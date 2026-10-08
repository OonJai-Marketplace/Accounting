-- Run once in the Supabase SQL editor after INSTALL-DATA-TOOLS-v142.32.sql.
-- Adds voucher evidence; it never changes ledger amounts or existing rows.
BEGIN;
CREATE TABLE IF NOT EXISTS public.voucher_settings14299 (
 id integer PRIMARY KEY DEFAULT 1 CHECK (id=1), prefix text NOT NULL DEFAULT 'OJM' CHECK (prefix ~ '^[A-Z0-9]{1,8}$'),
 handwritten_code text NOT NULL DEFAULT 'H' CHECK (handwritten_code ~ '^[A-Z]$'),
 editor_code text NOT NULL DEFAULT 'E' CHECK (editor_code ~ '^[A-Z]$'),
 handwritten_label text NOT NULL DEFAULT 'Handwritten' CHECK (length(handwritten_label) BETWEEN 1 AND 60),
 editor_label text NOT NULL DEFAULT 'Edited and Printed' CHECK (length(editor_label) BETWEEN 1 AND 60),
 digits integer NOT NULL DEFAULT 4 CHECK (digits BETWEEN 4 AND 6),
 year_digits integer NOT NULL DEFAULT 2 CHECK (year_digits IN (2,4)),
 updated_at timestamptz NOT NULL DEFAULT now(), CHECK (handwritten_code<>editor_code)
);
INSERT INTO public.voucher_settings14299(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.voucher_sequences14299 (
 year_no integer NOT NULL CHECK(year_no BETWEEN 2000 AND 2199), kind text NOT NULL CHECK(kind IN ('H','E')),
 next_no integer NOT NULL DEFAULT 1 CHECK(next_no>0), PRIMARY KEY(year_no,kind)
);
CREATE TABLE IF NOT EXISTS public.vouchers14299 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_key uuid NOT NULL UNIQUE, batch_key uuid NOT NULL,
 request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 number text NOT NULL UNIQUE, journal_number text UNIQUE, year_no integer NOT NULL, ordinal integer NOT NULL,
 kind text NOT NULL CHECK(kind IN ('H','E')), status text NOT NULL CHECK(status IN ('reserved','issued','linked','void')),
 voucher_date date NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(data)='object'),
 journal_entry_id uuid UNIQUE REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
 version integer NOT NULL DEFAULT 1, created_by uuid REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(year_no,kind,ordinal)
);
CREATE TABLE IF NOT EXISTS public.voucher_versions14299 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), voucher_id uuid NOT NULL REFERENCES public.vouchers14299(id) ON DELETE RESTRICT,
 version integer NOT NULL, data jsonb NOT NULL, reason text NOT NULL,
 changed_by uuid REFERENCES auth.users(id), changed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(voucher_id,version)
);
CREATE INDEX IF NOT EXISTS voucher_date14299 ON public.vouchers14299(voucher_date);
CREATE INDEX IF NOT EXISTS voucher_batch14299 ON public.vouchers14299(batch_key);
CREATE INDEX IF NOT EXISTS voucher_versions_fk14299 ON public.voucher_versions14299(voucher_id);
ALTER TABLE public.voucher_settings14299 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_sequences14299 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers14299 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_versions14299 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.voucher_settings14299,public.voucher_sequences14299,public.vouchers14299,public.voucher_versions14299 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.voucher_settings14299,public.voucher_sequences14299,public.vouchers14299,public.voucher_versions14299 TO authenticated;
CREATE OR REPLACE FUNCTION public.voucher_admin14299() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') AND public.accounting_workspace_allowed123()
$$;
REVOKE ALL ON FUNCTION public.voucher_admin14299() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.voucher_admin14299() TO authenticated;
DROP POLICY IF EXISTS voucher_settings_read14299 ON public.voucher_settings14299;
CREATE POLICY voucher_settings_read14299 ON public.voucher_settings14299 FOR SELECT TO authenticated USING(public.voucher_admin14299());
DROP POLICY IF EXISTS voucher_sequences_read14299 ON public.voucher_sequences14299;
CREATE POLICY voucher_sequences_read14299 ON public.voucher_sequences14299 FOR SELECT TO authenticated USING(public.voucher_admin14299());
DROP POLICY IF EXISTS vouchers_read14299 ON public.vouchers14299;
CREATE POLICY vouchers_read14299 ON public.vouchers14299 FOR SELECT TO authenticated USING(public.voucher_admin14299());
DROP POLICY IF EXISTS voucher_versions_read14299 ON public.voucher_versions14299;
CREATE POLICY voucher_versions_read14299 ON public.voucher_versions14299 FOR SELECT TO authenticated USING(public.voucher_admin14299());
CREATE OR REPLACE FUNCTION public.voucher_config14299(p_prefix text,p_handwritten_code text,p_editor_code text,p_handwritten_label text,p_editor_label text,p_digits integer,p_year_digits integer DEFAULT 2)
RETURNS public.voucher_settings14299 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE result public.voucher_settings14299;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required'; END IF;
 UPDATE public.voucher_settings14299 SET prefix=upper(trim(p_prefix)),handwritten_code=upper(trim(p_handwritten_code)),editor_code=upper(trim(p_editor_code)),handwritten_label=trim(p_handwritten_label),editor_label=trim(p_editor_label),digits=p_digits,year_digits=p_year_digits,updated_at=now() WHERE id=1 RETURNING * INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.voucher_issue14299(p_kind text,p_count integer,p_date date,p_data jsonb,p_request_key uuid)
