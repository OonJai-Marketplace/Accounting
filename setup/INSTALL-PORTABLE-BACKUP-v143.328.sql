-- Portable operational records. The signing key never leaves this database.
create table if not exists private.portable_key328 (
  singleton boolean primary key check (singleton), secret bytea not null
);
revoke all on private.portable_key328 from public, anon, authenticated;
insert into private.portable_key328 values (true,extensions.gen_random_bytes(32)) on conflict do nothing;

create or replace function private.portable_catalog328()
returns table(ord integer,ns text,tbl text,pk text[]) language sql immutable set search_path='' as $$
values
  (1,'public','period_findings',array['id']::text[]),
  (2,'public','journal_entries',array['id']::text[]),
  (3,'public','journal_lines',array['id']::text[]),
  (4,'public','journal_fx_evidence288',array['entry_id']::text[]),
  (5,'public','staff_journals',array['id']::text[]),
  (6,'public','staff_journal_lines',array['id']::text[]),
  (7,'public','entry_submissions',array['id']::text[]),
  (8,'public','journal_sources14253',array['journal_line_id','source_line_id']::text[]),
  (9,'public','approved_reports1443',array['journal_id']::text[]),
  (10,'public','review_routes14229',array['journal_id']::text[]),
  (11,'public','cashier_shift_closes',array['id']::text[]),
  (12,'public','cashier_shift_tenders',array['id']::text[]),
  (13,'public','cashier_currency_counts',array['id']::text[]),
  (14,'public','fund_adjustment_requests',array['id']::text[]),
  (15,'public','fund_adjustment_lines',array['id']::text[]),
  (16,'public','payroll_runs',array['id']::text[]),
  (17,'public','payroll_lines',array['id']::text[]),
  (18,'private','payroll_corrections277',array['id']::text[]),
  (20,'public','tax_sso_records',array['id']::text[]),
  (21,'public','vouchers14299',array['id']::text[]),
  (22,'public','voucher_versions14299',array['id']::text[]),
  (23,'public','operational_reports',array['id']::text[]),
  (24,'public','scheduled_journal_occurrences',array['id']::text[]),
  (25,'private','journal_plan_occurrences280',array['plan_id','occurrence_no']::text[]),
  (26,'private','reconciliation_records305',array['record_id']::text[]),
  (27,'private','reconciliation_versions306',array['record_id','saved_at']::text[]),
  (28,'public','audit_reviews136',array['id']::text[]),
  (29,'public','year_closings136',array['year']::text[]),
  (30,'public','audit_log',array['id']::text[]),
  (31,'public','record_deletions108',array['id']::text[]),
  (32,'public','workspace_actor_audit138',array['id']::text[]),
  (33,'private','legacy_audit_archive_20261110',array['source_table','source_id']::text[]),
  (34,'public','book_sessions136',array['id']::text[])
$$;

