-- Desktop personal journal and exact single-record audit deletion.
-- Run as database owner. Installation never deletes existing audit records.
BEGIN;
CREATE OR REPLACE FUNCTION public.delete_one_audit1437(p_source text,p_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required';END IF;
 IF p_id IS NULL OR btrim(p_id)='' THEN RAISE EXCEPTION 'Choose one audit record';END IF;
 IF p_source='audit_log' THEN
  DELETE FROM public.audit_log WHERE id::text=p_id;
 ELSIF p_source='record_deletions108' AND to_regclass('public.record_deletions108') IS NOT NULL THEN
  EXECUTE 'DELETE FROM public.record_deletions108 WHERE id::text=$1' USING p_id;
 ELSE RAISE EXCEPTION 'Unknown audit source';END IF;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n>1 THEN RAISE EXCEPTION 'Single-record deletion must not affect multiple records';END IF;
 RETURN jsonb_build_object('deleted',n,'id',p_id,'source',p_source);
END $$;
REVOKE ALL ON FUNCTION public.delete_one_audit1437(text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.delete_one_audit1437(text,text) TO authenticated;

ALTER TABLE public.staff_journal_lines ADD COLUMN IF NOT EXISTS editor_group1437 text;
ALTER TABLE public.staff_journal_lines ADD COLUMN IF NOT EXISTS editor_snapshot1437 jsonb;
CREATE INDEX IF NOT EXISTS staff_editor_group1437_idx ON public.staff_journal_lines(editor_group1437);

-- The existing save RPC remains authoritative for ownership, assigned funds,
-- permitted accounts/directions, month locks, IDs and collection treatment.
-- All component saves run in ONE transaction: any failure rolls back all of them.
CREATE OR REPLACE FUNCTION public.save_staff_editor1437(
 p_owner uuid,p_key text,p_items jsonb,p_snapshot jsonb,p_edit_ids uuid[] DEFAULT ARRAY[]::uuid[]
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE item jsonb; saved record; line_id uuid; position integer:=0; ids uuid[]:=ARRAY[]::uuid[];
 old_id uuid; existing_ids uuid[]; snapshot jsonb; n integer; actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor AND status='active') THEN RAISE EXCEPTION 'Active login required';END IF;
 IF actor<>p_owner AND NOT public.is_admin() THEN RAISE EXCEPTION 'This personal journal is not accessible';END IF;
 IF p_key IS NULL OR length(p_key)<10 OR length(p_key)>160 THEN RAISE EXCEPTION 'Invalid save reference';END IF;
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items)<1 OR jsonb_array_length(p_items)>500 THEN RAISE EXCEPTION 'Provide 1 to 500 complete entries';END IF;
 IF jsonb_typeof(p_snapshot) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid editor snapshot';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':desktop-editor',0));
 SELECT array_agg(l.id),min(l.editor_snapshot1437::text)::jsonb INTO existing_ids,snapshot
 FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id
 WHERE j.owner_id=p_owner AND left(l.editor_group1437,length(p_key)+1)=p_key||':';
 IF cardinality(existing_ids)>0 THEN
  IF snapshot IS DISTINCT FROM p_snapshot THEN RAISE EXCEPTION 'Save reference already used; refresh before retrying';END IF;
  RETURN jsonb_build_object('line_ids',existing_ids,'already_saved',true);
 END IF;
 IF cardinality(p_edit_ids)>0 THEN
  SELECT count(*) INTO n FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id
  WHERE l.id=ANY(p_edit_ids) AND j.owner_id=p_owner AND j.status IN ('draft','returned') AND l.journal_entry_id IS NULL;
  IF n<>cardinality(p_edit_ids) THEN RAISE EXCEPTION 'Only editable entries in this personal journal can be changed';END IF;
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  position:=position+1;old_id:=p_edit_ids[position];
  SELECT * INTO saved FROM public.save_staff_workspace_entry_v3(
   p_owner_id=>p_owner,p_line_id=>old_id,p_client_key=>p_key||':'||position,
   p_transaction_date=>(item->>'date')::date,p_direction=>item->>'direction',
   p_fund_account_id=>(item->>'fund')::uuid,p_account_id=>(item->>'account')::uuid,
   p_memo=>item->>'memo',p_reference=>coalesce(item->>'reference',''),
   p_amount=>(item->>'amount')::numeric,p_entry_kind=>item->>'kind');
  line_id:=saved.line_id;
  IF line_id IS NULL THEN RAISE EXCEPTION 'Entry save returned no record';END IF;
  UPDATE public.staff_journal_lines l SET editor_group1437=p_key||':'||(item->>'date'),editor_snapshot1437=p_snapshot
  FROM public.staff_journals j WHERE l.id=line_id AND j.id=l.staff_journal_id AND j.owner_id=p_owner;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Saved entry owner did not match';END IF;
  ids:=array_append(ids,line_id);
 END LOOP;
 FOREACH old_id IN ARRAY coalesce(p_edit_ids,ARRAY[]::uuid[]) LOOP
  IF NOT old_id=ANY(ids) THEN PERFORM public.void_staff_workspace_entry(p_line_id=>old_id,p_reason=>'Replaced while editing the personal journal transaction');END IF;
 END LOOP;
 RETURN jsonb_build_object('line_ids',ids,'already_saved',false);
END $$;
REVOKE ALL ON FUNCTION public.save_staff_editor1437(uuid,text,jsonb,jsonb,uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.save_staff_editor1437(uuid,text,jsonb,jsonb,uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.void_staff_editor1437(p_owner uuid,p_ids uuid[],p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer;line_id uuid;
BEGIN
 IF auth.uid() IS NULL OR (auth.uid()<>p_owner AND NOT public.is_admin()) THEN RAISE EXCEPTION 'This personal journal is not accessible';END IF;
 IF cardinality(p_ids) IS NULL OR cardinality(p_ids)<1 OR nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Choose entries and provide a reason';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':desktop-editor',0));
 SELECT count(*) INTO n FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id
 WHERE l.id=ANY(p_ids) AND j.owner_id=p_owner AND j.status IN ('draft','returned') AND l.journal_entry_id IS NULL;
 IF n<>cardinality(p_ids) THEN RAISE EXCEPTION 'Only editable entries in this personal journal can be removed';END IF;
 FOREACH line_id IN ARRAY p_ids LOOP
  PERFORM public.void_staff_workspace_entry(p_line_id=>line_id,p_reason=>p_reason);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.void_staff_editor1437(uuid,uuid[],text) FROM public;
GRANT EXECUTE ON FUNCTION public.void_staff_editor1437(uuid,uuid[],text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