RETURNS SETOF public.vouchers14299 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE setting public.voucher_settings14299; n integer; first_no integer; yr integer; code text; item public.vouchers14299;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required'; END IF;
 IF p_kind IS NULL OR p_kind NOT IN ('H','E') OR p_count IS NULL OR p_count NOT BETWEEN 1 AND 50 OR p_date IS NULL OR p_request_key IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid voucher request';END IF;
 IF p_kind='E' AND (p_count<>1 OR length(coalesce(p_data->>'tentative_number',''))<8 OR length(coalesce(p_data->>'html',''))<30) THEN RAISE EXCEPTION 'Editor voucher content and tentative number required';END IF;
 IF p_kind='E' AND (coalesce(p_data->>'total','') !~ '^[0-9]+([.][0-9]{1,2})?$' OR coalesce(p_data->>'currency','') NOT IN ('LAK','USD','THB')) THEN RAISE EXCEPTION 'Valid voucher amount and currency required';END IF;
 -- A retried request yields its original result and never consumes another ID.
 IF EXISTS(SELECT 1 FROM public.vouchers14299 WHERE batch_key=p_request_key) THEN
   IF EXISTS(SELECT 1 FROM public.vouchers14299 WHERE batch_key=p_request_key AND request_payload IS DISTINCT FROM jsonb_build_object('kind',p_kind,'count',p_count,'date',p_date,'data',p_data)) THEN RAISE EXCEPTION 'Voucher request reference already used for different data';END IF;
   RETURN QUERY SELECT * FROM public.vouchers14299 WHERE batch_key=p_request_key ORDER BY ordinal; RETURN;
 END IF;
 SELECT * INTO setting FROM public.voucher_settings14299 WHERE id=1 FOR SHARE;
 yr=extract(year FROM p_date)::integer;
 INSERT INTO public.voucher_sequences14299(year_no,kind,next_no) VALUES(yr,p_kind,1) ON CONFLICT DO NOTHING;
 SELECT next_no INTO first_no FROM public.voucher_sequences14299 WHERE year_no=yr AND kind=p_kind FOR UPDATE;
 -- Recheck after the sequence lock for concurrent retries.
 IF EXISTS(SELECT 1 FROM public.vouchers14299 WHERE batch_key=p_request_key) THEN
   IF EXISTS(SELECT 1 FROM public.vouchers14299 WHERE batch_key=p_request_key AND request_payload IS DISTINCT FROM jsonb_build_object('kind',p_kind,'count',p_count,'date',p_date,'data',p_data)) THEN RAISE EXCEPTION 'Voucher request reference already used for different data';END IF;
   RETURN QUERY SELECT * FROM public.vouchers14299 WHERE batch_key=p_request_key ORDER BY ordinal; RETURN;
 END IF;
 IF first_no+p_count-1>power(10,setting.digits)-1 THEN RAISE EXCEPTION 'Voucher number sequence exhausted';END IF;
 UPDATE public.voucher_sequences14299 SET next_no=next_no+p_count WHERE year_no=yr AND kind=p_kind;
 code=CASE WHEN p_kind='H' THEN setting.handwritten_code ELSE setting.editor_code END;
 FOR n IN 0..p_count-1 LOOP
   INSERT INTO public.vouchers14299(request_key,batch_key,request_payload,number,year_no,ordinal,kind,status,voucher_date,data,created_by)
   VALUES(CASE WHEN n=0 THEN p_request_key ELSE gen_random_uuid() END,p_request_key,jsonb_build_object('kind',p_kind,'count',p_count,'date',p_date,'data',p_data),
     setting.prefix||'-'||right(yr::text,setting.year_digits)||'-'||code||'-'||lpad((first_no+n)::text,setting.digits,'0'),yr,first_no+n,p_kind,
     CASE WHEN p_kind='H' THEN 'reserved' ELSE 'issued' END,p_date,
     (CASE WHEN p_kind='E' THEN jsonb_set(p_data,'{html}',to_jsonb(replace(p_data->>'html',coalesce(p_data->>'tentative_number',''),setting.prefix||'-'||right(yr::text,setting.year_digits)||'-'||code||'-'||lpad((first_no+n)::text,setting.digits,'0'))),true)-'tentative_number' ELSE p_data END)||jsonb_build_object('date',p_date,'id_format',jsonb_build_object('prefix',setting.prefix,'code',code,'digits',setting.digits,'year_digits',setting.year_digits,'label',CASE WHEN p_kind='H' THEN setting.handwritten_label ELSE setting.editor_label END)),
     auth.uid()) RETURNING * INTO item;
   INSERT INTO public.voucher_versions14299(voucher_id,version,data,reason,changed_by) VALUES(item.id,1,item.data,'Issued',auth.uid());
   RETURN NEXT item;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.voucher_update14299(p_id uuid,p_version integer,p_date date,p_data jsonb,p_reason text)
