-- Run as the migration owner. Everything rolls back, including all test accounts.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' AND status='active' LIMIT 1),true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE source public.account_groups143180; target public.account_groups143180; created public.accounts; test_id uuid:=gen_random_uuid(); account_id uuid; failed boolean:=false; payload jsonb;
BEGIN
 SELECT * INTO source FROM public.account_groups143180 WHERE name='Wellness';
 SELECT * INTO target FROM public.account_groups143180 WHERE name='Restaurant';
 account_id:=source.account_ids[1];
 IF account_id IS NULL OR target.id IS NULL THEN RAISE EXCEPTION 'Missing baseline groups'; END IF;
 PERFORM public.save_account_group143180(target.id,target.name,target.kind,target.parent_id,array_append(target.account_ids,account_id),target.revision);
 IF (SELECT count(*) FROM public.account_groups143180 WHERE account_id=ANY(account_ids))<>1 OR EXISTS(SELECT 1 FROM public.account_groups143180 WHERE id=source.id AND (account_id=ANY(account_ids) OR revision<>source.revision+1)) THEN RAISE EXCEPTION 'Exclusive reassignment failed'; END IF;
 BEGIN
  PERFORM public.save_account_group143180(source.id,source.name,source.kind,source.parent_id,source.account_ids,source.revision);
 EXCEPTION WHEN OTHERS THEN failed:=SQLERRM LIKE '%changed elsewhere%'; END;
 IF NOT failed THEN RAISE EXCEPTION 'Stale source assignment was accepted'; END IF;
 payload:=jsonb_build_object('code','QA143180-'||substr(test_id::text,1,8),'name','Rollback-only group account','currency_code','LAK','account_type','ASSET','account_purpose','regular','is_posting',true,'currency_label','LAK','track_foreign_funds',false);
 SELECT * INTO created FROM public.create_group_account143180(source.id,test_id,payload);
 IF created.code<>payload->>'code' OR NOT EXISTS(SELECT 1 FROM public.account_groups143180 WHERE id=source.id AND test_id=ANY(account_ids)) THEN RAISE EXCEPTION 'Atomic account creation or unchanged code failed'; END IF;
 PERFORM public.create_group_account143180(source.id,test_id,payload);
 IF (SELECT count(*) FROM public.accounts WHERE id=test_id)<>1 THEN RAISE EXCEPTION 'Retry duplicated account'; END IF;
 failed:=false;BEGIN PERFORM public.create_group_account143180(gen_random_uuid(),gen_random_uuid(),payload||jsonb_build_object('code','QA-MISSING'));EXCEPTION WHEN OTHERS THEN failed:=SQLERRM LIKE '%no longer available%';END;
 IF NOT failed OR EXISTS(SELECT 1 FROM public.accounts WHERE code='QA-MISSING') THEN RAISE EXCEPTION 'Missing group allowed orphan account'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role<>'admin' LIMIT 1),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE failed boolean:=false; BEGIN
 BEGIN PERFORM public.save_account_group143180(gen_random_uuid(),'Denied test','branch',null,'{}',null); EXCEPTION WHEN OTHERS THEN failed:=SQLERRM LIKE '%Administrator access%'; END;
 IF NOT failed THEN RAISE EXCEPTION 'Non-admin group mutation allowed'; END IF;
END $$;
ROLLBACK;
SELECT jsonb_build_object('groups',(SELECT jsonb_agg(jsonb_build_object('name',name,'count',cardinality(account_ids)) ORDER BY CASE name WHEN 'Company' THEN 1 WHEN 'Restaurant' THEN 2 WHEN 'Wellness' THEN 3 WHEN 'Other' THEN 4 ELSE 5 END) FROM public.account_groups143180),'incorrectly_grouped',(SELECT count(*) FROM public.accounts a WHERE is_active AND (SELECT count(*) FROM public.account_groups143180 g WHERE a.id=ANY(g.account_ids))<>1),'temporary_accounts',(SELECT count(*) FROM public.accounts WHERE name='Rollback-only group account'),'tests','passed') AS verification;
