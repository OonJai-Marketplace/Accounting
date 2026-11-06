-- Local PostgreSQL fixtures only. Never execute against live accounting records.
BEGIN;
DO $test$
DECLARE actor uuid=gen_random_uuid();a uuid=gen_random_uuid();rid text=gen_random_uuid()::text;entry uuid=gen_random_uuid();snap jsonb;r jsonb;edit jsonb;receipt jsonb;v timestamptz;w jsonb;rejected boolean;
BEGIN
 INSERT INTO public.profiles VALUES(actor,'admin','active');PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 INSERT INTO public.accounts VALUES(a,'1010','Cash on Hand MAIN','ASSET','LAK',true,false);
 INSERT INTO public.accounting_periods VALUES(gen_random_uuid(),'2026-09-01','closed'),(gen_random_uuid(),'2026-10-01','open'),(gen_random_uuid(),'2026-11-01','open');
 INSERT INTO public.journal_entries VALUES(entry,'TEST-1','2026-10-15','Test',null,'posted');
 INSERT INTO public.journal_lines VALUES(gen_random_uuid(),entry,a,'LAK',100,0,'2026-10-15','Count fixture');
 w=public.reconciliation_workspace306();ASSERT w->>'month'='2026-10','Working book used calendar month instead of open book';ASSERT jsonb_array_length(w->'months')=2;
 ASSERT public.reconciliation_workspace306('2026-09-01')->>'month' IS NULL,'Closed month offered';
 snap=public.reconciliation_snapshot305(a,'2026-10-01','2026-10-31','posting');
 r=snap||jsonb_build_object('id','REC-2610-1010','recordId',rid,'key',actor::text||':'||rid,'owner',actor,'account',jsonb_build_object('id',a,'code','1010','name','Cash on Hand MAIN'),'from','2026-10-01','to','2026-10-31','method','cash','dateBasis','posting','status','reconciled','statement','100','findings','[]'::jsonb);
 receipt=public.reconciliation_save305(r,snap->>'fingerprint');
 ASSERT public.reconciliation_workspace306('2026-10-01')->'progress'->>'complete'='true';
 ASSERT public.reconciliation_workspace306('2026-11-01')->'progress'->>'complete'='false','October reconciliation leaked into November';
 rejected=false;BEGIN PERFORM public.reconciliation_save305(r||jsonb_build_object('recordId',gen_random_uuid()),snap->>'fingerprint');EXCEPTION WHEN OTHERS THEN rejected=SQLERRM LIKE '%already reconciled%';END;ASSERT rejected;
 edit=public.reconciliation_edit306(rid);ASSERT edit->>'recordId'=rid;ASSERT edit->>'editing306'='true';v=(edit->>'editVersion306')::timestamptz;
 edit=edit||jsonb_build_object('statement','99','notes','One short, confirmed','differenceConfirmed',true,'status','saved');
 receipt=public.reconciliation_update306(edit,snap->>'fingerprint',v);
 ASSERT receipt->>'statement'='99';ASSERT NOT(receipt ? 'editing306');ASSERT (SELECT count(*) FROM private.reconciliation_records305)=1,'Edit created another record';ASSERT (SELECT count(*) FROM private.reconciliation_versions306)=1;
 PERFORM public.reconciliation_update306(edit,snap->>'fingerprint',v);ASSERT (SELECT count(*) FROM private.reconciliation_versions306)=1,'Retry created another revision';
 rejected=false;BEGIN PERFORM public.reconciliation_update306(edit||jsonb_build_object('statement','98'),snap->>'fingerprint',v);EXCEPTION WHEN OTHERS THEN rejected=SQLERRM LIKE '%changed%';END;ASSERT rejected,'Stale edit overwrote newer amount';
 UPDATE public.accounting_periods SET status='closed' WHERE period_month='2026-10-01';
 ASSERT public.reconciliation_workspace306()->>'month'='2026-11';ASSERT public.reconciliation_workspace306('2026-10-01')->>'month' IS NULL;
 rejected=false;BEGIN PERFORM public.reconciliation_edit306(rid);EXCEPTION WHEN OTHERS THEN rejected=SQLERRM LIKE '%closed or locked%';END;ASSERT rejected,'Closed record opened for editing';
 SELECT saved_at INTO v FROM private.reconciliation_records305 WHERE record_id=rid;
 rejected=false;BEGIN PERFORM public.reconciliation_update306(edit,snap->>'fingerprint',v);EXCEPTION WHEN OTHERS THEN rejected=SQLERRM LIKE '%closed or locked%';END;ASSERT rejected,'Closed record edited';
 rejected=false;BEGIN PERFORM public.reconciliation_save305(r||jsonb_build_object('recordId',gen_random_uuid()),snap->>'fingerprint');EXCEPTION WHEN OTHERS THEN rejected=SQLERRM LIKE '%closed or locked%';END;ASSERT rejected,'New reconciliation saved in closed book';
 UPDATE public.accounting_periods SET status='locked' WHERE period_month='2026-10-01';
 rejected=false;BEGIN PERFORM public.reconciliation_edit306(rid);EXCEPTION WHEN OTHERS THEN rejected=SQLERRM LIKE '%closed or locked%';END;ASSERT rejected;
 ASSERT NOT has_function_privilege('anon','public.reconciliation_update306(jsonb,text,timestamptz)','EXECUTE');
 ASSERT NOT has_table_privilege('authenticated','private.reconciliation_versions306','SELECT');
END $test$;
ROLLBACK;