RETURNS public.vouchers14299 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE item public.vouchers14299;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required';END IF;
 IF length(trim(coalesce(p_reason,'')))<4 OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Explain the correction and provide voucher data';END IF;
 SELECT * INTO item FROM public.vouchers14299 WHERE id=p_id FOR UPDATE;
 IF item.id IS NULL OR item.version<>p_version OR item.kind<>'E' OR item.status NOT IN ('issued','linked') THEN RAISE EXCEPTION 'Voucher changed or cannot be edited; refresh the register';END IF;
 IF p_date IS NULL THEN RAISE EXCEPTION 'Voucher date is required';END IF;
 IF coalesce(p_data->>'total','') !~ '^[0-9]+([.][0-9]{1,2})?$' OR coalesce(p_data->>'currency','') NOT IN ('LAK','USD','THB') THEN RAISE EXCEPTION 'Valid voucher amount and currency required';END IF;
 IF item.journal_entry_id IS NOT NULL AND ((p_data->>'total') IS DISTINCT FROM (item.data->>'total') OR (p_data->>'currency') IS DISTINCT FROM (item.data->>'currency')) THEN RAISE EXCEPTION 'Linked voucher amount and currency must agree with the journal';END IF;
 UPDATE public.vouchers14299 SET data=(p_data-'journal'-'id_format')||jsonb_build_object('journal',item.data->'journal','date',p_date,'id_format',item.data->'id_format'),voucher_date=p_date,version=version+1,updated_at=now()
 WHERE id=p_id AND version=p_version AND kind='E' AND status IN ('issued','linked') RETURNING * INTO item;
 IF NOT FOUND THEN RAISE EXCEPTION 'Voucher changed or cannot be edited; refresh the register';END IF;
 INSERT INTO public.voucher_versions14299(voucher_id,version,data,reason,changed_by) VALUES(item.id,item.version,item.data,p_reason,auth.uid());
 RETURN item;
