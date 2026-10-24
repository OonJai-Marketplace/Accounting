BEGIN;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT id FROM profiles WHERE role='admin' AND status='active' ORDER BY created_at LIMIT 1),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE eid uuid=gen_random_uuid(); rid uuid=gen_random_uuid(); baseline jsonb; req jsonb; plan jsonb; result jsonb;
BEGIN
 INSERT INTO public.payroll_employees(id,data,version) VALUES(eid,jsonb_build_object('code','HR-TEST','name','Rollback fixture','active',true,'salary',1000000,'currency','LAK'),1);
 req=jsonb_build_array(jsonb_build_object('id','HR-TEST-APPLY','source','{}'::jsonb,'data',jsonb_build_object('type','attendance','start','2099-10-24','end','2099-10-24')));
 PERFORM public.hr_inbox_save143168('test-rollback',req,'import');
 req=jsonb_build_array((req->0)||jsonb_build_object('version',1));
 baseline=public.hr_inbox_baseline143168();
 plan=jsonb_build_object('operations',jsonb_build_array(jsonb_build_object('table','payroll_runs','id',rid,'version',0,'data',jsonb_build_object('month','2099-10','status','draft','reference','HR-TEST','rates',jsonb_build_object('LAK',1),'rows',jsonb_build_array(jsonb_build_object('employeeId',eid,'employee',jsonb_build_object('name','Rollback fixture','salary',1000000,'currency','LAK'),'input',jsonb_build_object('attendance',jsonb_build_array(jsonb_build_object('date','2099-10-24','mark95','15')))))))),'changes','[]'::jsonb);
 BEGIN
  PERFORM public.hr_inbox_apply143168('test-rollback',req,plan,'{}'::jsonb);
  RAISE EXCEPTION 'Stale baseline allowed';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE '%changed since preview%' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.hr_inbox_apply143168('test-rollback',req,jsonb_set(plan,'{operations}',(plan->'operations')||jsonb_build_array(jsonb_build_object('table','unsupported'))),baseline);
  RAISE EXCEPTION 'Invalid operation allowed';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE '%Unsupported HR record%' THEN RAISE; END IF;
 END;
 IF EXISTS(SELECT 1 FROM payroll_runs WHERE id=rid) OR EXISTS(SELECT 1 FROM hr_inbox143168 WHERE sheet='test-rollback' AND status<>'pending') THEN RAISE EXCEPTION 'Partial batch persisted'; END IF;
 result=public.hr_inbox_apply143168('test-rollback',req,plan,baseline);
 IF result->0->>'status'<>'accepted' THEN RAISE EXCEPTION 'Approval not recorded'; END IF;
 IF NOT EXISTS(SELECT 1 FROM payroll_runs WHERE id=rid) THEN RAISE EXCEPTION 'Payroll not applied'; END IF;
 IF (SELECT count(*) FROM hr_inbox_audit143168 WHERE sheet='test-rollback')<>3 THEN RAISE EXCEPTION 'Audit missing'; END IF;
 BEGIN
  PERFORM public.hr_inbox_apply143168('test-rollback',req,plan,public.hr_inbox_baseline143168());
  RAISE EXCEPTION 'Duplicate was allowed';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE '%already processed%' THEN RAISE; END IF;
 END;
 BEGIN
  UPDATE hr_inbox143168 SET status='pending',version=version+1 WHERE sheet='test-rollback';
  RAISE EXCEPTION 'Receipt was mutable';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE '%immutable%' THEN RAISE; END IF;
 END;
END $$;
SELECT 'Atomic approval, audit, duplicate prevention and immutability passed' AS result;
ROLLBACK;
