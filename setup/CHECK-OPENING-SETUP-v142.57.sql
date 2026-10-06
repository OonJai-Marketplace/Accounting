-- READ ONLY. Run in the Supabase SQL editor to see why an apparently empty
-- journal may still be closed to opening balances. No amounts or identities.
SELECT closed,generation,request_key IS NOT NULL AS opening_was_attempted FROM public.opening_state14234 WHERE id;
SELECT status,count(*) AS saved_journal_headers FROM public.journal_entries GROUP BY status;
SELECT count(*) AS saved_journal_lines FROM public.journal_lines;
SELECT operation,count(*) AS retained_retry_receipts FROM public.operation_receipts14228 GROUP BY operation;
SELECT status,count(*) AS accounting_periods FROM public.accounting_periods GROUP BY status;
SELECT count(*) AS year_closings FROM public.year_closings136;
SELECT table_name,count(*) AS financial_audit_rows FROM public.audit_log WHERE table_name IN ('journal_entries','journal_lines','year_closings136') GROUP BY table_name;
