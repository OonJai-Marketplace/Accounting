-- Existing installations only. Fixes setup routine syntax; preserves all records.
BEGIN;
CREATE OR REPLACE FUNCTION public.save_installation14320(p_request_key uuid, p_expected_version integer, p_expected_budget_version integer, p_mode text, p_company jsonb, p_accounts jsonb, p_deployment jsonb, p_incoming uuid, p_checks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE s installation14320;b budget_settings14313;payload jsonb;receipt handover_history14320;r jsonb;k text;v text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND status='active')
 OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required' USING ERRCODE='42501';END IF;
 IF p_request_key IS NULL THEN RAISE EXCEPTION 'A save reference is required';END IF;
 IF jsonb_typeof(p_company) IS DISTINCT FROM 'object' OR jsonb_typeof(p_accounts) IS DISTINCT FROM 'object' OR jsonb_typeof(p_deployment) IS DISTINCT FROM 'object' OR jsonb_typeof(p_checks) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid settings';END IF;
 -- Whitelist fields before even the retry/audit payload is persisted.
 p_company=jsonb_build_object('name',p_company->>'name','email',p_company->>'email');
 p_accounts=jsonb_build_object('emailSender',p_accounts->>'emailSender','emails',p_accounts->>'emails','trialEmailTo',p_accounts->>'trialEmailTo','chatgptAccountEmail',p_accounts->>'chatgptAccountEmail','gmailClientId',p_accounts->>'gmailClientId');
 p_deployment=jsonb_build_object('siteUrl',p_deployment->>'siteUrl','repository',p_deployment->>'repository','branch',p_deployment->>'branch','accounting',p_deployment->>'accounting','publicRestaurant',p_deployment->>'publicRestaurant','restaurant',p_deployment->>'restaurant');
 p_checks=jsonb_build_object('github',p_checks->'github','supabase',p_checks->'supabase','recovery',p_checks->'recovery','login',p_checks->'login','gmail',p_checks->'gmail','chatgpt',p_checks->'chatgpt');
 payload=jsonb_build_object('version',p_expected_version,'budgetVersion',p_expected_budget_version,'mode',p_mode,'company',p_company,'accounts',p_accounts,'deployment',p_deployment,'incoming',p_incoming,'checks',p_checks);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_key::text,0));
 SELECT * INTO receipt FROM handover_history14320 WHERE request_key=p_request_key;
 IF FOUND THEN IF receipt.actor_id<>auth.uid() OR receipt.payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Save reference already used';END IF;RETURN receipt.result;END IF;
 SELECT * INTO s FROM installation14320 WHERE id FOR UPDATE;
 SELECT * INTO b FROM budget_settings14313 WHERE id FOR UPDATE;
 IF s.id IS NULL OR s.version IS DISTINCT FROM p_expected_version OR coalesce(b.version,0) IS DISTINCT FROM p_expected_budget_version THEN RAISE EXCEPTION 'Company settings changed elsewhere. Reopen before saving';END IF;
 IF p_mode NOT IN ('install','settings','handover') OR p_mode IS NULL THEN RAISE EXCEPTION 'Choose a valid operation';END IF;
 IF (p_mode='install')=s.initialized THEN RAISE EXCEPTION 'Installation state changed. Reopen setup';END IF;
 IF jsonb_typeof(p_company) IS DISTINCT FROM 'object' OR jsonb_typeof(p_accounts) IS DISTINCT FROM 'object' OR jsonb_typeof(p_deployment) IS DISTINCT FROM 'object' OR jsonb_typeof(p_checks) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid settings';END IF;
 IF length(btrim(coalesce(p_company->>'name','')))<1 OR length(p_company->>'name')>160 THEN RAISE EXCEPTION 'Enter the company name';END IF;
 FOREACH k IN ARRAY ARRAY['emailSender','chatgptAccountEmail','trialEmailTo','companyEmail'] LOOP
  v=coalesce(CASE WHEN k='companyEmail' THEN p_company->>'email' ELSE p_accounts->>k END,'');
  IF length(v)>254 OR (v<>'' AND v!~ '^[^[:space:]@,;]+@[^[:space:]@,;]+\.[^[:space:]@,;]+$') THEN RAISE EXCEPTION 'Enter a valid email address: %',k;END IF;
 END LOOP;
 IF length(coalesce(p_accounts->>'emails',''))>4000 THEN RAISE EXCEPTION 'Recipient list is too long';END IF;
 FOR v IN SELECT btrim(value) FROM regexp_split_to_table(coalesce(p_accounts->>'emails',''),'[,;]') value LOOP
  IF v<>'' AND v!~ '^[^[:space:]@,;]+@[^[:space:]@,;]+\.[^[:space:]@,;]+$' THEN RAISE EXCEPTION 'Enter valid recipient addresses';END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['siteUrl','accounting','publicRestaurant','restaurant'] LOOP
  v=coalesce(p_deployment->>k,'');
  IF (k IN ('siteUrl','accounting') AND v='') OR (v<>'' AND (length(v)>2048 OR v!~ '^https?://[^/[:space:]@]+([/?#][^[:space:]]*)?$')) THEN RAISE EXCEPTION 'Enter a published HTTP or HTTPS URL: %',k;END IF;
 END LOOP;
 IF coalesce(p_deployment->>'repository','')!~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' OR coalesce(p_deployment->>'branch','')!~ '^[A-Za-z0-9_./-]+$' THEN RAISE EXCEPTION 'Enter repository owner/name and branch';END IF;
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_incoming AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Choose an active administrator';END IF;
 IF p_mode='handover' AND p_incoming=auth.uid() THEN RAISE EXCEPTION 'Choose the incoming administrator';END IF;
 IF p_mode IN ('install','handover') THEN
  FOREACH k IN ARRAY ARRAY['github','supabase','recovery','login'] LOOP
   IF p_checks->k IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Complete the service check: %',k;END IF;
  END LOOP;
  IF coalesce(p_accounts->>'emailSender','')<>'' AND p_checks->'gmail' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Confirm Gmail authorization';END IF;
  IF coalesce(p_accounts->>'chatgptAccountEmail','')<>'' AND p_checks->'chatgpt' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Confirm the ChatGPT task handover';END IF;
 END IF;
 -- Preserve unrelated company fields and every budget category/template preference.
 INSERT INTO business_settings(id,legal_name,display_name,email,updated_at,updated_by)
 VALUES(true,btrim(p_company->>'name'),btrim(p_company->>'name'),coalesce(p_company->>'email',''),now(),auth.uid())
 ON CONFLICT(id) DO UPDATE SET legal_name=excluded.legal_name,display_name=excluded.display_name,email=excluded.email,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
 INSERT INTO budget_settings14313(id,data,version,updated_at,updated_by)
 VALUES(true,coalesce(b.data,'{}')||jsonb_build_object('emailSender',p_accounts->>'emailSender','emails',p_accounts->>'emails','trialEmailTo',p_accounts->>'trialEmailTo','chatgptAccountEmail',p_accounts->>'chatgptAccountEmail','gmailClientId',p_accounts->>'gmailClientId'),coalesce(b.version,0)+1,now(),auth.uid())
 ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=excluded.version,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
 UPDATE installation14320 SET initialized=true,version=version+1,
 deployment=jsonb_build_object('siteUrl',p_deployment->>'siteUrl','repository',p_deployment->>'repository','branch',p_deployment->>'branch','accounting',p_deployment->>'accounting','publicRestaurant',p_deployment->>'publicRestaurant','restaurant',p_deployment->>'restaurant'),
 incoming_admin=p_incoming,checks=p_checks,updated_at=now(),updated_by=auth.uid() WHERE id;
 r=public.installation_status14320();
 INSERT INTO handover_history14320 VALUES(p_request_key,auth.uid(),payload,r,now());RETURN r;
