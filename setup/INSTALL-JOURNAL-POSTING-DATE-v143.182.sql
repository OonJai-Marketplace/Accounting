-- Preserve the journal header date separately from receipt/line dates.
-- This read-only function keeps existing access, valuation, period and ordering rules.
-- The revision prefix invalidates previously cached rows missing postingDate.
CREATE OR REPLACE FUNCTION public.journal_window14333(p_from date, p_to date, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE result jsonb; opening jsonb:='[]'; revision text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_from>p_to OR p_offset<0 THEN RAISE EXCEPTION 'Invalid journal period'; END IF;
 SELECT coalesce(jsonb_agg(row_to_json(r)),'[]') INTO result FROM (
 SELECT e.created_at,e.source,e.id AS "dbEntryId",coalesce(e.entry_no,e.id::text) AS id,
 e.transaction_date AS "postingDate",coalesce(l.line_date,e.transaction_date) AS date,a.name AS account,a.id AS "accountId",a.code AS "accountCode",
 l.currency_code AS currency,coalesce(nullif(l.description,''),e.memo,'') AS memo,e.memo AS "generalMemo",
 (e.reference LIKE 'ANNUAL-OPENING-%' OR e.memo='Opening Balances') AS "annualOpening",l.debit,l.credit,l.fx_rate_lak,l.book_rate_lak,l.base_debit,l.base_credit,false AS archived
 FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id
 LEFT JOIN public.accounts a ON a.id=l.account_id
 WHERE e.status='posted' AND coalesce(l.line_date,e.transaction_date) BETWEEN p_from AND p_to
 ORDER BY e.transaction_date DESC,e.id,l.line_no LIMIT 500 OFFSET p_offset
 ) r;
 IF p_offset=0 THEN
 SELECT coalesce(jsonb_agg(row_to_json(b)),'[]') INTO opening FROM (
 SELECT l.account_id AS "accountId",l.currency_code AS currency,sum(l.debit-l.credit) AS balance,CASE WHEN bool_or(l.base_debit IS NULL OR l.base_credit IS NULL) THEN NULL ELSE sum(l.base_debit-l.base_credit) END AS base_balance
 FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id
 WHERE e.status='posted' AND coalesce(l.line_date,e.transaction_date)>=date_trunc('year',p_from)::date AND coalesce(l.line_date,e.transaction_date)<p_from
 GROUP BY l.account_id,l.currency_code HAVING sum(l.debit-l.credit)<>0 OR sum(l.base_debit-l.base_credit)<>0 OR bool_or(l.base_debit IS NULL OR l.base_credit IS NULL)
 ) b;
 END IF;
 SELECT md5(coalesce(sum(hashtextextended(concat_ws('|',e.id,e.entry_no,e.transaction_date,e.memo,e.status,e.updated_at,l.id,l.account_id,l.currency_code,l.debit,l.credit,l.line_date,l.description,l.fx_rate_lak,l.book_rate_lak),0)::numeric)::text,'0')) INTO revision
 FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id WHERE e.status='posted' AND coalesce(l.line_date,e.transaction_date)<=p_to;
 RETURN jsonb_build_object('rows',result,'opening',opening,'revision','posting-date143182:'||revision);
END $function$;
