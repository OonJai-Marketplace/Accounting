-- Close payroll independently of journal posting. No existing records are rewritten.
-- Retain the shared v83 employee/leave/report guard; replace only its payroll trigger.
create table private.payroll_corrections277(
 id uuid primary key default gen_random_uuid(),
 run_id uuid not null references public.payroll_runs(id),
 reason text not null check(length(btrim(reason))>0),
 requires_report boolean not null default false,
 original jsonb not null,
 corrected jsonb,
 state text not null default 'editing' check(state in ('editing','ready','posted')),
 posting_mode text check(posting_mode in ('initial','replace','adjustment','report')),
 journal_id uuid references public.journal_entries(id),
 created_by uuid not null,
 created_at timestamptz not null default now(),
 posted_at timestamptz
);
create index payroll_correction_run277 on private.payroll_corrections277(run_id);
create index payroll_correction_journal277 on private.payroll_corrections277(journal_id);
create unique index payroll_one_correction277 on private.payroll_corrections277(run_id) where state in ('editing','ready');
alter table private.payroll_corrections277 enable row level security;
revoke all on private.payroll_corrections277 from public,anon,authenticated;

create or replace function private.payroll_access277() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() or not public.accounting_workspace_allowed123() then
  raise exception 'Active payroll administrator access required' using errcode='42501';
 end if;
 perform public.password_gate14257();
end $$;

create or replace function private.payroll_open_month277(p_month text) returns void
language plpgsql security definer set search_path='' as $$
declare m date; period public.accounting_periods;
begin
 perform private.payroll_access277();
 if p_month is null or p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Invalid payroll month'; end if;
 m:=(p_month||'-01')::date;
 insert into public.accounting_periods(period_month,status,updated_by)
 values(m,'open',auth.uid()) on conflict(period_month) do nothing;
 select * into period from public.accounting_periods where period_month=m for share;
 if period.status<>'open' or exists(select 1 from public.year_closings136 where year=extract(year from m)::integer)
  or exists(select 1 from public.book_sessions136 where period_id=period.id and status='editing') then
  raise exception 'Payroll changes and posting require an open accounting month outside a book-correction session';
 end if;
end $$;

create or replace function private.payroll_has_journal277(p_id uuid,p_data jsonb) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(nullif(p_data->'journalLink1429'->>'journalId','') is not null,false)
 or exists(select 1 from public.journal_entries where status::text in ('posted','voided')
 and position('[Payroll:'||p_id::text||']' in coalesce(memo,''))>0)
$$;