create or replace function private.portable_rows328(p_from date,p_to date,p_groups text[])
returns jsonb language sql stable set search_path='' as $$
with
period_findings_sel as (select x.* from public.period_findings x where 'journal'=any(p_groups) and (x.accounting_period_id in (select id from public.accounting_periods where period_month>=p_from and (period_month+interval '1 month - 1 day')::date <=p_to))),
journal_entries_sel as (select x.* from public.journal_entries x where 'journal'=any(p_groups) and (x.transaction_date between p_from and p_to)),
journal_lines_sel as (select x.* from public.journal_lines x where (x.journal_entry_id in (select id from journal_entries_sel))),
journal_fx_evidence288_sel as (select x.* from public.journal_fx_evidence288 x where (x.entry_id in (select id from journal_entries_sel))),
staff_journals_sel as (select x.* from public.staff_journals x where 'staff'=any(p_groups) and (x.period_start>=p_from and x.period_end<=p_to and not exists (select 1 from public.staff_journal_lines l where l.staff_journal_id=x.id and l.transaction_date not between p_from and p_to))),
staff_journal_lines_sel as (select x.* from public.staff_journal_lines x where 'staff'=any(p_groups) and (x.transaction_date between p_from and p_to or x.staff_journal_id in (select id from staff_journals_sel))),
entry_submissions_sel as (select x.* from public.entry_submissions x where 'staff'=any(p_groups) and (x.transaction_date between p_from and p_to)),
journal_sources14253_sel as (select x.* from public.journal_sources14253 x where (x.journal_line_id in (select id from journal_lines_sel) or x.source_line_id in (select id from staff_journal_lines_sel) or x.report_id in (select id from staff_journals_sel))),
approved_reports1443_sel as (select x.* from public.approved_reports1443 x where (x.journal_id in (select id from staff_journals_sel))),
review_routes14229_sel as (select x.* from public.review_routes14229 x where (x.journal_id in (select id from staff_journals_sel))),
cashier_shift_closes_sel as (select x.* from public.cashier_shift_closes x where (x.staff_journal_id in (select id from staff_journals_sel) or ('staff'=any(p_groups) and (x.shift_ended_at at time zone 'Asia/Vientiane')::date between p_from and p_to))),
cashier_shift_tenders_sel as (select x.* from public.cashier_shift_tenders x where (x.shift_close_id in (select id from cashier_shift_closes_sel))),
cashier_currency_counts_sel as (select x.* from public.cashier_currency_counts x where (x.shift_close_id in (select id from cashier_shift_closes_sel))),
fund_adjustment_requests_sel as (select x.* from public.fund_adjustment_requests x where 'staff'=any(p_groups) and ((x.created_at at time zone 'Asia/Vientiane')::date between p_from and p_to)),
fund_adjustment_lines_sel as (select x.* from public.fund_adjustment_lines x where (x.request_id in (select id from fund_adjustment_requests_sel))),
payroll_runs_sel as (select x.* from public.payroll_runs x where 'payroll'=any(p_groups) and (x.period_start>=p_from and x.period_end<=p_to)),
payroll_lines_sel as (select x.* from public.payroll_lines x where (x.payroll_run_id in (select id from payroll_runs_sel))),
payroll_corrections277_sel as (select x.* from private.payroll_corrections277 x where (x.run_id in (select id from payroll_runs_sel))),
tax_sso_records_sel as (select x.* from public.tax_sso_records x where 'tax'=any(p_groups) and (x.period_start>=p_from and x.period_end<=p_to)),
vouchers14299_sel as (select x.* from public.vouchers14299 x where 'vouchers'=any(p_groups) and (x.voucher_date between p_from and p_to)),
voucher_versions14299_sel as (select x.* from public.voucher_versions14299 x where (x.voucher_id in (select id from vouchers14299_sel))),
operational_reports_sel as (select x.* from public.operational_reports x where 'reports'=any(p_groups) and (coalesce(nullif(x.data->>'from',''), nullif(x.data->>'date',''), nullif(x.data->>'requestDate',''), (x.created_at at time zone 'Asia/Vientiane')::date::text)>=p_from::text and coalesce(nullif(x.data->>'to',''),nullif(x.data->>'from',''),nullif(x.data->>'date',''),nullif(x.data->>'requestDate',''),(x.created_at at time zone 'Asia/Vientiane')::date::text)<=p_to::text)),
scheduled_journal_occurrences_sel as (select x.* from public.scheduled_journal_occurrences x where (x.journal_entry_id in (select id from journal_entries_sel) or ('schedules'=any(p_groups) and x.occurrence_date between p_from and p_to))),
journal_plan_occurrences280_sel as (select x.* from private.journal_plan_occurrences280 x where 'schedules'=any(p_groups) and (x.due_date between p_from and p_to)),
reconciliation_records305_sel as (select x.* from private.reconciliation_records305 x where 'reconciliation'=any(p_groups) and (x.period_from>=p_from and x.period_to<=p_to)),
reconciliation_versions306_sel as (select x.* from private.reconciliation_versions306 x where (x.record_id in (select record_id from reconciliation_records305_sel))),
book_sessions136_sel as (select x.* from public.book_sessions136 x where 'journal'=any(p_groups) and x.period_id in (select id from public.accounting_periods where period_month>=p_from and (period_month+interval '1 month - 1 day')::date<=p_to)),
selected_ids as (
 select 'journal_entries' t,id::text k from journal_entries_sel union all select 'journal_lines',id::text from journal_lines_sel
 union all select 'staff_journals',id::text from staff_journals_sel union all select 'staff_journal_lines',id::text from staff_journal_lines_sel
 union all select 'payroll_runs',id::text from payroll_runs_sel union all select 'operational_reports',id::text from operational_reports_sel
),
audit_reviews136_sel as (select x.* from public.audit_reviews136 x where x.entry_id in (select id from journal_entries_sel) or x.adjustment_id in (select id from journal_entries_sel) or ('audit'=any(p_groups) and (x.created_at at time zone 'Asia/Vientiane')::date between p_from and p_to)),
audit_log_sel as (select x.* from public.audit_log x
 where x.table_name not in ('payroll_employees','payroll_leave_records','employees','hr_inbox143168','hr_calendar_events14306','hr_calendar_settings14306')
 and (exists(select 1 from selected_ids z where z.t=x.table_name and z.k=x.record_id::text)
 or ('audit'=any(p_groups) and ((x.created_at at time zone 'Asia/Vientiane')::date between p_from and p_to or coalesce(x.new_data->>'transaction_date',x.old_data->>'transaction_date') between p_from::text and p_to::text)))),