END $$;
CREATE OR REPLACE FUNCTION public.voucher_link14299(p_id uuid,p_entry_id uuid)
RETURNS public.vouchers14299 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE item public.vouchers14299; entry public.journal_entries; snapshot jsonb; lines jsonb; journal_total numeric; setting public.voucher_settings14299; entry_ordinal text; linked_number text;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required';END IF;
 SELECT * INTO item FROM public.vouchers14299 WHERE id=p_id FOR UPDATE;
 SELECT * INTO entry FROM public.journal_entries WHERE id=p_entry_id AND status='posted' FOR SHARE;
 IF item.id IS NULL OR entry.id IS NULL OR item.status='void' THEN RAISE EXCEPTION 'Choose an available voucher and posted journal entry';END IF;
 IF item.journal_entry_id=p_entry_id THEN RETURN item;END IF;
 IF item.journal_entry_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.vouchers14299 WHERE journal_entry_id=p_entry_id) THEN RAISE EXCEPTION 'Voucher or journal entry is already linked';END IF;
 IF item.kind='E' AND item.data ? 'total' THEN
   SELECT coalesce(sum(l.debit),0) INTO journal_total FROM public.journal_lines l WHERE l.journal_entry_id=p_entry_id AND l.currency_code=item.data->>'currency';
   IF EXISTS(SELECT 1 FROM public.journal_lines l WHERE l.journal_entry_id=p_entry_id AND l.debit>0 AND l.currency_code IS DISTINCT FROM item.data->>'currency')
      OR journal_total IS DISTINCT FROM (item.data->>'total')::numeric THEN
      RAISE EXCEPTION 'Voucher total/currency differs from the posted journal. Correct the voucher or choose a matching entry';
   END IF;
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('account_id',l.account_id,'account',a.name,'code',a.code,'description',coalesce(nullif(l.description,''),entry.memo),'debit',l.debit,'credit',l.credit,'currency',l.currency_code) ORDER BY l.id::text),'[]'::jsonb) INTO lines
 FROM public.journal_lines l LEFT JOIN public.accounts a ON a.id=l.account_id WHERE l.journal_entry_id=p_entry_id;
 SELECT * INTO setting FROM public.voucher_settings14299 WHERE id=1 FOR SHARE;
 entry_ordinal=substring(entry.entry_no FROM '([0-9]+)$');
 IF entry_ordinal IS NULL THEN RAISE EXCEPTION 'Journal Entry ID needs a numeric suffix';END IF;
 entry_ordinal=(entry_ordinal::bigint)::text;
 linked_number=coalesce(item.data->'id_format'->>'prefix',setting.prefix)||'-'||right(extract(year FROM entry.transaction_date)::integer::text,coalesce((item.data->'id_format'->>'year_digits')::integer,setting.year_digits))||'-'||coalesce(item.data->'id_format'->>'code',CASE WHEN item.kind='H' THEN setting.handwritten_code ELSE setting.editor_code END)||'-'||lpad(entry_ordinal,greatest(coalesce((item.data->'id_format'->>'digits')::integer,setting.digits),length(entry_ordinal)),'0');
 snapshot=jsonb_build_object('entry_id',entry.id,'entry_no',entry.entry_no,'date',entry.transaction_date,'memo',entry.memo,'lines',lines);
 UPDATE public.vouchers14299 SET journal_entry_id=p_entry_id,journal_number=linked_number,status='linked',data=item.data||jsonb_build_object('journal',snapshot),version=version+1,updated_at=now() WHERE id=p_id RETURNING * INTO item;
 INSERT INTO public.voucher_versions14299(voucher_id,version,data,reason,changed_by) VALUES(item.id,item.version,item.data,'Linked to journal '||entry.entry_no,auth.uid());
 RETURN item;
