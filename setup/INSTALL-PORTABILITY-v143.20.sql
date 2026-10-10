-- Additive metadata only. Does not change user roles, transactions, or service ownership.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.profiles') IS NULL OR to_regclass('public.business_settings') IS NULL
 OR to_regclass('public.budget_settings14313') IS NULL OR to_regprocedure('public.current_access14228()') IS NULL THEN
  RAISE EXCEPTION 'Install the verified Accounting database foundation and budget settings first. This is an additive update, not the missing original schema.';
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.installation14320 (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), instance uuid NOT NULL DEFAULT gen_random_uuid(),
 initialized boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1,
 deployment jsonb NOT NULL DEFAULT '{}', incoming_admin uuid REFERENCES public.profiles(id),
 checks jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES public.profiles(id)
);
CREATE TABLE IF NOT EXISTS public.handover_history14320 (
 request_key uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES public.profiles(id),
 payload jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.installation14320(id,initialized)
 SELECT true,EXISTS(SELECT 1 FROM public.profiles) ON CONFLICT DO NOTHING;
ALTER TABLE public.installation14320 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_history14320 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.installation14320,public.handover_history14320 FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.installation_status14320() RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND status='active')
 OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('installation',(SELECT to_jsonb(i) FROM installation14320 i WHERE id),
  'company',(SELECT to_jsonb(b) FROM business_settings b WHERE id),
  'accounts',(SELECT to_jsonb(b) FROM budget_settings14313 b WHERE id));
