CREATE OR REPLACE FUNCTION public.delete_one_audit1437(p_source text,p_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE n integer; target text; state text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required';END IF;
 IF p_id IS NULL OR btrim(p_id)='' THEN RAISE EXCEPTION 'Choose one audit record';END IF;
 PERFORM pg_advisory_xact_lock(143120,1);
 IF p_source='audit_log' THEN
  SELECT a.record_id,e.status::text INTO target,state FROM public.audit_log a
  LEFT JOIN public.journal_entries e ON e.id::text=a.record_id AND a.table_name='journal_entries'
  WHERE a.id::text=p_id;
  IF state='voided' THEN
   DELETE FROM public.audit_log WHERE table_name='journal_entries' AND record_id=target;
   GET DIAGNOSTICS n=ROW_COUNT;
   -- The existing trigger purges the voided header/lines and releases its number.
   -- Delete the resulting archive too: this is an explicit permanent deletion.
   DELETE FROM public.record_deletions108 WHERE table_name='journal_entries' AND record_id::text=target;
  ELSE
   DELETE FROM public.audit_log WHERE id::text=p_id;
   GET DIAGNOSTICS n=ROW_COUNT;
  END IF;
 ELSIF p_source='record_deletions108' THEN
  DELETE FROM public.record_deletions108 WHERE id::text=p_id;
  GET DIAGNOSTICS n=ROW_COUNT;
 ELSE RAISE EXCEPTION 'Unknown audit source';END IF;
 RETURN jsonb_build_object('deleted',n,'id',p_id,'source',p_source);
END $$;
REVOKE ALL ON FUNCTION public.delete_one_audit1437(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_one_audit1437(text,text) TO authenticated;
