-- Read-only, atomic rate snapshot. Match the journal's explicit annual opening policy.
CREATE OR REPLACE FUNCTION public.account_exchange_rates143186(
 p_as_of date DEFAULT (now() AT TIME ZONE 'Asia/Vientiane')::date,
 p_exclude_entry text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public, pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF current_user <> 'service_role' THEN
  IF auth.uid() IS NULL OR NOT coalesce(public.accounting_workspace_allowed123(),false)
   OR NOT coalesce(public.can_action113('journal','view'),false) THEN
   RAISE EXCEPTION 'Journal viewing permission required' USING ERRCODE='42501';
  END IF;
 END IF;
 IF p_as_of IS NULL OR p_as_of < date '2000-01-01' OR p_as_of > date '2100-12-31' THEN
  RAISE EXCEPTION 'Invalid rate date';
 END IF;
 WITH totals AS (
  SELECT l.account_id, sum(l.debit-l.credit) quantity,
   sum(coalesce(l.base_debit,CASE WHEN l.debit=0 THEN 0 ELSE round(l.debit*coalesce(l.book_rate_lak,l.fx_rate_lak),2) END)
       -coalesce(l.base_credit,CASE WHEN l.credit=0 THEN 0 ELSE round(l.credit*coalesce(l.book_rate_lak,l.fx_rate_lak),2) END)) value,
   bool_or((l.debit<>0 AND l.base_debit IS NULL AND coalesce(l.book_rate_lak,l.fx_rate_lak,0)<=0)
        OR (l.credit<>0 AND l.base_credit IS NULL AND coalesce(l.book_rate_lak,l.fx_rate_lak,0)<=0)
        OR l.currency_code<>a.currency_code) missing,
   max(coalesce(l.line_date,e.transaction_date)) last_transaction_date
  FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id
  JOIN public.accounts a ON a.id=l.account_id
  WHERE e.status='posted' AND e.voided_at IS NULL
   AND coalesce(l.line_date,e.transaction_date) BETWEEN date_trunc('year',p_as_of)::date AND p_as_of
   AND (p_exclude_entry IS NULL OR (e.id::text<>p_exclude_entry AND coalesce(e.entry_no,'')<>p_exclude_entry))
  GROUP BY l.account_id
 ), rows AS (
  SELECT a.id account_id,a.code account_code,a.name account_name,a.currency_code currency,
   coalesce(t.quantity,0) foreign_balance,CASE WHEN t.missing THEN NULL ELSE coalesce(t.value,0) END lak_carrying_value,
   CASE WHEN NOT coalesce(t.missing,false) AND t.quantity*t.value>0
    AND NOT (t.quantity<0 AND a.account_type='ASSET' AND NOT coalesce(a.is_technical,false) AND coalesce(a.account_purpose,'regular')='regular') THEN t.value/t.quantity END average_rate,
   CASE WHEN coalesce(t.missing,false) THEN 'missing_valuation' WHEN coalesce(t.quantity,0)=0 THEN 'no_balance'
        WHEN t.quantity<0 AND a.account_type='ASSET' AND NOT coalesce(a.is_technical,false) AND coalesce(a.account_purpose,'regular')='regular' THEN 'negative_asset_balance'
        WHEN t.quantity*t.value>0 THEN 'available' ELSE 'invalid_balance' END rate_status,
   t.last_transaction_date
  FROM public.accounts a LEFT JOIN totals t ON t.account_id=a.id
  WHERE a.currency_code NOT IN ('LAK','NA') AND a.is_posting IS NOT FALSE AND a.is_active IS NOT FALSE
 ) SELECT jsonb_build_object('as_of',p_as_of,'period_start',date_trunc('year',p_as_of)::date,
  'calculated_at',statement_timestamp(),'basis','posted_database','excluded_entry',p_exclude_entry,
  'accounts',coalesce(jsonb_agg(to_jsonb(rows) ORDER BY account_code,account_id),'[]'::jsonb)) INTO result FROM rows;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.account_exchange_rates143186(date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.account_exchange_rates143186(date,text) TO authenticated,service_role;
COMMENT ON FUNCTION public.account_exchange_rates143186(date,text) IS 'Account-specific LAK carrying rates from posted current-year records and explicit opening entries. Unsynced device work is excluded.';
