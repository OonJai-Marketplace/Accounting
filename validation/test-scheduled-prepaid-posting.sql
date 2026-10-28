BEGIN;
CREATE TEMP TABLE scheduled_journals (LIKE public.scheduled_journals INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING CONSTRAINTS);
CREATE TEMP TABLE journal_entries (LIKE public.journal_entries INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING CONSTRAINTS);
CREATE TEMP TABLE journal_lines (LIKE public.journal_lines INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING CONSTRAINTS);
CREATE TEMP TABLE scheduled_journal_occurrences (LIKE public.scheduled_journal_occurrences INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING CONSTRAINTS);
CREATE TEMP TABLE audit_log (LIKE public.audit_log INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING CONSTRAINTS);
CREATE TEMP TABLE accounting_periods (LIKE public.accounting_periods INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING CONSTRAINTS);
ALTER TABLE pg_temp.scheduled_journals ADD COLUMN IF NOT EXISTS fixed_book_rate_lak numeric, ADD COLUMN IF NOT EXISTS fixed_rate_currency text;
CREATE TEMP SEQUENCE test_journal_seq;
CREATE TEMP SEQUENCE test_audit_seq;
ALTER TABLE pg_temp.audit_log ALTER COLUMN id SET DEFAULT nextval('pg_temp.test_audit_seq');
CREATE TRIGGER test_real_action_guard BEFORE INSERT OR UPDATE OR DELETE ON pg_temp.journal_entries FOR EACH ROW EXECUTE FUNCTION public.guard_actions113('journal');
CREATE TRIGGER test_real_action_guard BEFORE INSERT OR UPDATE OR DELETE ON pg_temp.journal_lines FOR EACH ROW EXECUTE FUNCTION public.guard_actions113('journal');
CREATE TRIGGER test_real_action_guard BEFORE INSERT OR UPDATE OR DELETE ON pg_temp.scheduled_journals FOR EACH ROW EXECUTE FUNCTION public.guard_actions113('journal');
CREATE OR REPLACE FUNCTION pg_temp.check_ledger_entry14228(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_temp', 'public'
AS $function$
DECLARE e pg_temp.journal_entries;
BEGIN
 SELECT * INTO e FROM journal_entries WHERE id=p_id;
 IF NOT FOUND OR e.status::text<>'posted' THEN RETURN;END IF;
 IF (SELECT count(*) FROM journal_lines WHERE journal_entry_id=p_id)<2 THEN RAISE EXCEPTION 'A posted journal requires at least two lines';END IF;
 IF EXISTS(SELECT 1 FROM journal_lines l JOIN accounts a ON a.id=l.account_id WHERE l.journal_entry_id=p_id AND
 (l.currency_code IS DISTINCT FROM a.currency_code OR NOT a.is_posting OR NOT a.is_active OR date_trunc('month',coalesce(l.line_date,e.transaction_date))<>date_trunc('month',e.transaction_date))) THEN RAISE EXCEPTION 'Journal account, currency or date mismatch';END IF;
 IF EXISTS(SELECT 1 FROM journal_lines WHERE journal_entry_id=p_id GROUP BY currency_code HAVING sum(debit)<>sum(credit)) THEN RAISE EXCEPTION 'Every currency must balance';END IF;
END $function$;
CREATE OR REPLACE FUNCTION pg_temp.post_scheduled_one91(p_id uuid, p_early boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_temp', 'public'
AS $function$
declare s pg_temp.scheduled_journals;v_id uuid;v_no text;v_num text;v_prefix text;v_digits integer;v_today date;v_post date;v_status text;v_currency text;v_other text;v_attempt integer:=0;v_next date;v_index integer;v_rate numeric;
begin
 if auth.uid() is not null and not public.schedule_admin91() then raise exception 'Administrator required';end if;
 select * into s from pg_temp.scheduled_journals where id=p_id for update;
 if not found or s.status<>'active' or s.is_sample then raise exception 'Schedule is unavailable for posting';end if;
 v_today:=(now() at time zone 'Asia/Vientiane')::date;
 if not p_early and s.next_due>v_today then raise exception 'Schedule is not due yet';end if;
 if s.end_date is not null and s.next_due>s.end_date or s.max_occurrences is not null and s.posted_count>=s.max_occurrences then raise exception 'Schedule ended';end if;
 v_post:=s.next_due;
 v_rate:=case when s.currency_code='LAK' then 1 else s.fixed_book_rate_lak end;
 if v_rate is null or v_rate<=0 or (s.currency_code<>'LAK' and s.fixed_rate_currency is distinct from s.currency_code) then raise exception 'Set an approved book rate for this foreign-currency schedule before posting';end if;
 if s.credit_amount is null or s.credit_amount<>s.amount then raise exception 'Debit and credit must balance';end if;
 select status into v_status from pg_temp.accounting_periods where period_month=date_trunc('month',v_post)::date;
 if coalesce(v_status,'open')<>'open' then raise exception 'Posting period is %',v_status;end if;
 select currency_code into v_currency from public.accounts where id=s.debit_account_id and is_active=true;
 select currency_code into v_other from public.accounts where id=s.credit_account_id and is_active=true;
 if v_currency is null or v_currency is distinct from s.currency_code or v_other is distinct from s.currency_code then raise exception 'Scheduled account is inactive or has changed currency';end if;
 select automated_prefix,journal_digits into v_prefix,v_digits from public.accounting_id_settings where id=true;
 loop
  v_attempt:=v_attempt+1;if v_attempt>1000 then raise exception 'Unable to allocate entry ID';end if;
  v_num:=nextval('pg_temp.test_journal_seq')::text;
  v_no:=private.format_entry_id143114(coalesce(v_prefix,'AUTO'),v_post,v_num::bigint,coalesce(v_digits,4));
  begin
   insert into pg_temp.journal_entries(entry_no,transaction_date,memo,status,source,posted_by,posted_at)
   values(v_no,v_post,s.memo,'posted','recurring',auth.uid(),now()) returning id into v_id;
   exit;
  exception when unique_violation then null;
  end;
 end loop;
 insert into pg_temp.journal_lines(journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date,fx_rate_lak,book_rate_lak) values
 (v_id,1,s.debit_account_id,s.memo,s.currency_code,s.amount,0,v_post,v_rate,v_rate),
 (v_id,2,s.credit_account_id,s.memo,s.currency_code,0,s.amount,v_post,v_rate,v_rate);
 perform pg_temp.check_ledger_entry14228(v_id);
 insert into pg_temp.scheduled_journal_occurrences(schedule_id,occurrence_date,journal_entry_id,posted_early) values(s.id,s.next_due,v_id,p_early and s.next_due>v_today);
 v_index:=s.posted_count+1;v_next:=public.schedule_next_date91(s.start_date,s.frequency,s.day_rule,s.anchor_day,v_index);
 update pg_temp.scheduled_journals set posted_count=v_index,next_due=v_next,status=case when (s.max_occurrences is not null and v_index>=s.max_occurrences) or (s.end_date is not null and v_next>s.end_date) then 'complete' else 'active' end,last_error=null,updated_at=now() where id=s.id;
 insert into pg_temp.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('journal_entries',v_id::text,'AUTO_POST',jsonb_build_object('schedule_id',s.id,'due_date',s.next_due,'posted_early',p_early,'entry_no',v_no),'Scheduled journal posted',auth.uid());
 return v_no;
end $function$;
CREATE OR REPLACE FUNCTION pg_temp.process_due_scheduled_journals91()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_temp', 'public'
AS $function$
DECLARE
 item record;
 v_today date := (now() at time zone 'Asia/Vientiane')::date;
 old_sub text := current_setting('request.jwt.claim.sub', true);
 old_role text := current_setting('request.jwt.claim.role', true);
 old_claims text := current_setting('request.jwt.claims', true);
BEGIN
 IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Scheduler only'; END IF;
 -- Only the server can call this function. Each posting remains subject to the
 -- same active-admin and ledger guards as a manual posting by its creator.
 FOR item IN SELECT id, created_by FROM pg_temp.scheduled_journals
  WHERE status='active' AND auto_post AND NOT is_sample AND next_due<=v_today
  ORDER BY next_due, id FOR UPDATE SKIP LOCKED
 LOOP
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=item.created_by AND role='admin' AND status='active') THEN
   RAISE LOG 'Scheduled journal % skipped: creator no longer has active administrator access', item.id;
   CONTINUE;
  END IF;
  PERFORM set_config('request.jwt.claim.sub', item.created_by::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', item.created_by, 'role', 'authenticated')::text, true);
  BEGIN
   PERFORM pg_temp.post_scheduled_one91(item.id, false);
  EXCEPTION WHEN OTHERS THEN
   UPDATE pg_temp.scheduled_journals SET status='failed', last_error=SQLERRM, updated_at=now() WHERE id=item.id;
  END;
  PERFORM set_config('request.jwt.claim.sub', coalesce(old_sub,''), true);
  PERFORM set_config('request.jwt.claim.role', coalesce(old_role,''), true);
  PERFORM set_config('request.jwt.claims', coalesce(old_claims,''), true);
 END LOOP;
EXCEPTION WHEN OTHERS THEN
 PERFORM set_config('request.jwt.claim.sub', coalesce(old_sub,''), true);
 PERFORM set_config('request.jwt.claim.role', coalesce(old_role,''), true);
 PERFORM set_config('request.jwt.claims', coalesce(old_claims,''), true);
 RAISE;
END
$function$;

DO $test$
DECLARE owner_id uuid; today date:=(now() at time zone 'Asia/Vientiane')::date;
 wifi uuid; rent uuid; missing_rate uuid; future_id uuid; bad_owner uuid; invalid_amount uuid; cycle_id uuid;
 wifi_dr uuid;wifi_cr uuid;rent_dr uuid;rent_cr uuid; n integer; rejected boolean;
BEGIN
 SELECT id INTO owner_id FROM public.profiles WHERE role='admin' AND status='active' ORDER BY created_at LIMIT 1;
 SELECT id INTO wifi_dr FROM public.accounts WHERE code='5110';
 SELECT id INTO wifi_cr FROM public.accounts WHERE code='1311';
 SELECT id INTO rent_dr FROM public.accounts WHERE code='9222';
 SELECT id INTO rent_cr FROM public.accounts WHERE code='1312';
 IF owner_id IS NULL OR rent_cr IS NULL THEN RAISE EXCEPTION 'Test fixtures unavailable'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 INSERT INTO pg_temp.scheduled_journals(schedule_no,title,memo,currency_code,debit_account_id,credit_account_id,amount,credit_amount,frequency,day_rule,anchor_day,start_date,next_due,max_occurrences,auto_post,status,created_by)
 VALUES('TEST-WIFI','test','test','LAK',wifi_dr,wifi_cr,1000,1000,'monthly','same_day',extract(day from today)::int,today,today,6,true,'active',owner_id) RETURNING id INTO wifi;
 INSERT INTO pg_temp.scheduled_journals(schedule_no,title,memo,currency_code,debit_account_id,credit_account_id,amount,credit_amount,frequency,day_rule,anchor_day,start_date,next_due,max_occurrences,auto_post,status,created_by,fixed_book_rate_lak,fixed_rate_currency)
 VALUES('TEST-RENT','test','test','THB',rent_dr,rent_cr,100,100,'monthly','same_day',extract(day from today)::int,today,today,6,true,'active',owner_id,10,'THB') RETURNING id INTO rent;
 INSERT INTO pg_temp.scheduled_journals SELECT (jsonb_populate_record(null::pg_temp.scheduled_journals,to_jsonb(s)||jsonb_build_object('id',gen_random_uuid(),'schedule_no','TEST-MISSING','fixed_book_rate_lak',null,'fixed_rate_currency',null))).* FROM pg_temp.scheduled_journals s WHERE id=rent RETURNING id INTO missing_rate;
 INSERT INTO pg_temp.scheduled_journals SELECT (jsonb_populate_record(null::pg_temp.scheduled_journals,to_jsonb(s)||jsonb_build_object('id',gen_random_uuid(),'schedule_no','TEST-FUTURE','next_due',today+1))).* FROM pg_temp.scheduled_journals s WHERE id=wifi RETURNING id INTO future_id;
 INSERT INTO pg_temp.scheduled_journals SELECT (jsonb_populate_record(null::pg_temp.scheduled_journals,to_jsonb(s)||jsonb_build_object('id',gen_random_uuid(),'schedule_no','TEST-OWNER','created_by',gen_random_uuid()))).* FROM pg_temp.scheduled_journals s WHERE id=wifi RETURNING id INTO bad_owner;
 INSERT INTO pg_temp.scheduled_journals SELECT (jsonb_populate_record(null::pg_temp.scheduled_journals,to_jsonb(s)||jsonb_build_object('id',gen_random_uuid(),'schedule_no','TEST-UNBALANCED','credit_amount',1))).* FROM pg_temp.scheduled_journals s WHERE id=wifi RETURNING id INTO invalid_amount;
 rejected:=false;
 BEGIN PERFORM pg_temp.process_due_scheduled_journals91(); EXCEPTION WHEN OTHERS THEN rejected:=(SQLERRM='Scheduler only'); END;
 IF NOT rejected THEN RAISE EXCEPTION 'Authenticated caller was not rejected'; END IF;
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claim.role','',true);
 PERFORM set_config('request.jwt.claims','',true);
 PERFORM pg_temp.process_due_scheduled_journals91();
 IF auth.uid() IS NOT NULL OR current_setting('request.jwt.claims',true)<>'' THEN RAISE EXCEPTION 'Identity leaked'; END IF;
 IF (SELECT count(*) FROM pg_temp.journal_entries)<>2 THEN RAISE EXCEPTION 'Expected exactly two due postings'; END IF;
 IF (SELECT last_value FROM pg_temp.test_journal_seq)<>2 THEN RAISE EXCEPTION 'Invalid input consumed an ID'; END IF;
 IF (SELECT status FROM pg_temp.scheduled_journals WHERE id=missing_rate)<>'failed' OR (SELECT status FROM pg_temp.scheduled_journals WHERE id=invalid_amount)<>'failed' THEN RAISE EXCEPTION 'Invalid schedules not marked failed'; END IF;
 IF EXISTS(SELECT 1 FROM pg_temp.scheduled_journals WHERE id IN(future_id,bad_owner) AND posted_count<>0) THEN RAISE EXCEPTION 'Future or unauthorized schedule posted'; END IF;
 IF (SELECT sum(base_debit) FROM pg_temp.journal_lines WHERE currency_code='THB')<>1000 THEN RAISE EXCEPTION 'THB valuation missing'; END IF;
 IF EXISTS(SELECT 1 FROM pg_temp.journal_entries WHERE posted_by IS DISTINCT FROM owner_id) THEN RAISE EXCEPTION 'Incorrect posting actor'; END IF;
 PERFORM pg_temp.process_due_scheduled_journals91();
 IF (SELECT count(*) FROM pg_temp.journal_entries)<>2 THEN RAISE EXCEPTION 'Repeated worker duplicated entries'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 INSERT INTO pg_temp.accounting_periods(period_month,status) VALUES(date_trunc('month',today)::date,'closed');
 rejected:=false;
 BEGIN PERFORM pg_temp.post_scheduled_one91(future_id,true); EXCEPTION WHEN OTHERS THEN rejected:=(SQLERRM LIKE 'Posting period is %'); END;
 IF NOT rejected THEN RAISE EXCEPTION 'Closed period guard failed'; END IF;
 DELETE FROM pg_temp.accounting_periods;
 INSERT INTO pg_temp.scheduled_journals SELECT (jsonb_populate_record(null::pg_temp.scheduled_journals,to_jsonb(s)||jsonb_build_object('id',gen_random_uuid(),'schedule_no','TEST-CYCLE','start_date','2026-10-31','next_due','2026-10-31','end_date','2027-03-31','day_rule','last_day','anchor_day',31,'posted_count',0))).* FROM pg_temp.scheduled_journals s WHERE id=rent RETURNING id INTO cycle_id;
 FOR n IN 1..6 LOOP PERFORM pg_temp.post_scheduled_one91(cycle_id,true); END LOOP;
 IF (SELECT status FROM pg_temp.scheduled_journals WHERE id=cycle_id)<>'complete' THEN RAISE EXCEPTION 'Sixth release did not finish schedule'; END IF;
 IF (SELECT array_agg(occurrence_date ORDER BY occurrence_date) FROM pg_temp.scheduled_journal_occurrences WHERE schedule_id=cycle_id) IS DISTINCT FROM ARRAY['2026-10-31','2026-11-30','2026-12-31','2027-01-31','2027-02-28','2027-03-31']::date[] THEN RAISE EXCEPTION 'Month-end dates wrong'; END IF;
END
$test$;
ROLLBACK;
SELECT 'PASS: guarded due posting, identity restoration, retry idempotence, missing-rate and imbalance failures before ID allocation, inactive creator and future exclusion, THB valuation, period lock, six month-ends. All test writes used temporary tables and sequences.' result;
