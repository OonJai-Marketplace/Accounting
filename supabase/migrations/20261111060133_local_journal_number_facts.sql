-- This download supplies historical facts to the device during normal sync.
-- The Post Entry editor does not call it or request a calculated next number.
DO $facts$
DECLARE def text;old_sql text:='''next'',public.preview_journal_number143114(p_date,prefix,digits),';
BEGIN
 def:=pg_get_functiondef('public.offline_journal_state143174(date,text,integer)'::regprocedure);
 IF strpos(def,old_sql)=0 THEN RAISE EXCEPTION 'Unexpected journal snapshot';END IF;
 def:=replace(def,'FUNCTION public.offline_journal_state143174(','FUNCTION public.journal_number_records335(');
 EXECUTE replace(def,old_sql,$fields$
 'retained',(SELECT coalesce(jsonb_agg(label),'[]'::jsonb) FROM (
   SELECT e.entry_no label FROM public.journal_entries e
   UNION SELECT t.entry_no FROM private.reusable_journal_ids143120 t
   UNION SELECT a.former_no FROM private.journal_number_aliases298 a WHERE NOT a.reusable335 AND NOT
    (a.replacement_no ~ '^(AMO|REC)[0-9]{2}-[0-9]+$' AND a.former_no !~ '^(AMO|REC)[0-9]{2}-[0-9]+$')
 ) records WHERE label ~ ('^'||prefix||'[0-9]{3,20}$')),
 'available',(SELECT coalesce(jsonb_agg(label),'[]'::jsonb) FROM (
   SELECT r.entry_no label FROM private.reusable_journal_ids143120(prefix,p_date,digits) r
   UNION SELECT r.from_no FROM private.journal_number_reviews335 r WHERE r.applied_at IS NOT NULL AND r.reused_at IS NULL
   AND NOT EXISTS(SELECT FROM public.journal_entries e WHERE e.entry_no=r.from_no)
 ) releases WHERE starts_with(label,prefix||to_char(p_date,'YY'))),
 'reserved',(SELECT coalesce(jsonb_agg(r.to_no),'[]'::jsonb) FROM private.journal_number_reviews335 r WHERE r.applied_at IS NULL
 AND starts_with(r.to_no,prefix||to_char(p_date,'YY'))),$fields$);
END $facts$;
REVOKE ALL ON FUNCTION public.journal_number_records335(date,text,integer) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.journal_number_records335(date,text,integer) TO authenticated;
