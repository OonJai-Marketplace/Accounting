-- A manual attendance mark is part of a payroll snapshot. Raw device events
-- reference that same HR employee and are read separately from payable time.
create table employee_hr.clock_intents (
  submission uuid primary key,
  event_id uuid unique not null default gen_random_uuid(),
  employee_id uuid not null references public.payroll_employees,
  session_digest text not null references employee_hr.sessions(digest) on delete cascade,
  kind text not null check (kind in ('clock-in','clock-out')),
  work_date date not null,
  issued_at timestamptz not null default clock_timestamp(),
  evidence jsonb, path text unique
);
create index clock_intents_age on employee_hr.clock_intents(issued_at);
create index clock_intents_session on employee_hr.clock_intents(session_digest);

create table employee_hr.clock_events (
  event_id uuid primary key, submission uuid unique not null,
  employee_id uuid not null references public.payroll_employees,
  submitted_name text not null,
  work_date date not null, kind text not null check(kind in ('clock-in','clock-out')),
  clock_in_id uuid references employee_hr.clock_events,
  official_at timestamptz not null, registered_status text not null default 'registered',
  latitude double precision not null check(latitude between -90 and 90),
  longitude double precision not null check(longitude between -180 and 180),
  accuracy_metres double precision not null check(accuracy_metres >= 0 and accuracy_metres < 'Infinity'::float8),
  acquired_at timestamptz not null, location_status text not null default 'available',
  image_path text unique not null, image_format text not null check(image_format in ('image/webp','image/jpeg')),
  size_bytes integer not null check(size_bytes between 1 and 98304),
  width integer not null check(width=480), height integer not null check(height=480),
  expires_at timestamptz not null, image_status text not null default 'available',
  retention_hold boolean not null default false, deleted_at timestamptz,
  unique(employee_id,work_date,kind), check((kind='clock-out')=(clock_in_id is not null))
);
create index clock_events_parent on employee_hr.clock_events(clock_in_id) where clock_in_id is not null;
create index clock_events_dates on employee_hr.clock_events(work_date,employee_id);
alter table employee_hr.clock_events enable row level security;
alter table employee_hr.clock_intents enable row level security;
revoke all on employee_hr.clock_events,employee_hr.clock_intents from public,anon,authenticated;
grant select on employee_hr.clock_events to service_role;
grant select,insert,delete,update on employee_hr.clock_intents to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hr-attendance-selfies','hr-attendance-selfies',false,98304,array['image/webp','image/jpeg']);
-- A restrictive policy stays effective even if another bucket has broad grants.
-- Staff and administrators both access this bucket through the Edge Function.
create policy hr_clock_private on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id <> 'hr-attendance-selfies') with check(bucket_id <> 'hr-attendance-selfies');

create function employee_hr.clock_days(emp uuid, first_day date,last_day date)
returns table(info jsonb) language sql stable set search_path='' as $$
 select jsonb_build_object('employeeId',a.employee_id,'date',a.work_date,'clockIn',a.official_at,'clockOut',b.official_at,
   'status',case when b.event_id is not null then 'Clocked out' when a.work_date=(statement_timestamp() at time zone 'Asia/Vientiane')::date
     then 'Currently clocked in' else 'Incomplete attendance' end,
   'durationSeconds',floor(extract(epoch from b.official_at-a.official_at))::int)
 from employee_hr.clock_events a left join employee_hr.clock_events b on b.clock_in_id=a.event_id
 where a.kind='clock-in' and (emp is null or a.employee_id=emp) and a.work_date between first_day and last_day
 order by a.work_date desc,a.employee_id
$$;

create function employee_hr.clock_today(emp uuid, day date) returns jsonb language sql stable set search_path='' as $$
 select coalesce((select info from employee_hr.clock_days(emp,day,day)),
   jsonb_build_object('date',day,'status','Not yet clocked in','incompleteDate',(
     select a.work_date from employee_hr.clock_events a where a.employee_id=emp and a.work_date<day and a.kind='clock-in'
      and not exists (select from employee_hr.clock_events b where b.clock_in_id=a.event_id)
       order by a.work_date desc limit 1)))
$$;

