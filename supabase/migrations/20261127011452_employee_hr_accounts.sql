-- A separate identity realm: no HR identity is inserted in auth.users or profiles.
create schema employee_hr;
revoke all on schema employee_hr from public, anon, authenticated;
create table employee_hr.accounts (
  employee_id uuid primary key references public.payroll_employees(id) on delete restrict,
  email text unique not null check(email=lower(btrim(email)) and length(email) between 3 and 254),
  password_hash text not null check(password_hash ~ '^[0-9a-f]{32}:[0-9a-f]{128}$'),
  access text not null check(access in ('enabled','disabled','suspended')),
  revision bigint not null default 1
);
create table employee_hr.sessions (
  digest text primary key check(digest ~ '^[a-f0-9]{64}$'),
  employee_id uuid not null references employee_hr.accounts,
  expires_at timestamptz not null
);
create index on employee_hr.sessions(employee_id);
create table employee_hr.audit (
  id bigint generated always as identity primary key,
  employee_id uuid not null, administrator uuid, action text not null,
  at timestamptz not null default clock_timestamp()
);
create index on employee_hr.audit(employee_id,id desc);
create table employee_hr.limits (
  bucket int primary key, since timestamptz not null, attempts int not null
);
alter table employee_hr.accounts enable row level security;
alter table employee_hr.sessions enable row level security;
alter table employee_hr.audit enable row level security;
alter table employee_hr.limits enable row level security;
revoke all on all tables in schema employee_hr from public,anon,authenticated;
grant usage on schema employee_hr to service_role;
grant select,insert,update on employee_hr.accounts,employee_hr.limits to service_role;
grant insert,select,delete on employee_hr.sessions to service_role;
grant insert,select on employee_hr.audit to service_role;
grant usage on all sequences in schema employee_hr to service_role;

create function employee_hr.status(d jsonb) returns text language sql stable set search_path='' as $$
 select case
 when d#>>'{archiveReason14306,code}'='terminated' or d->>'employmentStatus'='terminated' then 'terminated'
 when d->>'active'='false' or d->>'archived'='true' or d->>'historicalIdentityOnly200'='true' then
   case when d#>>'{archiveReason14306,code}'='resigned' or d->>'employmentStatus'='resigned' then 'resigned' else 'inactive' end
 when d->>'employmentStatus'='resigned' then case when d->>'separationDate' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
   and d->>'separationDate'>to_char(now() at time zone 'Asia/Vientiane','YYYY-MM-DD') then 'resignation_pending' else 'resigned' end
 when coalesce(d->>'employmentStatus','active') in ('active','probationary','on_leave','suspended','inactive') then coalesce(d->>'employmentStatus','active')
 else 'inactive' end
$$;
create function employee_hr.allowed(s text) returns boolean language sql immutable set search_path='' as $$
 select s in ('active','probationary','on_leave','resignation_pending')
$$;

create function employee_hr.on_employment() returns trigger language plpgsql security definer set search_path='' as $$
declare state text:=employee_hr.status(new.data);
begin
 if state is distinct from employee_hr.status(old.data) or new.data->>'separationDate' is distinct from old.data->>'separationDate' then
   update employee_hr.accounts set revision=revision+1 where employee_id=new.id;
   if found then
     delete from employee_hr.sessions where employee_id=new.id;
     if not employee_hr.allowed(state) or state='resignation_pending' then
       insert into employee_hr.audit(employee_id,administrator,action) values(new.id,coalesce(auth.uid(),new.updated_by),
         case when state='resignation_pending' then 'separation_scheduled' else 'employment_access_revoked' end);
     end if;
   end if;
 end if;
 return new;
end $$;
create trigger hr_access_employment after update of data on public.payroll_employees for each row
 when(old.data is distinct from new.data) execute function employee_hr.on_employment();

create function employee_hr.require_admin(actor uuid,sid uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select from public.profiles p join auth.sessions s on s.user_id=p.id
   where p.id=actor and p.status='active' and p.role='admin' and s.id=sid) then
   raise insufficient_privilege using message='Active administrator required';
 end if;
end $$;

