-- Preserve the approved detailed-items / summary-contra workflow.
-- Read-only validator correction; financial rows are unchanged.
DO $fix$
DECLARE body text; old_block text := $old$  -- Each accounting date must balance separately, even when an entire entry balances.
  FOR b IN SELECT coalesce(line_date,e.transaction_date) posting_day,currency_code,sum(debit-credit) gap FROM public.journal_lines WHERE journal_entry_id=e.id GROUP BY 1,2 HAVING abs(sum(debit-credit))>0.005 LOOP
   issues:=issues||private.check_issue281('block','entry-day:'||e.id||':'||b.posting_day||':'||b.currency_code,'Journal date does not balance',e.entry_no||' / '||b.posting_day||' / '||b.currency_code||': difference '||b.gap||'.','ledger');
  END LOOP;
$old$; new_block text := $new$  -- A summary journal can retain item dates with one month-end contra line.
  -- Validate the complete journal per currency in maintenance_base281; do not
  -- require each receipt date within that journal to balance independently.
$new$;
BEGIN
 SELECT pg_get_functiondef('private.extended_check281(date)'::regprocedure) INTO body;
 IF position(old_block IN body)>0 THEN EXECUTE replace(body,old_block,new_block);
 ELSIF position(new_block IN body)=0 THEN RAISE EXCEPTION 'Unexpected extended validator body';
 END IF;
END $fix$;
