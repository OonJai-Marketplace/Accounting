-- Input to this service-only RPC is the digest of a Phase 1 bearer. The caller
-- cannot select an employee. Keep authorization and the protected action atomic.
create function public.employee_hr_portal(p_digest text,p_action text,p_data jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 identity jsonb; emp uuid; profile jsonb; today date:=(now() at time zone 'Asia/Vientiane')::date;
 first_day date; last_day date; req uuid; details jsonb; kind text; reason text; stamp timestamptz:=now();
 history jsonb; marks jsonb; selected_month date;
begin
 identity:=public.employee_hr_session('me',p_digest);
 if identity is null then return null; end if;
 emp:=(identity->>'id')::uuid;
 perform 1 from employee_hr.sessions where digest=p_digest and employee_id=emp and expires_at>clock_timestamp();
 if not found then return null; end if;
 select data into strict profile from public.payroll_employees where id=emp;
 if p_action in ('dashboard','attendance') then
   selected_month:=coalesce((p_data->>'month')::date,today);
   select coalesce(jsonb_agg(jsonb_build_object('date',day->>'date','mark',day->>'mark',
     'label',(select rule->>'description' from jsonb_array_elements(r.data->'legendSnapshot95') rule
       where lower(rule->>'code')=lower(split_part(day->>'mark',':',1)) limit 1),'leaveType',day->>'leaveType') order by day->>'date' desc),'[]')
   into marks from public.payroll_runs r
   cross join lateral jsonb_array_elements(r.data->'results') employee_result
   cross join lateral jsonb_array_elements(employee_result->'attendance95') day
   where r.data->>'status'='finalized' and coalesce(r.data->>'isSample','false')<>'true'
     and r.period_start=date_trunc('month',selected_month)::date and employee_result->>'employeeId'=emp::text
     and (p_action='attendance' or day->>'date'=today::text);
   if p_action='attendance' then return marks; end if;
   return identity||jsonb_build_object('position',profile->>'position','today',today,'expiresAt',(select expires_at from employee_hr.sessions where digest=p_digest),'attendance',marks->0);
 end if;
 if p_action='submit' then
   if (p_data - array['key','kind','from','to','reason','details']) <> '{}' then raise exception 'Unexpected leave fields'; end if;
   req:=(p_data->>'key')::uuid; kind:=p_data->>'kind'; reason:=btrim(p_data->>'reason');
   first_day:=(p_data->>'from')::date; last_day:=(p_data->>'to')::date; details:=p_data->'details';
   if req is null or kind is null or kind not in ('unpaid','vacation','sick','personal','bereavement','minorSick','other')
      or first_day is null or last_day is null or last_day<first_day or coalesce(length(reason),0) not between 1 and 1500
      or jsonb_typeof(details) is distinct from 'object' or (details-array['timeOff459','coverage459','enoughTime459','employeeDate459'])<>'{}'
      or exists(select from jsonb_each(details) kv where jsonb_typeof(kv.value)<>'string')
      or coalesce(details->>'coverage459','') not in ('yes','no') or coalesce(details->>'enoughTime459','') not in ('yes','no')
      or length(details->>'timeOff459')>200 or coalesce(details->>'employeeDate459','') !~ '^(|[0-9]{4}-[0-9]{2}-[0-9]{2})$'
   then raise exception 'Check the leave form fields'; end if;
   perform nullif(details->>'employeeDate459','')::date;
   perform pg_advisory_xact_lock(hashtextextended(emp::text,0));
   if not exists(select from public.hub_leave_intake where id=req and employee_id=emp)
      and not exists(select from public.payroll_leave_records where id=req and data->>'employeeId'=emp::text) then
     if (select count(*) from public.hub_leave_intake where employee_id=emp and received>stamp-interval '1 hour')>=8 then
       raise exception 'Too many requests in one hour'; end if;
     insert into public.hub_leave_intake(id,employee_id,submitted_name,kind,starts,ends,reason,workdays,received,form_details)
     values(req,emp,profile->>'name',kind,first_day,last_day,reason,last_day-first_day+1,stamp,
       details||jsonb_build_object('hrSubmittedAt',stamp));
   end if;
   return jsonb_build_object('receipt',req);
 end if;
 if p_action not in ('leave','leaveHistory') then raise exception 'Unknown portal operation'; end if;
 if p_action='leaveHistory' then
   select coalesce(jsonb_agg(to_jsonb(h) order by h."from" desc,h.submitted desc nulls last),'[]') into history from (
     select i.kind, starts as "from", ends as "to", ends-starts+1 as days, received as submitted,
       case disposition when 'new' then 'Awaiting HR review' else 'Rejected' end as status, null::text as comments
     from public.hub_leave_intake i where employee_id=emp
     union all
     select case when data->>'type'='absent' and data->>'hub'='true' then 'unpaid' else data->>'type' end,
       (data->>'from')::date,(data->>'to')::date,(data->>'days')::numeric,
       case when data->>'hub'='true' then (data->>'hrSubmittedAt')::timestamptz else created_at end,
       case when data->>'rejected'='true' then 'Rejected' else initcap(data->>'status') end,data->>'supervisorComments459'
     from public.payroll_leave_records where data->>'employeeId'=emp::text
     union all
     select item->>'type',(item->>'from')::date,(item->>'to')::date,(item->>'days')::numeric,null::timestamptz,
       coalesce(initcap(item->>'status'),'Historical record'),null::text
     from jsonb_array_elements(profile#>'{leaveHistory200,records}') item
     where not exists(select from public.payroll_leave_records r where r.data->>'employeeId'=emp::text
       and (r.id::text=item->>'id' or (r.data->>'from'=item->>'from' and r.data->>'to'=item->>'to' and r.data->>'type'=item->>'type')))) h;
 end if;
 -- These inputs remain inside the Edge Function. Only numeric balances and the
 -- explicit employee-facing history projection are serialized to the browser.
 return jsonb_build_object('employee',jsonb_build_object('id',emp,'data',profile),'today',today,'history',history,
   'payroll',(select data->'payroll' from public.payroll_tax_settings where id),
   'settings',(select data from public.hr_calendar_settings14306 where id),
   'events',case when exists(select from public.payroll_leave_records where data->>'employeeId'=emp::text
      and data->>'status'='approved' and not(data?'dayFractions') and not(data?'calendarBasis14306')) then
      (select jsonb_agg(jsonb_build_object('id',id,'data',data)) from public.hr_calendar_events14306) end,
   'leaves',(select jsonb_agg(jsonb_build_object('data',data)) from public.payroll_leave_records
      where data->>'employeeId'=emp::text and data->>'status'='approved'),
   'carry',(select jsonb_agg(jsonb_build_object('runId',r.id,'employeeId',emp,'type',day->>'leaveType',
      'date',day->>'date','days',coalesce((day->>'scheduleFraction')::numeric,1)))
      from public.payroll_runs r cross join lateral jsonb_array_elements(r.data->'results') result
      cross join lateral jsonb_array_elements(result->'attendance95') day where r.data->>'status'='finalized'
      and coalesce(r.data->>'isSample','false')<>'true' and result->>'employeeId'=emp::text
      and day->>'leaveType' is not null and coalesce(day->>'linked','false') in ('false','0','')));
end $$;
revoke all on function public.employee_hr_portal(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.employee_hr_portal(text,text,jsonb) to service_role;