create function employee_hr.clock_receipt(emp uuid, sub uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('registered',true,'eventId',e.event_id,'submission',e.submission,'name',e.submitted_name,
   'type',e.kind,'date',e.work_date,'status',case when e.kind='clock-in' then 'Currently clocked in' else 'Clocked out' end,
   'clockIn',coalesce(i.official_at,e.official_at),'clockOut',case when e.kind='clock-out' then e.official_at end,
   'durationSeconds',floor(extract(epoch from e.official_at-i.official_at))::int)
 from employee_hr.clock_events e left join employee_hr.clock_events i on i.event_id=e.clock_in_id
 where e.employee_id=emp and e.submission=sub
$$;

create function public.hr_clock_registers(p_month date) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform employee_hr.require_admin(auth.uid(),(auth.jwt()->>'session_id')::uuid);
 if public.accounting_workspace_allowed123() is not true or public.password_change_required14257() is not false then raise insufficient_privilege; end if;
 return (select coalesce(jsonb_agg(info||jsonb_build_object('name',p.data->>'name') order by info->>'date' desc,p.data->>'name'),'[]')
  from employee_hr.clock_days(null,date_trunc('month',p_month)::date,(date_trunc('month',p_month)+interval '1 month - 1 day')::date)
  join public.payroll_employees p on p.id=(info->>'employeeId')::uuid);
end $$;

-- Edge checks the Accounting password/workspace gates, validates the actor and
-- signs this server-selected path. No caller-supplied filenames are signed.
create function public.hr_clock_photo_path(p_actor uuid,p_sid uuid,p_event uuid) returns text
language plpgsql stable security definer set search_path='' as $$
begin
 perform employee_hr.require_admin(p_actor,p_sid);
 return (select image_path from employee_hr.clock_events where event_id=p_event and image_status='available' and deleted_at is null);
end $$;

create function public.employee_hr_clock(p_digest text,p_action text,p_data jsonb default '{}')
returns jsonb language plpgsql set search_path='' as $$
declare
 ident jsonb; emp uuid; sub uuid; day date:=(clock_timestamp() at time zone 'Asia/Vientiane')::date;
 intent employee_hr.clock_intents; receipt jsonb; current_day jsonb; ev jsonb; object_path text;
begin
 ident:=public.employee_hr_session('me',p_digest);
 if ident is null then return null; end if;
 emp:=(ident->>'id')::uuid;
 if p_action='today' then return employee_hr.clock_today(emp,day);
 elsif p_action='month' then
   day:=date_trunc('month',(p_data->>'month')::date)::date;
   return (select coalesce(jsonb_agg(info order by info->>'date' desc),'[]') from employee_hr.clock_days(emp,day,(day+interval '1 month - 1 day')::date));
 end if;
 sub:=(p_data->>'submission')::uuid;
 if sub is null then raise exception 'Invalid submission.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(emp::text,3));
 receipt:=employee_hr.clock_receipt(emp,sub);
 if receipt is not null then return receipt; end if;
 if p_action='clockReceipt' then return '{"registered":false}'; end if;
 if p_action='clockCancel' then
   delete from employee_hr.clock_intents where submission=sub and employee_id=emp and session_digest=p_digest;
   return '{"cancelled":true}';
 end if;
 if p_action='clockBegin' then
   if p_data->>'type' is null or p_data->>'type' not in ('clock-in','clock-out') then raise exception 'Invalid attendance type.'; end if;
   delete from employee_hr.clock_intents where issued_at<clock_timestamp()-interval '5 minutes';
   current_day:=employee_hr.clock_today(emp,day);
   if (p_data->>'type'='clock-in' and current_day->>'clockIn' is not null)
      or (p_data->>'type'='clock-out' and (current_day->>'clockIn' is null or current_day->>'clockOut' is not null))
   then raise exception 'Attendance status changed. Return to the dashboard.'; end if;
   if (select count(*) from employee_hr.clock_intents where session_digest=p_digest)>=16 then raise exception 'Too many open captures. Try again in five minutes.'; end if;
   insert into employee_hr.clock_intents(submission,employee_id,session_digest,kind,work_date)
   values(sub,emp,p_digest,p_data->>'type',day) on conflict(submission) do nothing;
 end if;
 select * into intent from employee_hr.clock_intents where submission=sub and employee_id=emp and session_digest=p_digest for update;
 if intent.event_id is null or intent.work_date<>day or intent.issued_at<clock_timestamp()-interval '5 minutes' then
   raise exception 'Capture expired. Start again for fresh evidence.'; end if;
 if p_action='clockBegin' and intent.kind=p_data->>'type' then
   return jsonb_build_object('eventId',intent.event_id,'type',intent.kind,'submission',sub,'date',day);
 elsif p_action='clockPrepare' then
   ev:=p_data->'evidence';
   if (p_data->>'eventId')::uuid is distinct from intent.event_id or jsonb_typeof(ev) is distinct from 'object' or
     not (ev ?& array['lat','lon','accuracy','acquired','format','bytes','sha256'])
     or exists(select from jsonb_each(ev) f where f.value='null'::jsonb)
     or ev->>'format' not in ('image/webp','image/jpeg')
     or (ev->>'lat')::float8 not between -90 and 90 or (ev->>'lon')::float8 not between -180 and 180
     or (ev->>'accuracy')::float8 not between 0 and 1e308 or not isfinite((ev->>'acquired')::timestamptz)
     or (ev->>'bytes')::int not between 1 and 98304 or ev->>'sha256' !~ '^[0-9a-f]{64}$' then raise exception 'Invalid attendance evidence.'; end if;
   if intent.evidence is not null and intent.evidence<>ev then raise exception 'Evidence changed. Start a new capture.'; end if;
   object_path:=to_char(day,'YYYY/MM/')||emp||'/'||intent.event_id||'-'||intent.kind||case when ev->>'format'='image/webp' then '.webp' else '.jpg' end;
   update employee_hr.clock_intents set evidence=ev,path=object_path where submission=sub;
   return jsonb_build_object('path',object_path);
 end if;
 raise exception 'Invalid attendance action.';
end $$;

-- Commit only after the Storage upload. Its permission probes roll back and
-- never run this deferred trigger. A failing commit rolls back object metadata
-- and Storage discards the backing version for that unsuccessful upload.
create function employee_hr.commit_clock_object() returns trigger language plpgsql security definer set search_path='' as $$
declare intent employee_hr.clock_intents; ev jsonb; ident jsonb; first_id uuid; stamp timestamptz;
begin
 select * into intent from employee_hr.clock_intents where path=new.name;
 if intent.event_id is null then raise exception 'Unreserved attendance image.'; end if;
 ident:=public.employee_hr_session('me',intent.session_digest);
 if ident is null or (ident->>'id')::uuid<>intent.employee_id then raise exception 'HR access ended.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(intent.employee_id::text,3));
 perform 1 from employee_hr.sessions where digest=intent.session_digest and expires_at>clock_timestamp() for share;
 if not found then raise exception 'HR session ended.'; end if;
 select * into intent from employee_hr.clock_intents where path=new.name for update;
 if not found then raise exception 'Capture cancelled.'; end if;
 stamp:=clock_timestamp(); ev:=intent.evidence;
 if stamp>intent.issued_at+interval '5 minutes' or (stamp at time zone 'Asia/Vientiane')::date<>intent.work_date then raise exception 'Capture expired.'; end if;
 if (new.metadata->>'size')::integer is distinct from (ev->>'bytes')::integer or new.metadata->>'mimetype' is distinct from ev->>'format'
 then raise exception 'Stored image metadata does not match.'; end if;
 if intent.kind='clock-out' then
   select event_id into strict first_id from employee_hr.clock_events where employee_id=intent.employee_id and work_date=intent.work_date and kind='clock-in';
 end if;
 insert into employee_hr.clock_events(event_id,submission,employee_id,submitted_name,work_date,kind,clock_in_id,official_at,
   latitude,longitude,accuracy_metres,acquired_at,image_path,image_format,size_bytes,width,height,expires_at)
 values(intent.event_id,intent.submission,intent.employee_id,coalesce(ident->>'name',ident->>'code',''),intent.work_date,intent.kind,first_id,stamp,
   (ev->>'lat')::float8,(ev->>'lon')::float8,(ev->>'accuracy')::float8,(ev->>'acquired')::timestamptz,
   new.name,ev->>'format',(ev->>'bytes')::integer,480,480,((stamp at time zone 'Asia/Vientiane')+interval '12 months') at time zone 'Asia/Vientiane');
 delete from employee_hr.clock_intents where submission=intent.submission;
 return null;
end $$;
create constraint trigger hr_clock_storage_commit after insert on storage.objects
deferrable initially deferred for each row when (new.bucket_id='hr-attendance-selfies')
execute function employee_hr.commit_clock_object();

revoke all on function public.hr_clock_registers(date),public.hr_clock_photo_path(uuid,uuid,uuid),public.employee_hr_clock(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.hr_clock_registers(date) to authenticated;
grant execute on function public.hr_clock_photo_path(uuid,uuid,uuid),public.employee_hr_clock(text,text,jsonb) to service_role;
revoke all on function employee_hr.clock_days(uuid,date,date),employee_hr.clock_today(uuid,date),employee_hr.clock_receipt(uuid,uuid),employee_hr.commit_clock_object() from public,anon,authenticated;
grant execute on function employee_hr.clock_days(uuid,date,date),employee_hr.clock_today(uuid,date),employee_hr.clock_receipt(uuid,uuid) to service_role;
