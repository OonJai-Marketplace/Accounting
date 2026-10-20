-- Drafts live in Google Drive. This endpoint writes only after explicit approval.
BEGIN;
CREATE OR REPLACE FUNCTION public.drive_journal_receipt143128(p_sheet text,p_draft text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE k text;r public.operation_receipts14228;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Journal posting permission required' USING ERRCODE='42501'; END IF;
 IF p_sheet !~ '^[a-zA-Z0-9_-]{20,120}$' OR p_draft !~ '^[a-zA-Z0-9_-]{8,64}$' THEN RAISE EXCEPTION 'Invalid Drive draft reference';END IF;
 k:='drive-v1:'||p_sheet||':'||p_draft;
 SELECT * INTO r FROM public.operation_receipts14228 WHERE request_key=k AND operation='journal' ORDER BY created_at LIMIT 1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('payload',r.payload,'result',r.result,'approved_by',r.actor_id);
END $$;
CREATE OR REPLACE FUNCTION public.approve_drive_journal143128(p_sheet text,p_draft text,p_entry jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE k text;old jsonb;result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Journal posting permission required' USING ERRCODE='42501';END IF;
 IF p_sheet IS NULL OR p_draft IS NULL OR p_sheet !~ '^[a-zA-Z0-9_-]{20,120}$' OR p_draft !~ '^[a-zA-Z0-9_-]{8,64}$' THEN RAISE EXCEPTION 'Invalid Drive draft reference';END IF;
 k:='drive-v1:'||p_sheet||':'||p_draft;
 PERFORM pg_advisory_xact_lock(hashtextextended(k,0));
 old:=public.drive_journal_receipt143128(p_sheet,p_draft);
 IF old IS NOT NULL THEN
  IF old->'payload' IS DISTINCT FROM jsonb_build_array(p_entry) THEN RAISE EXCEPTION 'This Drive draft was already posted with different content. Review its existing journal; do not change its reference.';END IF;
  RETURN old->'result';
 END IF;
 result:=public.post_journal_batch14228(k,jsonb_build_array(p_entry));
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.drive_journal_receipt143128(text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.approve_drive_journal143128(text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.drive_journal_receipt143128(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_drive_journal143128(text,text,jsonb) TO authenticated;
COMMIT;
