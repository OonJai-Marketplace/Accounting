-- EDIT ONLY these dates. Counts staff workspace transaction lines separately from journals.
WITH dates AS (SELECT DATE '2026-01-01' AS start_date,DATE '2026-12-31' AS end_date)
SELECT j.status,count(*) AS transaction_lines,count(DISTINCT l.staff_journal_id) AS reports,
 count(*) FILTER(WHERE l.journal_entry_id IS NOT NULL) AS posted_lines
FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id CROSS JOIN dates d
WHERE l.transaction_date BETWEEN d.start_date AND d.end_date GROUP BY j.status ORDER BY j.status;
