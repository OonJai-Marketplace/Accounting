-- Do not turn an offline single-audit deletion into a whole-journal deletion.
CREATE OR REPLACE FUNCTION public.delete_audit_offline143174(p_request_key text,p_source text,p_id text,p_expected jsonb,p_void_request text DEFAULT NULL,p_entry_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE actor uuid:=auth.uid(); prior public.operation_receipts14228; prerequisite public.operation_receipts14228; payload jsonb; actual jsonb; subset jsonb; target text; policy text; result jsonb;
BEGIN
 IF actor IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501';END IF;
 IF p_request_key IS NULL OR length(p_request_key) NOT BETWEEN 10 AND 200 OR p_source NOT IN ('audit_log','record_deletions108') THEN RAISE EXCEPTION 'Stable deletion reference and audit source required';END IF;
 payload:=jsonb_build_object('source',p_source,'id',p_id,'expected',p_expected,'void_request',p_void_request,'entry_id',p_entry_id);
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_request_key,0));
 SELECT * INTO prior FROM public.operation_receipts14228 WHERE actor_id=actor AND request_key=p_request_key;
 IF FOUND THEN
  IF prior.operation<>'audit-delete143174' OR prior.payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Deletion reference already belongs to different data';END IF;
  RETURN prior.result;
 END IF;
 PERFORM pg_advisory_xact_lock(143120,1);
 IF p_void_request IS NOT NULL THEN
  SELECT * INTO prerequisite FROM public.operation_receipts14228 WHERE actor_id=actor AND request_key=p_void_request;
  IF NOT FOUND OR prerequisite.operation<>'journal-change14385' OR prerequisite.result->>'kind'<>'void' OR prerequisite.result->>'entry_id' IS DISTINCT FROM p_entry_id::text OR p_source<>'audit_log' THEN RAISE EXCEPTION 'The original void must be confirmed first' USING ERRCODE='40001';END IF;
  PERFORM 1 FROM public.journal_entries WHERE id=p_entry_id AND status='voided' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Voided journal changed or was already removed. Review this deletion.' USING ERRCODE='40001';END IF;
  SELECT id::text INTO target FROM public.audit_log WHERE table_name='journal_entries' AND record_id=p_entry_id::text ORDER BY created_at DESC,id DESC LIMIT 1;
  IF target IS NULL THEN RAISE EXCEPTION 'Linked audit history changed. Review this deletion.' USING ERRCODE='40001';END IF;
 ELSE
  IF p_expected IS NULL OR NOT p_expected ?& ARRAY['id','table_name','record_id','created_at'] THEN RAISE EXCEPTION 'Original audit snapshot required';END IF;
  target:=p_id;
  IF p_source='audit_log' THEN SELECT to_jsonb(a) INTO actual FROM public.audit_log a WHERE id::text=target FOR UPDATE;
  ELSE SELECT to_jsonb(d) INTO actual FROM public.record_deletions108 d WHERE id::text=target FOR UPDATE;END IF;
  SELECT jsonb_object_agg(key,actual->key) INTO subset FROM jsonb_each(p_expected);
  IF actual IS NULL OR subset IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Audit record changed or was removed. Review the retained deletion.' USING ERRCODE='40001';END IF;
 END IF;
 policy:=private.audit_delete_policy143124(p_source,target);
 IF policy NOT IN ('green','latest','latest_active') OR (p_entry_id IS NOT NULL AND policy<>'latest') OR (p_entry_id IS NULL AND policy='latest') THEN RAISE EXCEPTION 'Protected audit history. A newer journal may have been posted; review this deletion.' USING ERRCODE='40001';END IF;
 result:=public.delete_one_audit1437(p_source,target)||jsonb_build_object('request_key',p_request_key,'kind','audit-delete','entry_id',p_entry_id);
 IF (result->>'deleted')::integer<1 THEN RAISE EXCEPTION 'Deletion was not confirmed' USING ERRCODE='40001';END IF;
 INSERT INTO public.operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(actor,p_request_key,'audit-delete143174',payload,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.delete_audit_offline143174(text,text,text,jsonb,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_audit_offline143174(text,text,text,jsonb,text,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