record_deletions108_sel as (select x.* from public.record_deletions108 x
 where x.table_name not in ('payroll_employees','payroll_leave_records','employees','hr_inbox143168','hr_calendar_events14306','hr_calendar_settings14306')
 and (exists(select 1 from selected_ids z where z.t=x.table_name and z.k=x.record_id::text)
 or ('audit'=any(p_groups) and ((x.deleted_at at time zone 'Asia/Vientiane')::date between p_from and p_to or coalesce(x.record_data->>'transaction_date',x.record_data->>'transaction_date') between p_from::text and p_to::text)))),
workspace_actor_audit138_sel as (select x.* from public.workspace_actor_audit138 x
 where x.table_name not in ('payroll_employees','payroll_leave_records','employees','hr_inbox143168','hr_calendar_events14306','hr_calendar_settings14306')
 and (exists(select 1 from selected_ids z where z.t=x.table_name and z.k=x.row_id::text)
 or ('audit'=any(p_groups) and ((x.created_at at time zone 'Asia/Vientiane')::date between p_from and p_to or coalesce(x.after_data->>'transaction_date',x.before_data->>'transaction_date') between p_from::text and p_to::text)))),
legacy_audit_archive_20261110_sel as (select x.* from private.legacy_audit_archive_20261110 x
 where x.payload->>'table_name' not in ('payroll_employees','payroll_leave_records','employees','hr_inbox143168','hr_calendar_events14306','hr_calendar_settings14306')
 and (exists(select 1 from selected_ids z where z.t=x.payload->>'table_name' and z.k=coalesce(x.payload->>'row_id',x.payload->>'record_id'))
 or ('audit'=any(p_groups) and ((coalesce(x.payload->>'created_at',x.payload->>'deleted_at')::timestamptz at time zone 'Asia/Vientiane')::date between p_from and p_to or coalesce(x.payload->'after_data'->>'transaction_date',x.payload->'before_data'->>'transaction_date',x.payload->'record_data'->>'transaction_date') between p_from::text and p_to::text))))
select jsonb_build_object(
  'period_findings', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from period_findings_sel x),
  'journal_entries', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from journal_entries_sel x),
  'journal_lines', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from journal_lines_sel x),
  'journal_fx_evidence288', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.entry_id),'[]') from journal_fx_evidence288_sel x),
  'staff_journals', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from staff_journals_sel x),
  'staff_journal_lines', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from staff_journal_lines_sel x),
  'entry_submissions', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from entry_submissions_sel x),
  'journal_sources14253', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.journal_line_id,x.source_line_id),'[]') from journal_sources14253_sel x),
  'approved_reports1443', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.journal_id),'[]') from approved_reports1443_sel x),
  'review_routes14229', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.journal_id),'[]') from review_routes14229_sel x),
  'cashier_shift_closes', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from cashier_shift_closes_sel x),
  'cashier_shift_tenders', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from cashier_shift_tenders_sel x),
  'cashier_currency_counts', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from cashier_currency_counts_sel x),
  'fund_adjustment_requests', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from fund_adjustment_requests_sel x),
  'fund_adjustment_lines', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from fund_adjustment_lines_sel x),
  'payroll_runs', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from payroll_runs_sel x),
  'payroll_lines', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from payroll_lines_sel x),
  'payroll_corrections277', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from payroll_corrections277_sel x),
  'tax_sso_records', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from tax_sso_records_sel x),
  'vouchers14299', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from vouchers14299_sel x),
  'voucher_versions14299', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from voucher_versions14299_sel x),
  'operational_reports', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from operational_reports_sel x),
  'scheduled_journal_occurrences', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from scheduled_journal_occurrences_sel x),
  'journal_plan_occurrences280', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.plan_id,x.occurrence_no),'[]') from journal_plan_occurrences280_sel x),
  'reconciliation_records305', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.record_id),'[]') from reconciliation_records305_sel x),
  'reconciliation_versions306', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.record_id,x.saved_at),'[]') from reconciliation_versions306_sel x),
  'book_sessions136', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from book_sessions136_sel x),
  'audit_reviews136', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from audit_reviews136_sel x),
  'audit_log', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from audit_log_sel x),
  'record_deletions108', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from record_deletions108_sel x),
  'workspace_actor_audit138', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.id),'[]') from workspace_actor_audit138_sel x),
  'legacy_audit_archive_20261110', (select coalesce(jsonb_agg(to_jsonb(x)::text order by x.source_table,x.source_id),'[]') from legacy_audit_archive_20261110_sel x)
)
$$;

