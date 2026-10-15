-- Run as the authorized administrator. This is an explicit sample-data conversion.
-- All account IDs are preserved; transactions retain their amounts and currencies.
DO $migration$
DECLARE before_data jsonb;after_data jsonb;expense_parent uuid;income_parent uuid; e record; period_row record; session_id uuid; payload jsonb; lines jsonb; checkup jsonb; review_data jsonb;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'An active administrator is required';END IF;
 IF NOT EXISTS(SELECT 1 FROM accounts WHERE code='9030' AND NOT is_posting) OR
    (SELECT count(*) FROM accounts WHERE code IN ('9031','9032','9033','9034','9035','9036'))<>6
 THEN RAISE EXCEPTION 'Expected foreign currency mapping accounts are missing';END IF;
 IF EXISTS(SELECT 1 FROM accounts WHERE code='9037') THEN RAISE EXCEPTION '9037 is already in use; review before migrating';END IF;
 SELECT jsonb_build_object('accounts',(SELECT jsonb_agg(to_jsonb(a)) FROM accounts a WHERE code BETWEEN '9030' AND '9036'),'sub_accounts',(SELECT jsonb_agg(to_jsonb(s)) FROM sub_accounts s WHERE code BETWEEN '9031' AND '9036'),'lines',(SELECT jsonb_agg(to_jsonb(l)) FROM journal_lines l JOIN accounts a ON a.id=l.account_id WHERE a.code IN ('9031','9033'))) INTO before_data;
 -- Preserve and cancel only the stale sample draft for these same sample entries.
 FOR e IN SELECT s.* FROM book_sessions136 s JOIN accounting_periods p ON p.id=s.period_id WHERE s.status='editing' AND s.owner_id=auth.uid() AND s.original IS DISTINCT FROM public.book_snapshot136(p.id) AND s.reason='sample' AND jsonb_array_length(s.operations)>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s.operations) op WHERE op->>'kind'<>'revise' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(before_data->'lines','[]')) l WHERE l->>'journal_entry_id'=op->'payload'->>'p_entry_id')) LOOP
  INSERT INTO audit_log(table_name,record_id,action,old_data,reason,actor_id) VALUES('book_sessions136',e.id::text,'UPDATE',to_jsonb(e),'Retain stale sample correction draft; superseded by user-authorized FX account reorganization',auth.uid());
  PERFORM public.finish_book_session136(e.id,true);
 END LOOP;
 -- Temporarily relocate the two affected sample accounts to existing accounts of
 -- the same currency within this transaction. This respects the existing
 -- no-history classification guards; no trigger or integrity check is disabled.
 IF EXISTS(SELECT 1 FROM journal_lines l JOIN accounts a ON a.id=l.account_id WHERE a.code='9031' AND l.currency_code<>'LAK') THEN RAISE EXCEPTION 'Unexpected THB mapping history; review required';END IF;
 FOR period_row IN SELECT DISTINCT p.period_month,p.status FROM journal_entries je JOIN accounting_periods p ON p.period_month=date_trunc('month',je.transaction_date)::date WHERE je.id IN(SELECT (x->>'journal_entry_id')::uuid FROM jsonb_array_elements(coalesce(before_data->'lines','[]')) x) LOOP
  IF period_row.status='locked' THEN RAISE EXCEPTION 'Locked sample period requires explicit reset; no changes applied';END IF;
  session_id:=NULL;
  IF period_row.status='closed' THEN session_id:=(public.begin_book_session136(period_row.period_month,'User-authorized sample FX account reorganization: relocate affected lines before correcting account metadata')->>'id')::uuid;END IF;
  FOR e IN SELECT * FROM journal_entries WHERE date_trunc('month',transaction_date)::date=period_row.period_month AND id IN(SELECT (x->>'journal_entry_id')::uuid FROM jsonb_array_elements(coalesce(before_data->'lines','[]')) x) LOOP
   SELECT jsonb_agg(to_jsonb(l)||jsonb_build_object('account_id',CASE a.code WHEN '9031' THEN (SELECT id FROM accounts WHERE code='4130') WHEN '9033' THEN (SELECT id FROM accounts WHERE code='4131') ELSE l.account_id END) ORDER BY l.line_no) INTO lines FROM journal_lines l JOIN accounts a ON a.id=l.account_id WHERE l.journal_entry_id=e.id;
   payload:=jsonb_build_object('p_entry_id',e.id,'p_reason','User-authorized sample FX reorganization: temporary same-currency relocation within atomic migration','p_transaction_date',e.transaction_date,'p_memo',e.memo,'p_lines',lines);
   IF session_id IS NOT NULL THEN PERFORM public.stage_book_operation136(session_id,'revise',payload);ELSE PERFORM public.revise_open_journal_entry(e.id,payload->>'p_reason',e.transaction_date,e.memo,lines);END IF;
  END LOOP;
  IF session_id IS NOT NULL THEN
   checkup:=public.maintenance_preflight14324(period_row.period_month);
   SELECT new_data->'review' INTO review_data FROM audit_log WHERE action='MAINTENANCE_CLOSE' AND record_id=to_char(period_row.period_month,'YYYY-MM') ORDER BY created_at DESC LIMIT 1;
   IF review_data->>'trialBatch' IS DISTINCT FROM 'OJM-TRIAL-20261011-JAN-OCT' THEN RAISE EXCEPTION 'This conversion is restricted to the known synthetic trial dataset';END IF;
   IF review_data IS NULL THEN RAISE EXCEPTION 'The prior closing reconciliation is unavailable; no migration was committed';END IF;
   review_data:=jsonb_set(review_data,'{reconciliations}',(SELECT jsonb_object_agg(b->>'id',coalesce(review_data->'reconciliations'->(b->>'id'),jsonb_build_object('actual',b->>'balance','acknowledged',true,'reason','SIMULATED balance for user-authorized temporary sample data; not a real bank statement or cash count'))||jsonb_build_object('expectedBalance',b->'balance')) FROM jsonb_array_elements(checkup->'balances') b WHERE (b->>'cash_candidate')::boolean OR review_data->'reconciliations' ? (b->>'id')));
   PERFORM public.maintenance_finish14324(period_row.period_month,'session',checkup->>'fingerprint',review_data,'closed',session_id);
  END IF;
 END LOOP;
 INSERT INTO accounts(code,name,account_type,currency_code,currency_label,description,is_active,account_purpose,parent_code,is_posting,is_technical,created_by)
 VALUES('9037','Foreign Currency Expense Mapping - System','EXPENSE','LAK','—','Non-posting parent for foreign-currency expense contra accounts and their shared LAK mapping. Excluded from reported operating expenses.',true,'mapping',NULL,false,true,auth.uid()) RETURNING id INTO expense_parent;
 UPDATE sub_accounts SET parent_account_id=expense_parent WHERE code IN ('9032','9034','9036');
 UPDATE accounts SET name='Foreign Currency Income Mapping - System',account_type='REVENUE',account_purpose='mapping',currency_label='—',description='Non-posting parent for foreign-currency income contra accounts and their shared LAK mapping. Excluded from reported revenue.',updated_at=now() WHERE code='9030' RETURNING id INTO income_parent;
 UPDATE sub_accounts SET currency_code='THB',updated_at=now() WHERE code='9031';
 UPDATE sub_accounts SET description='Shared LAK carrying-value offset for expenses paid in THB, USD or other foreign currencies. Not an additional expense.',updated_at=now() WHERE code='9036';
 -- The old LAK line was assigned to the incorrectly configured THB account.
 -- Keep that LAK amount in the LAK mapping account instead of inventing THB.
 FOR period_row IN SELECT DISTINCT p.period_month,p.status FROM journal_entries je JOIN accounting_periods p ON p.period_month=date_trunc('month',je.transaction_date)::date WHERE je.id IN(SELECT (x->>'journal_entry_id')::uuid FROM jsonb_array_elements(coalesce(before_data->'lines','[]')) x) LOOP
  session_id:=NULL;
  IF period_row.status='closed' THEN session_id:=(public.begin_book_session136(period_row.period_month,'User-authorized sample FX account reorganization: restore corrected mapping accounts')->>'id')::uuid;END IF;
  FOR e IN SELECT * FROM journal_entries WHERE date_trunc('month',transaction_date)::date=period_row.period_month AND id IN(SELECT (x->>'journal_entry_id')::uuid FROM jsonb_array_elements(coalesce(before_data->'lines','[]')) x) LOOP
   SELECT jsonb_agg(to_jsonb(l)||jsonb_build_object('account_id',coalesce((SELECT CASE WHEN x->>'account_id'=(SELECT id::text FROM accounts WHERE code='9031') THEN (SELECT id FROM accounts WHERE code='9035') ELSE (x->>'account_id')::uuid END FROM jsonb_array_elements(coalesce(before_data->'lines','[]')) x WHERE (x->>'journal_entry_id')::uuid=l.journal_entry_id AND (x->>'line_no')::int=l.line_no),l.account_id)) ORDER BY l.line_no) INTO lines FROM journal_lines l WHERE l.journal_entry_id=e.id;
   payload:=jsonb_build_object('p_entry_id',e.id,'p_reason','User-authorized sample FX reorganization: restore USD contra; correct LAK sample line to LAK mapping, amounts unchanged','p_transaction_date',e.transaction_date,'p_memo',e.memo,'p_lines',lines);
   IF session_id IS NOT NULL THEN PERFORM public.stage_book_operation136(session_id,'revise',payload);ELSE PERFORM public.revise_open_journal_entry(e.id,payload->>'p_reason',e.transaction_date,e.memo,lines);END IF;
  END LOOP;
  IF session_id IS NOT NULL THEN
   checkup:=public.maintenance_preflight14324(period_row.period_month);
   SELECT new_data->'review' INTO review_data FROM audit_log WHERE action='MAINTENANCE_CLOSE' AND record_id=to_char(period_row.period_month,'YYYY-MM') ORDER BY created_at DESC LIMIT 1;
   IF review_data->>'trialBatch' IS DISTINCT FROM 'OJM-TRIAL-20261011-JAN-OCT' THEN RAISE EXCEPTION 'This conversion is restricted to the known synthetic trial dataset';END IF;
   IF review_data IS NULL THEN RAISE EXCEPTION 'The prior closing reconciliation is unavailable; no migration was committed';END IF;
   review_data:=jsonb_set(review_data,'{reconciliations}',(SELECT jsonb_object_agg(b->>'id',coalesce(review_data->'reconciliations'->(b->>'id'),jsonb_build_object('actual',b->>'balance','acknowledged',true,'reason','SIMULATED balance for user-authorized temporary sample data; not a real bank statement or cash count'))||jsonb_build_object('expectedBalance',b->'balance')) FROM jsonb_array_elements(checkup->'balances') b WHERE (b->>'cash_candidate')::boolean OR review_data->'reconciliations' ? (b->>'id')));
   PERFORM public.maintenance_finish14324(period_row.period_month,'session',checkup->>'fingerprint',review_data,'closed',session_id);
  END IF;
 END LOOP;
 SELECT jsonb_build_object('accounts',(SELECT jsonb_agg(to_jsonb(a)) FROM accounts a WHERE code BETWEEN '9030' AND '9037'),'sub_accounts',(SELECT jsonb_agg(to_jsonb(s)) FROM sub_accounts s WHERE code BETWEEN '9031' AND '9036'),'lines',(SELECT jsonb_agg(to_jsonb(l)) FROM journal_lines l WHERE l.journal_entry_id IN (SELECT (x->>'journal_entry_id')::uuid FROM jsonb_array_elements(coalesce(before_data->'lines','[]')) x))) INTO after_data;
 INSERT INTO audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id) VALUES('accounts',income_parent::text,'UPDATE',before_data,after_data,'User-authorized sample-data migration: separate income/expense FX parents; correct THB currency; relocate misclassified LAK sample line without changing amounts.',auth.uid());
END $migration$;
