-- Public submissions are unverified claims. Only an active HR administrator can
-- import a claim as pending leave; the regular approval and payroll guards still run.
create table public.hub_leave_intake (
 id uuid primary key, employee_id uuid not null references public.payroll_employees(id),
 submitted_name text, kind text not null, starts date not null, ends date not null,
 reason text, workdays numeric, received timestamptz not null default now(),
 decided_by uuid, decided_at timestamptz, disposition text not null default 'new' check(disposition in ('new','rejected'))
);
create index hub_leave_inbox_idx on public.hub_leave_intake(disposition,received desc);
alter table public.hub_leave_intake enable row level security;
revoke all on public.hub_leave_intake from public, anon, authenticated;
grant select on public.hub_leave_intake to authenticated;
create policy hub_hr_inbox on public.hub_leave_intake for select to authenticated using (
 public.is_admin() and public.active_account14228() and public.accounting_workspace_allowed123() and not public.password_change_required14257());
create function private.hub_workdays(p_from date,p_to date,emp uuid)
returns numeric language plpgsql stable set search_path='' as $$
declare cfg jsonb; d date; wk jsonb; effect text; total numeric:=0; n numeric; baseline jsonb;
begin
 if p_from is null or p_to is null or p_to<p_from or date_trunc('month',p_from)<>date_trunc('month',p_to) then raise exception 'Choose one payroll month';end if;
 select data into cfg from public.hr_calendar_settings14306 where id=true;
 for d in select generate_series(p_from::timestamp,p_to::timestamp,interval '1 day')::date loop
   select v into wk from (select s from jsonb_array_elements(cfg->'schedules') s where s->>'from'<=d::text order by s->>'from' desc limit 1) choice
    cross join lateral jsonb_array_elements(s->'days') v where (v->>'day')::int=extract(dow from d);
   if wk is null then raise exception 'Company schedule unavailable';end if;
   n=case when (wk->>'work')::boolean then coalesce((wk->>'fraction')::numeric,1) else 0 end;
   select jsonb_agg(jsonb_build_object('id','la-'||extract(year from d)::int||'-'||tag,'start',to_char(d,'YYYY')||'-'||md,'end',to_char(d,'YYYY')||'-'||md,'effect','off','publicHoliday',true)) into baseline
    from (values('01-01','new-year'),('03-08','women'),('04-14','lao-new-year-1'),('04-15','lao-new-year-2'),('04-16','lao-new-year-3'),('05-01','labour'),('07-20','women-union'),('12-02','national'),('03-09','women-observed')) h(md,tag)
    where tag<>'women-observed' or extract(year from d)=2026;
   with candidates as (
    select e||coalesce(cfg->'holidayOverrides'->(e->>'id'),'{}') ev from jsonb_array_elements(baseline||coalesce(cfg->'approvedCalendarNews14309','[]')) e
    union all select data||jsonb_build_object('id',id) from public.hr_calendar_events14306
   ) select ev->>'effect' into effect from candidates where ev->>'start'<=d::text and ev->>'end'>=d::text and coalesce(ev->>'status','')<>'cancelled' and ev->>'effect' in ('off','half','work') and
    (coalesce(jsonb_array_length(ev->'employeeIds'),0)=0 or ev->'employeeIds' ? emp::text)
   order by coalesce((ev->>'publicHoliday')::boolean,false),coalesce(ev->>'updatedAt','') desc,ev->>'id' desc limit 1;
   total=total+case effect when 'off' then 0 when 'half' then 0.5 when 'work' then 1 else n end;
 end loop;return total;
