-- Apply after SECURITY v142.28 and ORGANIZATION v142.29. Additive; no financial rows deleted.
BEGIN;
DO $$ BEGIN IF to_regprocedure('public.assert_final_review14229(uuid)') IS NULL OR to_regprocedure('public.post_manual_worker14228(date,text,jsonb,text,integer)') IS NULL THEN RAISE EXCEPTION 'Install the v142.28 security and v142.29 organization updates first';END IF;END $$;
CREATE TABLE IF NOT EXISTS public.report_types14253(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 80),active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS report_types14253_name ON public.report_types14253(lower(trim(name)));
ALTER TABLE public.report_types14253 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.report_types14253 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.report_types14253 TO authenticated;
DROP POLICY IF EXISTS report_types_read14253 ON public.report_types14253;
CREATE POLICY report_types_read14253 ON public.report_types14253 FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND status='active'));
INSERT INTO public.report_types14253(name) VALUES('Petty cash liquidation'),('Cashier report'),('Expense report'),('Collection report'),('Fund transfer / handover') ON CONFLICT DO NOTHING;
ALTER TABLE public.staff_journals ADD COLUMN IF NOT EXISTS report_types14253 jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deactivated_at14253 timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at14253 timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_identity14253 jsonb;
-- Start the inactivity clock now for existing inactive accounts; do not invent past dates.
UPDATE public.profiles SET deactivated_at14253=now() WHERE status<>'active' AND deactivated_at14253 IS NULL;
CREATE TABLE IF NOT EXISTS public.journal_sources14253(
 journal_line_id uuid NOT NULL REFERENCES public.journal_lines(id) ON DELETE RESTRICT,
 source_line_id uuid NOT NULL REFERENCES public.staff_journal_lines(id) ON DELETE RESTRICT,
 report_id uuid NOT NULL REFERENCES public.staff_journals(id) ON DELETE RESTRICT,
 source_entry_no text,submitter_id uuid NOT NULL,submitter_name text NOT NULL,
 source_date date NOT NULL,source_memo text,source_reference text,source_amount numeric NOT NULL,
 PRIMARY KEY(journal_line_id,source_line_id));
