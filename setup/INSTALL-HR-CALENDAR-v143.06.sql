-- HR calendar, audited shared schedules, and private employee attachments.
-- Run once in Supabase SQL Editor. Existing employee/payroll data is retained.
BEGIN;
CREATE TABLE IF NOT EXISTS public.hr_calendar_settings14306 (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), data jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(data)='object'),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES public.profiles(id)
);
CREATE TABLE IF NOT EXISTS public.hr_calendar_events14306 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES public.profiles(id),
 CHECK(data ?& ARRAY['title','type','effect','status','start','end']), CHECK(length(trim(data->>'title')) BETWEEN 1 AND 160), CHECK(data->>'type' IN ('holiday','occasion','project','workday')),
 CHECK(data->>'effect' IN ('none','off','half','work')), CHECK(data->>'status' IN ('scheduled','completed','cancelled')),
 CHECK((data->>'start')::date <= (data->>'end')::date)
);
CREATE TABLE IF NOT EXISTS public.hr_calendar_history14306 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, record_table text NOT NULL, record_id text NOT NULL,
 before_data jsonb, after_data jsonb, changed_at timestamptz NOT NULL DEFAULT now(), changed_by uuid REFERENCES public.profiles(id)
);
CREATE OR REPLACE FUNCTION public.guard_hr_calendar14306() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT public.is_admin() OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active administrator access required'; END IF;
 IF TG_OP='UPDATE' AND NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Record changed elsewhere; reopen before saving'; END IF;
 IF TG_OP='INSERT' AND NEW.version<>1 THEN RAISE EXCEPTION 'New records must start at version 1'; END IF;
 NEW.updated_at:=now(); NEW.updated_by:=auth.uid();
 INSERT INTO public.hr_calendar_history14306(record_table,record_id,before_data,after_data,changed_by)
 VALUES(TG_TABLE_NAME,NEW.id::text,CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW),auth.uid());
 RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['hr_calendar_settings14306','hr_calendar_events14306'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON public.%I TO authenticated',t);
  EXECUTE format('DROP POLICY IF EXISTS hr_admin14306 ON public.%I',t);
  EXECUTE format('CREATE POLICY hr_admin14306 ON public.%I TO authenticated USING(public.is_admin() AND public.accounting_workspace_allowed123()) WITH CHECK(public.is_admin() AND public.accounting_workspace_allowed123())',t);
  EXECUTE format('DROP TRIGGER IF EXISTS guard_hr_calendar14306 ON public.%I',t);
  EXECUTE format('CREATE TRIGGER guard_hr_calendar14306 BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_hr_calendar14306()',t);
 END LOOP;
END $$;
ALTER TABLE public.hr_calendar_history14306 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hr_calendar_history14306 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.hr_calendar_history14306 TO authenticated;
DROP POLICY IF EXISTS hr_history_admin14306 ON public.hr_calendar_history14306;
CREATE POLICY hr_history_admin14306 ON public.hr_calendar_history14306 FOR SELECT TO authenticated USING(public.is_admin() AND public.accounting_workspace_allowed123());
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('hr-documents14306','hr-documents14306',false,10485760,ARRAY['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS hr_documents_admin14306 ON storage.objects;
CREATE POLICY hr_documents_admin14306 ON storage.objects TO authenticated
USING(bucket_id='hr-documents14306' AND public.is_admin() AND public.accounting_workspace_allowed123())
WITH CHECK(bucket_id='hr-documents14306' AND public.is_admin() AND public.accounting_workspace_allowed123() AND EXISTS(SELECT 1 FROM public.payroll_employees WHERE id::text=split_part(name,'/',1)));
-- A restrictive policy keeps this private bucket protected from broad legacy policies.
DROP POLICY IF EXISTS hr_documents_private14306 ON storage.objects;
CREATE POLICY hr_documents_private14306 ON storage.objects AS RESTRICTIVE TO authenticated
USING(bucket_id<>'hr-documents14306' OR (public.is_admin() AND public.accounting_workspace_allowed123()))
WITH CHECK(bucket_id<>'hr-documents14306' OR (public.is_admin() AND public.accounting_workspace_allowed123()));
DROP POLICY IF EXISTS hr_documents_anon14306 ON storage.objects;
CREATE POLICY hr_documents_anon14306 ON storage.objects AS RESTRICTIVE TO anon
USING(bucket_id<>'hr-documents14306') WITH CHECK(bucket_id<>'hr-documents14306');
REVOKE ALL ON FUNCTION public.guard_hr_calendar14306() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
