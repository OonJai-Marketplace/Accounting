-- Show the signed-in administrator their confirmed journal edit reasons, on demand.
CREATE OR REPLACE FUNCTION public.my_journal_edit_reasons377(p_month date, p_offset integer DEFAULT 0)
RETURNS TABLE(edited_at timestamptz, entry_no text, reason text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
 SELECT r.created_at, r.result->>'entry_no', r.payload->>'reason'
 FROM public.operation_receipts14228 AS r
 WHERE r.actor_id = (SELECT auth.uid())
   AND (SELECT public.is_admin()) AND (SELECT public.active_account14228())
   AND (SELECT public.accounting_workspace_allowed123()) AND NOT (SELECT public.password_change_required14257())
   AND r.operation = 'journal-change14385' AND r.payload->>'kind' = 'revise'
   AND r.created_at >= (date_trunc('month',p_month::timestamp) AT TIME ZONE 'Asia/Vientiane')
   AND r.created_at < ((date_trunc('month',p_month::timestamp) + interval '1 month') AT TIME ZONE 'Asia/Vientiane')
 ORDER BY r.created_at DESC, r.request_key DESC
 LIMIT 51 OFFSET greatest(coalesce(p_offset,0),0);
$$;
REVOKE ALL ON FUNCTION public.my_journal_edit_reasons377(date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_journal_edit_reasons377(date, integer) TO authenticated;
NOTIFY pgrst, 'reload schema';
