CREATE OR REPLACE FUNCTION public.journal_change_receipt14385(p_request_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.operation_receipts14228;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Current journal permission required' USING ERRCODE='42501';END IF;
 SELECT * INTO r FROM public.operation_receipts14228 WHERE actor_id=auth.uid() AND request_key=p_request_key AND operation='journal-change14385';
 IF NOT FOUND THEN RETURN NULL;END IF;
 RETURN jsonb_build_object('payload',r.payload,'result',r.result);
END $$;
REVOKE ALL ON FUNCTION public.journal_change_receipt14385(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.journal_change_receipt14385(text) TO authenticated;
NOTIFY pgrst,'reload schema';
