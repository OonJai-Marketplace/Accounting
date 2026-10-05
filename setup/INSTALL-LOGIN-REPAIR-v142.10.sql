-- Historical installer. Preserved for reference only after v142.28.
DO $$ BEGIN RAISE EXCEPTION 'Superseded installer: use INSTALL-SECURITY-v142.28.sql and START-HERE-v142.28.txt';END $$;
-- Run once in Supabase SQL Editor as the database owner.
-- Repairs only the existing request hook. No ledger/payroll records or RLS policies change.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.workspace_hook_config138') IS NULL THEN
  RAISE EXCEPTION 'The v138/v141 workspace setup is missing. Install your existing workspace setup first.';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.workspace_pre_request138() RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE headers jsonb:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}');
 claims jsonb:=coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}');
 actor uuid:=auth.uid(); target uuid; p public.profiles; previous regprocedure; ns text; fn text;
BEGIN
 PERFORM set_config('ojm.workspace_actor138','',true);
 IF nullif(headers->>'x-ojm-workspace','') IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=actor AND role='admin' AND status='active') THEN
   RAISE EXCEPTION 'Only an active administrator may switch accounts' USING ERRCODE='42501';
  END IF;
  BEGIN target:=(headers->>'x-ojm-workspace')::uuid; EXCEPTION WHEN invalid_text_representation THEN
   RAISE EXCEPTION 'Invalid workspace account' USING ERRCODE='42501'; END;
  SELECT * INTO p FROM profiles WHERE id=target AND status='active' AND role<>'admin';
  IF p.id IS NULL THEN RAISE EXCEPTION 'Choose an active sub-user account' USING ERRCODE='42501';END IF;
  PERFORM set_config('ojm.workspace_actor138',actor::text,true);
  -- Authorization stays in the existing authenticated role; identity-dependent RLS/RPCs see the sub-user.
  claims:=claims||jsonb_build_object('sub',target::text,'email',to_jsonb(p)->>'email');
  claims:=claims-'app_metadata'-'user_metadata';
  PERFORM set_config('request.jwt.claims',claims::text,true);
  PERFORM set_config('request.jwt.claim.sub',target::text,true);
 END IF;
 SELECT previous_hook INTO previous FROM workspace_hook_config138 WHERE id;
 IF previous IS NOT NULL AND previous<>'public.workspace_pre_request138()'::regprocedure THEN
  SELECT n.nspname,f.proname INTO ns,fn FROM pg_proc f JOIN pg_namespace n ON n.oid=f.pronamespace WHERE f.oid=previous::oid;
  IF fn IS NOT NULL THEN EXECUTE format('SELECT %I.%I()',ns,fn);END IF;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.workspace_pre_request138() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.workspace_pre_request138() TO anon, authenticated;
-- PostgREST invokes this hook after assuming anon/authenticated. Allow the hook
-- to run for anon too; its administrator check still rejects every anonymous
-- workspace header, and table/RPC permissions remain unchanged.
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
COMMIT;
SELECT has_function_privilege('anon','public.workspace_pre_request138()','EXECUTE') AS anon_hook_ready,
       has_function_privilege('authenticated','public.workspace_pre_request138()','EXECUTE') AS signed_in_hook_ready;
