-- Scheduled journals require a signed-in administrator's explicit approval.
-- The legacy RPC remains retry-safe; its private worker cannot be called directly.
ALTER TABLE public.scheduled_journals ALTER COLUMN auto_post SET DEFAULT false;

CREATE OR REPLACE FUNCTION private.schedule_manual_only225()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $function$
BEGIN
 NEW.auto_post:=false;
 RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION private.schedule_manual_only225() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER schedule_manual_only225 BEFORE INSERT OR UPDATE OF auto_post
ON public.scheduled_journals FOR EACH ROW EXECUTE FUNCTION private.schedule_manual_only225();

-- Only the obsolete preference changes. The table lock keeps this guarded
-- maintenance atomic; audit/archive triggers and all row policies remain active.
ALTER TABLE public.scheduled_journals DISABLE TRIGGER action_guard113;
UPDATE public.scheduled_journals SET auto_post=false WHERE auto_post;
ALTER TABLE public.scheduled_journals ENABLE TRIGGER action_guard113;
ALTER TABLE public.scheduled_journals ADD CONSTRAINT scheduled_manual_only225 CHECK (NOT auto_post);
COMMENT ON COLUMN public.scheduled_journals.auto_post IS 'Retained for old clients; always false. Each occurrence requires administrator approval.';

CREATE OR REPLACE FUNCTION public.post_scheduled_one91(p_id uuid, p_early boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare s public.scheduled_journals;v_id uuid;v_no text;v_num text;v_prefix text;v_digits integer;v_today date;v_post date;v_status text;v_currency text;v_other text;v_attempt integer:=0;v_next date;v_index integer;v_rate numeric;
begin
 if auth.uid() is null or not public.schedule_admin91() then raise exception 'Administrator approval required';end if;
 if current_setting('app.schedule_approval225',true) is distinct from p_id::text then raise exception 'Approve this occurrence before posting';end if;
 select * into s from public.scheduled_journals where id=p_id for update;
 if not found or s.status<>'active' or s.is_sample then raise exception 'Schedule is unavailable for posting';end if;
 v_today:=(now() at time zone 'Asia/Vientiane')::date;
 if not p_early and s.next_due>v_today then raise exception 'Schedule is not due yet';end if;
 if s.end_date is not null and s.next_due>s.end_date or s.max_occurrences is not null and s.posted_count>=s.max_occurrences then raise exception 'Schedule ended';end if;
 v_post:=s.next_due;
 v_rate:=case when s.currency_code='LAK' then 1 else s.fixed_book_rate_lak end;
 if v_rate is null or v_rate<=0 or (s.currency_code<>'LAK' and s.fixed_rate_currency is distinct from s.currency_code) then raise exception 'Set an approved book rate for this foreign-currency schedule before posting';end if;
 if s.credit_amount is null or s.credit_amount<>s.amount then raise exception 'Debit and credit must balance';end if;
 select status into v_status from public.accounting_periods where period_month=date_trunc('month',v_post)::date;
 if coalesce(v_status,'open')<>'open' then raise exception 'Posting period is %',v_status;end if;
 select currency_code into v_currency from public.accounts where id=s.debit_account_id and is_active=true;
 select currency_code into v_other from public.accounts where id=s.credit_account_id and is_active=true;
 if v_currency is null or v_currency is distinct from s.currency_code or v_other is distinct from s.currency_code then raise exception 'Scheduled account is inactive or has changed currency';end if;
 select automated_prefix,journal_digits into v_prefix,v_digits from public.accounting_id_settings where id=true;
 loop
  v_attempt:=v_attempt+1;if v_attempt>1000 then raise exception 'Unable to allocate entry ID';end if;
  v_num:=nextval('public.journal_entry_number_seq')::text;
  v_no:=private.format_entry_id143114(coalesce(v_prefix,'AUTO'),v_post,v_num::bigint,coalesce(v_digits,4));
  begin
   insert into public.journal_entries(entry_no,transaction_date,memo,status,source,posted_by,posted_at)
   values(v_no,v_post,s.memo,'posted','recurring',auth.uid(),now()) returning id into v_id;
   exit;
  exception when unique_violation then null;
  end;
 end loop;
 insert into public.journal_lines(journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date,fx_rate_lak,book_rate_lak) values
 (v_id,1,s.debit_account_id,s.memo,s.currency_code,s.amount,0,v_post,v_rate,v_rate),
 (v_id,2,s.credit_account_id,s.memo,s.currency_code,0,s.amount,v_post,v_rate,v_rate);
 perform public.check_ledger_entry14228(v_id);
 insert into public.scheduled_journal_occurrences(schedule_id,occurrence_date,journal_entry_id,posted_early) values(s.id,s.next_due,v_id,p_early and s.next_due>v_today);
 v_index:=s.posted_count+1;v_next:=public.schedule_next_date91(s.start_date,s.frequency,s.day_rule,s.anchor_day,v_index);
 update public.scheduled_journals set posted_count=v_index,next_due=v_next,status=case when (s.max_occurrences is not null and v_index>=s.max_occurrences) or (s.end_date is not null and v_next>s.end_date) then 'complete' else 'active' end,last_error=null,updated_at=now() where id=s.id;
 insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('journal_entries',v_id::text,'APPROVED_SCHEDULE_POST',jsonb_build_object('schedule_id',s.id,'due_date',s.next_due,'posted_early',p_early,'entry_no',v_no),'Scheduled journal approved and posted',auth.uid());
 return v_no;
end $function$;
CREATE OR REPLACE FUNCTION public.post_scheduled_one92(p_id uuid, p_expected_due date, p_early boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare s public.scheduled_journals;n text;entry_status text; prior_approval text:=current_setting('app.schedule_approval225',true);
begin
 if auth.uid() is null or not public.schedule_admin91() then raise exception 'Administrator required';end if;
 if p_expected_due is null then raise exception 'Scheduled date required';end if;
 select * into s from public.scheduled_journals where id=p_id for update;
 if not found then raise exception 'Schedule was deleted or is unavailable';end if;
 select j.entry_no,j.status into n,entry_status from public.scheduled_journal_occurrences o join public.journal_entries j on j.id=o.journal_entry_id where o.schedule_id=p_id and o.occurrence_date=p_expected_due;
 if found then
  if entry_status<>'posted' then raise exception 'This occurrence was cancelled and will not be reposted';end if;
  return n;
 end if;
 if s.next_due<>p_expected_due then raise exception 'Schedule changed. Refresh before posting';end if;
 perform set_config('app.schedule_approval225',p_id::text,true);
 begin
  n:=public.post_scheduled_one91(p_id,p_early);
 exception when others then
  perform set_config('app.schedule_approval225',coalesce(prior_approval,''),true);
  raise;
 end;
 perform set_config('app.schedule_approval225',coalesce(prior_approval,''),true);
 return n;
end $function$;

-- A cached job definition or service caller is harmless even before cron stops.
CREATE OR REPLACE FUNCTION public.process_due_scheduled_journals91()
RETURNS void LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $function$
BEGIN
 RETURN;
END
$function$;
REVOKE ALL ON FUNCTION public.post_scheduled_one91(uuid,boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.post_scheduled_one92(uuid,date,boolean) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.post_scheduled_one92(uuid,date,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.process_due_scheduled_journals91() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_scheduled_journals91() TO service_role;

DO $cron$
BEGIN
 IF to_regclass('cron.job') IS NOT NULL THEN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='oonjai-scheduled-journals91';
 END IF;
END
$cron$;
