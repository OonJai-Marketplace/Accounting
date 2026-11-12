-- Requested accounts only. The compact result shares the annual opening and FX evidence used in the journal.
CREATE OR REPLACE FUNCTION public.account_watch_lines378(p_accounts uuid[], p_as_of date, p_rates boolean)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin() AND public.active_account14228() AND public.accounting_workspace_allowed123()
   AND NOT public.password_change_required14257() AND public.can_action113('journal','view'),false)
 THEN RAISE EXCEPTION 'Administrator journal access required' USING ERRCODE='42501'; END IF;
 IF p_as_of IS NULL OR p_accounts IS NULL OR p_rates IS NULL THEN RAISE EXCEPTION 'Choose accounts and a date'; END IF;
 WITH lines AS (
  SELECT l.account_id,coalesce(l.line_date,e.transaction_date) entry_day,l.currency_code,l.debit,l.credit,
    l.base_debit,l.base_credit,l.book_rate_lak,l.fx_rate_lak,l.line_no,e.id,e.created_at,
    (coalesce(e.reference,'') LIKE 'ANNUAL-OPENING-%' OR e.memo='Opening Balances' OR e.memo LIKE 'Annual opening balances %') IS TRUE AS opening,
    n.line_kinds->>l.line_no::text AS kind
  FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.journal_entry_id
  LEFT JOIN public.journal_fx_evidence288 n ON p_rates AND n.entry_id=e.id AND n.entry_updated_at=e.updated_at
  WHERE l.account_id=ANY(p_accounts) AND e.status='posted' AND e.voided_at IS NULL
    AND coalesce(l.line_date,e.transaction_date)<=p_as_of
    AND (p_rates OR coalesce(l.line_date,e.transaction_date)>=date_trunc('year',p_as_of)::date)
 ), recent AS (
  SELECT * FROM lines WHERE entry_day>=date_trunc('year',p_as_of)::date
 ), prior_valuation AS (
  SELECT DISTINCT ON (account_id) * FROM lines WHERE p_rates AND entry_day<date_trunc('year',p_as_of)::date
    AND kind IN ('equivalent','valuation','reference') AND fx_rate_lak>0
  ORDER BY account_id,entry_day DESC,created_at DESC,id DESC,line_no DESC
 ), grouped AS (
  SELECT account_id,currency_code,CASE WHEN p_rates THEN entry_day ELSE date_trunc('month',entry_day)::date END AS record_day,
    CASE WHEN p_rates THEN false ELSE opening END AS annual_opening,
    sum(debit) AS debit,sum(credit) AS credit,
    sum(coalesce(base_debit,CASE WHEN debit=0 THEN 0 ELSE round(debit*coalesce(book_rate_lak,fx_rate_lak),2) END)) AS base_dr,
    sum(coalesce(base_credit,CASE WHEN credit=0 THEN 0 ELSE round(credit*coalesce(book_rate_lak,fx_rate_lak),2) END)) AS base_cr,
    bool_or((debit<>0 AND base_debit IS NULL OR credit<>0 AND base_credit IS NULL) AND coalesce(book_rate_lak,fx_rate_lak,0)<=0) AS missing,
    (array_agg(fx_rate_lak ORDER BY created_at DESC,id DESC,line_no DESC)
       FILTER (WHERE p_rates AND kind IN ('equivalent','valuation','reference') AND fx_rate_lak>0))[1] AS valuation
  FROM (SELECT * FROM recent UNION ALL SELECT * FROM prior_valuation) history
  GROUP BY 1,2,3,4
 )
 SELECT coalesce(jsonb_agg(jsonb_build_object('accountId',account_id,'date',record_day,'currency',currency_code,
    'debit',debit,'credit',credit,'annualOpening',annual_opening) ||
    CASE WHEN p_rates THEN jsonb_build_object('base_debit',base_dr,'base_credit',base_cr,'valuationMissing',missing,
      'fx_rate_lak',valuation,'fxRateKind288',CASE WHEN valuation IS NOT NULL THEN 'valuation' END) ELSE '{}'::jsonb END
    ORDER BY record_day,account_id),'[]'::jsonb) INTO result FROM grouped;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.account_watch_lines378(uuid[],date,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.account_watch_lines378(uuid[],date,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
