-- EDIT ONLY the two dates below. Both dates are included.
WITH dates AS (SELECT DATE '2026-01-01' AS start_date,DATE '2026-12-31' AS end_date)
SELECT e.status,e.source,count(DISTINCT e.id) AS journals,count(l.id) AS lines
FROM public.journal_entries e LEFT JOIN public.journal_lines l ON l.journal_entry_id=e.id CROSS JOIN dates d
WHERE e.transaction_date BETWEEN d.start_date AND d.end_date
GROUP BY e.status,e.source ORDER BY e.status,e.source;
