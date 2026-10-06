-- Fix missing/null job titles in the existing administrator permission-save RPC.
-- Preserve current titles, grants, role checks and all other function behavior.
-- Does not run a permission save or change any existing user records.
BEGIN;
DO $patch$
DECLARE definition text; old_fragment text := 'r.manager_id,r.job_title,';
 new_fragment text := 'r.manager_id,coalesce(r.job_title,(SELECT saved.job_title FROM public.user_permissions saved WHERE saved.user_id=p_user),''''),';
BEGIN
 IF to_regprocedure('public.admin_save_access1441(uuid,text,text,jsonb)') IS NULL THEN
  RAISE EXCEPTION 'The administrator permission-save function is missing. No changes made.';
 END IF;
 definition := pg_get_functiondef('public.admin_save_access1441(uuid,text,text,jsonb)'::regprocedure);
 IF position(new_fragment IN definition)>0 THEN
  RAISE NOTICE 'Job title repair is already installed.';
 ELSIF position(old_fragment IN definition)>0 THEN
  definition := replace(definition,old_fragment,new_fragment);
  EXECUTE definition;
 ELSE
  RAISE EXCEPTION 'Unrecognized permission-save function version. No changes made; request a matching repair.';
 END IF;
END $patch$;
COMMIT;