END $function$
;
GRANT SELECT ON public.profiles TO service_role;
COMMIT;

-- Install once. Creates owner-only tools; this file never deletes business records.
-- Fresh installation already includes this file. Existing sites may run it independently.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.maintenance_backups14322(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),scope text NOT NULL,
 date_from date NOT NULL,date_to date NOT NULL,payload jsonb NOT NULL,
 fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 removed_at timestamptz,executed_by text, CHECK(date_from<=date_to)
);
CREATE TABLE IF NOT EXISTS private.removed_journal_requests14322(
 actor_id uuid NOT NULL,request_key text NOT NULL,backup_id uuid NOT NULL REFERENCES private.maintenance_backups14322(id),
 PRIMARY KEY(actor_id,request_key)
);
REVOKE ALL ON private.maintenance_backups14322,private.removed_journal_requests14322 FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.count_tables14322()
RETURNS TABLE(table_name text,record_count bigint,storage_bytes bigint)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE r record;BEGIN
 FOR r IN SELECT n.nspname,c.relname,c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname LOOP
  table_name:=r.nspname||'.'||r.relname;
  EXECUTE format('SELECT count(*) FROM %I.%I',r.nspname,r.relname) INTO record_count;
  storage_bytes:=pg_total_relation_size(r.oid); RETURN NEXT;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION private.maintenance_snapshot14322(p_scope text,p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE ids uuid[];pack jsonb;BEGIN
 IF p_from IS NULL OR p_to IS NULL OR p_from>p_to OR p_to-p_from>3660 THEN
  RAISE EXCEPTION 'Provide a start date and end date, in that order, spanning at most ten years';END IF;
 IF p_scope='journals' THEN
  SELECT coalesce(array_agg(id ORDER BY id),'{}') INTO ids FROM public.journal_entries WHERE transaction_date BETWEEN p_from AND p_to;
  SELECT jsonb_build_object(
   'journal_entries',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY id),'[]') FROM public.journal_entries e WHERE id=ANY(ids)),
   'journal_lines',(SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY id),'[]') FROM public.journal_lines l WHERE journal_entry_id=ANY(ids)),
   'operation_receipts14228',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY actor_id,request_key),'[]') FROM public.operation_receipts14228 r WHERE operation='journal' AND EXISTS(
     SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(r.result)='array' THEN r.result ELSE '[]' END) x WHERE x->>'entry_id'=ANY(ids::text[])))
  ) INTO pack;
 ELSIF p_scope='draft-transactions' THEN
  SELECT coalesce(array_agg(id ORDER BY id),'{}') INTO ids FROM public.staff_journal_lines WHERE transaction_date BETWEEN p_from AND p_to;
  SELECT jsonb_build_object('staff_journal_lines',coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.id),'[]')) INTO pack FROM public.staff_journal_lines l WHERE l.id=ANY(ids);
 ELSE RAISE EXCEPTION 'Choose journals or draft-transactions';END IF;
 RETURN pack;
