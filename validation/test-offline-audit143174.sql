-- Rollback-only verification. No sequence allocation or historic changes.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' AND status='active' LIMIT 1),true);
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
DO $$
DECLARE older uuid:=gen_random_uuid(); target uuid:=gen_random_uuid(); newer uuid:=gen_random_uuid(); a uuid; d date; lines jsonb; expected jsonb; before_seq bigint; void_key text:='test-void-'||gen_random_uuid(); delete_key text:='test-delete-'||gen_random_uuid(); audit_snapshot jsonb; r jsonb; retry jsonb; n text;
BEGIN
 SELECT last_value INTO before_seq FROM public.journal_entry_number_seq;
 SELECT period_month+8 INTO d FROM public.accounting_periods WHERE status='open' ORDER BY period_month DESC LIMIT 1;
 SELECT id INTO a FROM public.accounts WHERE is_active AND is_posting AND currency_code='LAK' LIMIT 1;
 UPDATE public.accounting_id_settings SET journal_prefix='OFTEST',journal_digits=6;
 lines:=jsonb_build_array(jsonb_build_object('account_id',a,'description','Rollback test','currency_code','LAK','debit',100,'credit',0),jsonb_build_object('account_id',a,'description','Rollback test','currency_code','LAK','debit',0,'credit',100));
 expected:=public.journal_shape14385(d,'Rollback test',lines);
 n:=private.format_entry_id143114('OFTEST',d,888002,6);
 INSERT INTO public.journal_entries(id,entry_no,transaction_date,memo,status,source,posted_by,posted_at) VALUES
 (older,private.format_entry_id143114('OFTEST',d,888001,6),d,'Rollback test','posted','manual',auth.uid(),now()),(target,n,d,'Rollback test','posted','manual',auth.uid(),now());
 INSERT INTO public.journal_lines(journal_entry_id,line_no,account_id,line_date,description,currency_code,debit,credit)
 SELECT eid,ord,a,d,'Rollback test','LAK',(l->>'debit')::numeric,(l->>'credit')::numeric FROM (VALUES(older),(target)) e(eid) CROSS JOIN jsonb_array_elements(lines) WITH ORDINALITY x(l,ord);
 BEGIN
  PERFORM public.delete_audit_offline143174(delete_key,'audit_log','device:'||void_key,NULL,void_key,target);
  RAISE EXCEPTION 'Missing prerequisite accepted';
 EXCEPTION WHEN serialization_failure THEN NULL;END;
 BEGIN
  PERFORM public.change_journal14385(void_key,target,'void','Test stale content',jsonb_set(expected,'{memo}','"Stale"'),NULL);
  RAISE EXCEPTION 'Stale void accepted';
 EXCEPTION WHEN serialization_failure THEN NULL;END;
 PERFORM public.change_journal14385(void_key,target,'void','Offline test',expected,NULL);
 SELECT to_jsonb(alog) INTO audit_snapshot FROM public.audit_log alog WHERE alog.table_name='journal_entries' AND alog.record_id=target::text LIMIT 1;
 BEGIN
  PERFORM public.delete_audit_offline143174('test-single-'||gen_random_uuid(),'audit_log',audit_snapshot->>'id',audit_snapshot,NULL,NULL);
  RAISE EXCEPTION 'Single-audit intent expanded to whole-entry deletion';
 EXCEPTION WHEN serialization_failure THEN NULL;END;
 -- A later record blocks deletion until that new record is itself removed.
 BEGIN
  INSERT INTO public.journal_entries(id,entry_no,transaction_date,memo,status,source,posted_by,posted_at) VALUES(newer,private.format_entry_id143114('OFTEST',d,888003,6),d,'Rollback newer','posted','manual',auth.uid(),now());
  PERFORM public.delete_audit_offline143174(delete_key,'audit_log','device:'||void_key,NULL,void_key,target);
  RAISE EXCEPTION 'Newer ID was overwritten';
 EXCEPTION WHEN serialization_failure THEN NULL;END;
 r:=public.delete_audit_offline143174(delete_key,'audit_log','device:'||void_key,NULL,void_key,target);
 retry:=public.delete_audit_offline143174(delete_key,'audit_log','device:'||void_key,NULL,void_key,target);
 IF r IS DISTINCT FROM retry OR (r->>'deleted')::integer<1 THEN RAISE EXCEPTION 'Immutable deletion retry failed';END IF;
 IF EXISTS(SELECT 1 FROM public.journal_entries WHERE id=target) OR EXISTS(SELECT 1 FROM public.audit_log WHERE table_name='journal_entries' AND record_id=target::text) THEN RAISE EXCEPTION 'Entry or audit survived';END IF;
 IF public.preview_journal_number143114(d,'OFTEST',6)<>888002 THEN RAISE EXCEPTION 'Trailing ID was not released';END IF;
 IF public.audit_delete_receipt143174(delete_key)->'result' IS DISTINCT FROM r THEN RAISE EXCEPTION 'Receipt lookup mismatch';END IF;
 BEGIN
  PERFORM public.delete_audit_offline143174(delete_key,'audit_log','other',NULL,void_key,target);
  RAISE EXCEPTION 'Changed deletion payload accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Deletion reference already belongs%' THEN RAISE;END IF;END;
 IF jsonb_array_length(public.offline_journal_state143174(d,'OFTEST',6)->'issued')<>1 THEN RAISE EXCEPTION 'Offline issued snapshot mismatch';END IF;
 IF (SELECT last_value FROM public.journal_entry_number_seq)<>before_seq THEN RAISE EXCEPTION 'Test consumed a journal number';END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
END $$;
SELECT 'PASS: prerequisite order, stale-content conflict, newer-ID protection, permanent deletion, immutable retry, released trailing ID, offline snapshot, no sequence allocation' result;
ROLLBACK;
