-- v142.29: update for an existing v142.28 project. No deployment or data clearing.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.current_access14228()') IS NULL THEN RAISE EXCEPTION 'Install v142.28 security first';END IF;
END $$;
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS department14229 text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS public.review_routes14229(
 journal_id uuid PRIMARY KEY REFERENCES public.staff_journals(id),
 current_reviewer uuid REFERENCES public.profiles(id),final_approved boolean NOT NULL DEFAULT false,
 stage integer NOT NULL DEFAULT 0,steps jsonb NOT NULL DEFAULT '[]',updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.upcoming_reminders14229(
 owner_id uuid PRIMARY KEY REFERENCES public.profiles(id),revision bigint NOT NULL DEFAULT 0,
 items jsonb NOT NULL DEFAULT '[]',updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.review_routes14229 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upcoming_reminders14229 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_routes14229,public.upcoming_reminders14229 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.in_branch14229(p_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.accounting_workspace_allowed123() AND (public.is_admin() OR p_owner=auth.uid() OR EXISTS(
 WITH RECURSIVE branch(id,path) AS (
 SELECT user_id,ARRAY[auth.uid(),user_id] FROM user_permissions WHERE manager_id=auth.uid() AND user_id<>auth.uid()
 UNION ALL SELECT p.user_id,b.path||p.user_id FROM user_permissions p JOIN branch b ON p.manager_id=b.id WHERE NOT p.user_id=ANY(b.path)
 ) SELECT 1 FROM branch WHERE id=p_owner))
$$;
CREATE OR REPLACE FUNCTION public.can_workspace113(p_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.accounting_workspace_allowed123() AND (public.is_admin()
 OR (auth.uid()=p_owner AND public.can_action113('sub-users-workspace','view'))
 OR (public.can_action113('user-entry-review','view') AND (
 EXISTS(SELECT 1 FROM user_permissions WHERE user_id=p_owner AND manager_id=auth.uid())
 OR EXISTS(SELECT 1 FROM review_routes14229 r JOIN staff_journals j ON j.id=r.journal_id WHERE j.owner_id=p_owner AND
 (r.current_reviewer=auth.uid() OR r.steps @> jsonb_build_array(jsonb_build_object('by',auth.uid()::text)))))))
$$;
CREATE OR REPLACE FUNCTION public.journal_visible14229(p_journal uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.accounting_workspace_allowed123() AND EXISTS(
 SELECT 1 FROM staff_journals j WHERE j.id=p_journal AND (public.is_admin()
 OR (j.owner_id=auth.uid() AND public.can_action113('sub-users-workspace','view'))
 OR (public.can_action113('user-entry-review','view') AND (
 EXISTS(SELECT 1 FROM user_permissions WHERE user_id=j.owner_id AND manager_id=auth.uid())
 OR EXISTS(SELECT 1 FROM review_routes14229 r WHERE r.journal_id=j.id AND (r.current_reviewer=auth.uid()
 OR r.steps @> jsonb_build_array(jsonb_build_object('by',auth.uid()::text))))))))
$$;
CREATE OR REPLACE FUNCTION public.review_current14229(p_journal uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r review_routes14229; j staff_journals; manager uuid;
BEGIN
 IF NOT public.accounting_workspace_allowed123() THEN RETURN false;END IF;
 IF public.is_admin() THEN RETURN EXISTS(SELECT 1 FROM staff_journals WHERE id=p_journal);END IF;
 IF NOT public.can_action113('user-entry-review','approve') THEN RETURN false;END IF;
 SELECT * INTO j FROM staff_journals WHERE id=p_journal;IF NOT FOUND OR j.owner_id=auth.uid() THEN RETURN false;END IF;
 SELECT * INTO r FROM review_routes14229 WHERE journal_id=p_journal;
 IF FOUND THEN RETURN r.current_reviewer=auth.uid();END IF;
 SELECT manager_id INTO manager FROM user_permissions WHERE user_id=j.owner_id;
 RETURN coalesce(manager=auth.uid(),false);
END $$;
CREATE OR REPLACE FUNCTION public.report_access1443(p_owner uuid,p_approve boolean DEFAULT false) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.accounting_workspace_allowed123() AND (public.is_admin() OR
 (NOT p_approve AND p_owner=auth.uid() AND public.can_action113('sub-users-workspace','view') AND public.can_action113('document-editor105','export')) OR
 (p_owner<>auth.uid() AND public.can_workspace113(p_owner) AND
 public.can_action113('user-entry-review',CASE WHEN p_approve THEN 'approve' ELSE 'export' END)
 AND (p_approve OR public.can_action113('document-editor105','export'))))
$$;

CREATE OR REPLACE FUNCTION public.organization_guard14229() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE next_id uuid;seen uuid[]:=ARRAY[NEW.user_id]; supervisor record;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('organization14229',0));
 IF length(NEW.job_title)>100 OR length(NEW.department14229)>100 THEN RAISE EXCEPTION 'Position and department must be at most 100 characters';END IF;
 next_id:=NEW.manager_id;
 IF next_id IS NOT NULL THEN
 SELECT p.*,u.module_actions113,u.can_approve INTO supervisor FROM profiles p LEFT JOIN user_permissions u ON u.user_id=p.id WHERE p.id=next_id;
 IF NOT FOUND OR supervisor.status<>'active' OR EXISTS(SELECT 1 FROM restaurant_members121 WHERE user_id=next_id) THEN RAISE EXCEPTION 'Choose an active Accounting supervisor';END IF;
 IF supervisor.role<>'admin' AND NOT (CASE WHEN supervisor.module_actions113 IS NULL THEN coalesce(supervisor.can_approve,false)
 ELSE coalesce(supervisor.module_actions113->'user-entry-review' @> '["view","approve"]',false) END) THEN RAISE EXCEPTION 'Supervisor needs View and Approve in Entry Submission Review';END IF;
 END IF;
 WHILE next_id IS NOT NULL LOOP
 IF next_id=ANY(seen) THEN RAISE EXCEPTION 'A person cannot report to themselves or create a reporting loop';END IF;
 seen:=seen||next_id;SELECT manager_id INTO next_id FROM user_permissions WHERE user_id=next_id;
 END LOOP;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS organization_structure14229 ON public.user_permissions;
CREATE TRIGGER organization_structure14229 BEFORE INSERT OR UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION public.organization_guard14229();
-- Preserve the tested atomic access-save function; add the department to its existing upsert.
DO $$ DECLARE d text; BEGIN
 d:=pg_get_functiondef('public.admin_save_access1441(uuid,text,text,jsonb)'::regprocedure);
 IF position('department14229' IN d)=0 THEN
 d:=replace(d,'(user_id,user_type,manager_id,job_title,modules','(user_id,user_type,manager_id,job_title,department14229,modules');
 d:=replace(d,'r.job_title,r.modules','r.job_title,coalesce(r.department14229,'''') ,r.modules');
 d:=replace(d,'job_title=EXCLUDED.job_title,modules','job_title=EXCLUDED.job_title,department14229=EXCLUDED.department14229,modules');
 EXECUTE d;
 END IF;
 d:=pg_get_functiondef('public.can_action113(text,text)'::regprocedure);
 IF position('settings-organization14229' IN d)=0 THEN
 d:=replace(d,'''settings-appearance113''','''settings-appearance113'',''settings-organization14229''');
 d:=replace(d,'if public.is_admin() then return true; end if;',
 'if public.is_admin() then return true; end if; IF p_target=''sub-users-home14229'' THEN SELECT module_actions113->p_target INTO a FROM public.user_permissions WHERE user_id=auth.uid(); RETURN p_action=''view'' AND coalesce(a ? ''view'',false); END IF;');
 EXECUTE d;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.review_directory14229() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Current accounting access required';END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(p)||jsonb_build_object('user_permissions',to_jsonb(u)) ORDER BY p.full_name)
 FROM profiles p LEFT JOIN user_permissions u ON u.user_id=p.id WHERE NOT EXISTS(SELECT 1 FROM restaurant_members121 WHERE user_id=p.id)
 AND (public.is_admin() OR p.id=auth.uid() OR public.can_workspace113(p.id))),'[]');
END $$;
CREATE OR REPLACE FUNCTION public.branch_home14229() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE people jsonb;balances jsonb; reports jsonb;
BEGIN
 IF NOT public.can_action113('sub-users-home14229','view') THEN RAISE EXCEPTION 'Main Home permission required';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,
 'can_open',public.can_workspace113(p.id),'user_permissions',jsonb_build_object('job_title',u.job_title,'department14229',u.department14229,
 'manager_id',u.manager_id,'assigned_fund_account_ids',u.assigned_fund_account_ids))), '[]') INTO people
 FROM profiles p JOIN user_permissions u ON u.user_id=p.id WHERE p.status='active' AND (p.role<>'admin' OR p.id=auth.uid())
 AND public.in_branch14229(p.id) AND NOT EXISTS(SELECT 1 FROM restaurant_members121 WHERE user_id=p.id);
 SELECT coalesce(jsonb_object_agg(owner,rows),'{}') INTO balances FROM (
 SELECT u.user_id::text owner,jsonb_agg(jsonb_build_object('account_id',a.id,'name',a.name,'currency',a.currency_code,
 'opening',0,'received',coalesce(s.dr,0),'used',coalesce(s.cr,0),'handover',0,'closing',coalesce(s.dr,0)-coalesce(s.cr,0))) rows
 FROM user_permissions u JOIN profiles p ON p.id=u.user_id AND p.status='active'
 JOIN accounts a ON a.id=ANY(u.assigned_fund_account_ids)
 LEFT JOIN LATERAL (SELECT sum(l.debit) dr,sum(l.credit) cr FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE l.account_id=a.id AND e.status::text='posted') s ON true
 WHERE public.in_branch14229(u.user_id) AND NOT EXISTS(SELECT 1 FROM restaurant_members121 WHERE user_id=u.user_id) GROUP BY u.user_id) q;
 SELECT coalesce(jsonb_agg(to_jsonb(j)||jsonb_build_object('review_route14229',to_jsonb(r))),'[]') INTO reports
 FROM staff_journals j LEFT JOIN review_routes14229 r ON r.journal_id=j.id
 WHERE public.in_branch14229(j.owner_id) AND public.can_action113('user-entry-review','view') AND public.journal_visible14229(j.id);
 RETURN jsonb_build_object('users',people,'balances',balances,'reports',reports);
END $$;
CREATE OR REPLACE FUNCTION public.review_inbox14229() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Current accounting access required';END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(j)||jsonb_build_object('review_route14229',to_jsonb(r),'lines',
 (SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.transaction_date,l.id),'[]') FROM staff_journal_lines l WHERE l.staff_journal_id=j.id)) ORDER BY j.submitted_at DESC NULLS LAST)
 FROM staff_journals j LEFT JOIN review_routes14229 r ON r.journal_id=j.id WHERE public.journal_visible14229(j.id)),'[]');
END $$;

CREATE OR REPLACE FUNCTION public.review_exact14229(p_journal uuid,p_expected jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actual jsonb;
BEGIN
 PERFORM 1 FROM staff_journals WHERE id=p_journal FOR UPDATE;
 PERFORM 1 FROM staff_journal_lines WHERE staff_journal_id=p_journal FOR UPDATE;
 SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.id),'[]') INTO actual FROM staff_journal_lines l WHERE staff_journal_id=p_journal;
 IF jsonb_array_length(actual)=0 OR jsonb_typeof(p_expected) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'A complete source report is required';END IF;
 IF (SELECT jsonb_agg(x ORDER BY x->>'id') FROM jsonb_array_elements(p_expected) x) IS DISTINCT FROM actual THEN RAISE EXCEPTION 'Report changed. Reload before reviewing';END IF;
END $$;
DO $$ BEGIN
 IF to_regprocedure('public.approve_report_worker14229(uuid,jsonb)') IS NULL THEN ALTER FUNCTION public.approve_report1443(uuid,jsonb) RENAME TO approve_report_worker14229;END IF;
END $$;
REVOKE ALL ON FUNCTION public.approve_report_worker14229(uuid,jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.approve_report1443(p_journal uuid,p_expected jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE pack jsonb;next_id uuid;r review_routes14229;
BEGIN
 IF NOT public.review_current14229(p_journal) THEN RAISE EXCEPTION 'This report is assigned to a different reviewer';END IF;
 PERFORM public.review_exact14229(p_journal,p_expected);
 SELECT manager_id INTO next_id FROM user_permissions WHERE user_id=auth.uid();
 IF NOT public.is_admin() AND next_id IS NOT NULL THEN RAISE EXCEPTION 'Review and forward this report to your direct supervisor';END IF;
 pack:=public.approve_report_worker14229(p_journal,p_expected);
 SELECT * INTO r FROM review_routes14229 WHERE journal_id=p_journal FOR UPDATE;
 IF NOT coalesce(r.final_approved,false) THEN
 INSERT INTO review_routes14229(journal_id,current_reviewer,final_approved,stage,steps) VALUES(p_journal,auth.uid(),true,1,
 jsonb_build_array(jsonb_build_object('by',auth.uid()::text,'by_name',(SELECT full_name FROM profiles WHERE id=auth.uid()),'action','final_approval','at',now())))
 ON CONFLICT(journal_id) DO UPDATE SET current_reviewer=auth.uid(),final_approved=true,stage=review_routes14229.stage+1,
 steps=review_routes14229.steps||EXCLUDED.steps,updated_at=now();
 END IF;
 RETURN pack;
END $$;
CREATE OR REPLACE FUNCTION public.review_forward14229(p_journal uuid,p_expected jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r review_routes14229;next_id uuid;pack jsonb;report_owner uuid;
BEGIN
 PERFORM 1 FROM staff_journals WHERE id=p_journal FOR UPDATE;
 IF NOT public.journal_visible14229(p_journal) OR NOT public.can_action113('user-entry-review','approve') THEN RAISE EXCEPTION 'Review permission required';END IF;
 PERFORM public.review_exact14229(p_journal,p_expected);
 SELECT * INTO r FROM review_routes14229 WHERE journal_id=p_journal FOR UPDATE;
 IF FOUND AND r.steps @> jsonb_build_array(jsonb_build_object('by',auth.uid()::text,'action','forward')) THEN RETURN to_jsonb(r);END IF;
 IF NOT public.review_current14229(p_journal) OR coalesce(r.final_approved,false) THEN RAISE EXCEPTION 'This report is not awaiting your review';END IF;
 SELECT manager_id INTO next_id FROM user_permissions WHERE user_id=auth.uid();
 IF next_id IS NULL THEN RAISE EXCEPTION 'No higher supervisor is assigned. Use final approval';END IF;
 SELECT j.owner_id INTO report_owner FROM staff_journals j WHERE id=p_journal;
 IF next_id=auth.uid() OR next_id=report_owner OR NOT EXISTS(SELECT 1 FROM profiles p LEFT JOIN user_permissions u ON u.user_id=p.id WHERE p.id=next_id AND p.status='active' AND (p.role='admin' OR u.module_actions113->'user-entry-review' @> '["view","approve"]')) THEN RAISE EXCEPTION 'The next supervisor must have current review permission';END IF;
 pack:=public.approve_report_worker14229(p_journal,p_expected);
 INSERT INTO review_routes14229(journal_id,current_reviewer,stage,steps) VALUES(p_journal,next_id,1,
 jsonb_build_array(jsonb_build_object('by',auth.uid()::text,'by_name',(SELECT full_name FROM profiles WHERE id=auth.uid()),'to',next_id::text,'to_name',(SELECT full_name FROM profiles WHERE id=next_id),'action','forward','at',now())))
 ON CONFLICT(journal_id) DO UPDATE SET current_reviewer=next_id,stage=review_routes14229.stage+1,
 steps=review_routes14229.steps||EXCLUDED.steps,updated_at=now();
 INSERT INTO audit_log(table_name,record_id,action,reason,actor_id,new_data) VALUES('staff_journals',p_journal::text,'REVIEW_FORWARD','Reviewed exact source and forwarded; no ledger posting',auth.uid(),jsonb_build_object('to',next_id));
 RETURN (SELECT to_jsonb(x) FROM review_routes14229 x WHERE journal_id=p_journal);
END $$;
CREATE OR REPLACE FUNCTION public.assert_final_review14229(p_journal uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r review_routes14229;
BEGIN
 IF NOT public.review_current14229(p_journal) THEN RAISE EXCEPTION 'This report is assigned to a different reviewer';END IF;
 SELECT * INTO r FROM review_routes14229 WHERE journal_id=p_journal;
 IF FOUND AND NOT r.final_approved THEN RAISE EXCEPTION 'Final approval is required before posting';END IF;
 IF NOT FOUND AND NOT public.is_admin() AND EXISTS(SELECT 1 FROM user_permissions WHERE user_id=auth.uid() AND manager_id IS NOT NULL) THEN RAISE EXCEPTION 'Forward this report before posting';END IF;
END $$;
-- Specific-journal checks prevent a forwarded report granting access to other periods.
DO $$ DECLARE name text;sig regprocedure;d text;guard text; BEGIN
 FOREACH name IN ARRAY ARRAY['staff_report1434','approved_report1443','post_workspace_review_v3','review_collection_report'] LOOP
 SELECT p.oid::regprocedure INTO sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=name LIMIT 1;
 d:=pg_get_functiondef(sig);
 IF position('14229(' IN d)>0 THEN CONTINUE;END IF;
 guard:=CASE WHEN name IN ('staff_report1434','approved_report1443') THEN
 ' IF NOT public.journal_visible14229(p_journal) THEN RAISE EXCEPTION ''Report access denied'';END IF;'
 ELSE ' PERFORM public.assert_final_review14229(p_journal_id);' END;
 d:=regexp_replace(d,'(\mbegin\M)',E'\\1\n'||guard,'i');EXECUTE d;
 END LOOP;
END $$;
DROP POLICY IF EXISTS journal_visible14229 ON public.staff_journals;
CREATE POLICY journal_visible14229 ON public.staff_journals AS RESTRICTIVE FOR SELECT TO authenticated USING(public.journal_visible14229(id));
DROP POLICY IF EXISTS approved_visible14229 ON public.approved_reports1443;
CREATE POLICY approved_visible14229 ON public.approved_reports1443 AS RESTRICTIVE FOR SELECT TO authenticated USING(public.journal_visible14229(journal_id));

CREATE OR REPLACE FUNCTION public.reminder_load14229() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.can_action113('transactions-recurring','view') THEN RAISE EXCEPTION 'Upcoming Transactions permission required';END IF;
 RETURN coalesce((SELECT jsonb_build_object('revision',revision,'items',items) FROM upcoming_reminders14229 WHERE owner_id=auth.uid()),'{"revision":0,"items":[]}');
END $$;
CREATE OR REPLACE FUNCTION public.reminder_save14229(p_key text,p_revision bigint,p_items jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE old_revision bigint;payload jsonb;receipt operation_receipts14228;result jsonb;x jsonb;
BEGIN
 IF NOT public.can_action113('transactions-recurring','edit') THEN RAISE EXCEPTION 'Upcoming Transactions editing permission required';END IF;
 IF length(p_key) NOT BETWEEN 10 AND 200 OR p_key IS NULL OR p_revision IS NULL OR p_revision<0 THEN RAISE EXCEPTION 'Valid save reference and revision required';END IF;
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Reminder list required';END IF;
 IF jsonb_array_length(p_items)>1000 OR octet_length(p_items::text)>524288 THEN RAISE EXCEPTION 'Reminder list is too large';END IF;
 payload:=jsonb_build_object('revision',p_revision,'items',p_items);
 PERFORM pg_advisory_xact_lock(hashtextextended('reminders14229:'||auth.uid()::text,0));
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=auth.uid() AND request_key=p_key;
 IF FOUND THEN IF receipt.operation<>'reminders14229' OR receipt.payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'This save reference has different data';END IF;RETURN receipt.result;END IF;
 IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(p_items))<>jsonb_array_length(p_items) THEN RAISE EXCEPTION 'Reminder IDs must be unique';END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(p_items) LOOP
 IF jsonb_typeof(x)<>'object' OR nullif(btrim(x->>'memo'),'') IS NULL OR length(x->>'memo')>300 OR nullif(x->>'id','') IS NULL OR (x->>'id') !~ '^[A-Za-z0-9_-]{1,100}$'
 OR nullif(x->>'nextDate','') IS NULL OR length(x->>'nextDate')<>10 THEN RAISE EXCEPTION 'Reminder ID, description and due date required';END IF;
 PERFORM (x->>'nextDate')::date;
 END LOOP;
 INSERT INTO upcoming_reminders14229(owner_id) VALUES(auth.uid()) ON CONFLICT DO NOTHING;
 SELECT revision INTO old_revision FROM upcoming_reminders14229 WHERE owner_id=auth.uid() FOR UPDATE;
 IF old_revision<>p_revision THEN RAISE EXCEPTION 'Reminders changed on another device. Reload before saving';END IF;
 UPDATE upcoming_reminders14229 SET revision=revision+1,items=p_items,updated_at=now() WHERE owner_id=auth.uid();
 result:=jsonb_build_object('revision',old_revision+1,'saved',true);
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(auth.uid(),p_key,'reminders14229',payload,result);
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.submit_route14229() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE manager uuid;
BEGIN
 IF NEW.status='submitted' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
 SELECT manager_id INTO manager FROM user_permissions WHERE user_id=NEW.owner_id;
 IF manager IS NOT NULL AND NOT EXISTS(SELECT 1 FROM profiles WHERE id=manager AND status='active') THEN RAISE EXCEPTION 'Your assigned supervisor is inactive. Ask the administrator to update Reports to';END IF;
 INSERT INTO review_routes14229(journal_id,current_reviewer) VALUES(NEW.id,manager) ON CONFLICT(journal_id) DO UPDATE SET current_reviewer=manager,updated_at=now() WHERE NOT review_routes14229.final_approved AND review_routes14229.stage=0;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.workspace_write_scope14229() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE owner_id uuid;jid uuid;
BEGIN
 IF public.is_admin() THEN IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;
 IF TG_TABLE_NAME='staff_journals' THEN owner_id:=CASE WHEN TG_OP='DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;
 ELSE jid:=CASE WHEN TG_OP='DELETE' THEN OLD.staff_journal_id ELSE NEW.staff_journal_id END;SELECT j.owner_id INTO owner_id FROM staff_journals j WHERE j.id=jid;END IF;
 IF owner_id=auth.uid() OR EXISTS(SELECT 1 FROM user_permissions WHERE user_id=owner_id AND manager_id=auth.uid()) THEN
 IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;
 -- Forwarded reviewers may finalize/link only the immutable report they received.
 IF TG_OP='UPDATE' AND public.review_current14229(CASE WHEN TG_TABLE_NAME='staff_journals' THEN NEW.id ELSE jid END)
 AND EXISTS(SELECT 1 FROM review_routes14229 WHERE journal_id=CASE WHEN TG_TABLE_NAME='staff_journals' THEN NEW.id ELSE jid END AND final_approved)
 AND public.can_action113('user-entry-review','post') THEN
 IF TG_TABLE_NAME='staff_journals' AND (to_jsonb(NEW)-ARRAY['status','reviewed_by','reviewed_at','updated_at'])=(to_jsonb(OLD)-ARRAY['status','reviewed_by','reviewed_at','updated_at']) THEN RETURN NEW;END IF;
 IF TG_TABLE_NAME='staff_journal_lines' AND (to_jsonb(NEW)-ARRAY['journal_entry_id','updated_at'])=(to_jsonb(OLD)-ARRAY['journal_entry_id','updated_at']) THEN RETURN NEW;END IF;
 END IF;
 RAISE EXCEPTION 'Only the owner or direct supervisor may edit this workspace';
END $$;
DROP TRIGGER IF EXISTS submit_route14229 ON public.staff_journals;
CREATE TRIGGER submit_route14229 AFTER INSERT OR UPDATE ON public.staff_journals FOR EACH ROW EXECUTE FUNCTION public.submit_route14229();
DROP TRIGGER IF EXISTS write_scope14229 ON public.staff_journals;
CREATE TRIGGER write_scope14229 BEFORE INSERT OR UPDATE OR DELETE ON public.staff_journals FOR EACH ROW EXECUTE FUNCTION public.workspace_write_scope14229();
DROP TRIGGER IF EXISTS write_scope14229 ON public.staff_journal_lines;
CREATE TRIGGER write_scope14229 BEFORE INSERT OR UPDATE OR DELETE ON public.staff_journal_lines FOR EACH ROW EXECUTE FUNCTION public.workspace_write_scope14229();
REVOKE ALL ON FUNCTION public.submit_route14229(),public.workspace_write_scope14229() FROM PUBLIC,anon,authenticated;
DROP POLICY IF EXISTS line_visible14229 ON public.staff_journal_lines;
CREATE POLICY line_visible14229 ON public.staff_journal_lines AS RESTRICTIVE FOR SELECT TO authenticated USING(public.journal_visible14229(staff_journal_id));
-- Browser-facing RPCs explicitly granted; storage and workers remain private.
DO $$ DECLARE p record;BEGIN
 FOR p IN SELECT f.oid::regprocedure sig,f.proname FROM pg_proc f JOIN pg_namespace n ON n.oid=f.pronamespace WHERE n.nspname='public' AND f.proname=ANY(ARRAY['in_branch14229','can_workspace113','journal_visible14229','review_current14229','report_access1443','organization_guard14229','review_directory14229','branch_home14229','review_inbox14229','review_exact14229','approve_report1443','review_forward14229','assert_final_review14229','reminder_load14229','reminder_save14229']) LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',p.sig);
 IF p.proname NOT IN ('organization_guard14229','review_exact14229','assert_final_review14229') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',p.sig);END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.report_history14229() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Current accounting access required';END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('journal_id',a.journal_id,'owner_id',a.owner_id,
 'approved_at',a.approved_at,'approved_by',a.approved_by,'review_route14229',to_jsonb(r)) ORDER BY a.approved_at DESC)
 FROM approved_reports1443 a LEFT JOIN review_routes14229 r ON r.journal_id=a.journal_id
 WHERE public.journal_visible14229(a.journal_id) AND public.report_access1443(a.owner_id)),'[]');
END $$;
REVOKE ALL ON FUNCTION public.report_history14229() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.report_history14229() TO authenticated;
-- Source content stays immutable. Current review history is returned beside it.
CREATE OR REPLACE FUNCTION public.approved_report1443(p_journal uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a approved_reports1443; r review_routes14229;
BEGIN
 IF NOT public.journal_visible14229(p_journal) THEN RAISE EXCEPTION 'Report unavailable or access denied: not assigned to you';END IF;
 SELECT * INTO a FROM approved_reports1443 WHERE journal_id=p_journal;
 IF NOT FOUND OR NOT public.report_access1443(a.owner_id) THEN RAISE EXCEPTION 'Approved report unavailable or access denied';END IF;
 SELECT * INTO r FROM review_routes14229 WHERE journal_id=p_journal;
 RETURN a.snapshot||jsonb_build_object('review_route14229',to_jsonb(r),'approver',CASE WHEN r.journal_id IS NULL THEN a.snapshot->'approver' WHEN r.final_approved THEN (SELECT jsonb_build_object('full_name',p.full_name) FROM profiles p WHERE p.id=r.current_reviewer) ELSE NULL END);
END $$;

NOTIFY pgrst,'reload schema';
COMMIT;
