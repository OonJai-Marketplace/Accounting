-- Save encrypted-download recovery records in Supabase.
-- Run in the existing project's SQL Editor. Does not alter existing business data.
BEGIN;
CREATE TABLE IF NOT EXISTS public.document_download_passwords14312 (
 owner_id uuid NOT NULL REFERENCES public.profiles(id),
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 filename text NOT NULL CHECK(length(filename) BETWEEN 1 AND 240),
 format text NOT NULL CHECK(format IN ('pdf','docx','html','txt','json')),
 password text NOT NULL CHECK(length(password)>0),
 prepared_at timestamptz NOT NULL DEFAULT now(),
 saved_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,id)
);
COMMENT ON TABLE public.document_download_passwords14312 IS 'Private, recoverable encrypted-download passwords. Never include in public exports or general audit payloads.';
CREATE INDEX IF NOT EXISTS document_download_passwords14312_date ON public.document_download_passwords14312(owner_id,prepared_at DESC,id);
ALTER TABLE public.document_download_passwords14312 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_download_passwords14312 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.document_download_passwords14312 TO authenticated;
DROP POLICY IF EXISTS download_password_owner14312 ON public.document_download_passwords14312;
CREATE POLICY download_password_owner14312 ON public.document_download_passwords14312 FOR SELECT TO authenticated
USING(owner_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND status='active') AND public.can_action113('document-editor105','export'));
DROP POLICY IF EXISTS download_password_save14312 ON public.document_download_passwords14312;
CREATE POLICY download_password_save14312 ON public.document_download_passwords14312 FOR INSERT TO authenticated
WITH CHECK(owner_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND status='active') AND public.can_action113('document-editor105','export'));
-- No client UPDATE or DELETE grant: recovery records cannot be overwritten or removed.
NOTIFY pgrst,'reload schema';
COMMIT;
