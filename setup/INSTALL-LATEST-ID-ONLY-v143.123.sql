-- Only the highest issued ID in this year/format can be offered again.
-- Keep older release markers as consumed-number evidence; never fill their gaps.
CREATE OR REPLACE FUNCTION private.reusable_journal_ids143120(p_prefix text,p_date date,p_digits integer)
RETURNS TABLE(entry_no text,number bigint) LANGUAGE sql STABLE SET search_path=pg_catalog,public,pg_temp AS $$
 WITH issued AS (
  SELECT e.entry_no FROM public.journal_entries e
  UNION SELECT r.entry_no FROM private.reusable_journal_ids143120 r
 ), numbered AS (
  SELECT i.entry_no,CASE WHEN substring(i.entry_no from length(p_prefix)+3) ~ '^[0-9]{1,18}$'
   THEN substring(i.entry_no from length(p_prefix)+3)::bigint END number FROM issued i
 ), latest AS (
  SELECT max(n.number) number FROM numbered n
  WHERE n.entry_no=private.format_entry_id143114(p_prefix,p_date,n.number,p_digits)
 )
 SELECT r.entry_no,l.number FROM private.reusable_journal_ids143120 r CROSS JOIN latest l
 WHERE r.entry_no=private.format_entry_id143114(p_prefix,p_date,l.number,p_digits)
 AND extract(year from r.entry_date)=extract(year from p_date)
 AND NOT EXISTS(SELECT 1 FROM public.journal_entries e WHERE e.entry_no=r.entry_no);
$$;
REVOKE ALL ON FUNCTION private.reusable_journal_ids143120(text,date,integer) FROM PUBLIC,anon,authenticated;
