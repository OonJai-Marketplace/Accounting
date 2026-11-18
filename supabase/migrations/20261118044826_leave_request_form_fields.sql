-- Only short structured answers are retained. The reusable form is application code.
alter table public.hub_leave_intake add column form_details jsonb;
alter table public.hub_leave_intake add constraint hub_leave_form_details_size check (form_details is null or (jsonb_typeof(form_details)='object' and octet_length(form_details::text)<=1024));
create function public.hub_submit_leave_form(p_key uuid,p_code text,p_name text,p_kind text,p_from date,p_to date,p_reason text,p_details jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare emp uuid; n numeric;
begin
 if p_details is null or jsonb_typeof(p_details)<>'object' or octet_length(p_details::text)>1024
 or exists(select 1 from jsonb_each(p_details) e where e.key not in ('coverage459','enoughTime459','timeOff459','employeeDate459') or jsonb_typeof(e.value)<>'string')
 or coalesce(p_details->>'coverage459','') not in ('','yes','no') or coalesce(p_details->>'enoughTime459','') not in ('','yes','no')
 or length(coalesce(p_details->>'timeOff459',''))>200
 or coalesce(p_details->>'employeeDate459','') !~ '^(|[0-9]{4}-[0-9]{2}-[0-9]{2})$'
 then raise exception 'Invalid form details';end if;
 if coalesce(p_details->>'employeeDate459','')<>'' then perform (p_details->>'employeeDate459')::date;end if;
 if p_key is null or coalesce(length(trim(p_code)),0) not between 1 and 40 or coalesce(length(trim(p_name)),0) not between 1 and 120 or coalesce(length(trim(p_reason)),0) not between 1 and 1500 or p_kind is null or p_kind not in ('vacation','sick','minorSick','personal','bereavement','other','unpaid') or p_from is null or p_to is null or p_from>p_to or date_trunc('month',p_from)<>date_trunc('month',p_to) then raise exception 'Invalid request';end if;
 select id into emp from public.payroll_employees where upper(trim(data->>'code'))=upper(trim(p_code)) and coalesce((data->>'active')::boolean,true) and not coalesce((data->>'archived')::boolean,false) and not coalesce((data->>'isSample')::boolean,false);
 if emp is null then return;end if;
 perform pg_advisory_xact_lock(hashtextextended(emp::text,0));
 if exists(select from public.hub_leave_intake where id=p_key) or exists(select from public.payroll_leave_records where id=p_key) or (select count(*) from public.hub_leave_intake where employee_id=emp and received>now()-interval '1 hour')>=8 then return;end if;
 n=private.hub_workdays(p_from,p_to,emp);
 insert into public.hub_leave_intake(id,employee_id,submitted_name,kind,starts,ends,reason,workdays,form_details) values(p_key,emp,trim(p_name),p_kind,p_from,p_to,trim(p_reason),n,p_details) on conflict do nothing;
end $$;
create or replace function public.hub_review_leave(p_key uuid,p_action text,p_paid boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.hub_leave_intake; n numeric;
begin
 if auth.uid() is null or not coalesce(public.is_admin() and public.active_account14228() and public.accounting_workspace_allowed123() and not public.password_change_required14257(),false) then raise exception 'HR administrator required';end if;
 select * into r from public.hub_leave_intake where id=p_key for update;
 if not found or r.disposition<>'new' then return;end if;
 if p_action='reject' then update public.hub_leave_intake set disposition='rejected',submitted_name=null,reason=null,workdays=null,form_details=null,decided_by=auth.uid(),decided_at=now() where id=p_key;return;end if;
 if p_action is distinct from 'import' or p_paid is null then raise exception 'Choose a review action';end if;
 perform pg_advisory_xact_lock(hashtextextended(r.employee_id::text,0));
 if not exists(select from public.payroll_employees where id=r.employee_id and coalesce((data->>'active')::boolean,true) and not coalesce((data->>'archived')::boolean,false)) then raise exception 'Employee is inactive';end if;
 if exists(select from public.payroll_leave_records where data->>'employeeId'=r.employee_id::text and data->>'status'<>'cancelled' and data->>'from'<=r.ends::text and data->>'to'>=r.starts::text) then raise exception 'Overlapping leave already exists';end if;
 n=private.hub_workdays(r.starts,r.ends,r.employee_id);
 if n<=0 then raise exception 'No working days in this range';end if;
 insert into public.payroll_leave_records(id,data) values(p_key,jsonb_build_object('employeeId',r.employee_id,'status','pending','from',r.starts,'to',r.ends,'month',to_char(r.starts,'YYYY-MM'),'type',case when r.kind='unpaid' then 'absent' else r.kind end,'days',n,'paid',case when p_paid and r.kind<>'unpaid' then 'yes' else 'no' end,'notes',r.reason,'hub',true,'formReceived',true,'informed',true)||coalesce(r.form_details,'{}'::jsonb));
 delete from public.hub_leave_intake where id=p_key;
end $$;
revoke all on function public.hub_submit_leave_form(uuid,text,text,text,date,date,text,jsonb) from public;
grant execute on function public.hub_submit_leave_form(uuid,text,text,text,date,date,text,jsonb) to anon,authenticated;
