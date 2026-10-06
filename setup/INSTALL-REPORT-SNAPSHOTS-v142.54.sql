-- Install after INSTALL-WORKFLOW-v142.53.sql. No existing report is rewritten.
-- Future report approvals retain the period's posted balances as seen at approval.
BEGIN;
CREATE OR REPLACE FUNCTION public.capture_report_funds14254() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE period date; balances jsonb;
BEGIN
 period := (NEW.snapshot->'journal'->>'period_start')::date;
 IF period IS NULL THEN RAISE EXCEPTION 'Report period is required'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO balances FROM (
  SELECT a.id account_id,a.name,a.currency_code currency,
   coalesce(sum(l.debit-l.credit) FILTER(WHERE coalesce(l.line_date,e.transaction_date)<period),0) opening,
   coalesce(sum(l.debit) FILTER(WHERE coalesce(l.line_date,e.transaction_date)>=period),0) received,
   coalesce(sum(l.credit) FILTER(WHERE coalesce(l.line_date,e.transaction_date)>=period),0) used,
   0::numeric handover,coalesce(sum(l.debit-l.credit),0) closing
  FROM public.accounts a
  LEFT JOIN public.journal_lines l ON l.account_id=a.id AND EXISTS(
   SELECT 1 FROM public.journal_entries h WHERE h.id=l.journal_entry_id AND h.status::text='posted'
   AND coalesce(l.line_date,h.transaction_date)<(period+interval '1 month')::date)
  LEFT JOIN public.journal_entries e ON e.id=l.journal_entry_id
  WHERE a.id IN (SELECT s.fund_account_id FROM public.staff_journal_lines s WHERE s.staff_journal_id=NEW.journal_id)
   OR a.id::text IN (SELECT jsonb_array_elements_text(coalesce(to_jsonb(up)->'assigned_fund_account_ids','[]'::jsonb))
     FROM public.user_permissions up WHERE up.user_id=NEW.owner_id)
  GROUP BY a.id,a.name,a.currency_code,a.code ORDER BY a.code
 ) t;
 NEW.snapshot := NEW.snapshot || jsonb_build_object(
  'fund_snapshot14254',coalesce(balances,'[]'::jsonb),
  'fund_snapshot_at14254',now());
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_report_funds14254() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS capture_report_funds14254 ON public.approved_reports1443;
CREATE TRIGGER capture_report_funds14254 BEFORE INSERT ON public.approved_reports1443
FOR EACH ROW EXECUTE FUNCTION public.capture_report_funds14254();

-- Keep existing row visibility and access checks; return the saved period too.
CREATE OR REPLACE FUNCTION public.report_history14229() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Current accounting access required'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
  'journal_id',a.journal_id,'owner_id',a.owner_id,
  'period_start',a.snapshot->'journal'->>'period_start',
  'approved_at',a.approved_at,'approved_by',a.approved_by,
  'review_route14229',to_jsonb(r)) ORDER BY a.approved_at DESC)
 FROM public.approved_reports1443 a LEFT JOIN public.review_routes14229 r ON r.journal_id=a.journal_id
 WHERE public.journal_visible14229(a.journal_id) AND public.report_access1443(a.owner_id)),'[]');
END $$;
REVOKE ALL ON FUNCTION public.report_history14229() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.report_history14229() TO authenticated;
COMMIT;