END $$;

CREATE OR REPLACE FUNCTION private.preview_removal14322(p_scope text,p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE pack jsonb:=private.maintenance_snapshot14322(p_scope,p_from,p_to);
 ids uuid[];reasons jsonb:='[]';r record;n bigint;target regclass;
BEGIN
 IF p_scope='journals' THEN
  SELECT coalesce(array_agg((x->>'id')::uuid),'{}') INTO ids FROM jsonb_array_elements(pack->'journal_entries') x;
  target:='public.journal_entries'::regclass;
  IF EXISTS(SELECT 1 FROM public.journal_entries WHERE id=ANY(ids) AND (source<>'manual' OR correction_status NOT IN ('normal','voided'))) THEN
   reasons:=reasons||jsonb_build_array('Only independent manual journals can be removed here. Use the app workflow for system, staff, payroll or correction entries.');END IF;
  IF EXISTS(SELECT 1 FROM public.journal_lines WHERE journal_entry_id=ANY(ids) AND coalesce(line_date,(SELECT transaction_date FROM public.journal_entries WHERE id=journal_entry_id)) NOT BETWEEN p_from AND p_to) THEN
   reasons:=reasons||jsonb_build_array('A journal has line dates outside the selected range. Whole journals must stay together.');END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_periods p JOIN public.journal_entries e ON date_trunc('month',e.transaction_date)::date=p.period_month WHERE e.id=ANY(ids) AND p.status IN ('closed','locked'))
   OR EXISTS(SELECT 1 FROM public.year_closings136 y JOIN public.journal_entries e ON extract(year FROM e.transaction_date)::integer=y.year WHERE e.id=ANY(ids)) THEN
   reasons:=reasons||jsonb_build_array('Closed periods and year-closing balances cannot be purged by this template.');END IF;
  IF cardinality(ids)>0 AND EXISTS(SELECT 1 FROM public.journal_entries WHERE transaction_date>p_to AND status='posted') THEN
   reasons:=reasons||jsonb_build_array('Later posted journals remain. A verified carry-forward installation is required before removing their earlier balance history.');END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(pack->'operation_receipts14228') receipt CROSS JOIN LATERAL jsonb_array_elements(receipt->'result') x WHERE NOT (x->>'entry_id'=ANY(ids::text[]))) THEN
   reasons:=reasons||jsonb_build_array('A posting batch contains journals outside this range. Expand the dates to include the whole batch.');END IF;
 ELSE
  SELECT coalesce(array_agg((x->>'id')::uuid),'{}') INTO ids FROM jsonb_array_elements(pack->'staff_journal_lines') x;
  target:='public.staff_journal_lines'::regclass;
  IF EXISTS(SELECT 1 FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id WHERE l.id=ANY(ids) AND (j.status NOT IN ('draft','returned') OR l.journal_entry_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.approved_reports1443 WHERE journal_id=j.id))) THEN
   reasons:=reasons||jsonb_build_array('Only unposted transactions in draft or returned, unapproved staff reports can be removed here.');END IF;
  IF EXISTS(SELECT 1 FROM public.staff_journal_lines a JOIN public.staff_journal_lines b ON b.staff_journal_id=a.staff_journal_id AND b.editor_group1437=a.editor_group1437 WHERE a.id=ANY(ids) AND NOT b.id=ANY(ids)) THEN
   reasons:=reasons||jsonb_build_array('A transaction editor group extends outside the dates. Expand the range to keep the group together.');END IF;
 END IF;
 -- Detect incoming relationships, including ON DELETE CASCADE links: do not silently delete their parents or reports.
 FOR r IN SELECT c.conname,n.nspname,t.relname,a.attname,cardinality(c.conkey) AS columns
 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
 JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=c.conkey[1]
 WHERE c.contype='f' AND c.confrelid=target AND NOT (p_scope='journals' AND c.conrelid='public.journal_lines'::regclass)
 LOOP
  IF r.columns<>1 AND cardinality(ids)>0 THEN reasons:=reasons||jsonb_build_array('Composite relationship requires review: '||r.conname);CONTINUE;END IF;
  EXECUTE format('SELECT count(*) FROM %I.%I WHERE %I=ANY($1)',r.nspname,r.relname,r.attname) INTO n USING ids;
  IF n>0 THEN reasons:=reasons||jsonb_build_array(format('%s linked records in %s.%s (%s)',n,r.nspname,r.relname,r.conname));END IF;
 END LOOP;
 RETURN jsonb_build_object('scope',p_scope,'from',p_from,'to',p_to,'records',cardinality(ids),'counts',
  (SELECT jsonb_object_agg(key,jsonb_array_length(value)) FROM jsonb_each(pack)),
  'fingerprint',encode(extensions.digest(pack::text,'sha256'),'hex'),'blockers',reasons,'canRemove',jsonb_array_length(reasons)=0 AND cardinality(ids)>0);
