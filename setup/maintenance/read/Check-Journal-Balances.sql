-- No edits needed. Healthy posted journals return NO rows.
-- Shows unbalanced currencies, insufficient lines, and missing posting accounts.
SELECT e.id,e.entry_no,e.transaction_date,l.currency_code,count(l.id) AS lines,
 coalesce(sum(l.debit),0) AS debit,coalesce(sum(l.credit),0) AS credit
FROM public.journal_entries e LEFT JOIN public.journal_lines l ON l.journal_entry_id=e.id
WHERE e.status='posted' GROUP BY e.id,e.entry_no,e.transaction_date,l.currency_code
HAVING count(l.id)<2 OR coalesce(sum(l.debit),0)<>coalesce(sum(l.credit),0)
UNION ALL
SELECT e.id,e.entry_no,e.transaction_date,l.currency_code,1,l.debit,l.credit
FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.journal_entry_id
LEFT JOIN public.accounts a ON a.id=l.account_id
WHERE e.status='posted' AND (a.id IS NULL OR NOT a.is_posting OR a.currency_code IS DISTINCT FROM l.currency_code)
ORDER BY transaction_date,entry_no;
