-- Required by the bundled account-provisioning and encrypted recovery functions.
BEGIN;
DO $$ BEGIN
 IF to_regclass('private.password_reset14257') IS NULL OR to_regprocedure('public.admin_save_access14281(uuid,text,text,jsonb)') IS NULL THEN RAISE EXCEPTION 'Install the verified password-reset and user-access foundation first';END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.account_provisioning14320 (
 email text PRIMARY KEY, actor_id uuid NOT NULL REFERENCES public.profiles(id),full_name text NOT NULL,request_id uuid NOT NULL DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.recovery_vaults14320 (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),version integer NOT NULL DEFAULT 1,
 ciphertext text NOT NULL,iv text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.recovery_tickets14320 (
 token_hash text PRIMARY KEY,actor_id uuid NOT NULL REFERENCES public.profiles(id),expires timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.recovery_attempts14320 (
 actor_id uuid PRIMARY KEY REFERENCES public.profiles(id),started_at timestamptz NOT NULL DEFAULT now(),attempts integer NOT NULL DEFAULT 0
);
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['account_provisioning14320','recovery_vaults14320','recovery_tickets14320','recovery_attempts14320'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
END LOOP;END $$;
CREATE OR REPLACE FUNCTION public.reserve_account14320(p_actor uuid,p_email text,p_name text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE r account_provisioning14320;BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_actor AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Administrator required';END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE lower(email)=p_email) AND NOT EXISTS(SELECT 1 FROM account_provisioning14320 WHERE email=p_email AND actor_id=p_actor) THEN RAISE EXCEPTION 'This email already has an account. Open it in Users instead';END IF;
 INSERT INTO account_provisioning14320(email,actor_id,full_name) VALUES(p_email,p_actor,p_name) ON CONFLICT DO NOTHING;
 SELECT * INTO r FROM account_provisioning14320 WHERE email=p_email FOR UPDATE;
 IF r.actor_id<>p_actor OR r.full_name<>p_name THEN RAISE EXCEPTION 'Account request changed. Retry the original details';END IF;
 RETURN jsonb_build_object('user_id',r.user_id,'request_id',r.request_id);
END $$;
CREATE OR REPLACE FUNCTION public.provisioned_account14320(p_actor uuid,p_email text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_actor AND role='admin' AND status='active') OR NOT EXISTS(SELECT 1 FROM account_provisioning14320 WHERE email=p_email AND actor_id=p_actor) THEN RAISE EXCEPTION 'Account request unavailable';END IF;
 RETURN jsonb_build_object('user_id',(SELECT u.id FROM auth.users u JOIN account_provisioning14320 r ON r.email=lower(u.email) WHERE r.email=p_email AND r.actor_id=p_actor AND u.raw_app_meta_data->>'provision_request14320'=r.request_id::text));
END $$;
CREATE OR REPLACE FUNCTION public.link_account14320(p_actor uuid,p_email text,p_user uuid,p_name text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE r account_provisioning14320;BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_actor AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Administrator required';END IF;
 SELECT * INTO r FROM account_provisioning14320 WHERE email=p_email FOR UPDATE;
 IF r.email IS NULL OR r.actor_id<>p_actor OR r.full_name<>p_name OR (r.user_id IS NOT NULL AND r.user_id<>p_user) OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user AND lower(email)=p_email AND raw_app_meta_data->>'provision_request14320'=r.request_id::text) THEN RAISE EXCEPTION 'Account request mismatch';END IF;
 -- Auth may already have created the profile through its normal trigger.
 INSERT INTO profiles(id,email,full_name,role,status) VALUES(p_user,p_email,p_name,'submitter','active') ON CONFLICT(id) DO NOTHING;
 IF r.user_id IS NULL THEN
  INSERT INTO private.password_reset14257(user_id,request_id,temporary_hash,required,issued_by)
  SELECT p_user,r.request_id,encrypted_password,true,p_actor FROM auth.users WHERE id=p_user
  ON CONFLICT(user_id) DO NOTHING;
 END IF;
 UPDATE account_provisioning14320 SET user_id=p_user WHERE email=p_email;
 RETURN jsonb_build_object('user_id',p_user);
END $$;
CREATE OR REPLACE FUNCTION public.recovery_attempt14320(p_actor uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE r recovery_attempts14320;BEGIN
 INSERT INTO recovery_attempts14320(actor_id) VALUES(p_actor) ON CONFLICT DO NOTHING;
 SELECT * INTO r FROM recovery_attempts14320 WHERE actor_id=p_actor FOR UPDATE;
 IF r.started_at<now()-interval '15 minutes' THEN UPDATE recovery_attempts14320 SET started_at=now(),attempts=1 WHERE actor_id=p_actor;RETURN true;END IF;
 IF r.attempts>=5 THEN RETURN false;END IF;
 UPDATE recovery_attempts14320 SET attempts=attempts+1 WHERE actor_id=p_actor;RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reserve_account14320(uuid,text,text),public.provisioned_account14320(uuid,text),public.link_account14320(uuid,text,uuid,text),public.recovery_attempt14320(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_account14320(uuid,text,text),public.provisioned_account14320(uuid,text),public.link_account14320(uuid,text,uuid,text),public.recovery_attempt14320(uuid) TO service_role;
NOTIFY pgrst,'reload schema';COMMIT;
