-- v142.58: preserves the existing workspace security hook. Replaces the v142.57 combined installer.
BEGIN;
-- Forward-only password-reset gate. Does not change any existing passwords.
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.password_reset14257 (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id uuid NOT NULL, temporary_hash text, required boolean NOT NULL DEFAULT true,
 issued_by uuid NOT NULL, issued_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private.password_reset14257 FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.password_change_required14257() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,private AS $$
 SELECT EXISTS(SELECT 1 FROM private.password_reset14257 WHERE user_id=auth.uid() AND required)
$$;
REVOKE ALL ON FUNCTION public.password_change_required14257() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.password_change_required14257() TO authenticated;
CREATE OR REPLACE FUNCTION public.password_change_status14257() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,private AS $$
 SELECT jsonb_build_object('required',EXISTS(SELECT 1 FROM private.password_reset14257 WHERE user_id=auth.uid() AND required))
$$;
REVOKE ALL ON FUNCTION public.password_change_status14257() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.password_change_status14257() TO authenticated;
CREATE OR REPLACE FUNCTION public.password_gate14257() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,private AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM private.password_reset14257 WHERE user_id=auth.uid() AND required)
 AND coalesce(current_setting('request.path',true),'') NOT IN ('/rpc/password_change_status14257','/rpc/password_change_required14257')
 THEN RAISE SQLSTATE 'PT403' USING MESSAGE='PASSWORD_CHANGE_REQUIRED'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.password_gate14257() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.password_gate14257() TO authenticated,anon,service_role;
-- Compose the known workspace hook without changing its implementation or chain.
-- Check the real caller before account switching, then the effective user after it.
DO $$DECLARE setting text; use_workspace boolean:=false; scoped boolean:=false; BEGIN
 FOR setting IN SELECT unnest(setconfig) FROM pg_db_role_setting
 WHERE setrole=(SELECT oid FROM pg_roles WHERE rolname='authenticator')
 AND setdatabase IN (0,(SELECT oid FROM pg_database WHERE datname=current_database()))
 LOOP
  IF setting LIKE 'pgrst.db_pre_request=%' THEN
   IF setting NOT IN ('pgrst.db_pre_request=','pgrst.db_pre_request=public.password_gate14257','pgrst.db_pre_request=public.workspace_pre_request138','pgrst.db_pre_request=public.account_request_gate14258')
   THEN RAISE EXCEPTION 'Unknown Data API hook must be reviewed before installation: %',setting; END IF;
   use_workspace:=use_workspace OR setting IN ('pgrst.db_pre_request=public.workspace_pre_request138','pgrst.db_pre_request=public.account_request_gate14258');
  END IF;
 END LOOP;
 IF use_workspace THEN
  IF to_regprocedure('public.workspace_pre_request138()') IS NULL THEN RAISE EXCEPTION 'Existing workspace security hook is missing'; END IF;
  EXECUTE $create$CREATE OR REPLACE FUNCTION public.account_request_gate14258() RETURNS void
   LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $body$
   BEGIN
    PERFORM public.password_gate14257();
    PERFORM public.workspace_pre_request138();
    PERFORM public.password_gate14257();
   END $body$
  $create$;
  REVOKE ALL ON FUNCTION public.account_request_gate14258() FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.account_request_gate14258() TO authenticator,authenticated,anon,service_role;
  ALTER ROLE authenticator SET pgrst.db_pre_request='public.account_request_gate14258';
 ELSE
  ALTER ROLE authenticator SET pgrst.db_pre_request='public.password_gate14257';
 END IF;
 -- A database-specific role setting overrides the global one: compose it too.
 SELECT EXISTS(SELECT 1 FROM pg_db_role_setting,unnest(setconfig) c
  WHERE setrole=(SELECT oid FROM pg_roles WHERE rolname='authenticator')
  AND setdatabase=(SELECT oid FROM pg_database WHERE datname=current_database())
  AND c LIKE 'pgrst.db_pre_request=%') INTO scoped;
 IF scoped THEN EXECUTE format('ALTER ROLE authenticator IN DATABASE %I SET pgrst.db_pre_request=%L',current_database(),
  CASE WHEN use_workspace THEN 'public.account_request_gate14258' ELSE 'public.password_gate14257' END); END IF;
