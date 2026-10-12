-- Roll back all fixtures. A temporary sequence prevents consuming real Entry IDs.
BEGIN;
CREATE TEMP SEQUENCE test_report_sequence START 900000;
DO $test$
DECLARE def text;actor uuid;who uuid;fund uuid;category uuid;line uuid;j uuid;expected jsonb;posted jsonb;again jsonb;mode text;rows jsonb;bad jsonb;context jsonb;types uuid[];actuals jsonb;
BEGIN
 SELECT pg_get_functiondef('public.post_report_worker14349(date,text,jsonb,text,integer)'::regprocedure) INTO def;
 EXECUTE replace(def,'public.journal_entry_number_seq','pg_temp.test_report_sequence');
 SELECT id INTO actor FROM profiles WHERE role='admin' AND status='active' LIMIT 1;
 SELECT u.user_id,f.id,a.id INTO who,fund,category FROM user_permissions u JOIN profiles p ON p.id=u.user_id
 CROSS JOIN LATERAL unnest(u.assigned_fund_account_ids) fi(id) JOIN accounts f ON f.id=fi.id
 CROSS JOIN LATERAL unnest(u.destination_account_ids) ai(id) JOIN accounts a ON a.id=ai.id
 WHERE p.status='active' AND p.role<>'admin' AND 'out'=ANY(u.allowed_directions) AND f.currency_code=a.currency_code AND f.id<>a.id AND f.account_type='ASSET' LIMIT 1;
 IF who IS NULL THEN RAISE EXCEPTION 'Fixture workspace not available';END IF;
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 FOREACH mode IN ARRAY ARRAY['consolidated','detailed'] LOOP
 SELECT line_id INTO line FROM save_staff_workspace_entry_v3(who,null,'test14349-'||mode||'-1','1902-01-05','out',fund,category,'Rollback item A','A',10,'payment');
 SELECT staff_journal_id INTO j FROM staff_journal_lines WHERE id=line;
 PERFORM save_staff_workspace_entry_v3(who,null,'test14349-'||mode||'-2','1902-01-05','out',fund,category,'Rollback item B','B',20,'payment');
 PERFORM save_staff_workspace_entry_v3(who,null,'test14349-'||mode||'-3','1902-01-06','out',fund,category,'Rollback item C','C',30,'payment');
 SELECT array_agg(id) INTO types FROM report_types14253 WHERE active;
 context:=submission_context14345(j,'1902-01-31');
 SELECT jsonb_agg(jsonb_build_object('account_id',f->>'account_id','actual',(f->>'posted')::numeric+(f->>'unposted')::numeric,'reason','')) INTO actuals FROM jsonb_array_elements(context->'funds') f;
 PERFORM submit_reconciled14345(j,types,'1902-01-31',context->>'fingerprint',actuals);
 SELECT jsonb_agg(to_jsonb(l)) INTO expected FROM staff_journal_lines l WHERE staff_journal_id=j;
 PERFORM approve_report1443(j,expected);
 WITH sides AS (
 SELECT id,transaction_date,account_id,currency_code,amount,'debit' side,id::text bucket FROM staff_journal_lines WHERE staff_journal_id=j
 UNION ALL SELECT id,transaction_date,fund_account_id,currency_code,amount,'credit',CASE WHEN mode='consolidated' THEN 'fund' ELSE id::text END FROM staff_journal_lines WHERE staff_journal_id=j
 ), grouped AS (SELECT transaction_date,account_id,currency_code,side,bucket,sum(amount) amount,jsonb_agg(id::text ORDER BY id::text) ids FROM sides GROUP BY transaction_date,account_id,currency_code,side,bucket)
 SELECT jsonb_agg(jsonb_build_object('line_date',transaction_date,'account_id',account_id,'currency_code',currency_code,'debit',CASE WHEN side='debit' THEN amount ELSE 0 END,'credit',CASE WHEN side='credit' THEN amount ELSE 0 END,'source_ids',ids,'description','Test source reference')) INTO rows FROM grouped;
 bad=jsonb_set(rows,'{0,line_date}','"1902-01-07"');
 BEGIN PERFORM post_report14349(j,'1902-01-05','Test',bad,'TEST',6,mode);RAISE EXCEPTION 'TEST accepted changed date';EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'TEST %' THEN RAISE;END IF;END;
 bad=jsonb_set(rows,'{0,debit}','999');
 BEGIN PERFORM post_report14349(j,'1902-01-05','Test',bad,'TEST',6,mode);RAISE EXCEPTION 'TEST accepted changed amount';EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'TEST %' THEN RAISE;END IF;END;
 posted=post_report14349(j,'1902-01-05','Test',rows,'TEST',6,mode);
 again=post_report14349(j,'1902-01-05','Test',rows,'TEST',6,mode);
 IF posted<>again THEN RAISE EXCEPTION 'Idempotence failed';END IF;
 IF (SELECT count(DISTINCT journal_entry_id) FROM staff_journal_lines WHERE staff_journal_id=j)<>1 THEN RAISE EXCEPTION 'More than one entry';END IF;
 IF (SELECT count(DISTINCT line_date) FROM journal_lines WHERE journal_entry_id=(posted->>'entry_id')::uuid)<>2 THEN RAISE EXCEPTION 'Dates lost';END IF;
 IF (SELECT count(*) FROM journal_lines WHERE journal_entry_id=(posted->>'entry_id')::uuid)<>(CASE WHEN mode='consolidated' THEN 5 ELSE 6 END) THEN RAISE EXCEPTION 'Wrong number of lines';END IF;
 PERFORM check_ledger_entry14228((posted->>'entry_id')::uuid);
 END LOOP;
END $test$;
SET CONSTRAINTS ALL IMMEDIATE;
SELECT 'PASS: both modes, two dates, one ID, exact line counts, source checks, duplicate safety and ledger integrity' verification;
ROLLBACK;
