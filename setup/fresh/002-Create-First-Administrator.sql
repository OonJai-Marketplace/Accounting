-- Fresh installations only. First create/confirm an Auth user in Supabase Dashboard.
-- Replace the UUID below with that user's ID. Never add a password or API secret here.
BEGIN;
DO $$ DECLARE actor uuid:='00000000-0000-0000-0000-000000000000';email_address text;BEGIN
 IF actor='00000000-0000-0000-0000-000000000000'::uuid THEN RAISE EXCEPTION 'Replace the placeholder with the first Auth administrator UUID';END IF;
 LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE role='admin' AND status='active') THEN RAISE EXCEPTION 'An active administrator already exists. Use Users & Permissions';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.installation14320 WHERE id AND NOT initialized) THEN RAISE EXCEPTION 'This database is not awaiting first installation';END IF;
 SELECT email INTO email_address FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL;
 IF email_address IS NULL THEN RAISE EXCEPTION 'Create and confirm the Auth user first';END IF;
 INSERT INTO public.profiles(id,email,full_name,role,status) VALUES(actor,email_address,'Administrator','admin','active')
 ON CONFLICT(id) DO UPDATE SET role='admin',status='active';
END $$;
COMMIT;