END $$;
CREATE OR REPLACE FUNCTION public.save_installation14320(
 p_request_key uuid,p_expected_version integer,p_expected_budget_version integer,p_mode text,
 p_company jsonb,p_accounts jsonb,p_deployment jsonb,p_incoming uuid,p_checks jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE s installation14320;b budget_settings14313;payload jsonb;receipt handover_history14320;r jsonb;k text;v text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND status='active')
 OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required' USING ERRCODE='42501';END IF;
 IF p_request_key IS NULL THEN RAISE EXCEPTION 'A save reference is required';END IF;
 IF jsonb_typeof(p_company) IS DISTINCT FROM 'object' OR jsonb_typeof(p_accounts) IS DISTINCT FROM 'object' OR jsonb_typeof(p_deployment) IS DISTINCT FROM 'object' OR jsonb_typeof(p_checks) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid settings';END IF;
 -- Whitelist fields before even the retry/audit payload is persisted.
 p_company=jsonb_build_object('name',p_company->>'name','email',p_company->>'email');
 p_accounts=jsonb_build_object('emailSender',p_accounts->>'emailSender','emails',p_accounts->>'emails','trialEmailTo',p_accounts->>'trialEmailTo','chatgptAccountEmail',p_accounts->>'chatgptAccountEmail','gmailClientId',p_accounts->>'gmailClientId');
 p_deployment=jsonb_build_object('siteUrl',p_deployment->>'siteUrl,'repository',p_deployment->>'repository','branch',p_deployment->>'branch','accounting',p_deployment->>'accounting','publicRestaurant',p_deployment->>'publicRestaurant','restaurant',p_deployment->>'restaurant');
 p_checks=jsonb_build_object('github',p_checks->'github','supabase',p_checks->'supabase','recovery',p_checks->'recovery','login',p_checks->'login','gmail',p_checks->'gmail','chatgpt',p_checks->'chatgpt');
 payload=jsonb_build_object('version',p_expected_version,'budgetVersion',p_expected_budget_version,'mode',p_mode,'company',p_company,'accounts',p_accounts,'deployment',p_deployment,'incoming',p_incoming,'checks',p_checks);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_key::text,0));
 SELECT * INTO receipt FROM handover_history14320 WHERE request_key=p_request_key;
 IF FOUND THEN IF receipt.actor_id<>auth.uid() OR receipt.payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Save reference already used';END IF;RETURN receipt.result;END IF;
 SELECT * INTO s FROM installation14320 WHERE id FOR UPDATE;
 SELECT * INTO b FROM budget_settings14313 WHERE id FOR UPDATE;
 IF s.id IS NULL OR s.version IS DISTINCT FROM p_expected_version OR coalesce(b.version,0) IS DISTINCT FROM p_expected_budget_version THEN RAISE EXCEPTION 'Company settings changed elsewhere. Reopen before saving';END IF;
 IF p_mode NOT IN ('install','settings','handover') OR p_mode IS NULL THEN RAISE EXCEPTION 'Choose a valid operation';END IF;
 IF (p_mode='install')=s.initialized THEN RAISE EXCEPTION 'Installation state changed. Reopen setup';END IF;
 IF jsonb_typeof(p_company) IS DISTINCT FROM 'object' OR jsonb_typeof(p_accounts) IS DISTINCT FROM 'object' OR jsonb_typeof(p_deployment) IS DISTINCT FROM 'object' OR jsonb_typeof(p_checks) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid settings';END IF;
 IF length(btrim(coalesce(p_company->>'name','')))<1 OR length(p_company->>'name')>160 THEN RAISE EXCEPTION 'Enter the company name';END IF;
 FOREACH k IN ARRAY ARRAY['emailSender','chatgptAccountEmail','trialEmailTo','companyEmail'] LOOP
  v=coalesce(CASE WHEN k='companyEmail' THEN p_company->>'email' ELSE p_accounts->>k END,'');
  IF length(v)>254 OR (v<>'' AND v!~ '^[^[:space:]@,;]+@[^[:space:]@,;]+\.[^[:space:]@,;]+$') THEN RAISE EXCEPTION 'Enter a valid email address: %',k;END IF;
 END LOOP;
 IF length(coalesce(p_accounts->>'emails',''))>4000 THEN RAISE EXCEPTION 'Recipient list is too long';END IF;
 FOR v IN SELECT btrim(value) FROM regexp_split_to_table(coalesce(p_accounts->>'emails',''),'[,;]') value LOOP
  IF v<>'' AND v!~ '^[^[:space:]@,;]+@[^[:space:]@,;]+\.[^[:space:]@,;]+$' THEN RAISE EXCEPTION 'Enter valid recipient addresses';END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['siteUrl','accounting','publicRestaurant','restaurant'] LOOP
  v=coalesce(p_deployment->>k,'');
  IF (k IN ('siteUrl','accounting') AND v='') OR (v<>'' AND (length(v)>2048 OR v!~ '^https?://[^/[:space:]@]+([/?#][^[:space:]]*)?$')) THEN RAISE EXCEPTION 'Enter a published HTTP or HTTPS URL: %',k;END IF;
 END LOOP;
 IF coalesce(p_deployment->>'repository','')!~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' OR coalesce(p_deployment->>'branch','')!~ '^[A-Za-z0-9_./-]+$' THEN RAISE EXCEPTION 'Enter repository owner/name and branch';END IF;
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_incoming AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Choose an active administrator';END IF;
 IF p_mode='handover' AND p_incoming=auth.uid() THEN RAISE EXCEPTION 'Choose the incoming administrator';END IF;
 IF p_mode IN ('install','handover') THEN
  FOREACH k IN ARRAY ARRAY['github','supabase','recovery','login'] LOOP
   IF p_checks->k IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Complete the service check: %',k;END IF;
  END LOOP;
  IF coalesce(p_accounts->>'emailSender','')<>'' AND p_checks->'gmail' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Confirm Gmail authorization';END IF;
  IF coalesce(p_accounts->>'chatgptAccountEmail','')<>'' AND p_checks->'chatgpt' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Confirm the ChatGPT task handover';END IF;
 END IF;
 -- Preserve unrelated company fields and every budget category/template preference.
 INSERT INTO business_settings(id,legal_name,display_name,email,updated_at,updated_by)
 VALUES(true,btrim(p_company->>'name'),btrim(p_company->>'name'),coalesce(p_company->>'email',''),now(),auth.uid())
 ON CONFLICT(id) DO UPDATE SET legal_name=excluded.legal_name,display_name=excluded.display_name,email=excluded.email,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
 INSERT INTO budget_settings14313(id,data,version,updated_at,updated_by)
 VALUES(true,coalesce(b.data,'{}')||jsonb_build_object('emailSender',p_accounts->>'emailSender','emails',p_accounts->>'emails','trialEmailTo',p_accounts->>'trialEmailTo','chatgptAccountEmail',p_accounts->>'chatgptAccountEmail','gmailClientId',p_accounts->>'gmailClientId'),coalesce(b.version,0)+1,now(),auth.uid())
 ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=excluded.version,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
 UPDATE installation14320 SET initialized=true,version=version+1,
 deployment=jsonb_build_object('siteUrl',p_deployment->>'siteUrl','repository',p_deployment->>'repository','branch',p_deployment->>'branch','accounting',p_deployment->>'accounting','publicRestaurant',p_deployment->>'publicRestaurant','restaurant',p_deployment->>'restaurant'),
 incoming_admin=p_incoming,checks=p_checks,updated_at=now(),updated_by=auth.uid() WHERE id;
 r=public.installation_status14320();
 INSERT INTO handover_history14320 VALUES(p_request_key,auth.uid(),payload,r,now());RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.installation_status14320(),public.save_installation14320(uuid,integer,integer,text,jsonb,jsonb,jsonb,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.installation_status14320(),public.save_installation14320(uuid,integer,integer,text,jsonb,jsonb,jsonb,uuid,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
