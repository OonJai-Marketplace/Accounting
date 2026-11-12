-- Keep enough information to verify an exact retry after the author removes the note.
CREATE FUNCTION private.without_journal_reason377(payload jsonb, request_key text)
RETURNS jsonb LANGUAGE sql IMMUTABLE STRICT SET search_path = pg_catalog AS $$
 SELECT (payload - 'reason') || jsonb_build_object('reason_hash377',
   encode(sha256(convert_to(request_key || ':' || (payload->>'reason'),'UTF8')),'hex'));
$$;
REVOKE ALL ON FUNCTION private.without_journal_reason377(jsonb,text) FROM PUBLIC, anon, authenticated;

DO $upgrade$
DECLARE def text:=pg_get_functiondef('public.change_journal14385(text,uuid,text,text,jsonb,jsonb)'::regprocedure);
 needle text:='prior.payload IS DISTINCT FROM payload';
BEGIN
 IF strpos(def,needle)=0 THEN RAISE EXCEPTION 'Unexpected journal retry check'; END IF;
 EXECUTE replace(def,needle,'prior.payload IS DISTINCT FROM (CASE WHEN prior.payload ? ''reason_hash377'' THEN private.without_journal_reason377(payload,p_request_key) ELSE payload END)');
END $upgrade$;

CREATE FUNCTION public.my_active_journal_notes377(p_month date, p_offset integer DEFAULT 0)
RETURNS TABLE(edited_at timestamptz, entry_no text, reason text, note_key text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
 SELECT r.created_at, r.result->>'entry_no', r.payload->>'reason', r.request_key
 FROM public.operation_receipts14228 AS r
 WHERE r.actor_id = (SELECT auth.uid())
   AND (SELECT public.is_admin()) AND (SELECT public.active_account14228())
   AND (SELECT public.accounting_workspace_allowed123()) AND NOT (SELECT public.password_change_required14257())
   AND r.operation = 'journal-change14385' AND r.payload->>'kind' = 'revise' AND r.payload ? 'reason'
   AND r.created_at >= (date_trunc('month',p_month::timestamp) AT TIME ZONE 'Asia/Vientiane')
   AND r.created_at < ((date_trunc('month',p_month::timestamp) + interval '1 month') AT TIME ZONE 'Asia/Vientiane')
 ORDER BY r.created_at DESC, r.request_key DESC
 LIMIT 51 OFFSET greatest(coalesce(p_offset,0),0);
$$;
REVOKE ALL ON FUNCTION public.my_active_journal_notes377(date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_active_journal_notes377(date, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_journal_edit_reasons377(p_month date, p_offset integer DEFAULT 0)
RETURNS TABLE(edited_at timestamptz, entry_no text, reason text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
 SELECT n.edited_at,n.entry_no,n.reason FROM public.my_active_journal_notes377(p_month,p_offset) n;
$$;

CREATE FUNCTION public.delete_my_journal_edit_note377(p_note_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR NOT coalesce(public.is_admin() AND public.active_account14228()
   AND public.accounting_workspace_allowed123() AND NOT public.password_change_required14257(),false)
 THEN RAISE EXCEPTION 'Active administrator access required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_note_key,0));
 UPDATE public.operation_receipts14228 r SET payload=private.without_journal_reason377(r.payload,r.request_key)
 WHERE r.actor_id=actor AND r.request_key=p_note_key AND r.operation='journal-change14385'
   AND r.payload->>'kind'='revise' AND r.payload ? 'reason';
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.delete_my_journal_edit_note377(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_journal_edit_note377(text) TO authenticated;
NOTIFY pgrst, 'reload schema';