create or replace function private.payroll_correction_rules277(p_id uuid,p_data jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare c private.payroll_corrections277;
begin
 select * into c from private.payroll_corrections277 where run_id=p_id and id::text=p_data->'correction277'->>'id' and state in ('editing','ready');
 if not found then return false; end if;
 if p_data->'config' is distinct from c.original->'data'->'config' or p_data->'settingsSnapshot' is distinct from c.original->'data'->'settingsSnapshot'
  or p_data->>'settingsVersion' is distinct from c.original->'data'->>'settingsVersion' then raise exception 'Retain the original applied payroll rules'; end if;
 return true;
end $$;

CREATE OR REPLACE FUNCTION public.check_payroll_tax_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare config public.payroll_tax_settings%rowtype; h jsonb; linked uuid;
begin
 perform private.payroll_access277();
 if TG_OP='UPDATE' and new.data->>'status'='finalized' and private.payroll_correction_rules277(new.id,new.data) then return new; end if;
 if new.data->>'status'='finalized' and (TG_OP='INSERT' or old.data->>'status' is distinct from 'finalized') then
  h := new.data->'historicalImport199';
  if h is not null then
   if TG_OP<>'INSERT' or auth.uid() is null or not public.is_admin()
      or h->>'kind' is distinct from 'historical-source'
      or h->>'historyOnly' is distinct from 'true'
      or h->>'importedBy' is distinct from auth.uid()::text
      or h->>'month' is distinct from new.data->>'month'
      or coalesce(h->>'file','')='' or coalesce(h->>'sha256','') !~ '^[a-f0-9]{64}$'
      or jsonb_typeof(h->'sourceSheets') is distinct from 'object'
      or jsonb_typeof(h->'checks') is distinct from 'array' then
    raise exception 'Historical payroll requires administrator identity and preserved source evidence';
   end if;
   if not exists(select 1 from public.accounting_periods where period_month=((new.data->>'month')||'-01')::date and status='closed') then
    raise exception 'Historical payroll is restricted to closed months';
   end if;
   linked := (new.data->'journalLink1429'->>'journalId')::uuid;
   if not exists(select 1 from public.journal_entries where id=linked and status='posted'
      and to_char(transaction_date,'YYYY-MM')=new.data->>'month') then
    raise exception 'Historical payroll must link an existing posted journal in its month';
   end if;
   if jsonb_typeof(new.data->'results') is distinct from 'array'
      or jsonb_array_length(new.data->'results')<>jsonb_array_length(new.data->'rows')
      or jsonb_array_length(new.data->'results')=0 then
    raise exception 'Historical payroll requires one preserved result per employee';
   end if;
   return new;
  end if;
  select * into config from public.payroll_tax_settings where id=true for share;
  if not found or (new.data->>'settingsVersion') is distinct from config.version::text or
     new.data->'settingsSnapshot'->'payroll' is distinct from config.data->'payroll' or
     new.data->'settingsSnapshot'->'tax' is distinct from config.data->'tax' then
   raise exception 'Payroll and tax settings changed or have not been shared. Refresh and review payroll before finalizing.';
  end if;
 end if;
 return new;
end $function$
;

create or replace function private.guard_payroll_run277() returns trigger
language plpgsql security definer set search_path='' as $$
declare mode text:=current_setting('app.payroll277',true); metadata_only boolean; correction private.payroll_corrections277;
begin
 perform private.payroll_access277();
 -- Preserve legacy rows without an application snapshot.
 if new.data is null then
  if tg_op='UPDATE' and old.data is not null then raise exception 'Cannot remove an application payroll snapshot'; end if;
  new.updated_at:=now();new.updated_by:=auth.uid();return new;
 end if;
 if jsonb_typeof(new.data)<>'object' then raise exception 'Invalid record data'; end if;
 if tg_op='INSERT' and new.data->'correction277' is not null then raise exception 'Use Edit payroll to start a documented correction'; end if;
 if tg_op='INSERT' and new.data->'journalLink1429' is not null and new.data->'historicalImport199' is null then
  raise exception 'Save and close payroll before linking its journal';
 end if;
 if tg_op='UPDATE' then
  if new.version is distinct from old.version+1 then raise exception 'Record version conflict'; end if;
  new.created_at:=old.created_at;new.created_by:=old.created_by;
  if old.data is not null and new.data->>'month' is distinct from old.data->>'month' then raise exception 'A saved payroll cannot move to another month'; end if;
  if new.data->'correction277' is distinct from old.data->'correction277' and mode is distinct from 'reopen:'||new.id::text
   and mode is distinct from 'link:'||new.id::text then raise exception 'Use the documented payroll correction action'; end if;
  select * into correction from private.payroll_corrections277 where run_id=new.id and id::text=new.data->'correction277'->>'id' and state in ('editing','ready') for update;
  if correction.id is not null then
   if new.data->>'month' is distinct from correction.original->'data'->>'month'
    or new.data->'config' is distinct from correction.original->'data'->'config'
    or new.data->'settingsSnapshot' is distinct from correction.original->'data'->'settingsSnapshot'
    or new.data->'legendSnapshot95' is distinct from correction.original->'data'->'legendSnapshot95'
    or new.data->'calendarSnapshot14306' is distinct from correction.original->'data'->'calendarSnapshot14306'
    or new.data->'leaveSnapshot' is distinct from correction.original->'data'->'leaveSnapshot' then
     raise exception 'Payroll corrections must retain their original month and calculation rules';
   end if;
  end if;
  if new.data->'journalLink1429' is distinct from old.data->'journalLink1429'
   and mode is distinct from 'link:'||new.id::text then raise exception 'Use the payroll journal action to link a posted journal'; end if;
  if old.data->>'status'='finalized' then
   metadata_only:=(new.data-'payrollTemplate1429'-'journalLink1429')=(old.data-'payrollTemplate1429'-'journalLink1429');
   if mode='link:'||new.id::text then
    if new.data-'journalLink1429'-'correction277' is distinct from old.data-'journalLink1429'-'correction277' then raise exception 'Journal linking cannot change payroll calculations'; end if;
   elsif mode='reopen:'||new.id::text and new.data->>'status'='draft' then
    if correction.id is null then raise exception 'A documented correction is required'; end if;
   elsif not metadata_only or new.data->>'status'<>'finalized' then
    raise exception 'Use Edit payroll in Salary History before changing a closed payroll';
   elsif correction.id is null and private.payroll_has_journal277(old.id,old.data) then raise exception 'Use Edit payroll in Salary History before changing this payroll';
   end if;
  elsif correction.id is null and private.payroll_has_journal277(old.id,old.data) then raise exception 'Use Edit payroll in Salary History before changing this payroll';
  end if;
 end if;
 if coalesce(new.data->>'status','') not in ('draft','finalized')
  or coalesce(new.data->>'month','') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
  or jsonb_typeof(new.data->'rows') is distinct from 'array' then raise exception 'Invalid payroll run'; end if;
 if new.data->>'status'='finalized' and (jsonb_typeof(new.data->'results') is distinct from 'array'
  or jsonb_typeof(new.data->'config') is distinct from 'object' or jsonb_array_length(new.data->'results')=0) then
  raise exception 'Closed payroll requires calculated results and applied rules'; end if;
 -- The existing check_payroll_tax_settings trigger still validates historical imports.
 if correction.id is null and not (tg_op='INSERT' and new.data->'historicalImport199' is not null and new.data->>'status'='finalized') then
  perform private.payroll_open_month277(new.data->>'month');
 end if;
 new.period_start:=((new.data->>'month')||'-01')::date;
 new.period_end:=(new.period_start+interval '1 month - 1 day')::date;
 new.status:=new.data->>'status';
 if tg_op='INSERT' then new.created_by:=auth.uid(); end if;
 if new.status='finalized' then
  if coalesce((new.data->>'isSample')::boolean,false) then raise exception 'Examples cannot be closed as actual payroll'; end if;
  if tg_op='INSERT' or old.status is distinct from 'finalized' then new.approved_by:=auth.uid(); end if;
 end if;
 if correction.id is not null and old.status='draft' and new.status='finalized' then
  update private.payroll_corrections277 set corrected=new.data,state='ready' where id=correction.id;
  if correction.requires_report then insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
  values('payroll_runs',new.id::text,'PAYROLL_CORRECTION_REPORT',correction.original,to_jsonb(new),correction.reason,auth.uid());
  end if;
 end if;
 new.updated_at:=now();new.updated_by:=auth.uid();return new;
end $$;
drop trigger if exists guard_record83 on public.payroll_runs;
create trigger guard_record83 before insert or update on public.payroll_runs
 for each row execute function private.guard_payroll_run277();

create or replace function public.reopen_payroll277(p_run_id uuid,p_expected_version integer,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.payroll_runs; saved public.payroll_runs; correction private.payroll_corrections277; needs_report boolean;
begin
 perform private.payroll_access277();
 select * into r from public.payroll_runs where id=p_run_id for update;
 if not found or r.version is distinct from p_expected_version then raise exception 'Payroll changed. Reload Salary History before editing'; end if;
 if r.data->>'status'<>'finalized' or coalesce((r.data->>'isSample')::boolean,false) then raise exception 'Choose a closed actual payroll'; end if;
 needs_report:=not coalesce((private.payroll_journal_context277(r.id)->>'period_open')::boolean,false);
 if needs_report and nullif(btrim(p_reason),'') is null then raise exception 'This accounting month is closed. Describe the problem and the proposed payroll correction'; end if;
 if jsonb_typeof(r.data->'settingsSnapshot') is distinct from 'object' or jsonb_typeof(r.data->'config'->'brackets') is distinct from 'array' then
  raise exception 'This imported payroll does not contain complete saved calculation rules. Preserve its figures and prepare a documented manual payroll adjustment; do not recalculate it with current settings';
 end if;
 if r.data->'journalLink1429'->>'status' in ('posting','uncertain') then raise exception 'Refresh the interrupted journal posting before editing payroll'; end if;
 select * into correction from private.payroll_corrections277 where run_id=r.id and state in ('editing','ready') for update;
 if found then
  update private.payroll_corrections277 set state='editing',corrected=null,requires_report=requires_report or needs_report,reason=case when needs_report then btrim(p_reason) else reason end where id=correction.id returning * into correction;
 else
  insert into private.payroll_corrections277(run_id,reason,requires_report,original,created_by) values(r.id,case when needs_report then btrim(p_reason) else 'Payroll edit while accounting month is open' end,needs_report,to_jsonb(r),auth.uid()) returning * into correction;
 end if;
 perform set_config('app.payroll277','reopen:'||r.id::text,true);
 update public.payroll_runs set data=r.data||jsonb_build_object('status','draft','reviewed',false,'correction277',jsonb_build_object('id',correction.id,'reason',case when correction.requires_report then correction.reason else '' end,'pending',true)),version=version+1 where id=r.id returning * into saved;
 perform set_config('app.payroll277','',true);
 if correction.requires_report then insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
 values('payroll_runs',r.id::text,'REOPEN_PAYROLL',to_jsonb(r),to_jsonb(saved),correction.reason,auth.uid());
 end if;
 return to_jsonb(saved);
end $$;

-- Marked payroll journals must use the atomic action, including Generate/manual edits
-- made after preparing payroll. Unrelated manual journals retain their existing path.
create or replace function private.guard_payroll_journal277() returns trigger
language plpgsql security definer set search_path='' as $$
declare refs text[]; adjustments text[];
begin
 if new.status::text<>'posted' then return new; end if;
 if tg_op='UPDATE' and old.status::text='posted' then return new; end if;
 select array_agg(m[1]||':'||m[2]) into adjustments from regexp_matches(coalesce(new.memo,''),'\[PayrollAdjustment:([^]:]+):([^]]+)\]','g') m;
 if adjustments is not null then
  if cardinality(adjustments)<>1 or current_setting('app.payroll277',true) is distinct from 'post:'||split_part(adjustments[1],':',1)
   or position('[Payroll:' in coalesce(new.memo,''))>0 then raise exception 'Prepare this payroll adjustment from Salary History'; end if;
  if exists(select 1 from public.journal_entries where status::text in ('posted','voided') and position('[PayrollAdjustment:'||adjustments[1]||']' in coalesce(memo,''))>0) then raise exception 'This payroll adjustment is already journaled'; end if;
  return new;
 end if;
 select array_agg(m[1]) into refs from regexp_matches(coalesce(new.memo,''),'\[Payroll:([^]]+)\]','g') m;
 if refs is null then return new; end if;
 if cardinality(refs)<>1 or current_setting('app.payroll277',true) is distinct from 'post:'||refs[1] then
  raise exception 'Prepare this payroll from Salary History, then use Post Payroll Journal';
 end if;
 if exists(select 1 from public.journal_entries where id<>new.id and status::text in ('posted','voided')
  and position('[Payroll:'||refs[1]||']' in coalesce(memo,''))>0) then raise exception 'This payroll already has a journal'; end if;
 return new;
end $$;
create trigger payroll_journal277 before insert or update of status on public.journal_entries
 for each row execute function private.guard_payroll_journal277();

create or replace function private.link_payroll277(p_run_id uuid,p_entry_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.payroll_runs; e public.journal_entries; saved public.payroll_runs; tagged text;
begin
 select * into r from public.payroll_runs where id=p_run_id for update;
 select * into e from public.journal_entries where id=p_entry_id for update;
 if e.id is null or e.status::text<>'posted' or to_char(e.transaction_date,'YYYY-MM') is distinct from r.data->>'month' then
  raise exception 'Choose a posted journal from this payroll month'; end if;
 if exists(select 1 from public.payroll_runs where id<>r.id and data->'journalLink1429'->>'journalId'=e.id::text)
  or exists(select 1 from public.journal_entries where id<>e.id and status::text in ('posted','voided')
   and position('[Payroll:'||r.id::text||']' in coalesce(memo,''))>0)
  or (nullif(r.data->'journalLink1429'->>'journalId','') is not null and r.data->'journalLink1429'->>'journalId'<>e.id::text) then
  raise exception 'Payroll or journal is already linked. Review its existing journal'; end if;
 for tagged in select m[1] from regexp_matches(coalesce(e.memo,''),'\[Payroll:([^]]+)\]','g') m loop
  if tagged<>r.id::text then raise exception 'This journal references another payroll'; end if;
 end loop;
 if r.data->'journalLink1429'->>'journalId'=e.id::text and r.data->'journalLink1429'->>'status'='posted' then return to_jsonb(r); end if;
 perform set_config('app.payroll277','link:'||r.id::text,true);
 update public.payroll_runs set data=jsonb_set(data,'{journalLink1429}',jsonb_build_object('status','posted','journalId',e.id,'journalReference',e.entry_no,'postedAt',e.posted_at)),version=version+1
 where id=r.id returning * into saved;
 perform set_config('app.payroll277','',true);
 insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
 values('payroll_runs',r.id::text,'LINK_PAYROLL',to_jsonb(r),to_jsonb(saved),'Explicit payroll journal link',auth.uid());
 return to_jsonb(saved);
end $$;

create or replace function public.link_payroll_journal277(p_run_id uuid,p_expected_version integer,p_entry_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.payroll_runs;
begin
 perform private.payroll_access277();
 select * into r from public.payroll_runs where id=p_run_id for update;
 if not found or r.version is distinct from p_expected_version then raise exception 'Payroll changed. Reload before linking'; end if;
 if r.data->>'status'<>'finalized' or coalesce((r.data->>'isSample')::boolean,false) then raise exception 'Close actual payroll before linking its journal'; end if;
 if coalesce((r.data->'correction277'->>'pending')::boolean,false) then raise exception 'Use the payroll correction journal action for this report'; end if;
 -- Already linked historical records can be read/refreshed without rewriting them.
 if r.data->'journalLink1429'->>'journalId' is distinct from p_entry_id::text then perform private.payroll_open_month277(r.data->>'month'); end if;
 return private.link_payroll277(p_run_id,p_entry_id);
end $$;

-- Read the complete posted payroll basis, including prior adjustment entries.
create or replace function private.payroll_journal_context277(p_run_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.payroll_runs; c private.payroll_corrections277; ledger jsonb; mode text; period_open boolean; base_id uuid;
begin
 select * into r from public.payroll_runs where id=p_run_id;
 if not found or r.data->>'status'<>'finalized' then raise exception 'Close payroll before preparing its journal'; end if;
 select * into c from private.payroll_corrections277 where run_id=r.id and id::text=r.data->'correction277'->>'id' and state='ready';
 base_id:=nullif(r.data->'journalLink1429'->>'journalId','')::uuid;
 if base_id is null then
  select id into base_id from public.journal_entries where status::text='posted' and position('[Payroll:'||r.id::text||']' in coalesce(memo,''))>0 limit 1;
 end if;
 select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('lines',(select coalesce(jsonb_agg(to_jsonb(l) order by l.line_no,l.id),'[]'::jsonb) from public.journal_lines l where l.journal_entry_id=e.id)) order by e.id),'[]'::jsonb)
 into ledger from public.journal_entries e where e.id=base_id or e.id in (select journal_id from private.payroll_corrections277 where run_id=r.id and state='posted');
 if exists(select 1 from jsonb_array_elements(ledger) e where e->>'status'<>'posted') then raise exception 'A payroll journal was voided. Review its audit history before correcting payroll'; end if;
 period_open:=not exists(select 1 from public.accounting_periods where period_month=((r.data->>'month')||'-01')::date and status<>'open')
  and not exists(select 1 from public.year_closings136 where year=left(r.data->>'month',4)::integer)
  and not exists(select 1 from public.book_sessions136 s join public.accounting_periods p on p.id=s.period_id where to_char(p.period_month,'YYYY-MM')=r.data->>'month' and s.status='editing');
 if c.id is null then mode:='initial';
 elsif not period_open or exists(select 1 from private.payroll_corrections277 where run_id=r.id and state='posted' and posting_mode='adjustment') then mode:='adjustment';
 elsif jsonb_array_length(ledger)>0 then mode:='replace';else mode:='initial';end if;
 return jsonb_build_object('record',to_jsonb(r),'correction_id',c.id,'reason',c.reason,'mode',mode,'period_open',period_open,'needs_report',not period_open and c.id is not null and not c.requires_report,'journal_id',base_id,'ledger',ledger,'ledger_hash',md5(ledger::text));
end $$;
create or replace function public.payroll_journal_context277(p_run_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin perform private.payroll_access277();return private.payroll_journal_context277(p_run_id);end $$;

create or replace function public.document_payroll_correction277(p_run_id uuid,p_expected_version integer,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.payroll_runs;c private.payroll_corrections277;saved public.payroll_runs;
begin
 perform private.payroll_access277();
 if nullif(btrim(p_reason),'') is null then raise exception 'Describe the closed-month payroll correction'; end if;
 select * into r from public.payroll_runs where id=p_run_id for update;
 if not found or r.version is distinct from p_expected_version then raise exception 'Payroll changed. Reopen its journal'; end if;
 select * into c from private.payroll_corrections277 where run_id=r.id and id::text=r.data->'correction277'->>'id' and state='ready' for update;
 if not found then raise exception 'Close the payroll correction before preparing its journal'; end if;
 update private.payroll_corrections277 set reason=btrim(p_reason),requires_report=true where id=c.id;
 perform set_config('app.payroll277','link:'||r.id::text,true);
 update public.payroll_runs set data=jsonb_set(data,'{correction277,reason}',to_jsonb(btrim(p_reason))),version=version+1 where id=r.id returning * into saved;
 perform set_config('app.payroll277','',true);
 insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
 values('payroll_runs',r.id::text,'PAYROLL_CORRECTION_REPORT',c.original,to_jsonb(saved),btrim(p_reason),auth.uid());
 return to_jsonb(saved);
end $$;

create or replace function private.payroll_line_totals277(p_lines jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(t) order by account,currency,fx,book),'[]'::jsonb) from (
  select l->>'account_id' account,l->>'currency_code' currency,
   case when l->>'currency_code'='LAK' then 1 else nullif(l->>'fx_rate_lak','')::numeric end fx,
   nullif(l->>'book_rate_lak','')::numeric book,sum(coalesce((l->>'debit')::numeric,0)-coalesce((l->>'credit')::numeric,0)) amount
  from jsonb_array_elements(p_lines) l group by 1,2,3,4
  having sum(coalesce((l->>'debit')::numeric,0)-coalesce((l->>'credit')::numeric,0))<>0
 ) t
$$;

create or replace function public.post_payroll_journal277(p_run_id uuid,p_expected_version integer,p_transaction_date date,p_memo text,p_lines jsonb,p_prefix text default 'OJM',p_digits integer default 6,p_correction_id uuid default null,p_expected_mode text default 'initial',p_expected_journal_hash text default null,p_target_lines jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.payroll_runs; saved jsonb; posted record; existing public.journal_entries; refs text[]; c private.payroll_corrections277; context jsonb; mode text; entry_id uuid; entry_no text; report_only boolean:=false; basis jsonb;
begin
 perform private.payroll_access277();
 if not public.can_action113('journal','post') then raise exception 'Journal posting permission required' using errcode='42501'; end if;
 select * into r from public.payroll_runs where id=p_run_id for update;
 if not found then raise exception 'Payroll could not be found'; end if;
 if r.data->>'status'<>'finalized' or coalesce((r.data->>'isSample')::boolean,false) then raise exception 'Close actual payroll before posting its journal'; end if;
 if p_correction_id is not null then
  select * into c from private.payroll_corrections277 where id=p_correction_id and run_id=r.id for update;
  if not found then raise exception 'Payroll correction could not be found'; end if;
  if c.state='posted' then
   select * into existing from public.journal_entries where id=c.journal_id;
   return jsonb_build_object('record',to_jsonb(r),'entry_id',existing.id,'entry_no',existing.entry_no,'already_posted',true,'mode',c.posting_mode,'report_only',c.posting_mode='report');
  end if;
  if c.state<>'ready' or r.data->'correction277'->>'id' is distinct from c.id::text then raise exception 'Close this payroll correction before journaling'; end if;
 elsif coalesce((r.data->'correction277'->>'pending')::boolean,false) then raise exception 'Prepare the pending payroll correction again';
 else
  select * into existing from public.journal_entries where status::text='posted' and
   (id::text=r.data->'journalLink1429'->>'journalId' or position('[Payroll:'||r.id::text||']' in coalesce(memo,''))>0) limit 1;
  if found then return jsonb_build_object('record',to_jsonb(r),'entry_id',existing.id,'entry_no',existing.entry_no,'already_posted',true,'mode','initial'); end if;
 end if;
 if r.version is distinct from p_expected_version then raise exception 'Payroll changed after preparation. Prepare its journal again'; end if;
 perform e.id from public.journal_entries e where e.id::text=r.data->'journalLink1429'->>'journalId'
  or e.id in (select journal_id from private.payroll_corrections277 where run_id=r.id and state='posted') order by e.id for update;
 context:=private.payroll_journal_context277(r.id);mode:=context->>'mode';
 if (context->>'needs_report')::boolean then raise exception 'The payroll month is now closed. Add the correction explanation before posting an adjustment'; end if;
 if mode is distinct from p_expected_mode then raise exception 'The accounting month or payroll journal changed. Prepare the correction again'; end if;
 if c.id is not null and p_expected_journal_hash is distinct from context->>'ledger_hash' then raise exception 'The existing payroll journal changed. Prepare the correction again'; end if;
 if mode='adjustment' and p_lines='[]'::jsonb then
  select coalesce(jsonb_agg(l),'[]'::jsonb) into basis from jsonb_array_elements(context->'ledger') e cross join lateral jsonb_array_elements(e->'lines') l;
  if jsonb_array_length(basis)=0 or jsonb_typeof(p_target_lines) is distinct from 'array' or private.payroll_line_totals277(basis) is distinct from private.payroll_line_totals277(p_target_lines) then raise exception 'A report without a journal change requires unchanged account amounts and rates'; end if;
  report_only:=true;
 end if;
 if mode in ('initial','replace') and to_char(p_transaction_date,'YYYY-MM') is distinct from r.data->>'month' then raise exception 'Journal date must be in this payroll month'; end if;
 if not report_only then perform private.payroll_open_month277(to_char(p_transaction_date,'YYYY-MM'));end if;
 if mode in ('initial','replace') then perform private.payroll_open_month277(r.data->>'month');end if;
 if mode='initial' and private.payroll_has_journal277(r.id,r.data) then raise exception 'This payroll already has a journal. Review its existing journal'; end if;
 if r.data->'journalLink1429'->>'status' in ('posting','uncertain') then raise exception 'Refresh the interrupted posting before trying again'; end if;
 if mode='adjustment' then
  if c.id is null or position('[PayrollAdjustment:'||r.id::text||':'||c.id::text||']' in coalesce(p_memo,''))=0 or position('[Payroll:' in coalesce(p_memo,''))>0 then raise exception 'Retain the payroll adjustment reference'; end if;
 else
  select array_agg(m[1]) into refs from regexp_matches(coalesce(p_memo,''),'\[Payroll:([^]]+)\]','g') m;
  if refs is distinct from array[r.id::text] then raise exception 'Retain this payroll reference when posting'; end if;
 end if;
 perform set_config('app.payroll277','post:'||r.id::text,true);
 if report_only then
  mode:='report';entry_id:=coalesce((context->>'journal_id')::uuid,(context->'ledger'->0->>'id')::uuid);select e.entry_no into entry_no from public.journal_entries e where e.id=entry_id;
 elsif mode='replace' then
  entry_id:=(context->>'journal_id')::uuid;
  perform public.revise_open_journal_entry(entry_id,c.reason,p_transaction_date,p_memo,p_lines);
  select e.entry_no into entry_no from public.journal_entries e where e.id=entry_id;
 else
  select * into posted from public.post_manual_journal14228(p_transaction_date=>p_transaction_date,p_memo=>p_memo,p_lines=>p_lines,p_prefix=>p_prefix,p_digits=>p_digits,p_request_key=>'payroll:'||r.id::text||':'||coalesce(c.id::text,r.version::text));
  entry_id:=posted.entry_id;entry_no:=posted.entry_no;
 end if;
 if mode='initial' then saved:=private.link_payroll277(r.id,entry_id);else saved:=to_jsonb(r);end if;
 if c.id is not null then
  perform set_config('app.payroll277','link:'||r.id::text,true);
  update public.payroll_runs set data=jsonb_set(data,'{correction277}',jsonb_build_object('id',c.id,'reason',c.reason,'pending',false,'mode',mode,'journalId',entry_id,'journalReference',entry_no)),version=version+1 where id=r.id returning to_jsonb(payroll_runs) into saved;
  perform set_config('app.payroll277','',true);
  update private.payroll_corrections277 set state='posted',posting_mode=mode,journal_id=entry_id,posted_at=now() where id=c.id;
  if c.requires_report then insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
  values('payroll_runs',r.id::text,'PAYROLL_CORRECTION_JOURNAL',jsonb_build_object('payroll',c.original,'journals',context->'ledger'),jsonb_build_object('payroll',saved,'journalId',entry_id,'mode',mode),c.reason,auth.uid());
  end if;
 end if;
 return jsonb_build_object('record',saved,'entry_id',entry_id,'entry_no',entry_no,'already_posted',false,'mode',mode,'report_only',report_only);
end $$;

revoke all on function public.check_payroll_tax_settings() from public,anon,authenticated;
revoke all on function private.payroll_access277(),private.payroll_open_month277(text),private.payroll_has_journal277(uuid,jsonb),private.payroll_correction_rules277(uuid,jsonb),private.guard_payroll_run277(),private.guard_payroll_journal277(),private.link_payroll277(uuid,uuid),private.payroll_journal_context277(uuid),private.payroll_line_totals277(jsonb) from public,anon,authenticated;
revoke all on function public.reopen_payroll277(uuid,integer,text),public.link_payroll_journal277(uuid,integer,uuid),public.payroll_journal_context277(uuid),public.document_payroll_correction277(uuid,integer,text),public.post_payroll_journal277(uuid,integer,date,text,jsonb,text,integer,uuid,text,text,jsonb) from public,anon;
grant execute on function public.reopen_payroll277(uuid,integer,text),public.link_payroll_journal277(uuid,integer,uuid),public.payroll_journal_context277(uuid),public.document_payroll_correction277(uuid,integer,text),public.post_payroll_journal277(uuid,integer,date,text,jsonb,text,integer,uuid,text,text,jsonb) to authenticated;
-- Preserve last closed leave usage while a correction is being edited.
CREATE OR REPLACE FUNCTION public.payroll_window14334(p_from date, p_to date, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE records jsonb; carry jsonb:='[]'; revision text; history_index jsonb:='[]';
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_from>p_to OR p_offset IS NULL OR p_offset<0 THEN RAISE EXCEPTION 'Invalid payroll period'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') INTO records FROM (
  SELECT * FROM public.payroll_runs
  WHERE jsonb_typeof(data->'rows')='array' AND coalesce(data->>'month',to_char(period_start,'YYYY-MM')) BETWEEN to_char(p_from,'YYYY-MM') AND to_char(p_to,'YYYY-MM')
  ORDER BY period_start DESC,id LIMIT 200 OFFSET p_offset
 ) r;
 IF p_offset=0 THEN
  -- Dates are retained because each employee has a different entitlement renewal date.
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO carry FROM (
   SELECT r.id AS "runId",result->>'employeeId' AS "employeeId",r.data->>'month' AS month,
    day->>'date' AS date,day->>'leaveType' AS type,
    sum(coalesce((day->>'scheduleFraction')::numeric,1)) AS days
   FROM public.payroll_runs r
   CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(r.data->'results')='array' THEN r.data->'results' ELSE '[]'::jsonb END) result
   CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(result->'attendance95')='array' THEN result->'attendance95' ELSE '[]'::jsonb END) day
   WHERE (r.data->>'status'='finalized' OR jsonb_typeof(r.data->'correction277')='object')
    AND NOT(coalesce(r.data->>'month',to_char(r.period_start,'YYYY-MM')) BETWEEN to_char(p_from,'YYYY-MM') AND to_char(p_to,'YYYY-MM'))
    AND coalesce(day->>'linked','false') IN ('false','0','')
    AND day->>'leaveType' IS NOT NULL
   GROUP BY r.id,result->>'employeeId',r.data->>'month',day->>'date',day->>'leaveType'
  ) x;
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'month',data->>'month','status',CASE WHEN jsonb_typeof(data->'correction277')='object' THEN 'finalized' ELSE data->>'status' END,'employees',(SELECT coalesce(jsonb_agg(e->>'employeeId'),'[]') FROM jsonb_array_elements(CASE WHEN jsonb_typeof(data->'rows')='array' THEN data->'rows' ELSE '[]'::jsonb END) e))),'[]') INTO history_index FROM public.payroll_runs;
 SELECT md5(coalesce(sum(hashtextextended(concat_ws('|',id,version,updated_at,data::text),0)::numeric)::text,'0')) INTO revision FROM public.payroll_runs;
 RETURN jsonb_build_object('rows',records,'carry',carry,'index',CASE WHEN p_offset=0 THEN history_index ELSE '[]'::jsonb END,'revision',revision);
END $function$
;