create function public.employee_hr_admin(p_actor uuid,p_sid uuid,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare emp uuid; prior employee_hr.accounts; mail text; state text; hash text; events text[]:='{}';
begin
 perform employee_hr.require_admin(p_actor,p_sid);
 if p_action='list' then
   return (select coalesce(jsonb_agg(jsonb_build_object(
     'id',e.id,'code',e.data->>'code','name',e.data->>'name','position',e.data->>'position',
     'employment',case when employee_hr.status(e.data) in ('active','probationary') and exists(
       select from public.payroll_leave_records l where l.data->>'employeeId'=e.id::text and l.data->>'status'='approved'
       and coalesce(l.data->>'rejected','false')<>'true' and to_char(now() at time zone 'Asia/Vientiane','YYYY-MM-DD')
       between l.data->>'from' and l.data->>'to') then 'on_leave' else employee_hr.status(e.data) end,
     'separationDate',e.data->>'separationDate','email',a.email,'access',a.access,'revision',coalesce(a.revision,0))
     order by lower(e.data->>'name'),e.id),'[]') from public.payroll_employees e left join employee_hr.accounts a on a.employee_id=e.id);
 end if;
 emp:=(p_data->>'id')::uuid;
 if p_action='history' then
   return (select coalesce(jsonb_agg(to_jsonb(h) order by h.id desc),'[]') from (
     select a.id,a.at,a.action,a.administrator,p.full_name from employee_hr.audit a left join public.profiles p on p.id=a.administrator
     where a.employee_id=emp order by a.id desc limit 100) h);
 end if;
 if p_action<>'save' then raise exception 'Unknown operation'; end if;
 perform 1 from public.payroll_employees where id=emp for update;
 if not found then raise exception 'Missing employee'; end if;
 select * into prior from employee_hr.accounts where employee_id=emp for update;
 if coalesce(prior.revision,0) is distinct from (p_data->>'revision')::bigint then
   raise exception 'Account changed. Refresh before retrying.'; end if;
 mail:=lower(btrim(p_data->>'email')); state:=p_data->>'access'; hash:=p_data->>'hash';
 if prior.employee_id is null then
   insert into employee_hr.accounts(employee_id,email,password_hash,access) values(emp,mail,hash,state);
   events:=array['account_created','password_assigned'];
 else
   if hash is not null then events:=events||array['password_reset']; end if;
   if mail is distinct from prior.email then events:=events||array['email_changed']; end if;
 end if;
 if state is distinct from prior.access then events:=events||array[case state when 'enabled' then
   case when prior.access='suspended' then 'account_reactivated' else 'access_enabled' end
   when 'disabled' then 'access_revoked' when 'suspended' then 'account_suspended' end]; end if;
 if prior.employee_id is not null and cardinality(events)>0 then
   update employee_hr.accounts set email=mail,password_hash=coalesce(hash,password_hash),access=state,revision=revision+1 where employee_id=emp;
   delete from employee_hr.sessions where employee_id=emp;
 end if;
 insert into employee_hr.audit(employee_id,administrator,action) select emp,p_actor,ev from unnest(events) ev;
 return '{"saved":true}';
end $$;

create function employee_hr.attempt(k int,lim int) returns boolean language plpgsql security invoker set search_path='' as $$
declare n int;
begin
 insert into employee_hr.limits as l values(k,now(),1) on conflict(bucket) do update set
 attempts=case when l.since<=now()-interval '10 minutes' then 1 else least(l.attempts+1,lim+1) end,
 since=case when l.since<=now()-interval '10 minutes' then now() else l.since end returning attempts into n;
 return n<=lim;
end $$;
create function public.employee_hr_challenge(p_email text,p_source int) returns jsonb language plpgsql security invoker set search_path='' as $$
declare creds jsonb;
begin
 if not employee_hr.attempt(65536+(p_source & 65535),150) or not employee_hr.attempt(hashtext(p_email) & 65535,15) then return '{"limited":true}'; end if;
 select jsonb_build_object('id',a.employee_id,'hash',a.password_hash,'revision',a.revision) into creds from employee_hr.accounts a
 join public.payroll_employees e on e.id=a.employee_id where a.email=p_email and a.access='enabled' and employee_hr.allowed(employee_hr.status(e.data));
 return coalesce(creds,'{}');
end $$;
create function public.employee_hr_session(p_action text,p_digest text,p_employee uuid default null,p_revision bigint default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare emp uuid; d jsonb; a employee_hr.accounts; deadline timestamptz:=now()+interval '8 hours';
begin
 if p_action='logout' then delete from employee_hr.sessions where digest=p_digest; return '{"signedOut":true}'; end if;
 if p_action='issue' then emp:=p_employee;
 elsif p_action='me' then select employee_id into emp from employee_hr.sessions where digest=p_digest;
 else raise exception 'Unknown operation'; end if;
 -- All access and update paths lock the employee before the account. A reset
 -- during password verification invalidates the outstanding challenge revision.
 select data into d from public.payroll_employees where id=emp for share;
 select * into a from employee_hr.accounts where employee_id=emp for share;
 if a.employee_id is null or a.access<>'enabled' or not employee_hr.allowed(employee_hr.status(d)) then return null; end if;
 if p_action='issue' then
   if a.revision is distinct from p_revision then return null; end if;
   if employee_hr.status(d)='resignation_pending' then deadline:=least(deadline,((d->>'separationDate')::date::timestamp at time zone 'Asia/Vientiane')); end if;
   delete from employee_hr.sessions where employee_id=emp and expires_at<=now();
   insert into employee_hr.sessions values(p_digest,emp,deadline);
 elsif not exists(select from employee_hr.sessions where digest=p_digest and employee_id=emp and expires_at>now()) then return null; end if;
 return jsonb_build_object('id',emp,'code',d->>'code','name',d->>'name');
end $$;
revoke all on all functions in schema employee_hr from public,anon,authenticated;
grant execute on all functions in schema employee_hr to service_role;
revoke all on function public.employee_hr_admin(uuid,uuid,text,jsonb),public.employee_hr_challenge(text,int),public.employee_hr_session(text,text,uuid,bigint) from public,anon,authenticated;
grant execute on function public.employee_hr_admin(uuid,uuid,text,jsonb),public.employee_hr_challenge(text,int),public.employee_hr_session(text,text,uuid,bigint) to service_role;
