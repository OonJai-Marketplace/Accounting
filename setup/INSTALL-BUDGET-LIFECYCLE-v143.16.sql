-- Install after DATA TOOLS v142.32 and BUDGET TEMPLATES v143.13.
-- This installer never deletes or resets records.
BEGIN;
-- A self-reference preserves parent/child integrity during generic deletion and reset.
ALTER TABLE public.operational_reports ADD COLUMN IF NOT EXISTS budget_request_id14316 uuid;
UPDATE public.operational_reports SET budget_request_id14316=NULLIF(data->>'requestId14316','')::uuid WHERE budget_request_id14316 IS DISTINCT FROM NULLIF(data->>'requestId14316','')::uuid;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.operational_reports'::regclass AND conname='budget_request_parent14316') THEN
  ALTER TABLE public.operational_reports ADD CONSTRAINT budget_request_parent14316 FOREIGN KEY(budget_request_id14316) REFERENCES public.operational_reports(id) ON DELETE RESTRICT;
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS operational_reports_budget_parent14316 ON public.operational_reports(budget_request_id14316);
CREATE OR REPLACE FUNCTION public.budget_link_guard14316() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE parent public.operational_reports%ROWTYPE;
BEGIN
 NEW.budget_request_id14316=NULLIF(NEW.data->>'requestId14316','')::uuid;
 IF TG_OP='UPDATE' THEN
  IF OLD.data->>'kind'='finance' AND OLD.data->>'status'='finalized' AND NEW.data IS DISTINCT FROM OLD.data THEN RAISE EXCEPTION 'Finalized fund allocation is read-only'; END IF;
  IF OLD.data->>'kind'='finance' AND EXISTS(SELECT 1 FROM public.operational_reports WHERE budget_request_id14316=OLD.id) AND NEW.data IS DISTINCT FROM OLD.data THEN RAISE EXCEPTION 'Budget request has allocations; create a new request for changes'; END IF;
 END IF;
 IF NEW.budget_request_id14316 IS NOT NULL THEN
  SELECT * INTO parent FROM public.operational_reports WHERE id=NEW.budget_request_id14316 FOR UPDATE;
  IF NOT FOUND OR parent.data->>'kind' IS DISTINCT FROM 'finance' OR parent.data->>'mode'='utilization' OR parent.budget_request_id14316 IS NOT NULL OR NEW.data->>'mode' IS DISTINCT FROM 'utilization' OR NEW.data->>'kind' IS DISTINCT FROM 'finance' THEN RAISE EXCEPTION 'Choose an original saved budget request'; END IF;
  IF NEW.data->'lines' IS DISTINCT FROM parent.data->'lines' OR (NEW.data->>'requestVersion14316')::integer IS DISTINCT FROM parent.version THEN RAISE EXCEPTION 'Budget request changed. Reopen its current version'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.budget_link_guard14316() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS budget_link_guard14316 ON public.operational_reports;
CREATE TRIGGER budget_link_guard14316 BEFORE INSERT OR UPDATE ON public.operational_reports FOR EACH ROW EXECUTE FUNCTION public.budget_link_guard14316();
CREATE OR REPLACE FUNCTION public.delete_budget14316(p_id uuid,p_version integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE target public.operational_reports%ROWTYPE; r public.operational_reports%ROWTYPE; deleted jsonb='[]'::jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required'; END IF;
 -- Prevent a linked allocation being inserted between selection and deletion.
 LOCK TABLE public.operational_reports IN SHARE ROW EXCLUSIVE MODE;
 SELECT * INTO target FROM public.operational_reports WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR target.version IS DISTINCT FROM p_version OR target.data->>'kind' IS DISTINCT FROM 'finance' THEN RAISE EXCEPTION 'Budget changed or is unavailable. Reopen History.'; END IF;
 FOR r IN SELECT * FROM public.operational_reports WHERE data->>'requestId14316'=p_id::text ORDER BY id LOOP
  -- Use the existing deletion journal. Support both deployed ID argument types.
  IF to_regprocedure('public.delete_record108(text,uuid,integer)') IS NOT NULL THEN
   EXECUTE 'SELECT public.delete_record108($1,$2::uuid,$3)' USING 'operational_reports',r.id,r.version;
  ELSIF to_regprocedure('public.delete_record108(text,text,integer)') IS NOT NULL THEN
   EXECUTE 'SELECT public.delete_record108($1,$2::text,$3)' USING 'operational_reports',r.id,r.version;
  ELSE RAISE EXCEPTION 'Install the existing audited record deletion function first'; END IF;
  deleted=deleted||jsonb_build_array(r.id);
 END LOOP;
 IF to_regprocedure('public.delete_record108(text,uuid,integer)') IS NOT NULL THEN
  EXECUTE 'SELECT public.delete_record108($1,$2::uuid,$3)' USING 'operational_reports',target.id,target.version;
 ELSIF to_regprocedure('public.delete_record108(text,text,integer)') IS NOT NULL THEN
  EXECUTE 'SELECT public.delete_record108($1,$2::text,$3)' USING 'operational_reports',target.id,target.version;
 ELSE RAISE EXCEPTION 'Install the existing audited record deletion function first'; END IF;
 RETURN jsonb_build_object('deletedIds',deleted||jsonb_build_array(target.id));
END $$;
REVOKE ALL ON FUNCTION public.delete_budget14316(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_budget14316(uuid,integer) TO authenticated;
-- Keep every report/document byte together with the existing selected reports reset.
-- Templates and handover settings remain configuration and are not reset.
-- Extend current snapshot definitions without replacing later deployed table catalogs.
DO $$ DECLARE definition text; BEGIN
 IF to_regprocedure('public.audit_snapshot14232()') IS NOT NULL THEN
  SELECT pg_get_functiondef(to_regprocedure('public.audit_snapshot14232()')) INTO definition;
  IF position('budget_templates14313' IN definition)=0 THEN
   definition=replace(definition,'''entry_prefix_reservations''','''budget_templates14313'',''budget_settings14313'',''entry_prefix_reservations''');
   IF position('budget_templates14313' IN definition)=0 THEN RAISE EXCEPTION 'Snapshot definition differs; add budget configuration to its reference-table list before installing'; END IF;
   EXECUTE definition;
  END IF;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.budget_capabilities14316() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$ BEGIN IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required'; END IF;RETURN jsonb_build_object('version',14316);END $$;
REVOKE ALL ON FUNCTION public.budget_capabilities14316() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.budget_capabilities14316() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