END $$;
-- Restrictive policies also cover direct RLS-backed reads and Storage access.
DO $$DECLARE t record; BEGIN
 FOR t IN SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind IN ('r','p') AND c.relrowsecurity AND (n.nspname='public' OR (n.nspname='storage' AND c.relname='objects'))
 LOOP
  EXECUTE format('DROP POLICY IF EXISTS password_gate14257 ON %I.%I',t.nspname,t.relname);
  EXECUTE format('CREATE POLICY password_gate14257 ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.password_change_required14257()) WITH CHECK (NOT public.password_change_required14257())',t.nspname,t.relname);
 END LOOP;
END $$;
-- Service-only helpers. Raw password hashes never leave the database.
CREATE OR REPLACE FUNCTION public.password_reset_service14257(p_action text,p_user uuid,p_actor uuid DEFAULT NULL,p_request uuid DEFAULT NULL,p_password text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,private AS $$
DECLARE row private.password_reset14257; current_hash text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 IF p_action='prepare' THEN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND role='admin' AND status='active')
  OR EXISTS(SELECT 1 FROM private.password_reset14257 WHERE user_id=p_actor AND required)
  THEN RAISE EXCEPTION 'Active administrator required' USING ERRCODE='42501'; END IF;
  IF p_user=p_actor THEN RAISE EXCEPTION 'Use your own password-change form instead'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user AND status='active') THEN RAISE EXCEPTION 'Active target user required'; END IF;
  INSERT INTO private.password_reset14257(user_id,request_id,issued_by) VALUES(p_user,p_request,p_actor)
  ON CONFLICT(user_id) DO UPDATE SET request_id=excluded.request_id,temporary_hash=NULL,required=true,issued_by=excluded.issued_by,issued_at=now()
  WHERE private.password_reset14257.temporary_hash IS NOT NULL OR private.password_reset14257.issued_at<now()-interval '2 minutes' OR NOT private.password_reset14257.required;
  IF NOT FOUND THEN RAISE EXCEPTION 'Another reset is still in progress. Retry after two minutes.'; END IF;
  RETURN jsonb_build_object('prepared',true);
 END IF;
 SELECT * INTO row FROM private.password_reset14257 WHERE user_id=p_user FOR UPDATE;
 IF NOT FOUND OR NOT row.required THEN RETURN jsonb_build_object('required',false); END IF;
 SELECT encrypted_password INTO current_hash FROM auth.users WHERE id=p_user;
 IF p_action='confirm' THEN
  IF row.request_id IS DISTINCT FROM p_request OR row.issued_by IS DISTINCT FROM p_actor THEN RAISE EXCEPTION 'Reset request changed'; END IF;
  IF current_hash IS NULL OR current_hash='' THEN RAISE EXCEPTION 'Password update unconfirmed'; END IF;
  UPDATE private.password_reset14257 SET temporary_hash=current_hash WHERE user_id=p_user;
  RETURN jsonb_build_object('confirmed',true);
 ELSIF p_action='complete' THEN
  IF row.temporary_hash IS NULL THEN RAISE EXCEPTION 'Temporary password setup is incomplete. Ask the administrator to retry.'; END IF;
  IF p_password IS NULL OR extensions.crypt(p_password,current_hash) IS DISTINCT FROM current_hash OR extensions.crypt(p_password,row.temporary_hash)=row.temporary_hash THEN RAISE EXCEPTION 'Set and confirm a different new password before continuing'; END IF;
  UPDATE private.password_reset14257 SET required=false,temporary_hash=NULL WHERE user_id=p_user;
  RETURN jsonb_build_object('completed',true);
 ELSIF p_action='status' THEN RETURN jsonb_build_object('required',row.required);
 ELSE RAISE EXCEPTION 'Unsupported operation'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.password_reset_service14257(text,uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.password_reset_service14257(text,uuid,uuid,uuid,text) TO service_role;
NOTIFY pgrst,'reload config';
NOTIFY pgrst,'reload schema';

-- Read-only preview of the same global sequence used when posting.
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
