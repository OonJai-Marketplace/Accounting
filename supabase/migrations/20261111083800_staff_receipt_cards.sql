-- Keep each phone receipt independently editable, including receipts with the same date.
CREATE OR REPLACE FUNCTION public.save_staff_editor1437(p_owner uuid, p_key text, p_items jsonb, p_snapshot jsonb, p_edit_ids uuid[] DEFAULT ARRAY[]::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE receipt public.operation_receipts14228;request_payload jsonb;item jsonb; saved record; line_id uuid; position integer:=0; ids uuid[]:=ARRAY[]::uuid[];
 old_id uuid; existing_ids uuid[]; snapshot jsonb; n integer; actor uuid:=auth.uid();
 card jsonb; cards jsonb:=p_snapshot->'receiptCards341'; card_no integer:=0; card_end integer:=0;
 group_suffix text; stored_snapshot jsonb; batch_fingerprint text;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor AND status='active') THEN RAISE EXCEPTION 'Active login required';END IF;
 IF p_owner IS NULL OR NOT public.can_workspace113(p_owner) OR NOT public.can_action113(CASE WHEN actor=p_owner THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'edit') THEN RAISE EXCEPTION 'Current workspace edit access required';END IF;
 IF p_key IS NULL OR length(p_key)<10 OR length(p_key)>160 THEN RAISE EXCEPTION 'Invalid save reference';END IF;
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items)<1 OR jsonb_array_length(p_items)>500 THEN RAISE EXCEPTION 'Provide 1 to 500 complete entries';END IF;
 IF jsonb_typeof(p_snapshot) IS DISTINCT FROM 'object' OR p_snapshot->'components1437' IS DISTINCT FROM p_items THEN RAISE EXCEPTION 'Editor snapshot must match the supplied entries';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':desktop-editor',0));
 request_payload:=jsonb_build_object('owner',p_owner,'items',p_items,'snapshot',p_snapshot,'edit_ids',coalesce(p_edit_ids,ARRAY[]::uuid[]));
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=actor AND request_key=p_key;
 IF FOUND THEN
  IF receipt.operation<>'staff-editor' OR receipt.payload IS DISTINCT FROM request_payload THEN RAISE EXCEPTION 'Save reference already used for different data';END IF;
  RETURN receipt.result||jsonb_build_object('already_saved',true);
 END IF;
 SELECT array_agg(l.id),min(l.editor_snapshot1437::text)::jsonb INTO existing_ids,snapshot
 FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id
 WHERE j.owner_id=p_owner AND left(l.editor_group1437,length(p_key)+1)=p_key||':';
 IF cards IS NOT NULL THEN
  IF jsonb_typeof(cards) IS DISTINCT FROM 'array' OR jsonb_array_length(cards) NOT BETWEEN 1 AND 500 THEN
   RAISE EXCEPTION 'Provide a snapshot for each receipt';
  END IF;
  FOR card IN SELECT value FROM jsonb_array_elements(cards) LOOP
   IF jsonb_typeof(card->'components1437') IS DISTINCT FROM 'array' OR jsonb_array_length(card->'components1437')<1
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(card->'components1437') i WHERE i->>'date' IS DISTINCT FROM card->>'date') THEN
    RAISE EXCEPTION 'Each receipt must contain entries for its own date';
   END IF;
  END LOOP;
  IF (SELECT jsonb_agg(i.value ORDER BY c.ord,i.ord) FROM jsonb_array_elements(cards) WITH ORDINALITY c(value,ord)
      CROSS JOIN LATERAL jsonb_array_elements(c.value->'components1437') WITH ORDINALITY i(value,ord)) IS DISTINCT FROM p_items THEN
   RAISE EXCEPTION 'Receipt cards must match the complete entries in order';
  END IF;
  batch_fingerprint:=encode(sha256(convert_to(request_payload::text,'UTF8')),'hex');
 END IF;
 IF cardinality(existing_ids)>0 THEN
  IF (cards IS NULL AND snapshot IS DISTINCT FROM p_snapshot) OR
     (cards IS NOT NULL AND (snapshot->>'batchFingerprint341' IS DISTINCT FROM batch_fingerprint OR cardinality(existing_ids)<>jsonb_array_length(p_items))) THEN RAISE EXCEPTION 'Save reference already used; refresh before retrying';END IF;
  RETURN jsonb_build_object('line_ids',existing_ids,'already_saved',true);
 END IF;
 IF cardinality(p_edit_ids)>0 THEN
  SELECT count(*) INTO n FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id
  WHERE l.id=ANY(p_edit_ids) AND j.owner_id=p_owner AND j.status IN ('draft','returned') AND l.journal_entry_id IS NULL;
  IF n<>cardinality(p_edit_ids) THEN RAISE EXCEPTION 'Only editable entries in this personal journal can be changed';END IF;
 END IF;
 -- Explicit target applies only to new lines; v3 rechecks owner, period and returned status.
 PERFORM set_config('app.correction_journal14347',coalesce(p_snapshot->>'correction_journal14347',''),true);
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
  IF cards IS NULL THEN
   group_suffix:=item->>'date'; stored_snapshot:=p_snapshot;
  ELSE
   IF position>card_end THEN
    card:=cards->card_no; card_no:=card_no+1;
    card_end:=card_end+jsonb_array_length(card->'components1437');
    stored_snapshot:=card||jsonb_build_object('batchFingerprint341',batch_fingerprint,'correction_journal14347',p_snapshot->'correction_journal14347');
   END IF;
   group_suffix:='r'||card_no||':'||(item->>'date');
  END IF;
  UPDATE public.staff_journal_lines l SET editor_group1437=p_key||':'||group_suffix,editor_snapshot1437=stored_snapshot,fx_rate_lak=nullif(item->>'fx_rate_lak','')::numeric
  FROM public.staff_journals j WHERE l.id=line_id AND j.id=l.staff_journal_id AND j.owner_id=p_owner;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Saved entry owner did not match';END IF;
  ids:=array_append(ids,line_id);
 END LOOP;
 FOREACH old_id IN ARRAY coalesce(p_edit_ids,ARRAY[]::uuid[]) LOOP
  IF NOT old_id=ANY(ids) THEN PERFORM public.void_staff_workspace_entry(p_line_id=>old_id,p_reason=>'Replaced while editing the personal journal transaction');END IF;
 END LOOP;
 PERFORM set_config('app.correction_journal14347','',true);
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(actor,p_key,'staff-editor',request_payload,jsonb_build_object('line_ids',ids,'already_saved',false));
 RETURN jsonb_build_object('line_ids',ids,'already_saved',false);
END $function$;
