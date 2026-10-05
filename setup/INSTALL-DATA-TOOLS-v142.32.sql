-- Install once after v142.29. No records are reset by this installer.
BEGIN;
CREATE TABLE IF NOT EXISTS public.data_tools_state14232(id integer PRIMARY KEY CHECK(id=1),instance uuid NOT NULL DEFAULT gen_random_uuid());
INSERT INTO public.data_tools_state14232(id) VALUES(1) ON CONFLICT DO NOTHING;
ALTER TABLE public.data_tools_state14232 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.data_tools_state14232 FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.reset_scope_catalog14232() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$ SELECT '[{"id": "journal", "group": "Transactions", "label": "Journal and transaction history", "tables": ["journal_entries", "journal_lines"]}, {"id": "periods", "group": "Transactions", "label": "Period closing and review", "tables": ["accounting_periods", "period_findings", "year_closings136", "book_sessions136", "audit_reviews136", "correction_sessions136"]}, {"id": "submissions", "group": "Transactions", "label": "Entry submissions", "tables": ["entry_submissions"]}, {"id": "scheduled", "group": "Transactions", "label": "Scheduled transactions", "tables": ["scheduled_journals", "scheduled_journal_lines", "scheduled_journal_occurrences", "recurring_transactions"]}, {"id": "reminders", "group": "Transactions", "label": "Upcoming reminders", "tables": ["recurring_reminders", "upcoming_reminders14229"]}, {"id": "todos", "group": "Transactions", "label": "To-do lists", "tables": ["workspace_todos136", "todo_completions1443"]}, {"id": "staff", "group": "Sub-users", "label": "Entries, reports and review routing", "tables": ["staff_journals", "staff_journal_lines", "approved_reports1443", "review_routes14229", "report_review_steps14229"]}, {"id": "funds", "group": "Sub-users", "label": "Fund adjustments and activity", "tables": ["fund_adjustment_requests", "fund_adjustment_lines", "workspace_notifications"]}, {"id": "payroll", "group": "Payroll", "label": "Payroll runs and lines", "tables": ["payroll_runs", "payroll_lines"]}, {"id": "hr", "group": "Human Resources", "label": "Employees and leave records", "tables": ["payroll_employees", "payroll_leave_records", "employees", "legal_documents"]}, {"id": "tax", "group": "Tax & SSO", "label": "Tax and SSO records", "tables": ["tax_sso_records"]}, {"id": "reports", "group": "Reports & Documents", "label": "Saved operational reports", "tables": ["operational_reports"]}, {"id": "documents", "group": "Reports & Documents", "label": "Saved documents", "tables": ["company_documents105"]}, {"id": "audit", "group": "Auditing", "label": "Audit log", "tables": ["audit_log"]}, {"id": "deleted", "group": "Auditing", "label": "Deleted-record history", "tables": ["record_deletions108"]}]'::jsonb $$;
REVOKE ALL ON FUNCTION public.reset_scope_catalog14232() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.reset_scope_tables14232(p_scopes text[]) RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE result text[];BEGIN
 IF p_scopes IS NULL OR cardinality(p_scopes)=0 OR EXISTS(SELECT 1 FROM unnest(p_scopes) x WHERE x IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.reset_scope_catalog14232()) s WHERE s->>'id'=x)) THEN RAISE EXCEPTION 'Choose valid reset modules'; END IF;
 SELECT array_agg(DISTINCT t ORDER BY t) INTO result FROM jsonb_array_elements(public.reset_scope_catalog14232()) s CROSS JOIN LATERAL jsonb_array_elements_text(s->'tables') t WHERE s->>'id'=ANY(p_scopes) AND to_regclass(format('public.%I',t)) IS NOT NULL;
 IF cardinality(result) IS NULL THEN RAISE EXCEPTION 'No installed tables for this selection'; END IF;RETURN result;END $$;
REVOKE ALL ON FUNCTION public.reset_scope_tables14232(text[]) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.scoped_reset_backup14232(p_scopes text[]) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE names text[];name text;list jsonb;data jsonb='{}';counts jsonb='{}';BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required'; END IF;
 names=public.reset_scope_tables14232(p_scopes);
 FOREACH name IN ARRAY names LOOP EXECUTE format('LOCK TABLE public.%I IN SHARE MODE',name);END LOOP;
 FOREACH name IN ARRAY names LOOP EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text),''[]''::jsonb) FROM public.%I r',name) INTO list;data=data||jsonb_build_object(name,list);counts=counts||jsonb_build_object(name,jsonb_array_length(list));END LOOP;
 RETURN jsonb_build_object('format','oonjai-reset-14232','instance',(SELECT instance FROM public.data_tools_state14232 WHERE id=1),'owner',auth.uid(),'scopes',p_scopes,'tables',data,'counts',counts,'fingerprint',md5(data::text));END $$;
