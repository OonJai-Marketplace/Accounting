-- Per-user input/view preference only. Existing accounts and journal data are unchanged.
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS workspace_entry_mode240 text NOT NULL DEFAULT 'double_simple';
ALTER TABLE public.user_permissions DROP CONSTRAINT IF EXISTS user_permissions_workspace_entry_mode240_check;
ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_workspace_entry_mode240_check
 CHECK (workspace_entry_mode240 IN ('cashbook','double_simple','double_full','both'));
CREATE OR REPLACE FUNCTION public.admin_save_access14281(p_user uuid, p_name text, p_role text, p_permissions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE result jsonb; ids uuid[]; entry_mode text;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Active administrator required' USING ERRCODE='42501'; END IF;
 IF p_permissions ? 'ledger_account_ids14281' THEN
  IF jsonb_typeof(p_permissions->'ledger_account_ids14281') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Ledger accounts must be an array'; END IF;
  SELECT coalesce(array_agg(DISTINCT v::uuid),'{}'::uuid[]) INTO ids FROM jsonb_array_elements_text(p_permissions->'ledger_account_ids14281') AS x(v);
  IF EXISTS(SELECT 1 FROM unnest(ids) x WHERE x IS NULL OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=x AND is_posting)) THEN RAISE EXCEPTION 'Choose valid posting accounts for ledger access'; END IF;
 ELSE SELECT coalesce(ledger_account_ids14281,'{}') INTO ids FROM user_permissions WHERE user_id=p_user;
 END IF;
 IF p_permissions ? 'workspace_entry_mode240' THEN
  entry_mode:=p_permissions->>'workspace_entry_mode240';
  IF entry_mode IS NULL OR entry_mode NOT IN ('cashbook','double_simple','double_full','both') THEN RAISE EXCEPTION 'Choose a valid bookkeeping mode'; END IF;
 ELSE SELECT workspace_entry_mode240 INTO entry_mode FROM public.user_permissions WHERE user_id=p_user;
 END IF;
 result:=public.admin_save_access1441(p_user,p_name,p_role,p_permissions);
 UPDATE user_permissions SET workspace_entry_mode240=coalesce(entry_mode,'double_simple'),ledger_account_ids14281=coalesce(ids,'{}') WHERE user_id=p_user;
 RETURN result||jsonb_build_object('ledger_saved',true);
END $function$
;
REVOKE ALL ON FUNCTION public.admin_save_access14281(uuid,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_save_access14281(uuid,text,text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