create or replace function private.portable_edges328()
returns table(ns text,tbl text,pk text[],col text,parent text,parent_col text)
language sql stable set search_path='' as $$
 select ch.ns,ch.tbl,ch.pk,a.attname::text,pa.tbl,b.attname::text
 from private.portable_catalog328() ch
 join pg_constraint fk on fk.conrelid=to_regclass(format('%I.%I',ch.ns,ch.tbl))
 join private.portable_catalog328() pa on fk.confrelid=to_regclass(format('%I.%I',pa.ns,pa.tbl))
 join pg_attribute a on a.attrelid=fk.conrelid and a.attnum=fk.conkey[1]
 join pg_attribute b on b.attrelid=fk.confrelid and b.attnum=fk.confkey[1]
 where fk.contype='f' and cardinality(fk.conkey)=1 and not a.attnotnull
 order by ch.ord,a.attnum
$$;

-- HR-owned entitlement evidence. Store only the dated leave usage needed after an attendance cleanup.
create table if not exists private.portable_leave328(
 run_id uuid not null, employee_id text not null, month text not null,leave_date date not null,
 leave_type text not null,days numeric not null,primary key(run_id,employee_id,leave_date,leave_type)
);
revoke all on private.portable_leave328 from public,anon,authenticated;

create or replace function private.attendance_patch328(data jsonb,run_id uuid,d1 date,d2 date)
returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',run_id,'month',data->>'month','from',d1,'to',d2,
  'finalized',coalesce(data->>'status'='finalized' or jsonb_typeof(data->'correction277')='object',false),
  'items',coalesce(jsonb_agg(jsonb_build_object('bucket',b,'employee',person->>'employeeId','index',n-1,'day',day)
    order by b,person->>'employeeId',n),'[]'))
 from unnest(array['rows','inactiveRows99','results']) b
 cross join lateral jsonb_array_elements(case when jsonb_typeof(data->b)='array' then data->b else '[]'::jsonb end) person
 cross join lateral (select case when b='results' then person->'attendance95' else person->'input'->'attendance' end a) v
 cross join lateral jsonb_array_elements(case when jsonb_typeof(a)='array' then a else '[]'::jsonb end) with ordinality dt(day,n)
 where day->>'date' between d1::text and d2::text
