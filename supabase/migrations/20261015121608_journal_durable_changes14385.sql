-- Additive Phase 1 migration. No historic journals or rates are rewritten.
CREATE OR REPLACE FUNCTION public.journal_shape14385(p_date date,p_memo text,p_lines jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('date',p_date,'memo',trim(coalesce(p_memo,'')),'lines',coalesce(jsonb_agg(jsonb_build_object(
 'account_id',l->>'account_id','description',coalesce(nullif(l->>'description',''),trim(p_memo)),
 'currency_code',l->>'currency_code','debit',coalesce((l->>'debit')::numeric,0),'credit',coalesce((l->>'credit')::numeric,0),
 'fx_rate_lak',CASE WHEN l->>'currency_code'='LAK' THEN 1 ELSE nullif(l->>'fx_rate_lak','')::numeric END,
 'book_rate_lak',nullif(l->>'book_rate_lak','')::numeric) ORDER BY n),'[]'::jsonb))
 FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS items(l,n);
$$;
REVOKE ALL ON FUNCTION public.journal_shape14385(date,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.journal_shape14385(date,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.change_journal14385(p_request_key text,p_entry_id uuid,p_kind text,p_reason text,p_expected jsonb,p_value jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=auth.uid(); prior public.operation_receipts14228; entry public.journal_entries;
 payload jsonb; result jsonb; actual jsonb; expected jsonb; value jsonb; month_key date; period_status text;
BEGIN
 IF actor IS NULL OR NOT public.can_action113('journal','post') OR (p_kind='void' AND NOT public.is_admin()) THEN
  RAISE EXCEPTION 'Current journal permission required' USING ERRCODE='42501';
 END IF;
 IF p_kind NOT IN ('revise','void') OR p_kind IS NULL THEN RAISE EXCEPTION 'Invalid journal operation';END IF;
 IF p_request_key IS NULL OR length(p_request_key) NOT BETWEEN 10 AND 200 THEN RAISE EXCEPTION 'Stable change reference required';END IF;
 IF nullif(trim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'A change reason is required';END IF;
 payload:=jsonb_build_object('entry_id',p_entry_id,'kind',p_kind,'reason',p_reason,'expected',p_expected,'value',p_value);
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_request_key,0));
 SELECT * INTO prior FROM public.operation_receipts14228 WHERE actor_id=actor AND request_key=p_request_key;
 IF FOUND THEN
  IF prior.operation<>'journal-change14385' OR prior.payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Change reference already used for different data';END IF;
  RETURN prior.result;
 END IF;
 SELECT * INTO entry FROM public.journal_entries WHERE id=p_entry_id FOR UPDATE;
 IF NOT FOUND OR entry.status<>'posted' THEN RAISE EXCEPTION 'Entry changed or was voided. Review the retained device change.' USING ERRCODE='40001';END IF;
 SELECT public.journal_shape14385(entry.transaction_date,entry.memo,jsonb_agg(to_jsonb(l) ORDER BY l.line_no)) INTO actual
 FROM public.journal_lines l WHERE l.journal_entry_id=p_entry_id;
 IF p_expected IS NULL OR jsonb_typeof(p_expected->'lines') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Original entry content is required';END IF;
 expected:=public.journal_shape14385((p_expected->>'date')::date,p_expected->>'memo',p_expected->'lines');
 IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Entry changed in another session. Review both versions before saving.' USING ERRCODE='40001';END IF;
 -- Hold all original and destination period locks in a consistent order.
 FOR month_key IN SELECT DISTINCT m FROM (
  SELECT date_trunc('month',entry.transaction_date)::date m
  UNION SELECT date_trunc('month',coalesce(line_date,entry.transaction_date))::date FROM public.journal_lines WHERE journal_entry_id=p_entry_id
  UNION SELECT date_trunc('month',(p_value->>'date')::date)::date WHERE p_kind='revise'
 ) months WHERE m IS NOT NULL ORDER BY m LOOP
  INSERT INTO public.accounting_periods(period_month,status,updated_by) VALUES(month_key,'open',actor) ON CONFLICT(period_month) DO NOTHING;
  SELECT status INTO period_status FROM public.accounting_periods WHERE period_month=month_key FOR UPDATE;
  IF period_status<>'open' THEN RAISE EXCEPTION 'Period % must be open before synchronization',month_key;END IF;
 END LOOP;
 IF p_kind='revise' THEN
  IF p_value IS NULL OR jsonb_typeof(p_value->'lines') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Revised journal content required';END IF;
  value:=public.journal_shape14385((p_value->>'date')::date,p_value->>'memo',p_value->'lines');
  PERFORM public.validate_journal14228((value->>'date')::date,value->>'memo',value->'lines');
  PERFORM public.revise_open_journal_entry(p_entry_id,p_reason,(value->>'date')::date,value->>'memo',value->'lines');
 ELSE
  PERFORM public.void_journal_entry(p_entry_id,p_reason);
 END IF;
 result:=jsonb_build_object('entry_id',p_entry_id,'entry_no',entry.entry_no,'request_key',p_request_key,'kind',p_kind);
 INSERT INTO public.operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(actor,p_request_key,'journal-change14385',payload,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.change_journal14385(text,uuid,text,text,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.change_journal14385(text,uuid,text,text,jsonb,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
