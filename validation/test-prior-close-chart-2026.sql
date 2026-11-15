-- Synthetic accounts and journals in the local test database only.
BEGIN;
DO $test$
DECLARE
    m date:='2026-01-01'; actor uuid:=gen_random_uuid(); bank uuid:=gen_random_uuid();
    period uuid:=gen_random_uuid(); session uuid:=gen_random_uuid(); entry uuid:=gen_random_uuid();
    snapshot jsonb; checks jsonb; report jsonb; approved_line jsonb; rejected boolean;
BEGIN
    INSERT INTO public.profiles VALUES(actor,'admin','active');
    PERFORM set_config('request.jwt.claim.sub',actor::text,true);
    INSERT INTO public.accounts VALUES(bank,'1040','Bank','ASSET','LAK',true,false),
       (gen_random_uuid(),'4000','Income','REVENUE','LAK',true,false);
    INSERT INTO public.accounting_periods(id,period_month,status) VALUES(period,m,'open');
    INSERT INTO public.book_sessions136(id,period_id,owner_id,status,operations)
        VALUES(session,period,actor,'editing','[]');
    checks:=public.maintenance_preflight14324(m);
    ASSERT jsonb_array_length(checks->'issues')=1 AND checks#>>'{reconciliation305,complete}'='false';
    snapshot:=private.fx_reclass_fingerprints_2026(m,null);
    ASSERT snapshot ? (bank::text||'/receipt') AND snapshot ? (bank::text||'/posting');
    INSERT INTO private.fx_reclass_prior_close_2026
        (session_id,period_month,actor_id,prior_closed_at,transaction_id,journal_numbers,fingerprints)
        VALUES(session,m,actor,now(),txid_current(),ARRAY['TEST1'],snapshot);
    checks:=public.maintenance_preflight14324(m);
    ASSERT jsonb_array_length(checks->'issues')=0 AND checks#>>'{reconciliation305,complete}'='false';
    ASSERT checks#>>'{reconciliation305,items,0,closureEvidence}'='unchanged_movements';
    ASSERT checks#>>'{reconciliation305,items,0,reportId}' IS NULL;
    ASSERT jsonb_array_length(public.maintenance_preflight14324('2026-02-01')->'issues')=1;
    PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
    ASSERT jsonb_array_length(public.maintenance_preflight14324(m)->'issues')=1;
    PERFORM set_config('request.jwt.claim.sub',actor::text,true);
    UPDATE private.fx_reclass_prior_close_2026 SET transaction_id=txid_current()-1;
    ASSERT jsonb_array_length(public.maintenance_preflight14324(m)->'issues')=1;
    UPDATE private.fx_reclass_prior_close_2026 SET transaction_id=txid_current();

    report:=private.reconciliation_snapshot305(bank,m,'2026-01-31','receipt');
    report:=report||jsonb_build_object('owner',actor,'account',jsonb_build_object('id',bank),'id','REC-TEST',
        'recordId',gen_random_uuid(),'from',m,'to','2026-01-31','method','bank','dateBasis','receipt',
        'status','reconciled','statement','0','statementOpening117','0','statementDebit117','0',
        'statementCredit117','0','findings','[]'::jsonb);
    PERFORM public.reconciliation_save305(report,report->>'fingerprint');
    INSERT INTO public.journal_entries(id,entry_no,transaction_date,status) VALUES(entry,'TEST1',m,'posted');
    INSERT INTO public.journal_lines(id,journal_entry_id,account_id,currency_code,debit,credit)
        VALUES(gen_random_uuid(),entry,bank,'LAK',100,0);
    rejected:=false;
    BEGIN PERFORM public.maintenance_preflight14324(m);
    EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE 'Protected account movements changed%'; END;
    ASSERT rejected;
    UPDATE private.fx_reclass_prior_close_2026 SET fingerprints=private.fx_reclass_fingerprints_2026(m,null);
    checks:=public.maintenance_preflight14324(m);
    ASSERT jsonb_array_length(checks->'issues')=1 AND checks#>>'{reconciliation305,items,0,state}' LIKE 'Account changed%';

    approved_line:=jsonb_build_array(jsonb_build_object('code','1040','debit',100,'credit',0,'base_debit',100,'base_credit',0));
    INSERT INTO private.fx_reclass_journals_2026(entry_no,period_month,original_header,original_lines,proposed_lines)
        VALUES('TEST1',m,jsonb_build_object('transaction_date',m),approved_line,approved_line);
    PERFORM private.fx_reclass_validate_month_2026(m);
    UPDATE private.fx_reclass_journals_2026 SET proposed_lines=jsonb_set(approved_line,'{0,line_date}','"2026-01-02"');
    rejected:=false;
    BEGIN PERFORM private.fx_reclass_validate_month_2026(m);
    EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE 'The proposed lines change%'; END;
    ASSERT rejected;
    UPDATE private.fx_reclass_journals_2026 SET proposed_lines=jsonb_set(approved_line,'{0,code}','"4000"');
    rejected:=false;
    BEGIN PERFORM private.fx_reclass_validate_month_2026(m);
    EXCEPTION WHEN OTHERS THEN rejected:=SQLERRM LIKE 'The proposed lines change%'; END;
    ASSERT rejected;
    ASSERT NOT has_table_privilege('authenticated','private.fx_reclass_prior_close_2026','INSERT');
    ASSERT NOT has_function_privilege('anon','public.post_reviewed_foreign_month_2026(date)','EXECUTE');
END $test$;
ROLLBACK;