ALTER TABLE public.journal_sources14253 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.journal_sources14253 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.journal_sources14253 TO authenticated;
DROP POLICY IF EXISTS journal_sources_read14253 ON public.journal_sources14253;
CREATE POLICY journal_sources_read14253 ON public.journal_sources14253 FOR SELECT TO authenticated USING(public.can_action113('journal','view') OR public.report_access1443(submitter_id));
CREATE OR REPLACE FUNCTION public.workflow_capabilities14253() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active') THEN '{"version":14253}'::jsonb ELSE '{}'::jsonb END
$$;
CREATE OR REPLACE FUNCTION public.save_report_type14253(p_id uuid,p_name text,p_active boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r report_types14253;
BEGIN
 IF NOT public.is_admin() OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active') THEN RAISE EXCEPTION 'Active administrator required';END IF;
 IF p_id IS NULL THEN INSERT INTO report_types14253(name,active) VALUES(trim(p_name),p_active) RETURNING * INTO r;
 ELSE UPDATE report_types14253 SET name=trim(p_name),active=p_active WHERE id=p_id RETURNING * INTO r;IF NOT FOUND THEN RAISE EXCEPTION 'Report type not found';END IF;END IF;
 RETURN to_jsonb(r);
END $$;
CREATE OR REPLACE FUNCTION public.submit_report14253(p_journal uuid,p_types uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE labels jsonb;j staff_journals;n integer;
BEGIN
 SELECT * INTO j FROM staff_journals WHERE id=p_journal FOR UPDATE;
 IF NOT FOUND OR NOT public.can_workspace113(j.owner_id) OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active') THEN RAISE EXCEPTION 'Workspace unavailable';END IF;
 SELECT count(DISTINCT x) INTO n FROM unnest(p_types) x;
 IF n=0 OR n>10 OR n<>cardinality(p_types) THEN RAISE EXCEPTION 'Choose one to ten distinct report types';END IF;
 SELECT jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY name) INTO labels FROM report_types14253 WHERE id=ANY(p_types) AND active;
 IF coalesce(jsonb_array_length(labels),0)<>n THEN RAISE EXCEPTION 'A report type is inactive or missing';END IF;
 -- Existing RPC enforces owner/reviewer authorization, directions, assignments and locks.
 UPDATE staff_journals SET report_types14253=labels WHERE id=p_journal;
 PERFORM public.submit_staff_journal(p_journal);
END $$;
CREATE OR REPLACE FUNCTION public.report_labels_lock14253() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN IF OLD.status NOT IN ('draft','returned') AND NEW.report_types14253 IS DISTINCT FROM OLD.report_types14253 THEN RAISE EXCEPTION 'Submitted report types are locked';END IF;RETURN NEW;END $$;
DROP TRIGGER IF EXISTS report_labels_lock14253 ON public.staff_journals;
CREATE TRIGGER report_labels_lock14253 BEFORE UPDATE OF report_types14253 ON public.staff_journals FOR EACH ROW EXECUTE FUNCTION public.report_labels_lock14253();
CREATE OR REPLACE FUNCTION public.post_summary14253(p_journal uuid,p_date date,p_memo text,p_lines jsonb,p_prefix text,p_digits integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE j staff_journals;snapshot jsonb;expected jsonb;actual jsonb;posted record;item jsonb;src record;line_id uuid;summary_line_no integer:=0;owner_name text;receipt operation_receipts14228;payload jsonb;answer jsonb;
BEGIN
 IF NOT public.has_user_permission('approve') OR NOT public.has_user_permission('post') OR NOT public.can_action113('user-entry-review','post') OR NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Review and journal posting permissions required';END IF;
 SELECT * INTO j FROM staff_journals WHERE id=p_journal FOR UPDATE;
 IF NOT FOUND OR NOT public.can_workspace113(j.owner_id) THEN RAISE EXCEPTION 'Workspace access denied';END IF;
 PERFORM public.assert_final_review14229(p_journal);
 payload=jsonb_build_object('date',p_date,'memo',p_memo,'lines',p_lines,'prefix',p_prefix,'digits',p_digits);
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=auth.uid() AND request_key='summary:'||p_journal::text;
 IF FOUND THEN IF receipt.payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Report already posted with different data';END IF;RETURN receipt.result;END IF;
 IF j.status<>'submitted' THEN RAISE EXCEPTION 'Report is not awaiting posting';END IF;
 SELECT a.snapshot INTO snapshot FROM approved_reports1443 a WHERE a.journal_id=p_journal;
 IF NOT FOUND THEN RAISE EXCEPTION 'Approve the exact detailed report before summary posting';END IF;
 IF p_date IS NULL OR date_trunc('month',p_date)<>date_trunc('month',j.period_start) THEN RAISE EXCEPTION 'Posting date must be within the reporting month';END IF;
 IF EXISTS(SELECT 1 FROM accounting_periods WHERE period_month=date_trunc('month',p_date)::date AND status<>'open') THEN RAISE EXCEPTION 'Reporting period is closed';END IF;
 PERFORM 1 FROM staff_journal_lines WHERE staff_journal_id=p_journal FOR UPDATE;
 -- Compare immutable reviewed content, ignoring only links filled by previous postings.
 IF (SELECT jsonb_agg(to_jsonb(l)-'journal_entry_id' ORDER BY l.id) FROM staff_journal_lines l WHERE staff_journal_id=p_journal)
 IS DISTINCT FROM (SELECT jsonb_agg(x-'journal_entry_id' ORDER BY x->>'id') FROM jsonb_array_elements(snapshot->'journal'->'lines') x) THEN RAISE EXCEPTION 'Source changed after approval';END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)<2 THEN RAISE EXCEPTION 'No balanced summary supplied';END IF;
 -- Derive each account/currency/side and its exact source IDs on the server.
 WITH sides AS (
 SELECT l.id,l.currency_code,l.amount,l.account_id AS account_id,CASE WHEN l.direction='in' THEN 'credit' ELSE 'debit' END AS side FROM staff_journal_lines l WHERE l.staff_journal_id=p_journal AND l.entry_kind<>'collection' AND l.journal_entry_id IS NULL
 UNION ALL SELECT l.id,l.currency_code,l.amount,l.fund_account_id,CASE WHEN l.direction='in' THEN 'debit' ELSE 'credit' END FROM staff_journal_lines l WHERE l.staff_journal_id=p_journal AND l.entry_kind<>'collection' AND l.journal_entry_id IS NULL
 ), grouped AS (SELECT account_id,currency_code,side,sum(amount) amount,jsonb_agg(id::text ORDER BY id::text) ids FROM sides GROUP BY account_id,currency_code,side)
 SELECT jsonb_agg(jsonb_build_object('account',account_id,'currency',currency_code,'side',side,'amount',amount,'ids',ids) ORDER BY account_id,currency_code,side) INTO expected FROM grouped;
 SELECT jsonb_agg(jsonb_build_object('account',(x->>'account_id')::uuid,'currency',x->>'currency_code','side',CASE WHEN (x->>'debit')::numeric>0 THEN 'debit' ELSE 'credit' END,'amount',greatest((x->>'debit')::numeric,(x->>'credit')::numeric),'ids',(SELECT jsonb_agg(v ORDER BY v) FROM jsonb_array_elements_text(x->'source_ids') v)) ORDER BY (x->>'account_id')::uuid,x->>'currency_code',CASE WHEN (x->>'debit')::numeric>0 THEN 'debit' ELSE 'credit' END) INTO actual FROM jsonb_array_elements(p_lines) x;
 IF expected IS NULL OR expected IS DISTINCT FROM actual THEN RAISE EXCEPTION 'Summary accounts, amounts or source references do not match the approved report';END IF;
 SELECT * INTO posted FROM public.post_manual_worker14228(p_date,p_memo,p_lines,p_prefix,p_digits);
 owner_name=coalesce(snapshot->'user'->>'full_name',(SELECT full_name FROM profiles WHERE id=j.owner_id),'Former user');
 FOR item IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
 summary_line_no=summary_line_no+1;SELECT l.id INTO STRICT line_id FROM journal_lines l WHERE l.journal_entry_id=posted.entry_id AND l.line_no=summary_line_no;
 FOR src IN SELECT l.* FROM staff_journal_lines l WHERE l.id IN(SELECT value::uuid FROM jsonb_array_elements_text(item->'source_ids')) LOOP
 INSERT INTO journal_sources14253 VALUES(line_id,src.id,p_journal,src.workspace_entry_no,j.owner_id,owner_name,src.transaction_date,src.memo,src.reference,src.amount);
 END LOOP;END LOOP;
 UPDATE staff_journal_lines SET journal_entry_id=posted.entry_id WHERE staff_journal_id=p_journal AND entry_kind<>'collection' AND journal_entry_id IS NULL;
 UPDATE staff_journals SET status='posted',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() WHERE id=p_journal;
 answer=jsonb_build_object('entry_id',posted.entry_id,'entry_no',posted.entry_no,'report_id',p_journal);
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(auth.uid(),'summary:'||p_journal::text,'workspace-summary',payload,answer);
 INSERT INTO audit_log(table_name,record_id,action,new_data,reason,actor_id) VALUES('staff_journals',p_journal::text,'POST',answer,'Approved detailed report posted as account summary',auth.uid());
 RETURN answer;
END $$;
-- Keep historical profile identities after an Auth login is deleted. All transaction
-- foreign keys to profiles remain intact. Only the profile->Auth dependency is detached.
DO $$ DECLARE c record;BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND confrelid='auth.users'::regclass AND contype='f' LOOP
 EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I',c.conname);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.user_lifecycle14253(p_user uuid,p_action text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u profiles;c record;used boolean:=false;found_ref boolean;
BEGIN
 -- Serialize changes so two administrators cannot deactivate each other concurrently.
 PERFORM pg_advisory_xact_lock(14253,1);
 IF NOT public.is_admin() OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active' AND deleted_at14253 IS NULL) THEN RAISE EXCEPTION 'Active administrator required';END IF;
 IF p_user=auth.uid() THEN RAISE EXCEPTION 'You cannot deactivate or delete your own account';END IF;
 SELECT * INTO u FROM profiles WHERE id=p_user FOR UPDATE;
 IF NOT FOUND OR u.deleted_at14253 IS NOT NULL THEN RAISE EXCEPTION 'User no longer available';END IF;
 IF p_action NOT IN ('deactivate','reactivate','delete') THEN RAISE EXCEPTION 'Invalid user action';END IF;
 IF p_action<>'reactivate' AND u.role='admin' AND NOT EXISTS(SELECT 1 FROM profiles WHERE id<>p_user AND role='admin' AND status='active' AND deleted_at14253 IS NULL) THEN RAISE EXCEPTION 'Keep at least one active administrator';END IF;
 IF p_action='delete' THEN
 IF u.status='active' THEN RAISE EXCEPTION 'Deactivate the user before deleting their login';END IF;
 -- Detect retained activity through every public FK to the profile, not just one report table.
 FOR c IN SELECT n.nspname,t.relname,a.attname FROM pg_constraint k JOIN pg_class t ON t.oid=k.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.conkey[1] WHERE k.contype='f' AND k.confrelid='public.profiles'::regclass AND n.nspname='public' AND array_length(k.conkey,1)=1 AND t.relname NOT IN ('user_permissions','user_fund_assignments') LOOP
 EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I WHERE %I=$1)',c.nspname,c.relname,c.attname) INTO found_ref USING p_user;used=used OR found_ref;
 END LOOP;
 IF used AND (u.deactivated_at14253 IS NULL OR u.deactivated_at14253>now()-interval '5 years') THEN RAISE EXCEPTION 'Users with retained activity must be inactive for five years before login deletion';END IF;
 IF EXISTS(SELECT 1 FROM staff_journals WHERE owner_id=p_user AND status IN ('draft','returned','submitted')) THEN RAISE EXCEPTION 'Resolve outstanding reports before deleting this login';END IF;
 -- Refuse an unknown public Auth cascade rather than deleting financial data.
 FOR c IN SELECT n.nspname,t.relname,a.attname FROM pg_constraint k JOIN pg_class t ON t.oid=k.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.conkey[1] WHERE k.contype='f' AND k.confrelid='auth.users'::regclass AND n.nspname<>'auth' AND n.nspname NOT LIKE 'pg_%' LOOP
 EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I WHERE %I=$1)',c.nspname,c.relname,c.attname) INTO found_ref USING p_user;
 IF found_ref THEN RAISE EXCEPTION 'Another public record still references this login; preserve that link before deletion';END IF;
 END LOOP;
 UPDATE profiles SET deleted_at14253=now(),deleted_identity14253=jsonb_build_object('id',u.id,'full_name',u.full_name,'email',u.email),email='deleted+'||u.id::text||'@retired.invalid' WHERE id=p_user;
 DELETE FROM auth.users WHERE id=p_user;
 ELSIF p_action='deactivate' THEN
 UPDATE profiles SET status='inactive',deactivated_at14253=coalesce(deactivated_at14253,now()) WHERE id=p_user;
 UPDATE auth.users SET banned_until='infinity'::timestamptz WHERE id=p_user;
 DELETE FROM auth.sessions WHERE user_id=p_user;
 ELSE
 UPDATE profiles SET status='active',deactivated_at14253=NULL WHERE id=p_user;
 UPDATE auth.users SET banned_until=NULL WHERE id=p_user;
 END IF;
 INSERT INTO audit_log(table_name,record_id,action,new_data,reason,actor_id) VALUES('profiles',p_user::text,'UPDATE',jsonb_build_object('lifecycle',p_action),'User login lifecycle; historical identity retained',auth.uid());
 RETURN jsonb_build_object('user_id',p_user,'action',p_action,'saved',true);
END $$;
REVOKE ALL ON FUNCTION public.workflow_capabilities14253(),public.save_report_type14253(uuid,text,boolean),public.submit_report14253(uuid,uuid[]),public.post_summary14253(uuid,date,text,jsonb,text,integer),public.user_lifecycle14253(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.workflow_capabilities14253(),public.save_report_type14253(uuid,text,boolean),public.submit_report14253(uuid,uuid[]),public.post_summary14253(uuid,date,text,jsonb,text,integer),public.user_lifecycle14253(uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