REVOKE ALL ON FUNCTION public.scoped_reset_backup14232(text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.scoped_reset_backup14232(text[]) TO authenticated;
CREATE OR REPLACE FUNCTION public.scoped_reset14232(p_backup jsonb,p_apply boolean DEFAULT false,p_confirmation text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE scopes text[];names text[];name text;current_pack jsonb;missing text[];total bigint;BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required'; END IF;
 IF p_backup->>'format' IS DISTINCT FROM 'oonjai-reset-14232' OR p_backup->>'owner' IS DISTINCT FROM auth.uid()::text OR p_backup->>'instance' IS DISTINCT FROM (SELECT instance::text FROM public.data_tools_state14232 WHERE id=1) THEN RAISE EXCEPTION 'Select the backup prepared for this administrator and database';END IF;
 SELECT array_agg(v) INTO scopes FROM jsonb_array_elements_text(p_backup->'scopes') v;names=public.reset_scope_tables14232(scopes);
 FOREACH name IN ARRAY names LOOP EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE',name);END LOOP;
 current_pack=public.scoped_reset_backup14232(scopes);
 IF p_backup->'tables' IS DISTINCT FROM current_pack->'tables' THEN RAISE EXCEPTION 'Selected data changed after backup; prepare a new backup'; END IF;
 SELECT array_agg(DISTINCT child.relname ORDER BY child.relname) INTO missing FROM pg_constraint c JOIN pg_class parent ON parent.oid=c.confrelid JOIN pg_namespace pn ON pn.oid=parent.relnamespace JOIN pg_class child ON child.oid=c.conrelid JOIN pg_namespace cn ON cn.oid=child.relnamespace WHERE c.contype='f' AND pn.nspname='public' AND parent.relname=ANY(names) AND (cn.nspname<>'public' OR NOT child.relname=ANY(names));
 IF EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY(names) AND NOT t.tgisinternal AND (t.tgtype::integer & 32)>0) THEN RAISE EXCEPTION 'A selected table has a custom reset trigger; its side effects must be reviewed before resetting';END IF;
 SELECT coalesce(sum(v::bigint),0) INTO total FROM jsonb_each_text(current_pack->'counts') x(k,v);
 IF NOT coalesce(p_apply,false) THEN RETURN jsonb_build_object('mode','preview','counts',current_pack->'counts','total',total,'requiredTables',coalesce(to_jsonb(missing),'[]'::jsonb),'fingerprint',current_pack->>'fingerprint','preserved','Accounts, settings, users, access rules and generated number continuity');END IF;
 IF p_confirmation IS DISTINCT FROM 'RESET SELECTED DATA' THEN RAISE EXCEPTION 'Type RESET SELECTED DATA'; END IF;
 IF cardinality(missing)>0 THEN RAISE EXCEPTION 'Selected tables are linked to unselected tables: %. Include their modules; nothing was deleted.',array_to_string(missing,', ');END IF;
 -- No CASCADE and no RESTART IDENTITY. Foreign-key restrictions remain authoritative.
 EXECUTE 'TRUNCATE TABLE '||(SELECT string_agg(format('public.%I',n),', ' ORDER BY n) FROM unnest(names) n)||' RESTRICT';
 RETURN jsonb_build_object('mode','cleared','counts',current_pack->'counts','total',total,'scopes',scopes);END $$;
REVOKE ALL ON FUNCTION public.scoped_reset14232(jsonb,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.scoped_reset14232(jsonb,boolean,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.protect_todo1443()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i int; before_step jsonb; after_step jsonb; next_steps jsonb; reset_cycle boolean; all_done boolean; blocked boolean=false;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active') THEN RAISE EXCEPTION 'Active sign-in required'; END IF;
 IF TG_OP='DELETE' THEN
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(OLD.steps) x WHERE x->>'done'='true') OR EXISTS(SELECT 1 FROM todo_completions1443 WHERE todo_id=OLD.id) THEN RAISE EXCEPTION 'Archive completed checklists instead of deleting them'; END IF; RETURN OLD;
 END IF;
 IF NEW.owner_id<>auth.uid() OR (TG_OP='UPDATE' AND NEW.owner_id<>OLD.owner_id) THEN RAISE EXCEPTION 'Private checklist access required'; END IF;
 IF TG_OP='INSERT' THEN RETURN NEW; END IF;
 IF OLD.is_template1438 THEN RETURN NEW; END IF;
 IF NEW.is_template1438 AND (EXISTS(SELECT 1 FROM jsonb_array_elements(OLD.steps) x WHERE x->>'done'='true') OR EXISTS(SELECT 1 FROM todo_completions1443 WHERE todo_id=OLD.id)) THEN RAISE EXCEPTION 'Copy a completed checklist to create a template'; END IF;
 reset_cycle=coalesce((NEW.todo_config1438->>'completedCycles')::int,0)=coalesce((OLD.todo_config1438->>'completedCycles')::int,0)+1;
 IF coalesce((NEW.todo_config1438->>'completedCycles')::int,0)<>coalesce((OLD.todo_config1438->>'completedCycles')::int,0) AND NOT reset_cycle THEN RAISE EXCEPTION 'Completed cycle count cannot be changed'; END IF;
 next_steps=CASE WHEN reset_cycle THEN NEW.todo_config1438->'lastCompletedSteps' ELSE NEW.steps END;
 IF reset_cycle AND (OLD.todo_config1438->>'type'<>'recurring' OR jsonb_array_length(NEW.steps)<>jsonb_array_length(OLD.steps) OR (NEW.todo_config1438->>'dueAt')::timestamptz<=(OLD.todo_config1438->>'dueAt')::timestamptz) THEN RAISE EXCEPTION 'Invalid recurring checklist reset'; END IF;
 IF next_steps IS NULL OR jsonb_typeof(next_steps)<>'array' THEN RAISE EXCEPTION 'Invalid checklist'; END IF;
 FOR i IN 0..jsonb_array_length(OLD.steps)-1 LOOP
  before_step=OLD.steps->i;after_step=next_steps->i;
  IF before_step->>'done'='true' AND (after_step IS NULL OR (before_step-'done') IS DISTINCT FROM (after_step-'done')) THEN RAISE EXCEPTION 'Recorded step text cannot be removed, moved or edited'; END IF;
 END LOOP;
 FOR i IN 0..jsonb_array_length(next_steps)-1 LOOP
  after_step=next_steps->i;
  IF OLD.sequential AND blocked AND after_step->>'done'='true' THEN RAISE EXCEPTION 'Complete checklist steps in order'; END IF;
  IF coalesce(after_step->>'done','false')<>'true' THEN blocked=true; END IF;
 END LOOP;
 all_done=jsonb_array_length(next_steps)>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(next_steps) x WHERE x->>'done' IS DISTINCT FROM 'true');
 IF reset_cycle THEN
  IF NOT all_done OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.steps) WITH ORDINALITY AS x(step,n) WHERE step->>'done' IS DISTINCT FROM 'false' OR (step-'done') IS DISTINCT FROM ((next_steps->(n::int-1))-'done')) THEN RAISE EXCEPTION 'Only a fully completed cycle can restart'; END IF;
 END IF;
 IF all_done AND (reset_cycle OR EXISTS(SELECT 1 FROM jsonb_array_elements(OLD.steps) x WHERE x->>'done' IS DISTINCT FROM 'true')) THEN INSERT INTO todo_completions1443(todo_id,owner_id,title,steps) VALUES(OLD.id,OLD.owner_id,NEW.title,next_steps); END IF;
 RETURN NEW;
