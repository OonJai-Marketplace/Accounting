-- Report preview / three journal formats. No financial records are rewritten.
-- Existing function signature, permissions, approval locks and retry receipts retained.
CREATE OR REPLACE FUNCTION public.post_report14349(p_journal uuid, p_date date, p_memo text, p_lines jsonb, p_prefix text, p_digits integer, p_mode text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j staff_journals;snapshot jsonb;expected jsonb;actual jsonb;posted record;item jsonb;src record;line_id uuid;summary_line_no integer:=0;owner_name text;receipt operation_receipts14228;payload jsonb;answer jsonb;
BEGIN
 IF auth.uid() IS NULL OR p_mode NOT IN ('consolidated','detailed','category_totals','fund_totals') OR p_mode IS NULL THEN RAISE EXCEPTION 'Authenticated user and posting mode required';END IF;
 IF NOT public.has_user_permission('approve') OR NOT public.has_user_permission('post') OR NOT public.can_action113('user-entry-review','post') OR NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Review and journal posting permissions required';END IF;
 SELECT * INTO j FROM staff_journals WHERE id=p_journal FOR UPDATE;
 IF NOT FOUND OR NOT public.can_workspace113(j.owner_id) THEN RAISE EXCEPTION 'Workspace access denied';END IF;
 PERFORM public.assert_final_review14229(p_journal);
 payload=jsonb_build_object('date',p_date,'memo',p_memo,'lines',p_lines,'prefix',p_prefix,'digits',p_digits,'mode',p_mode);
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=auth.uid() AND request_key='summary:'||p_journal::text;
 IF FOUND THEN IF receipt.payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Report already posted with different data';END IF;RETURN receipt.result;END IF;
 IF j.status<>'submitted' THEN RAISE EXCEPTION 'Report is not awaiting posting';END IF;
 SELECT a.snapshot INTO snapshot FROM approved_reports1443 a WHERE a.journal_id=p_journal;
 IF NOT FOUND THEN RAISE EXCEPTION 'Approve the exact detailed report before summary posting';END IF;
 IF p_date IS NULL OR date_trunc('month',p_date)<>date_trunc('month',j.period_start) THEN RAISE EXCEPTION 'Keep original reporting dates';END IF;
 PERFORM 1 FROM staff_journal_lines WHERE staff_journal_id=p_journal FOR UPDATE;
 -- Compare immutable reviewed content, ignoring only links filled by previous postings.
 IF (SELECT jsonb_agg(jsonb_strip_nulls(to_jsonb(l)-'journal_entry_id') ORDER BY l.id) FROM staff_journal_lines l WHERE staff_journal_id=p_journal)
 IS DISTINCT FROM (SELECT jsonb_agg(jsonb_strip_nulls(x-'journal_entry_id') ORDER BY x->>'id') FROM jsonb_array_elements(snapshot->'journal'->'lines') x) THEN RAISE EXCEPTION 'Source changed after approval';END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)<2 THEN RAISE EXCEPTION 'No balanced summary supplied';END IF;
 -- The two new formats use one report-month posting date while keeping original
 -- dates immutable in journal_sources14253. Old clients retain their dated modes.
 IF p_mode IN ('category_totals','fund_totals') AND EXISTS(
 SELECT 1 FROM staff_journal_lines l WHERE l.staff_journal_id=p_journal
 AND date_trunc('month',l.transaction_date)<>date_trunc('month',p_date)
 AND NOT (l.entry_kind='collection' AND l.account_id=l.fund_account_id)
 AND l.journal_entry_id IS NULL) THEN RAISE EXCEPTION 'Original transactions must belong to the report month';END IF;
 -- Derive exact allowed lines; never accept an arbitrary balancing adjustment.
 WITH source AS (
 SELECT l.* FROM staff_journal_lines l WHERE l.staff_journal_id=p_journal
 AND NOT (l.entry_kind='collection' AND l.account_id=l.fund_account_id) AND l.journal_entry_id IS NULL
 AND coalesce(to_jsonb(l)->>'status','')<>'voided' AND nullif(to_jsonb(l)->>'voided_at','') IS NULL
 ), sides AS (
 SELECT l.id,CASE WHEN p_mode IN ('category_totals','fund_totals') THEN p_date ELSE l.transaction_date END transaction_date,
 l.currency_code,CASE WHEN p_mode IN ('category_totals','fund_totals') AND l.currency_code='LAK' THEN 1 ELSE l.fx_rate_lak END fx_rate_lak,
 l.amount,l.account_id,CASE WHEN l.direction='in' THEN 'credit' ELSE 'debit' END side,
 CASE WHEN p_mode='category_totals' THEN 'all' WHEN p_mode='fund_totals' AND l.account_id IN(SELECT fund_account_id FROM source) THEN 'fund' ELSE l.id::text END bucket FROM source l
 UNION ALL
 SELECT l.id,CASE WHEN p_mode IN ('category_totals','fund_totals') THEN p_date ELSE l.transaction_date END,
 l.currency_code,CASE WHEN p_mode IN ('category_totals','fund_totals') AND l.currency_code='LAK' THEN 1 ELSE l.fx_rate_lak END,
 l.amount,l.fund_account_id,CASE WHEN l.direction='in' THEN 'debit' ELSE 'credit' END,
 CASE WHEN p_mode='category_totals' THEN 'all' WHEN p_mode IN ('consolidated','fund_totals') THEN 'fund' ELSE l.id::text END FROM source l
 ), grouped AS (SELECT transaction_date,account_id,currency_code,fx_rate_lak,side,bucket,sum(amount) amount,jsonb_agg(id::text ORDER BY id::text) ids FROM sides GROUP BY transaction_date,account_id,currency_code,fx_rate_lak,side,bucket), objects AS (
 SELECT jsonb_build_object('date',transaction_date,'account',account_id,'currency',currency_code,'side',side,'amount',amount,'ids',ids) obj FROM grouped)
 SELECT jsonb_agg(obj ORDER BY obj::text) INTO expected FROM objects;
 WITH objects AS (SELECT jsonb_build_object('date',(x->>'line_date')::date,'account',(x->>'account_id')::uuid,'currency',x->>'currency_code','side',CASE WHEN (x->>'debit')::numeric>0 THEN 'debit' ELSE 'credit' END,'amount',greatest((x->>'debit')::numeric,(x->>'credit')::numeric),'ids',(SELECT jsonb_agg(v ORDER BY v) FROM jsonb_array_elements_text(x->'source_ids') v)) obj FROM jsonb_array_elements(p_lines) x)
 SELECT jsonb_agg(obj ORDER BY obj::text) INTO actual FROM objects;
 IF expected IS NULL OR expected IS DISTINCT FROM actual THEN RAISE EXCEPTION 'Dates, accounts, amounts or references do not match the approved report';END IF;
 -- Preserve reviewed rates. A reviewer may supply rates absent from older source records.
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) x CROSS JOIN LATERAL jsonb_array_elements_text(x->'source_ids') sid JOIN staff_journal_lines l ON l.id=sid.value::uuid WHERE l.currency_code<>'LAK' AND l.fx_rate_lak IS NOT NULL AND l.fx_rate_lak IS DISTINCT FROM nullif(x->>'fx_rate_lak','')::numeric) THEN RAISE EXCEPTION 'Exchange rates do not match the approved report';END IF;
 -- Validate and lock every accounting date before allocating one entry number.
 FOR src IN SELECT (x->>'line_date')::date d,jsonb_agg(x) lines FROM jsonb_array_elements(p_lines) x GROUP BY (x->>'line_date')::date ORDER BY (x->>'line_date')::date LOOP
 PERFORM public.validate_journal14228(src.d,p_memo,src.lines);
 END LOOP;
 SELECT * INTO posted FROM public.post_report_worker14349(p_date,p_memo,p_lines,p_prefix,p_digits);
 owner_name=coalesce(snapshot->'user'->>'full_name',(SELECT full_name FROM profiles WHERE id=j.owner_id),'Former user');
 FOR item IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
 summary_line_no=summary_line_no+1;SELECT l.id INTO STRICT line_id FROM journal_lines l WHERE l.journal_entry_id=posted.entry_id AND l.line_no=summary_line_no;
 FOR src IN SELECT l.* FROM staff_journal_lines l WHERE l.id IN(SELECT value::uuid FROM jsonb_array_elements_text(item->'source_ids')) LOOP
 INSERT INTO journal_sources14253 VALUES(line_id,src.id,p_journal,src.workspace_entry_no,j.owner_id,owner_name,src.transaction_date,src.memo,src.reference,src.amount);
 END LOOP;END LOOP;
 UPDATE staff_journal_lines l SET journal_entry_id=posted.entry_id WHERE staff_journal_id=p_journal AND NOT (entry_kind='collection' AND account_id=fund_account_id) AND journal_entry_id IS NULL AND coalesce(to_jsonb(l)->>'status','')<>'voided' AND nullif(to_jsonb(l)->>'voided_at','') IS NULL;
 UPDATE staff_journals SET status='posted',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() WHERE id=p_journal;
 answer=jsonb_build_object('entry_id',posted.entry_id,'entry_no',posted.entry_no,'report_id',p_journal);
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(auth.uid(),'summary:'||p_journal::text,'workspace-summary',payload,answer);
 INSERT INTO audit_log(table_name,record_id,action,new_data,reason,actor_id) VALUES('staff_journals',p_journal::text,'POST',answer,'Approved report posted with retained source dates: '||p_mode,auth.uid());
 RETURN answer;
END $function$
;
