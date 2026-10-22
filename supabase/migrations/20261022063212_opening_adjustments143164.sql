-- Opening Balance stays available. Later recording dates are opening adjustments,
-- not replacements for January's opening. Existing journal guards still apply.
BEGIN;
CREATE OR REPLACE FUNCTION public.annual_opening_status143109(p_year integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE closed boolean; openings integer;
BEGIN
 PERFORM public.require_admin136();
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Accounting workspace access required'; END IF;
 IF p_year IS NULL OR p_year NOT BETWEEN 1900 AND 2198 THEN RAISE EXCEPTION 'Invalid opening year'; END IF;
 SELECT EXISTS(SELECT 1 FROM year_closings136 WHERE year=p_year) INTO closed;
 SELECT count(*) INTO openings FROM journal_entries WHERE status='posted' AND reference='ANNUAL-OPENING-'||p_year;
 RETURN jsonb_build_object('available',NOT closed,'generation',(SELECT generation FROM opening_state14234 WHERE id),'opening_count',openings,
  'reason',CASE WHEN closed THEN 'This year is finalized. Record a later opening balance adjustment in an open year.' ELSE '' END);
END $$;

CREATE OR REPLACE FUNCTION public.post_annual_opening143109(p_year integer,p_generation uuid,p_request_key text,p_entries jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s jsonb; r jsonb; l jsonb; rate numeric; receipt operation_receipts14228; recorded date; late boolean; marker text;
BEGIN
 PERFORM public.require_admin136();
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Accounting workspace access required'; END IF;
 IF p_year IS NULL OR p_year NOT BETWEEN 1900 AND 2198 THEN RAISE EXCEPTION 'Invalid opening year'; END IF;
 IF jsonb_typeof(p_entries) IS DISTINCT FROM 'array' OR jsonb_array_length(p_entries)<>1 THEN RAISE EXCEPTION 'Provide one opening journal'; END IF;
 recorded:=(p_entries->0->>'p_transaction_date')::date;
 IF recorded IS NULL OR extract(year FROM recorded)::integer<>p_year THEN RAISE EXCEPTION 'The recording date must belong to the selected year'; END IF;
 late:=recorded<>make_date(p_year,1,1);
 marker:=CASE WHEN late THEN 'OPENING-ADJUSTMENT-' ELSE 'ANNUAL-OPENING-' END||p_year;
 IF (NOT late AND p_entries->0->>'p_memo' IS DISTINCT FROM 'Annual opening balances '||p_year)
  OR (late AND coalesce(p_entries->0->>'p_memo','') NOT LIKE 'Opening balance adjustment '||p_year||' — %') THEN
  RAISE EXCEPTION 'Use the opening balance label for the selected recording date';
 END IF;
 LOCK TABLE journal_entries IN SHARE ROW EXCLUSIVE MODE;
 PERFORM 1 FROM opening_state14234 WHERE id FOR UPDATE;
 IF p_generation IS DISTINCT FROM (SELECT generation FROM opening_state14234 WHERE id) THEN RAISE EXCEPTION 'The ledger was reset. Return to Journal Entry Options and review the opening balances.'; END IF;
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=auth.uid() AND request_key=p_request_key;
 IF FOUND THEN
  IF receipt.operation<>'journal' OR receipt.payload IS DISTINCT FROM p_entries THEN RAISE EXCEPTION 'Posting reference already used for different data'; END IF;
  IF NOT EXISTS(SELECT 1 FROM journal_entries WHERE id=(receipt.result->0->>'entry_id')::uuid AND reference=marker AND status='posted') THEN RAISE EXCEPTION 'This opening reference is archived or belongs to another operation. Review History.'; END IF;
  RETURN receipt.result;
 END IF;
 s:=public.annual_opening_status143109(p_year);
 IF NOT (s->>'available')::boolean THEN RAISE EXCEPTION '%',s->>'reason'; END IF;
 FOR l IN SELECT value FROM jsonb_array_elements(p_entries->0->'p_lines') LOOP
  IF coalesce(nullif(l->>'line_date','')::date,recorded)<>recorded OR position('[Receipt date:' in coalesce(l->>'description',''))>0 THEN RAISE EXCEPTION 'Opening amounts use the selected recording date, without separate receipt dates'; END IF;
  IF late AND coalesce(l->>'description','') NOT LIKE 'Opening balance adjustment — %' THEN RAISE EXCEPTION 'Label each late opening line as an opening balance adjustment'; END IF;
  rate:=CASE WHEN l->>'currency_code'='LAK' THEN 1 ELSE nullif(l->>'book_rate_lak','')::numeric END;
  IF rate IS NULL OR rate<=0 OR rate::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Every foreign opening balance needs a positive LAK carrying rate'; END IF;
  IF EXISTS(SELECT 1 FROM accounts WHERE id=(l->>'account_id')::uuid AND upper(account_type) IN ('REVENUE','INCOME','EXPENSE') AND NOT is_technical AND account_purpose='regular') THEN RAISE EXCEPTION 'Opening balances use balance-sheet and system accounts, not income or expense'; END IF;
 END LOOP;
 IF (SELECT sum(round(coalesce((x->>'debit')::numeric,0)*CASE WHEN x->>'currency_code'='LAK' THEN 1 ELSE (x->>'book_rate_lak')::numeric END,2)-round(coalesce((x->>'credit')::numeric,0)*CASE WHEN x->>'currency_code'='LAK' THEN 1 ELSE (x->>'book_rate_lak')::numeric END,2)) FROM jsonb_array_elements(p_entries->0->'p_lines') x)<>0 THEN RAISE EXCEPTION 'Opening LAK equivalents must balance'; END IF;
 r:=public.post_journal_batch14228(p_request_key,p_entries);
 UPDATE journal_entries SET reference=marker,updated_at=now() WHERE id=(r->0->>'entry_id')::uuid;
 UPDATE audit_log SET new_data=new_data||jsonb_build_object('reference',marker,'opening_kind',CASE WHEN late THEN 'adjustment' ELSE 'initial' END),
  reason=CASE WHEN late THEN 'Opening balance adjustment recorded on '||recorded::text ELSE 'Initial opening balances recorded for '||p_year END
 WHERE table_name='journal_entries' AND record_id=r->0->>'entry_id' AND action='POST' AND actor_id=auth.uid();
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.annual_opening_status143109(integer),public.post_annual_opening143109(integer,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.annual_opening_status143109(integer),public.post_annual_opening143109(integer,uuid,text,jsonb) TO authenticated;
COMMIT;
