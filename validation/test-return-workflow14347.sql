-- Isolated fixture only; the file always rolls back its synthetic records.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('pg_temp.audit_fixture14370') IS NULL THEN
  RAISE EXCEPTION 'Run through the isolated validation/test-fresh-backend14322.cjs harness only';
 END IF;
END $guard$;

DO $test$
DECLARE who uuid; actor uuid; fund uuid; category uuid; ret uuid; draft uuid; line uuid; added uuid; result jsonb; items jsonb; context jsonb; types uuid[]; actuals jsonb;
BEGIN
 SELECT id INTO actor FROM profiles WHERE role='admin' AND status='active' LIMIT 1;
 SELECT u.user_id,f.id,a.id INTO who,fund,category FROM user_permissions u JOIN profiles p ON p.id=u.user_id
 CROSS JOIN LATERAL unnest(u.assigned_fund_account_ids) fi(id) JOIN accounts f ON f.id=fi.id
 CROSS JOIN LATERAL unnest(u.destination_account_ids) ai(id) JOIN accounts a ON a.id=ai.id
 WHERE p.status='active' AND p.role<>'admin' AND 'out'=ANY(u.allowed_directions) AND f.currency_code=a.currency_code AND f.id<>a.id AND f.account_type='ASSET' LIMIT 1;
 IF who IS NULL THEN RAISE EXCEPTION 'No suitable assigned workspace for rolled-back test';END IF;
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 INSERT INTO staff_journals(owner_id,period_start,period_end,status,return_note) VALUES(who,'1901-01-01','1901-01-31','returned','Test correction') RETURNING id INTO ret;
 SELECT line_id INTO line FROM save_staff_workspace_entry_v3(who,null,'test14347-first-save','1901-01-05','out',fund,category,'Rollback test regular draft','',1,'payment');
 SELECT staff_journal_id INTO draft FROM staff_journal_lines WHERE id=line;
 IF draft=ret THEN RAISE EXCEPTION 'Returned report replaced regular draft';END IF;
 items:=jsonb_build_array(jsonb_build_object('date','1901-01-05','direction','out','fund',fund,'account',category,'memo','Rollback correction','reference','','amount',2,'kind','payment'));
 result:=save_staff_editor1437(who,'test14347-correction-save',items,jsonb_build_object('components1437',items,'correction_journal14347',ret),ARRAY[]::uuid[]);
 added:=(result->'line_ids'->>0)::uuid;
 IF (SELECT staff_journal_id FROM staff_journal_lines WHERE id=added)<>ret THEN RAISE EXCEPTION 'Correction added to wrong journal';END IF;
 PERFORM save_staff_workspace_entry_v3(who,added,'test14347-correction-edit','1901-01-05','out',fund,category,'Rollback edited correction','',3,'payment');
 IF (SELECT amount FROM staff_journal_lines WHERE id=line)<>1 THEN RAISE EXCEPTION 'Existing draft modified';END IF;
 SELECT array_agg(id) INTO types FROM report_types14253 WHERE active;
 context:=submission_context14345(ret,'1901-01-31');
 SELECT jsonb_agg(jsonb_build_object('account_id',f->>'account_id','actual',(f->>'posted')::numeric+(f->>'unposted')::numeric,'reason','')) INTO actuals FROM jsonb_array_elements(context->'funds') f;
 result:=submit_reconciled14345(ret,types,'1901-01-31',context->>'fingerprint',actuals);
 IF result->>'status'<>'submitted' THEN RAISE EXCEPTION 'Correction resubmission failed';END IF;
 context:=submission_context14345(draft,'1901-01-31');
 SELECT jsonb_agg(jsonb_build_object('account_id',f->>'account_id','actual',(f->>'posted')::numeric+(f->>'unposted')::numeric,'reason','')) INTO actuals FROM jsonb_array_elements(context->'funds') f;
 result:=submit_reconciled14345(draft,types,'1901-01-31',context->>'fingerprint',actuals);
 PERFORM save_staff_workspace_entry_v3(who,null,'test14347-next-submission','1901-01-06','out',fund,category,'Rollback next draft','',1,'payment');
 IF (SELECT count(*) FROM staff_journals WHERE owner_id=who AND period_start='1901-01-01')<>3 THEN RAISE EXCEPTION 'Repeated submissions unavailable';END IF;
END $test$;
SELECT 'PASS: returned correction and draft isolated; two reconciled submissions and another draft in the same month' AS verification;

ROLLBACK;