END $$;

-- Read-only raw working copy: this endpoint cannot register an archive/history.
CREATE OR REPLACE FUNCTION public.audit_snapshot14232() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE names text[]; name text; items jsonb; data jsonb='{}';BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required';END IF;
 SELECT array_agg(DISTINCT t ORDER BY t) INTO names FROM (
  SELECT jsonb_array_elements_text(s->'tables') t FROM jsonb_array_elements(public.reset_scope_catalog14232()) s
  UNION SELECT unnest(ARRAY['accounts','sub_accounts','currencies','profiles','user_permissions','user_fund_assignments','business_settings','accounting_id_settings','print_settings','presentation_settings113','entry_prefix_reservations','staff_entry_sequences'])
 ) x WHERE to_regclass(format('public.%I',t)) IS NOT NULL;
 FOREACH name IN ARRAY names LOOP EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) FROM public.%I r',name) INTO items;data=data||jsonb_build_object(name,items);END LOOP;
 RETURN jsonb_build_object('format','oonjai-data-113','tables',data,'storage','[]'::jsonb,'auditTrail','{}'::jsonb,'purpose14232','audit_working_copy','copiedAt14232',statement_timestamp());
END $$;
REVOKE ALL ON FUNCTION public.audit_snapshot14232() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.audit_snapshot14232() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