END $$;

CREATE OR REPLACE FUNCTION private.export_removal_backup14322(p_scope text,p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE pack jsonb:=private.maintenance_snapshot14322(p_scope,p_from,p_to);b private.maintenance_backups14322;BEGIN
 INSERT INTO private.maintenance_backups14322(scope,date_from,date_to,payload,fingerprint)
 VALUES(p_scope,p_from,p_to,pack,encode(extensions.digest(pack::text,'sha256'),'hex')) RETURNING * INTO b;
 RETURN jsonb_build_object('format','oonjai-maintenance14322','backupId',b.id,'createdAt',b.created_at,'scope',p_scope,'from',p_from,'to',p_to,'fingerprint',b.fingerprint,'tables',pack,
 'includes','Selected rows only. Keep the full application archive plus Auth and Storage backups separately.');
END $$;

CREATE OR REPLACE FUNCTION private.remove_backed_up_records14322(p_scope text,p_from date,p_to date,p_confirmation text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE b private.maintenance_backups14322;preview jsonb;pack jsonb;ids uuid[];g record;r record;guards jsonb:='[]';removed integer;
BEGIN
 IF p_confirmation IS DISTINCT FROM 'I_SAVED_THE_BACKUP' THEN RAISE EXCEPTION 'Save the exported backup file first, then replace NOT_CONFIRMED with I_SAVED_THE_BACKUP';END IF;
 -- Freeze application writes for this short maintenance transaction. Deterministic lock order.
 FOR r IN SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY 1,2 LOOP
  EXECUTE format('LOCK TABLE %I.%I IN SHARE ROW EXCLUSIVE MODE',r.nspname,r.relname);
 END LOOP;
 SELECT * INTO b FROM private.maintenance_backups14322 WHERE scope=p_scope AND date_from=p_from AND date_to=p_to AND removed_at IS NULL ORDER BY created_at DESC,id LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Export and save a matching date-range backup first';END IF;
 preview:=private.preview_removal14322(p_scope,p_from,p_to);
 IF NOT (preview->>'canRemove')::boolean THEN RAISE EXCEPTION 'Removal blocked: %',preview->'blockers';END IF;
 IF preview->>'fingerprint' IS DISTINCT FROM b.fingerprint THEN RAISE EXCEPTION 'Records changed after export. Export and save a new backup, then retry';END IF;
 pack:=b.payload;
 SELECT coalesce(array_agg((x->>'id')::uuid),'{}') INTO ids FROM jsonb_array_elements(pack->CASE WHEN p_scope='journals' THEN 'journal_entries' ELSE 'staff_journal_lines' END) x;
 -- SQL Editor has no application JWT. Suspend only application triggers on the selected tables.
 -- Incoming foreign keys remain enabled. Trigger state is restored before commit; failure rolls everything back.
 FOR g IN SELECT n.nspname,c.relname,t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE NOT t.tgisinternal AND t.tgenabled<>'D' AND t.tgrelid=ANY(CASE WHEN p_scope='journals' THEN ARRAY['public.journal_entries'::regclass,'public.journal_lines'::regclass] ELSE ARRAY['public.staff_journal_lines'::regclass] END) ORDER BY 1,2,3 LOOP
  guards:=guards||jsonb_build_array(to_jsonb(g));EXECUTE format('ALTER TABLE %I.%I DISABLE TRIGGER %I',g.nspname,g.relname,g.tgname);
 END LOOP;
 IF p_scope='journals' THEN
  INSERT INTO private.removed_journal_requests14322(actor_id,request_key,backup_id)
   SELECT (x->>'actor_id')::uuid,x->>'request_key',b.id FROM jsonb_array_elements(pack->'operation_receipts14228') x ON CONFLICT DO NOTHING;
  DELETE FROM public.journal_lines WHERE journal_entry_id=ANY(ids);
  DELETE FROM public.journal_entries WHERE id=ANY(ids);GET DIAGNOSTICS removed=ROW_COUNT;
 ELSE DELETE FROM public.staff_journal_lines WHERE id=ANY(ids);GET DIAGNOSTICS removed=ROW_COUNT;END IF;
 FOR g IN SELECT value AS data FROM jsonb_array_elements(guards) LOOP
  EXECUTE format('ALTER TABLE %I.%I ENABLE %s TRIGGER %I',g.data->>'nspname',g.data->>'relname',CASE g.data->>'tgenabled' WHEN 'A' THEN 'ALWAYS' WHEN 'R' THEN 'REPLICA' ELSE '' END,g.data->>'tgname');
 END LOOP;
 UPDATE private.maintenance_backups14322 SET removed_at=now(),executed_by=current_user,payload='{}'::jsonb WHERE id=b.id;
 INSERT INTO public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
 VALUES('maintenance',b.id::text,'DATE_RANGE_DELETE',jsonb_build_object('backupId',b.id,'fingerprint',b.fingerprint),preview||jsonb_build_object('removed',removed,'databaseRole',current_user),
 'SQL Editor maintenance after exported backup; original identifiers and numbering sequences preserved',NULL);
 RETURN preview||jsonb_build_object('removed',removed,'backupId',b.id,'databaseRole',current_user);
END $$;

REVOKE ALL ON FUNCTION private.count_tables14322(),private.maintenance_snapshot14322(text,date,date),private.preview_removal14322(text,date,date),private.export_removal_backup14322(text,date,date),private.remove_backed_up_records14322(text,date,date,text) FROM PUBLIC,anon,authenticated,service_role;

-- Retain posting receipts, and reject retries of explicitly removed batches.
CREATE OR REPLACE FUNCTION public.post_journal_batch14228(p_request_key text, p_entries jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=auth.uid();receipt public.operation_receipts14228;entry jsonb;saved record;result jsonb:='[]';
BEGIN
 IF EXISTS(SELECT 1 FROM private.removed_journal_requests14322 WHERE actor_id=auth.uid() AND request_key=p_request_key) THEN RAISE EXCEPTION 'This journal batch was archived and permanently removed. Create a new entry with a new save reference';END IF;
 IF NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Current journal posting permission required' USING ERRCODE='42501';END IF;
 IF p_request_key IS NULL OR length(p_request_key) NOT BETWEEN 10 AND 200 THEN RAISE EXCEPTION 'A stable posting reference is required';END IF;
 IF jsonb_typeof(p_entries) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Posting entries must be an array';END IF;
 IF jsonb_array_length(p_entries) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Provide 1 to 100 posting dates';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_request_key,0));
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=actor AND request_key=p_request_key;
 IF FOUND THEN
  IF receipt.operation<>'journal' OR receipt.payload IS DISTINCT FROM p_entries THEN RAISE EXCEPTION 'Posting reference already used for different data';END IF;
  RETURN receipt.result;
 END IF;
 -- Preflight every date and lock periods in consistent order before inserting headers.
 FOR entry IN SELECT value FROM jsonb_array_elements(p_entries) ORDER BY value->>'p_transaction_date' LOOP
  PERFORM public.validate_journal14228((entry->>'p_transaction_date')::date,entry->>'p_memo',entry->'p_lines');
 END LOOP;
 FOR entry IN SELECT value FROM jsonb_array_elements(p_entries) LOOP
  SELECT * INTO saved FROM public.post_manual_worker14228((entry->>'p_transaction_date')::date,entry->>'p_memo',entry->'p_lines',coalesce(entry->>'p_prefix','OJM'),coalesce((entry->>'p_digits')::integer,6));
  result:=result||jsonb_build_array(jsonb_build_object('date',entry->>'p_transaction_date','entry_id',saved.entry_id,'entry_no',saved.entry_no));
 END LOOP;
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(actor,p_request_key,'journal',p_entries,result);
 RETURN result;
END $function$
;
CREATE OR REPLACE FUNCTION public.journal_receipt14228(p_request_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE r public.operation_receipts14228;
BEGIN
 IF EXISTS(SELECT 1 FROM private.removed_journal_requests14322 WHERE actor_id=auth.uid() AND request_key=p_request_key) THEN RAISE EXCEPTION 'This journal batch was archived and permanently removed. Create a new entry with a new save reference';END IF;
 IF NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Current journal permission required';END IF;
 SELECT * INTO r FROM operation_receipts14228 WHERE actor_id=auth.uid() AND request_key=p_request_key AND operation='journal';
 IF NOT FOUND THEN RETURN NULL;END IF;
 RETURN jsonb_build_object('payload',r.payload,'result',r.result);
END $function$
;
GRANT SELECT ON public.profiles TO service_role;
COMMIT;
