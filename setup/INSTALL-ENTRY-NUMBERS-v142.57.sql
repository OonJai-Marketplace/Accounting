-- Read-only preview of the same global sequence used when posting.
BEGIN;
CREATE OR REPLACE FUNCTION public.preview_journal_number14257(p_prefix text DEFAULT 'OJM',p_digits integer DEFAULT 6) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE next_number bigint; prefix text; digits integer; attempts integer:=0;
BEGIN
 IF NOT public.can_action113('journal','view') THEN RAISE EXCEPTION 'Journal access required' USING ERRCODE='42501'; END IF;
 SELECT CASE WHEN is_called THEN last_value+1 ELSE last_value END INTO next_number FROM public.journal_entry_number_seq;
 prefix:=left(coalesce(nullif(upper(regexp_replace(coalesce(nullif(trim(p_prefix),''),'OJM'),'[^A-Za-z0-9]','','g')),''),'OJM'),8);
 digits:=greatest(3,least(9,coalesce(p_digits,6)));
 WHILE EXISTS(SELECT 1 FROM public.journal_entries WHERE entry_no=prefix||'-'||lpad(next_number::text,digits,'0')) LOOP
  next_number:=next_number+1;attempts:=attempts+1;
  IF attempts>1000 THEN RAISE EXCEPTION 'Unable to preview a unique journal number'; END IF;
 END LOOP;
 RETURN next_number;
END $$;
REVOKE ALL ON FUNCTION public.preview_journal_number14257(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.preview_journal_number14257(text,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