END $$;
CREATE OR REPLACE FUNCTION public.voucher_void14299(p_id uuid,p_version integer,p_reason text)
RETURNS public.vouchers14299 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE item public.vouchers14299;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required';END IF;
 IF length(trim(coalesce(p_reason,'')))<4 THEN RAISE EXCEPTION 'Explain why the voucher is unused';END IF;
 SELECT * INTO item FROM public.vouchers14299 WHERE id=p_id FOR UPDATE;
 IF item.id IS NULL OR item.version<>p_version OR item.status='void' OR item.journal_entry_id IS NOT NULL THEN RAISE EXCEPTION 'Only an unchanged, unlinked voucher can be marked unused';END IF;
 UPDATE public.vouchers14299 SET status='void',version=version+1,updated_at=now() WHERE id=p_id RETURNING * INTO item;
 INSERT INTO public.voucher_versions14299(voucher_id,version,data,reason,changed_by) VALUES(item.id,item.version,item.data,'Unused: '||trim(p_reason),auth.uid());
 RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.voucher_void14299(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.voucher_void14299(uuid,integer,text) TO authenticated;
REVOKE ALL ON FUNCTION public.voucher_config14299(text,text,text,text,text,integer,integer),public.voucher_issue14299(text,integer,date,jsonb,uuid),public.voucher_update14299(uuid,integer,date,jsonb,text),public.voucher_link14299(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.voucher_config14299(text,text,text,text,text,integer,integer),public.voucher_issue14299(text,integer,date,jsonb,uuid),public.voucher_update14299(uuid,integer,date,jsonb,text),public.voucher_link14299(uuid,uuid) TO authenticated;

-- The journal reset includes its vouchers and immutable version history. Sequence state is retained.
CREATE OR REPLACE FUNCTION public.reset_scope_catalog14232() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT jsonb_set('[{"id":"journal","group":"Transactions","label":"Journal and transaction history","tables":["journal_entries","journal_lines","vouchers14299","voucher_versions14299"]},{"id":"periods","group":"Transactions","label":"Period closing and review","tables":["accounting_periods","period_findings","year_closings136","book_sessions136","audit_reviews136","correction_sessions136"]},{"id":"submissions","group":"Transactions","label":"Entry submissions","tables":["entry_submissions"]},{"id":"scheduled","group":"Transactions","label":"Scheduled transactions","tables":["scheduled_journals","scheduled_journal_lines","scheduled_journal_occurrences","recurring_transactions"]},{"id":"reminders","group":"Transactions","label":"Upcoming reminders","tables":["recurring_reminders","upcoming_reminders14229"]},{"id":"todos","group":"Transactions","label":"To-do lists","tables":["workspace_todos136","todo_completions1443"]},{"id":"staff","group":"Sub-users","label":"Entries, reports and review routing","tables":["staff_journals","staff_journal_lines","approved_reports1443","review_routes14229","report_review_steps14229"]},{"id":"funds","group":"Sub-users","label":"Fund adjustments and activity","tables":["fund_adjustment_requests","fund_adjustment_lines","workspace_notifications"]},{"id":"payroll","group":"Payroll","label":"Payroll runs and lines","tables":["payroll_runs","payroll_lines"]},{"id":"hr","group":"Human Resources","label":"Employees and leave records","tables":["payroll_employees","payroll_leave_records","employees","legal_documents"]},{"id":"tax","group":"Tax & SSO","label":"Tax and SSO records","tables":["tax_sso_records"]},{"id":"reports","group":"Reports & Documents","label":"Saved operational reports","tables":["operational_reports"]},{"id":"documents","group":"Reports & Documents","label":"Saved documents","tables":["company_documents105"]},{"id":"audit","group":"Auditing","label":"Audit log","tables":["audit_log"]},{"id":"deleted","group":"Auditing","label":"Deleted-record history","tables":["record_deletions108"]}]'::jsonb,'{0,label}','"Journal, vouchers and transaction history"'::jsonb)
$$;
CREATE OR REPLACE FUNCTION public.audit_snapshot14232() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE names text[]; name text; items jsonb; data jsonb='{}';BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Active accounting administrator required';END IF;
 SELECT array_agg(DISTINCT t ORDER BY t) INTO names FROM (
  SELECT jsonb_array_elements_text(s->'tables') t FROM jsonb_array_elements(public.reset_scope_catalog14232()) s
  UNION SELECT unnest(ARRAY['accounts','sub_accounts','currencies','profiles','user_permissions','user_fund_assignments','business_settings','accounting_id_settings','print_settings','presentation_settings113','voucher_settings14299','voucher_sequences14299','entry_prefix_reservations','staff_entry_sequences'])
 ) x WHERE to_regclass(format('public.%I',t)) IS NOT NULL;
 FOREACH name IN ARRAY names LOOP EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) FROM public.%I r',name) INTO items;data=data||jsonb_build_object(name,items);END LOOP;
 RETURN jsonb_build_object('format','oonjai-data-113','tables',data,'storage','[]'::jsonb,'auditTrail','{}'::jsonb,'purpose14232','audit_working_copy','copiedAt14232',statement_timestamp());
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