end $$;
revoke all on function private.hub_workdays(date,date,uuid) from public,anon,authenticated;
create function public.hub_leave_days(p_from date,p_to date) returns numeric language sql stable security definer set search_path='' as $$select private.hub_workdays(p_from,p_to,null)$$;
create function public.hub_submit_leave(p_key uuid,p_code text,p_name text,p_kind text,p_from date,p_to date,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare emp uuid; n numeric;
begin
 if p_key is null or coalesce(length(trim(p_code)),0) not between 1 and 40 or coalesce(length(trim(p_name)),0) not between 1 and 120 or coalesce(length(trim(p_reason)),0) not between 1 and 1500 or p_kind is null or p_kind not in ('vacation','sick','minorSick','personal','bereavement','other') or p_from is null or p_to is null or p_from>p_to or date_trunc('month',p_from)<>date_trunc('month',p_to) then raise exception 'Invalid request';end if;
 select id into emp from public.payroll_employees where upper(trim(data->>'code'))=upper(trim(p_code)) and coalesce((data->>'active')::boolean,true) and not coalesce((data->>'archived')::boolean,false) and not coalesce((data->>'isSample')::boolean,false);
 if emp is null then return;end if;
 perform pg_advisory_xact_lock(hashtextextended(emp::text,0));
 if exists(select from public.hub_leave_intake where id=p_key) or exists(select from public.payroll_leave_records where id=p_key) or (select count(*) from public.hub_leave_intake where employee_id=emp and received>now()-interval '1 hour')>=8 then return;end if;
 n=private.hub_workdays(p_from,p_to,emp);
 insert into public.hub_leave_intake(id,employee_id,submitted_name,kind,starts,ends,reason,workdays) values(p_key,emp,trim(p_name),p_kind,p_from,p_to,trim(p_reason),n) on conflict do nothing;
end $$;
create function public.hub_review_leave(p_key uuid,p_action text,p_paid boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.hub_leave_intake; n numeric;
begin
 if auth.uid() is null or not coalesce(public.is_admin() and public.active_account14228() and public.accounting_workspace_allowed123() and not public.password_change_required14257(),false) then raise exception 'HR administrator required';end if;
 select * into r from public.hub_leave_intake where id=p_key for update;
 if not found or r.disposition<>'new' then return;end if;
 if p_action='reject' then update public.hub_leave_intake set disposition='rejected',submitted_name=null,reason=null,workdays=null,decided_by=auth.uid(),decided_at=now() where id=p_key;return;end if;
 if p_action is distinct from 'import' or p_paid is null then raise exception 'Choose a review action';end if;
 perform pg_advisory_xact_lock(hashtextextended(r.employee_id::text,0));
 if not exists(select from public.payroll_employees where id=r.employee_id and coalesce((data->>'active')::boolean,true) and not coalesce((data->>'archived')::boolean,false)) then raise exception 'Employee is inactive';end if;
 if exists(select from public.payroll_leave_records where data->>'employeeId'=r.employee_id::text and data->>'status'<>'cancelled' and data->>'from'<=r.ends::text and data->>'to'>=r.starts::text) then raise exception 'Overlapping leave already exists';end if;
 n=private.hub_workdays(r.starts,r.ends,r.employee_id);
 if n<=0 then raise exception 'No working days in this range';end if;
 insert into public.payroll_leave_records(id,data) values(p_key,jsonb_build_object('employeeId',r.employee_id,'status','pending','from',r.starts,'to',r.ends,'month',to_char(r.starts,'YYYY-MM'),'type',r.kind,'days',n,'paid',case when p_paid then 'yes' else 'no' end,'notes',r.reason,'hub',true,'formReceived',true,'informed',true));
 delete from public.hub_leave_intake where id=p_key;
end $$;
revoke all on function public.hub_review_leave(uuid,text,boolean) from public,anon;
grant execute on function public.hub_review_leave(uuid,text,boolean) to authenticated;
revoke all on function public.hub_leave_days(date,date),public.hub_submit_leave(uuid,text,text,text,date,date,text) from public;
grant execute on function public.hub_leave_days(date,date),public.hub_submit_leave(uuid,text,text,text,date,date,text) to authenticated,anon;