$$;
create or replace function private.apply_attendance328(data jsonb,patch jsonb,restore boolean)
returns jsonb language plpgsql immutable set search_path='' as $$
declare item jsonb; person_idx int; path text[]; days jsonb; saved jsonb; same int; result jsonb:=data;
begin
 for item in select value from jsonb_array_elements(patch->'items') order by value->>'bucket',value->>'employee',(value->>'index')::int loop
  select (n-1)::int into strict person_idx from jsonb_array_elements(result->(item->>'bucket')) with ordinality p(v,n) where v->>'employeeId'=item->>'employee';
  path:=array[item->>'bucket',person_idx::text]||case when item->>'bucket'='results' then array['attendance95'] else array['input','attendance'] end;
  days:=coalesce(result#>path,'[]');saved:=item->'day';
  select (n-1)::int into same from jsonb_array_elements(days) with ordinality d(v,n) where v=saved limit 1;
  if restore and same is null then
   if exists(select 1 from jsonb_array_elements(days) d where d->>'date'=saved->>'date') then raise exception 'Attendance has changed on %. Existing values were preserved.',saved->>'date';end if;
   days:=jsonb_insert(days,array[least((item->>'index')::int,jsonb_array_length(days))::text],saved);
  elsif not restore and same is not null then days:=days-same;
  else continue; end if;
  result:=jsonb_set(result,path,days);
 end loop;
 return result;
end $$;
create or replace function private.portable_leave_days328(pack jsonb)
returns table(run_id uuid,employee_id text,month text,leave_date date,leave_type text,days numeric)
language sql immutable set search_path='' as $$
 with full_runs as (
  select v::jsonb r from jsonb_array_elements_text(pack->'tables'->'payroll_runs') v
 ), days as (
  select (r->>'id')::uuid id,r->'data'->>'month' mo,e->>'employeeId' emp,d.day
  from full_runs cross join lateral jsonb_array_elements(coalesce(nullif(r->'data'->'results','null'),'[]')) e
  cross join lateral jsonb_array_elements(coalesce(nullif(e->'attendance95','null'),'[]')) d(day)
  where r->'data'->>'status'='finalized' or jsonb_typeof(r->'data'->'correction277')='object'
  union all
  select (p->>'id')::uuid,p->>'month',i->>'employee',i->'day' from jsonb_array_elements(pack->'attendance') p
  cross join lateral jsonb_array_elements(p->'items') i where (p->>'finalized')::boolean and i->>'bucket'='results'
 )
 select id,emp,coalesce(mo,left(day->>'date',7)),(day->>'date')::date,day->>'leaveType',sum(coalesce((day->>'scheduleFraction')::numeric,1))
 from days where coalesce(day->>'linked','false') in ('false','0','') and nullif(day->>'leaveType','') is not null
 group by 1,2,3,4,5
$$;
create or replace function public.portable_leave_carry328()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or public.is_admin() is not true or public.accounting_workspace_allowed123() is not true or public.active_account14228() is not true or public.password_change_required14257() then return '[]'::jsonb; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('runId','archived:'||run_id,'employeeId',employee_id,'month',month,'date',leave_date,'type',leave_type,'days',days) order by run_id,employee_id,leave_date,leave_type),'[]') from private.portable_leave328);
end $$;
revoke all on function private.attendance_patch328(jsonb,uuid,date,date),private.apply_attendance328(jsonb,jsonb,boolean),private.portable_leave_days328(jsonb),public.portable_leave_carry328() from public,anon,authenticated;
grant execute on function public.portable_leave_carry328() to authenticated;
-- The regular HR calculation already consumes dated carry records for each employee and renewal period.
do $patch$
declare body text;
begin
 if to_regprocedure('public.payroll_window14334(date,date,integer)') is null then raise exception 'Install the payroll period reader first';end if;
 body:=pg_get_functiondef('public.payroll_window14334(date,date,integer)'::regprocedure);
 if position('portable_leave_carry328' in body)=0 then
  if position('RETURN jsonb_build_object(''rows'',records,''carry'',carry' in body)=0 then raise exception 'Payroll window reader changed'; end if;
  execute replace(body,'RETURN jsonb_build_object(''rows'',records,''carry'',carry','IF p_offset=0 THEN carry:=carry||public.portable_leave_carry328(); END IF; RETURN jsonb_build_object(''rows'',records,''carry'',carry');
 end if;
end $patch$;

