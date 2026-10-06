-- READ ONLY. One result cell includes every status and date (no UI filters).
-- Copy the result to identify records blocking the initial setup reset.
SELECT jsonb_build_object(
 'journal_count',(SELECT count(*) FROM public.journal_entries),
 'counts_by_status',(SELECT coalesce(jsonb_object_agg(status,n),'{}'::jsonb) FROM
  (SELECT coalesce(status::text,'NULL') status,count(*) n FROM public.journal_entries GROUP BY status) x),
 'journals_first_100',(SELECT coalesce(jsonb_agg(row_data),'[]'::jsonb) FROM
  (SELECT jsonb_build_object('id',e.id,'entry_no',e.entry_no,'date',e.transaction_date,'status',e.status,
    'memo',e.memo,'line_count',(SELECT count(*) FROM public.journal_lines l WHERE l.journal_entry_id=e.id)) row_data
   FROM public.journal_entries e ORDER BY e.transaction_date,e.entry_no LIMIT 100) x),
 'opening_setup',(SELECT to_jsonb(x) FROM (SELECT closed FROM public.opening_state14234 WHERE id) x),
 'year_closings',(SELECT count(*) FROM public.year_closings136)
) AS opening_setup_diagnosis;
