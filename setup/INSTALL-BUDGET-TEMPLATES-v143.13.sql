-- Shared budget templates and handover settings. Run in Supabase SQL Editor.
BEGIN;
CREATE TABLE IF NOT EXISTS public.budget_templates14313 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES public.profiles(id)
);
CREATE TABLE IF NOT EXISTS public.budget_settings14313 (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 data jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(data)='object'),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES public.profiles(id)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['budget_templates14313','budget_settings14313'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
  EXECUTE format('DROP POLICY IF EXISTS budget_admin14313 ON public.%I',t);
  EXECUTE format('CREATE POLICY budget_admin14313 ON public.%I TO authenticated USING(public.is_admin() AND public.accounting_workspace_allowed123()) WITH CHECK(public.is_admin() AND public.accounting_workspace_allowed123())',t);
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