create or replace function private.portable_pack328(p_from date,p_to date,p_groups text[])
returns jsonb language plpgsql set search_path='' as $$
declare rows jsonb; edges jsonb:='{}'; found_links jsonb; e record; key_args text; refs jsonb;
begin
 if p_from is null or p_to is null or p_from>p_to or coalesce(cardinality(p_groups),0)=0
    or array_position(p_groups,null) is not null or not p_groups <@ array['journal','staff','payroll','tax','vouchers','reports','schedules','reconciliation','audit'] then
   raise exception 'Choose a period and at least one valid module'; end if;
 rows:=private.portable_rows328(p_from,p_to,p_groups);
 for e in select * from private.portable_edges328() loop
  if coalesce(jsonb_array_length(rows->e.parent),0)=0 then continue; end if;
  select string_agg(format('%L,x.%I',k,k),',') into key_args from unnest(e.pk) k;
  execute format('select coalesce(jsonb_agg(jsonb_build_object(''key'',jsonb_build_object(%s),''value'',x.%I) order by %s),''[]'') from %I.%I x where x.%I::text in (select (r::jsonb)->>%L from jsonb_array_elements_text($1) r)',
   key_args,e.col,(select string_agg(format('x.%I',k),',') from unnest(e.pk) k),e.ns,e.tbl,e.col,e.parent_col)
   into found_links using rows->e.parent;
  if jsonb_array_length(found_links)>0 then edges:=edges||jsonb_build_object(e.tbl||'.'||e.col,found_links); end if;
 end loop;
 -- Master data remains in place during range cleanup. Include readable account references.
 select jsonb_build_object('accounts',(select coalesce(jsonb_agg(to_jsonb(a)::text order by id),'[]') from public.accounts a),
 'sub_accounts',(select coalesce(jsonb_agg(to_jsonb(a)::text order by id),'[]') from public.sub_accounts a),
 'currencies',(select coalesce(jsonb_agg(to_jsonb(a)::text order by code),'[]') from public.currencies a)) into refs;
 return jsonb_build_object('format','oonjai-portable-328','from',p_from,'to',p_to,'modules',p_groups,
 'attendance',case when 'payroll'=any(p_groups) then (select coalesce(jsonb_agg(patch order by id),'[]') from (select r.id,private.attendance_patch328(r.data,r.id,p_from,p_to) patch from public.payroll_runs r where r.period_start<=p_to and r.period_end>=p_from and not (r.period_start>=p_from and r.period_end<=p_to)) partial where jsonb_array_length(patch->'items')>0) else '[]'::jsonb end,
 'tables',rows,'links',edges,'reference',refs,
 'keys',(select jsonb_object_agg(tbl,pk) from private.portable_catalog328()) || '{"accounts":["id"],"sub_accounts":["id"],"currencies":["code"]}'::jsonb,'instance',(select instance from public.data_tools_state14232 where id=1));
end $$;

