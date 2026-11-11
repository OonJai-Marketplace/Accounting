-- Separate posted journal families. The journal rows and protected deletion
-- records are the counter, so failed transactions cannot spend a number.
CREATE TABLE private.journal_number_reviews335 (
 entry_id uuid PRIMARY KEY, from_no text NOT NULL, to_no text NOT NULL UNIQUE,
 voucher_id uuid NOT NULL, line_hash text NOT NULL, applied_at timestamptz, reused_at timestamptz,
 CHECK (from_no <> to_no)
);
REVOKE ALL ON private.journal_number_reviews335 FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE private.journal_number_aliases298 ADD COLUMN reusable335 boolean NOT NULL DEFAULT false;
-- Cross-series conversions retain the historical UUID lookup.
UPDATE private.journal_number_aliases298 SET reusable335=true
 WHERE replacement_no ~ '^(AMO|REC)[0-9]{2}-[0-9]+$' AND former_no !~ '^(AMO|REC)[0-9]{2}-[0-9]+$';

CREATE OR REPLACE FUNCTION private.reserve_journal_alias298() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT FROM private.journal_number_aliases298
           WHERE former_no=NEW.entry_no AND entry_id<>NEW.id AND NOT reusable335
           AND NOT (replacement_no ~ '^(AMO|REC)[0-9]{2}-[0-9]+$' AND former_no !~ '^(AMO|REC)[0-9]{2}-[0-9]+$'))
 OR EXISTS(SELECT FROM private.journal_number_reviews335
           WHERE to_no=NEW.entry_no AND entry_id<>NEW.id AND applied_at IS NULL) THEN
  RAISE unique_violation USING MESSAGE='This journal number is reserved for another entry.';
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION private.posting_number335(p_prefix text,p_date date,p_digits int,p_family text,p_allocate boolean)
RETURNS TABLE(number bigint, entry_no text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE stem text; width int; pattern text; base text; candidate bigint; reserved text; used text[];
BEGIN
 IF p_date IS NULL THEN RAISE EXCEPTION 'Posting date required'; END IF;
 IF p_allocate THEN PERFORM pg_advisory_xact_lock(143120,1); END IF;
 CASE coalesce(p_family,'')
  WHEN 'amortization' THEN stem:='AMO';
  WHEN 'recurring' THEN stem:='REC';
  WHEN 'payroll' THEN stem:='PAY';
  WHEN 'review' THEN stem:='ADJ';
  WHEN 'staff' THEN stem:='SUB';
  WHEN '' THEN stem:=left(coalesce(nullif(upper(regexp_replace(p_prefix,'[^A-Za-z0-9]','','g')),''),'OJM'),8);
  ELSE RAISE EXCEPTION 'Unknown posting series';
 END CASE;
 IF coalesce(p_family,'')='' AND EXISTS(SELECT FROM public.entry_prefix_reservations
  WHERE entry_prefix_reservations.stem=left(coalesce(nullif(upper(regexp_replace(p_prefix,'[^A-Za-z0-9]','','g')),''),'OJM'),8)
  AND owner_key NOT IN ('main','automated')) THEN RAISE EXCEPTION 'Prefix belongs to another numbering series';END IF;
 width:=greatest(3,least(9,coalesce(p_digits,6)));
 IF coalesce(p_family,'')<>'' THEN width:=6; END IF;
 base:=stem||to_char(p_date,'YY')||CASE WHEN coalesce(p_family,'')='' THEN '' ELSE '-' END;
 pattern:='^'||stem||'[0-9]{2}'||CASE WHEN coalesce(p_family,'')='' THEN '' ELSE '-' END||'([0-9]{1,18})$';
 -- Keep the existing continuous serial across years and recognize earlier widths.
 WITH labels(label) AS (
   SELECT e.entry_no FROM public.journal_entries e
   UNION ALL SELECT a.new_data->>'entry_no' FROM public.audit_log a WHERE p_family IN ('amortization','recurring') AND a.table_name='journal_entries'
   UNION ALL SELECT a.old_data->>'entry_no' FROM public.audit_log a WHERE p_family IN ('amortization','recurring') AND a.table_name='journal_entries'
   UNION ALL SELECT t.entry_no FROM private.reusable_journal_ids143120 t
   UNION ALL SELECT a.former_no FROM private.journal_number_aliases298 a WHERE NOT a.reusable335
    AND NOT (a.replacement_no ~ '^(AMO|REC)[0-9]{2}-[0-9]+$' AND a.former_no !~ '^(AMO|REC)[0-9]{2}-[0-9]+$')
 ), serials AS (SELECT substring(label FROM pattern)::bigint n FROM labels)
 SELECT coalesce(max(n),0)+1 INTO candidate FROM serials;
 IF coalesce(p_family,'')='' THEN
  SELECT opts.n,opts.label INTO number,reserved FROM (
   SELECT r.number n,r.entry_no label FROM private.reusable_journal_ids143120(stem,p_date,width) r
   UNION ALL SELECT substring(t.from_no FROM pattern)::bigint,t.from_no FROM private.journal_number_reviews335 t
    WHERE t.applied_at IS NOT NULL AND t.reused_at IS NULL AND starts_with(t.from_no,base) AND t.from_no ~ pattern
    AND NOT EXISTS(SELECT FROM public.journal_entries e WHERE e.entry_no=t.from_no)
  ) opts ORDER BY opts.n LIMIT 1;
 END IF;
 SELECT ARRAY(SELECT t.to_no FROM private.journal_number_reviews335 t WHERE t.applied_at IS NULL
              UNION SELECT a.former_no FROM private.journal_number_aliases298 a WHERE NOT a.reusable335
              AND NOT (a.replacement_no ~ '^(AMO|REC)[0-9]{2}-[0-9]+$' AND a.former_no !~ '^(AMO|REC)[0-9]{2}-[0-9]+$')) INTO used;
 IF reserved IS NOT NULL AND NOT reserved=ANY(used) THEN
   entry_no:=reserved;
   IF p_allocate THEN
    DELETE FROM private.reusable_journal_ids143120 t WHERE t.entry_no=reserved;
    UPDATE private.journal_number_reviews335 SET reused_at=now() WHERE from_no=reserved AND applied_at IS NOT NULL AND reused_at IS NULL;
   END IF;
 ELSE
   LOOP
    number:=candidate;entry_no:=base||lpad(number::text,greatest(width,length(number::text)),'0');
    EXIT WHEN NOT entry_no=ANY(used);candidate:=candidate+1;
   END LOOP;
 END IF;
 RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION private.posting_number335(text,date,int,text,boolean) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.next_plan_entry_no298(p_kind text,p_lines jsonb,p_date date)
RETURNS text LANGUAGE plpgsql VOLATILE STRICT SECURITY INVOKER SET search_path='' AS $$
DECLARE family text:=p_kind;
BEGIN
 IF family NOT IN ('amortization','recurring') THEN RAISE EXCEPTION 'Unknown journal plan type';END IF;
 IF family='recurring' AND private.prepaid_release_lines298(p_lines) THEN family:='amortization';END IF;
 RETURN (SELECT n.entry_no FROM private.posting_number335(NULL,p_date,6,family,true) n);
END $$;

DO $upgrade$
DECLARE sig regprocedure; def text; start_at int; end_at int; needle text; day text;
BEGIN
 FOREACH sig IN ARRAY ARRAY['public.post_manual_worker14228(date,text,jsonb,text,integer)'::regprocedure,
                            'public.post_report_worker14349(date,text,jsonb,text,integer)'::regprocedure] LOOP
  def:=pg_get_functiondef(sig);
  start_at:=strpos(def,'  -- Sequence allocation and collision retry');
  end_at:=strpos(def,'  for v_line in');
  IF start_at=0 OR end_at<=start_at OR strpos(def,'journal_entry_number_seq')=0 THEN RAISE EXCEPTION 'Unexpected allocation in %',sig;END IF;
  def:=left(def,start_at-1)||$body$
  SELECT n.entry_no INTO v_entry_no FROM private.posting_number335(v_prefix,p_transaction_date,v_digits,p_family335,true) n;
  INSERT INTO public.journal_entries(entry_no,transaction_date,memo,status,source,posted_by,posted_at)
  VALUES(v_entry_no,p_transaction_date,trim(p_memo),'posted','manual',auth.uid(),now()) RETURNING id INTO v_entry_id;
$body$||substr(def,end_at);
  IF sig='public.post_report_worker14349(date,text,jsonb,text,integer)'::regprocedure THEN
   EXECUTE replace(def,'p_family335','''staff''');
  ELSE
   EXECUTE replace(def,'FUNCTION public.post_manual_worker14228(','FUNCTION private.post_worker335(p_family335 text, ');
   def:=pg_get_functiondef(sig);
   EXECUTE left(def,strpos(def,'AS $function$')-1)||$wrapper$AS $function$
   BEGIN RETURN QUERY SELECT * FROM private.post_worker335('',p_transaction_date,p_memo,p_lines,p_prefix,p_digits); END $function$$wrapper$;
  END IF;
 END LOOP;
 FOREACH day IN ARRAY ARRAY['l','s'] LOOP
  sig:=CASE day WHEN 'l' THEN 'public.approve_staff_journal(uuid)'::regprocedure ELSE 'public.approve_entry_submission(uuid)'::regprocedure END;
  def:=pg_get_functiondef(sig);
  needle:='private.format_entry_id143114(coalesce((select journal_prefix from public.accounting_id_settings where id=true),''OJM''),'||day||'.transaction_date,nextval(''public.journal_entry_number_seq''),coalesce((select journal_digits from public.accounting_id_settings where id=true),4))';
  IF strpos(def,needle)=0 THEN RAISE EXCEPTION 'Unexpected staff allocation in %',sig; END IF;
  EXECUTE replace(def,needle,'(select n.entry_no from private.posting_number335(null,'||day||'.transaction_date,6,''staff'',true) n)');
 END LOOP;
END $upgrade$;

-- Route derived company entries at their posting source. Personal entries,
-- payroll vouchers and fund requests keep their own original references.
REVOKE ALL ON FUNCTION private.post_worker335(text,date,text,jsonb,text,integer) FROM PUBLIC,anon,authenticated,service_role;
DO $routes$
DECLARE f record;def text;
BEGIN
 FOR f IN SELECT * FROM (VALUES
  ('public.post_review_adjustment136(uuid,jsonb)','public.post_manual_worker14228(','private.post_worker335(p_family335=>''review'','),
  ('public.post_summary14253(uuid,date,text,jsonb,text,integer)','public.post_manual_worker14228(','private.post_worker335(''staff'','),
  ('public.post_workspace_review_v3(uuid,jsonb,text,integer,text)','public.post_manual_worker14228(','private.post_worker335(''staff'',')
 ) AS x(sig,old_sql,new_sql) LOOP
  def:=pg_get_functiondef(f.sig::regprocedure);
  IF strpos(def,f.old_sql)=0 THEN RAISE EXCEPTION 'Unexpected posting route %',f.sig; END IF;
  EXECUTE replace(def,f.old_sql,f.new_sql);
 END LOOP;
 -- Both batch routes share validation, request identity and receipt replay.
 def:=pg_get_functiondef('public.post_journal_batch14228(text,jsonb)'::regprocedure);
 IF strpos(def,'public.post_manual_worker14228(')=0 THEN RAISE EXCEPTION 'Unexpected batch route';END IF;
 EXECUTE replace(replace(def,'FUNCTION public.post_journal_batch14228(','FUNCTION private.post_batch335(p_family335 text, '),
                 'public.post_manual_worker14228(','private.post_worker335(p_family335,');
 EXECUTE left(def,strpos(def,'AS $function$')-1)||$wrapper$AS $function$
 BEGIN RETURN private.post_batch335('',p_request_key,p_entries); END $function$$wrapper$;
 def:=pg_get_functiondef('public.post_manual_journal14228(date,text,jsonb,text,integer,text)'::regprocedure);
 IF strpos(def,'public.post_journal_batch14228(')=0 THEN RAISE EXCEPTION 'Unexpected manual posting route';END IF;
 EXECUTE replace(replace(def,'FUNCTION public.post_manual_journal14228(','FUNCTION private.post_payroll_entry335('),
                 'public.post_journal_batch14228(','private.post_batch335(''payroll'',');
 def:=pg_get_functiondef('public.post_payroll_journal277(uuid,integer,date,text,jsonb,text,integer,uuid,text,text,jsonb)'::regprocedure);
 IF strpos(def,'public.post_manual_journal14228(')=0 THEN RAISE EXCEPTION 'Unexpected payroll posting route';END IF;
 EXECUTE replace(def,'public.post_manual_journal14228(','private.post_payroll_entry335(');
END $routes$;
REVOKE ALL ON FUNCTION private.post_batch335(text,text,jsonb), private.post_payroll_entry335(date,text,jsonb,text,integer,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.preview_journal_number143114(p_date date,p_prefix text DEFAULT 'OJM',p_digits integer DEFAULT 6)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.can_action113('journal','view') THEN RAISE EXCEPTION 'Journal access required' USING ERRCODE='42501';END IF;
 RETURN (SELECT n.number FROM private.posting_number335(p_prefix,p_date,p_digits,'',false) n);
END $$;

-- Publish only the relevant review instructions alongside the existing snapshot.
DO $upgrade$
DECLARE sig regprocedure:='public.offline_journal_state143174(date,text,integer)'::regprocedure;def text;needle text:='''issued'',issued,';
BEGIN
 def:=pg_get_functiondef(sig);
 IF strpos(def,needle)=0 THEN RAISE EXCEPTION 'Unexpected offline numbering snapshot';END IF;
 EXECUTE replace(def,needle,$body$'issued',issued,'reviews',CASE WHEN public.is_admin() THEN
 (SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.entry_id,'from',r.from_no,'to',r.to_no,'voucher',v.number)),'[]'::jsonb)
 FROM private.journal_number_reviews335 r JOIN public.vouchers14299 v ON v.id=r.voucher_id
 WHERE r.applied_at IS NULL AND left(r.to_no,length(prefix)+2)=prefix||to_char(p_date,'YY')) ELSE '[]'::jsonb END,$body$);
END $upgrade$;

CREATE FUNCTION private.finish_number_review335(p_id uuid,p_reason text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE review private.journal_number_reviews335; item public.vouchers14299; entry public.journal_entries; digest text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() OR NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Administrator posting access required';END IF;
 PERFORM pg_advisory_xact_lock(143120,1);
 SELECT * INTO STRICT review FROM private.journal_number_reviews335 WHERE entry_id=p_id FOR UPDATE;
 IF p_reason<>'Correct journal ID to '||review.to_no THEN RAISE EXCEPTION 'Journal number does not match the staged review';END IF;
 SELECT * INTO STRICT entry FROM public.journal_entries WHERE id=p_id AND status='posted' FOR UPDATE;
 SELECT * INTO STRICT item FROM public.vouchers14299 WHERE id=review.voucher_id AND journal_entry_id=p_id AND status='linked' FOR UPDATE;
 IF review.applied_at IS NOT NULL AND entry.entry_no=review.to_no THEN RETURN entry.entry_no; END IF;
 SELECT md5(jsonb_agg(jsonb_build_array(l.id,l.line_no,l.account_id,l.debit,l.credit,l.currency_code,l.description,l.line_date,l.fx_rate_lak,l.book_rate_lak) ORDER BY l.line_no)::text)
 INTO digest FROM public.journal_lines l WHERE l.journal_entry_id=p_id;
 IF entry.entry_no<>review.from_no OR digest IS DISTINCT FROM review.line_hash
    OR item.data#>>'{journal,entry_no}' IS DISTINCT FROM review.from_no
    OR item.data#>>'{id_format,scheme}' IS DISTINCT FROM 'shared245'
    OR EXISTS(SELECT FROM public.journal_entries WHERE entry_no=review.to_no) THEN
   RAISE EXCEPTION 'Entry or document changed since review. Refresh before proceeding.' USING ERRCODE='40001';
 END IF;
 UPDATE public.journal_entries SET entry_no=review.to_no WHERE id=p_id;
 INSERT INTO private.journal_number_aliases298(former_no,entry_id,replacement_no,changed_by,reusable335)
 VALUES(review.from_no,p_id,review.to_no,auth.uid(),true);
 UPDATE public.vouchers14299 SET data=jsonb_set(data,'{journal,entry_no}',to_jsonb(review.to_no)),
 version=version+1,updated_at=now() WHERE id=item.id RETURNING * INTO item;
 INSERT INTO public.voucher_versions14299(voucher_id,version,data,reason,changed_by) VALUES(item.id,item.version,item.data,p_reason,auth.uid());
 INSERT INTO public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
 VALUES('journal_entries',p_id::text,'UPDATE',jsonb_build_object('entry_no',review.from_no),jsonb_build_object('entry_no',review.to_no),p_reason,auth.uid());
 UPDATE private.journal_number_reviews335 SET applied_at=now() WHERE entry_id=p_id;
 RETURN review.to_no;
END $$;
REVOKE ALL ON FUNCTION private.finish_number_review335(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

DO $upgrade$
DECLARE sig regprocedure:='public.change_journal14385(text,uuid,text,text,jsonb,jsonb)'::regprocedure;def text;
 needle text:='PERFORM public.revise_open_journal_entry(p_entry_id,p_reason,(value->>''date'')::date,value->>''memo'',value->''lines'');';
BEGIN
 def:=pg_get_functiondef(sig);
 IF strpos(def,needle)=0 THEN RAISE EXCEPTION 'Unexpected journal edit routine';END IF;
 EXECUTE replace(def,needle,$body$IF starts_with(p_reason,'Correct journal ID to ') THEN
   IF actual IS DISTINCT FROM value THEN RAISE EXCEPTION 'Review the original unchanged transaction to correct its ID';END IF;
   entry.entry_no:=private.finish_number_review335(p_entry_id,p_reason);
  ELSE $body$||needle||' END IF;');
END $upgrade$;

-- The device chooses each displayed number. An actual cross-device collision
-- rolls back the entire batch before the user chooses whether to renumber.
CREATE FUNCTION public.post_device_journal335(p_request_key text,p_entries jsonb,p_numbers jsonb,p_voucher uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; prior boolean; mismatch record;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Journal posting access required' USING ERRCODE='42501';END IF;
 IF jsonb_typeof(p_numbers) IS DISTINCT FROM 'array' OR jsonb_array_length(p_numbers)<>jsonb_array_length(p_entries) THEN RAISE EXCEPTION 'Incomplete device journal numbers';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_request_key,0));
 SELECT EXISTS(SELECT FROM public.operation_receipts14228 WHERE request_key=p_request_key AND actor_id=auth.uid()) INTO prior;
 result:=private.post_batch335('',p_request_key,p_entries);
 IF NOT prior THEN
  SELECT n.label,r.item->>'entry_no' actual INTO mismatch
   FROM jsonb_array_elements_text(p_numbers) WITH ORDINALITY n(label,i)
   JOIN jsonb_array_elements(result) WITH ORDINALITY r(item,i) USING(i)
   WHERE n.label IS NOT NULL AND n.label<>r.item->>'entry_no' LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION 'Device ID % differs from the next available ID %. Review this entry to use the available number.',mismatch.label,mismatch.actual USING ERRCODE='P0335';END IF;
 END IF;
 IF p_voucher IS NOT NULL THEN
  IF jsonb_array_length(result)<>1 THEN RAISE EXCEPTION 'A voucher requires a single journal';END IF;
  PERFORM public.voucher_link14299(p_voucher,(result->0->>'entry_id')::uuid);
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.post_device_journal335(text,jsonb,jsonb,uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.post_device_journal335(text,jsonb,jsonb,uuid) TO authenticated;
