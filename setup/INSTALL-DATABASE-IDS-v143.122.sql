CREATE OR REPLACE FUNCTION private.reusable_journal_ids143120(p_prefix text,p_date date,p_digits integer)
RETURNS TABLE(entry_no text,number bigint) LANGUAGE sql STABLE SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT r.entry_no,n.number FROM private.reusable_journal_ids143120 r
 CROSS JOIN LATERAL (SELECT CASE WHEN substring(r.entry_no from length(p_prefix)+3) ~ '^[0-9]{1,18}$' THEN substring(r.entry_no from length(p_prefix)+3)::bigint END number) n
 WHERE extract(year from r.entry_date)=extract(year from p_date)
 AND r.entry_no=private.format_entry_id143114(p_prefix,p_date,n.number,p_digits)
 AND NOT EXISTS(SELECT 1 FROM public.journal_entries e WHERE e.entry_no=r.entry_no)
 ORDER BY n.number;
$$;
REVOKE ALL ON FUNCTION private.reusable_journal_ids143120(text,date,integer) FROM PUBLIC,anon,authenticated;