create or replace function public.portable_backup328(p_action text,p_from date default null,p_to date default null,p_groups text[] default null,p_file jsonb default null,p_expected text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare pack jsonb; signature text; changes_digest text; counts jsonb; total bigint; c record; e record; trig record; mode_list jsonb:='[]';
  rows jsonb; links jsonb; matched text; columns text; projected text; num bigint; modified bigint:=0; skipped bigint:=0; restore boolean:=p_action='restore'; exists_count bigint; queue_count bigint:=0;
begin
 if auth.uid() is null or public.is_admin() is not true or public.accounting_workspace_allowed123() is not true or public.can_action113('settings-data14231','view') is not true then
  raise exception 'Administrator access required' using errcode='42501'; end if;
 if p_action is null or p_action not in ('preview','export','restore','delete','inspect') then raise exception 'Unknown backup action'; end if;
 if p_action in ('delete','restore') then
  perform pg_advisory_xact_lock(143,328);
  -- Keep row selection, FK link handling, and trigger restoration in one transaction.
  for c in select * from private.portable_catalog328() order by ns,tbl loop
   execute format('lock table %I.%I in access exclusive mode',c.ns,c.tbl);
  end loop;
 end if;
 if p_action in ('restore','inspect') then
  pack:=(p_file->>'payload')::jsonb;
 else
  pack:=private.portable_pack328(p_from,p_to,p_groups);
 end if;
 signature:=encode(extensions.hmac(convert_to(pack::text,'UTF8'),(select secret from private.portable_key328 where singleton),'sha256'),'hex');
 if p_action in ('restore','inspect') and (signature is null or signature is distinct from p_file->>'signature' or pack->>'format' is distinct from 'oonjai-portable-328') then
  raise exception 'Choose an original backup downloaded from this accounting database'; end if;
 select jsonb_object_agg(key,jsonb_array_length(value)),sum(jsonb_array_length(value)) into counts,total from jsonb_each(pack->'tables');
 total:=total+coalesce(jsonb_array_length(pack->'attendance'),0);
 changes_digest:=md5((pack-'reference')::text);
 if p_action in ('preview','inspect') then return jsonb_build_object('counts',counts,'total',total,'from',pack->'from','to',pack->'to','modules',pack->'modules','selection',changes_digest); end if;
 if p_action='export' then return jsonb_build_object('format','oonjai-backup-file-328','payload',pack::text,'signature',signature); end if;
 if p_action='delete' and (p_expected is null or signature is distinct from p_expected) then raise exception 'A current backup ZIP is required. Prepare the selection again before deleting.'; end if;
 -- Suppress posting side effects and period guards only inside this signed restore / authorized range deletion.
 -- Internal foreign-key triggers, unique keys, and CHECK constraints remain active.
 for trig in select catalog.ns,catalog.tbl,t.tgname,t.tgenabled from private.portable_catalog328() catalog join pg_trigger t
  on t.tgrelid=to_regclass(format('%I.%I',catalog.ns,catalog.tbl)) where not t.tgisinternal and t.tgenabled in ('O','A') order by catalog.ord,t.tgname loop
  execute format('alter table %I.%I disable trigger %I',trig.ns,trig.tbl,trig.tgname);
  mode_list:=mode_list||jsonb_build_array(to_jsonb(trig));
 end loop;

 -- Keep the HR entitlement evidence before removing full or partial attendance.
 if not restore then
  update private.reusable_journal_ids143120 r set log_cleared313=true
  where exists(select 1 from jsonb_array_elements_text(coalesce(pack->'tables'->'audit_log','[]')||coalesce(pack->'tables'->'record_deletions108','[]')) v
    where (v::jsonb)->>'table_name'='journal_entries' and (v::jsonb)->>'record_id'=r.original_entry::text);
  -- Discard pending mirror copies of the selected rows. Previously saved Sheets history stays append-only.
  with selected as materialized (
   select catalog.tbl,jsonb_build_object() || (select jsonb_object_agg(k,(v::jsonb)->k) from unnest(catalog.pk) k) k
   from private.portable_catalog328() catalog cross join lateral jsonb_array_elements_text(pack->'tables'->catalog.tbl) v
  )
  delete from private.sheet_archive_queue194 q using selected s where q.table_name=s.tbl and q.record @> s.k;
  get diagnostics queue_count=row_count;
  insert into private.portable_leave328(run_id,employee_id,month,leave_date,leave_type,days)
  select * from private.portable_leave_days328(pack)
  on conflict(run_id,employee_id,leave_date,leave_type) do update set days=excluded.days,month=excluded.month;
 end if;
 declare patch jsonb; current_data jsonb; next_data jsonb;
 begin
  for patch in select value from jsonb_array_elements(coalesce(pack->'attendance','[]')) loop
   select data into strict current_data from public.payroll_runs where id=(patch->>'id')::uuid;
   next_data:=private.apply_attendance328(current_data,patch,restore);
   if next_data<>current_data then
    update public.payroll_runs set data=next_data,version=version+1,updated_at=clock_timestamp() where id=(patch->>'id')::uuid;
    modified:=modified+1;
   else skipped:=skipped+1;end if;
  end loop;
 end;
 if not restore then
  for e in select * from private.portable_edges328() loop
   links:=pack->'links'->(e.tbl||'.'||e.col);
   if links is null then continue; end if;
   select string_agg(format('x.%I::text=l->''key''->>%L',k,k),' and ') into matched from unnest(e.pk) k;
   execute format('update %I.%I x set %I=null from jsonb_array_elements($1) l where %s and x.%I::text=l->>''value''',e.ns,e.tbl,e.col,matched,e.col) using links;
  end loop;
 end if;
 for c in select * from private.portable_catalog328() order by case when restore then ord else -ord end loop
  rows:=pack->'tables'->c.tbl;
  if rows is null or jsonb_array_length(rows)=0 then continue; end if;
  select string_agg(format('x.%I=r.%I',k,k),' and ') into matched from unnest(c.pk) k;
  if restore then
   -- Refuse a same-key collision with different data before inserting any records.
   execute format('select count(*) from jsonb_array_elements_text($1) s cross join lateral jsonb_populate_record(null::%I.%I,s::jsonb) r join %I.%I x on %s where to_jsonb(x)<>s::jsonb',c.ns,c.tbl,c.ns,c.tbl,matched)
    into exists_count using rows;
   if exists_count>0 then raise exception 'Existing records differ in %. Restore kept the database unchanged.',c.tbl; end if;
   select string_agg(format('%I',a.attname),',' order by a.attnum),
    string_agg(case when pack->'links' ? (c.tbl||'.'||a.attname) then
     format('case when exists (select 1 from jsonb_array_elements($2->%L) l where %s) then null else r.%I end',c.tbl||'.'||a.attname,
      (select string_agg(format('r.%I::text=l->''key''->>%L',k,k),' and ') from unnest(c.pk) k),a.attname)
     else format('r.%I',a.attname) end,',' order by a.attnum)
   into columns,projected from pg_attribute a where a.attrelid=to_regclass(format('%I.%I',c.ns,c.tbl)) and a.attnum>0 and not a.attisdropped and a.attgenerated=''
   and (rows->>0)::jsonb ? a.attname;
   execute format('insert into %I.%I (%s) overriding system value select %s from jsonb_array_elements_text($1) s cross join lateral jsonb_populate_record(null::%I.%I,s::jsonb) r where not exists(select 1 from %I.%I x where %s)',c.ns,c.tbl,columns,projected,c.ns,c.tbl,c.ns,c.tbl,matched) using rows,pack->'links';
   get diagnostics num=row_count; skipped:=skipped+jsonb_array_length(rows)-num;
  else
   execute format('delete from %I.%I x using jsonb_array_elements_text($1) s cross join lateral jsonb_populate_record(null::%I.%I,s::jsonb) r where %s',c.ns,c.tbl,c.ns,c.tbl,matched) using rows;
   get diagnostics num=row_count;
   if num<>jsonb_array_length(rows) then raise exception 'Selection changed in %',c.tbl; end if;
  end if;
  modified:=modified+num;
 end loop;
 if restore then
  for e in select * from private.portable_edges328() loop
   links:=pack->'links'->(e.tbl||'.'||e.col); if links is null then continue; end if;
   select string_agg(format('x.%I::text=l->''key''->>%L',k,k),' and ') into matched from unnest(e.pk) k;
   execute format('update %I.%I x set %I=r.%I from jsonb_array_elements($1) l cross join lateral jsonb_populate_record(null::%I.%I,jsonb_build_object(%L,l->''value'')) r where %s and x.%I is null',e.ns,e.tbl,e.col,e.col,e.ns,e.tbl,e.col,matched,e.col) using links;
  end loop;
 end if;
 if restore then
  delete from private.portable_leave328 l using private.portable_leave_days328(pack) d
  where l.run_id=d.run_id and l.employee_id=d.employee_id and l.leave_date=d.leave_date and l.leave_type=d.leave_type;
 end if;
 for trig in select * from jsonb_to_recordset(mode_list) as t(ns text,tbl text,tgname text,tgenabled text) loop
  execute format('alter table %I.%I enable %s trigger %I',trig.ns,trig.tbl,case when trig.tgenabled='A' then 'always' else '' end,trig.tgname);
 end loop;
 return jsonb_build_object('changed',modified,'queueRemoved',queue_count,'alreadyPresent',skipped,'counts',counts);
end $$;

revoke all on function private.portable_catalog328(),private.portable_edges328(),private.portable_rows328(date,date,text[]),private.portable_pack328(date,date,text[]) from public,anon,authenticated;
revoke all on function public.portable_backup328(text,date,date,text[],jsonb,text) from public,anon;
grant execute on function public.portable_backup328(text,date,date,text[],jsonb,text) to authenticated;

-- Serialize manual imports with the existing archive writer; release only our own lease.
create or replace function public.portable_sheet_lease328(p_token uuid,p_release boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.sheet_archive_config194;
begin
 if p_token is null then raise exception 'Missing import token'; end if;
 if p_release then
  update private.sheet_archive_config194 set lease=null,lease_until=null where id and lease=p_token;
  return '{}'::jsonb;
 end if;
 update private.sheet_archive_config194 set lease=p_token,lease_until=now()+interval '5 minutes'
 where id and (lease_until is null or lease_until<now()) returning * into cfg;
 if not found then raise exception 'Another archive save is running. Retry the append when it finishes.'; end if;
 return jsonb_build_object('sheet',cfg.sheet,'connection',cfg.connection_sheet);
end $$;
revoke all on function public.portable_sheet_lease328(uuid,boolean) from public,anon,authenticated;
grant execute on function public.portable_sheet_lease328(uuid,boolean) to service_role;
