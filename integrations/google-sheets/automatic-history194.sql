-- Business records only. Authentication credentials and recovery secrets never leave Supabase.
create schema if not exists private;
create table private.sheet_archive_config194 (
 id boolean primary key default true check(id), sheet text not null, connection_sheet text not null,
 enabled boolean not null default false, lease uuid, lease_until timestamptz,
 last_saved timestamptz, last_error text, revision bigint not null default 0
);
create table private.sheet_archive_catalog194(name text primary key);
insert into private.sheet_archive_catalog194(name)
select tablename from pg_tables where schemaname='public' and tablename not in (
 'google_connections143150','google_states143150','google_inbox143150','workspace_hook_config138',
 'document_download_passwords14312','account_provisioning14320','recovery_vault113','recovery_vaults14320',
 'recovery_sessions113','recovery_tickets14320','recovery_attempts14320','accounting_operations136',
 'hope_sync183','data_tools_state14232','session_policy1443'
);
create table private.sheet_archive_queue194 (
 id bigint generated always as identity primary key, table_name text not null, operation text not null,
 captured_at timestamptz not null default now(), record jsonb not null
);
create table private.sheet_archive_years194 (
 year integer primary key, closed_at timestamptz not null, snapshot jsonb,
 sealed_at timestamptz, digest text, rows integer, sheet_id integer, purged_at timestamptz
);
create table private.sheet_archive_permits194 (
 actor uuid primary key, token uuid not null, expires_at timestamptz not null,
 mode text not null, pack jsonb not null, digest text not null
);
alter table private.sheet_archive_config194 enable row level security;
alter table private.sheet_archive_catalog194 enable row level security;
alter table private.sheet_archive_queue194 enable row level security;
alter table private.sheet_archive_years194 enable row level security;
alter table private.sheet_archive_permits194 enable row level security;
revoke all on private.sheet_archive_config194,private.sheet_archive_catalog194,private.sheet_archive_queue194,private.sheet_archive_years194,private.sheet_archive_permits194 from public,anon,authenticated;

create function private.sheet_archive_snapshot194() returns jsonb language plpgsql security definer set search_path='' as $$
declare statement text; result jsonb; total bigint;
begin
 -- One SQL statement gives every table the same MVCC snapshot.
 select string_agg(format('select %L::text name,coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),''[]''::jsonb) rows from public.%I r',name,name),' union all ' order by name) into statement from private.sheet_archive_catalog194;
 if statement is null then return '{}'::jsonb;end if;
 execute 'select jsonb_object_agg(name,rows) from ('||statement||') data' into result;
 select sum(jsonb_array_length(value)) into total from jsonb_each(result);
 if total>50000 then raise exception 'Archive exceeds 50,000 source records; extend capacity before cleanup';end if;
 return result;
end $$;
create function public.sheet_archive_wake194() returns bigint language plpgsql security definer set search_path='' as $$
declare n bigint;
begin
 if not exists(select 1 from private.sheet_archive_config194 where enabled) then return null; end if;
 select net.http_post(url:='https://nhjsesfhapnjtwlxvirm.supabase.co/functions/v1/accounting-sheet-archive',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||public.google_poll_key143150()),
  body:='{"action":"sync"}'::jsonb,timeout_milliseconds:=120000) into n;
 return n;
end $$;
create function private.sheet_archive_capture194() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- A row revision is durable until Google readback succeeds. DELETE carries the last complete row.
 if TG_OP='UPDATE' and to_jsonb(OLD)=to_jsonb(NEW) then return NEW; end if;
 insert into private.sheet_archive_queue194(table_name,operation,record)
 values(TG_TABLE_NAME,TG_OP,case when TG_OP='DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end);
 update private.sheet_archive_config194 set revision=revision+1 where id;
 if TG_TABLE_NAME='year_closings136' and TG_OP='INSERT' then
  insert into private.sheet_archive_years194(year,closed_at,snapshot)
  values(NEW.year,NEW.closed_at,private.sheet_archive_snapshot194()) on conflict(year) do nothing;
 end if;
 if current_setting('app.sheet_archive_woken194',true) is distinct from 'yes' then
  perform set_config('app.sheet_archive_woken194','yes',true); perform public.sheet_archive_wake194();
 end if;
 if TG_OP='DELETE' then return OLD; end if; return NEW;
end $$;
do $$declare t text; begin
 for t in select name from private.sheet_archive_catalog194 loop
  execute format('create trigger sheet_archive_capture194 after insert or update or delete on public.%I for each row execute function private.sheet_archive_capture194()',t);
  execute format('insert into private.sheet_archive_queue194(table_name,operation,record) select %L,''BASELINE'',to_jsonb(r) from public.%I r',t,t);
 end loop;
end $$;
insert into private.sheet_archive_years194(year,closed_at,snapshot)
select year,closed_at,private.sheet_archive_snapshot194() from public.year_closings136;

create function public.sheet_archive_job194(p_lease uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare c private.sheet_archive_config194; begin
 update private.sheet_archive_config194 set lease=p_lease,lease_until=now()+interval '5 minutes'
 where id and enabled and (lease_until is null or lease_until<now()) returning * into c;
 if not found then return null; end if;
 return jsonb_build_object('config',to_jsonb(c),'tables',private.sheet_archive_snapshot194(),
  'queue',(select coalesce(jsonb_agg(q order by id),'[]') from (select * from private.sheet_archive_queue194 order by id limit 1000) q),
  'years',(select coalesce(jsonb_agg(y order by year),'[]') from private.sheet_archive_years194 y));
end $$;
create function public.sheet_archive_finish194(p_lease uuid,p_ids bigint[],p_error text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from private.sheet_archive_config194 where lease=p_lease) then raise exception 'Archive lease changed'; end if;
 if p_error is null then delete from private.sheet_archive_queue194 where id=any(p_ids); end if;
 update private.sheet_archive_config194 set lease=null,lease_until=null,last_error=p_error,
 last_saved=case when p_error is null then now() else last_saved end where lease=p_lease;
 if p_error is null and exists(select 1 from private.sheet_archive_queue194) then perform public.sheet_archive_wake194(); end if;
end $$;
create function public.sheet_archive_seal194(p_year integer,p_digest text,p_rows integer,p_sheet_id integer) returns void language plpgsql security definer set search_path='' as $$
begin
 update private.sheet_archive_years194 set sealed_at=now(),digest=p_digest,rows=p_rows,sheet_id=p_sheet_id,snapshot=null
 where year=p_year and sealed_at is null;
end $$;
create function public.sheet_archive_state194() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 return jsonb_build_object('config',(select to_jsonb(c)-'lease' from private.sheet_archive_config194 c),
 'pending',(select count(*) from private.sheet_archive_queue194),
 'years',(select coalesce(jsonb_agg(to_jsonb(y)-'snapshot' order by year),'[]') from private.sheet_archive_years194 y),
 'tables',(select jsonb_agg(name order by name) from private.sheet_archive_catalog194));
end $$;
create function public.sheet_archive_permit194(p_actor uuid,p_mode text,p_pack jsonb,p_digest text) returns uuid language plpgsql security definer set search_path='' as $$
declare token uuid:=gen_random_uuid(); begin
 if p_mode not in ('reset','year') then raise exception 'Invalid cleanup mode'; end if;
 if not exists(select 1 from private.sheet_archive_excel194 e where e.actor=p_actor and e.mode=p_mode and e.digest=p_digest and e.expires_at>now()) then raise exception 'Prepare a fresh database Excel backup before cleanup';end if;
 insert into private.sheet_archive_permits194 values(p_actor,token,now()+interval '5 minutes',p_mode,p_pack,p_digest)
 on conflict(actor) do update set token=excluded.token,expires_at=excluded.expires_at,mode=excluded.mode,pack=excluded.pack,digest=excluded.digest;
 return token;
end $$;
-- Keep existing reset previews and permission checks; actual resets now require a fresh Google comparison.
alter function public.scoped_reset14232(jsonb,boolean,text) rename to scoped_reset_before194;
revoke all on function public.scoped_reset_before194(jsonb,boolean,text) from public,anon,authenticated;
create function public.scoped_reset14232(p_backup jsonb,p_apply boolean default false,p_confirmation text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare permit private.sheet_archive_permits194; result jsonb; begin
 if coalesce(p_apply,false) then
  select * into permit from private.sheet_archive_permits194 where actor=auth.uid() and mode='reset' and expires_at>now() for update;
  if not found or permit.pack is distinct from p_backup then raise exception 'Compare the selected database records with Google Sheets again before permanent deletion'; end if;
  delete from private.sheet_archive_permits194 where actor=auth.uid();
  delete from private.sheet_archive_excel194 where actor=auth.uid();
 end if;
 result:=public.scoped_reset_before194(p_backup,p_apply,p_confirmation);
 if coalesce(p_apply,false) then perform public.sheet_archive_wake194(); end if;
 return result;
end $$;
revoke all on function public.scoped_reset14232(jsonb,boolean,text) from public,anon;
grant execute on function public.scoped_reset14232(jsonb,boolean,text) to authenticated;
-- Old all-time destructive endpoints must not bypass the new comparison and confirmation screen.
do $$declare n text; begin
 foreach n in array array['accounting_archive_clear126','operational_data_reset142'] loop
  execute format('revoke all on function public.%I(jsonb,boolean,text) from public,anon,authenticated',n);
 end loop;
end $$;
do $$declare p record; begin
 for p in select proc.oid::regprocedure signature from pg_proc proc join pg_namespace n on n.oid=proc.pronamespace where n.nspname='public' and proc.proname like 'sheet_archive_%194' loop
  execute format('revoke all on function %s from public,anon,authenticated',p.signature);
  execute format('grant execute on function %s to service_role',p.signature);
 end loop;
end $$;
revoke all on function private.sheet_archive_snapshot194(),private.sheet_archive_capture194() from public,anon,authenticated;

-- Retain the closed-year marker when its first journal is archived out of the database.
alter table public.year_closings136 drop constraint year_closings136_anchor_entry_fkey;
alter table public.year_closings136 add constraint year_closings136_anchor_entry_fkey foreign key(anchor_entry) references public.journal_entries(id) on delete set null;

create function public.sheet_archive_year_pack194(p_year integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare pack jsonb; tables jsonb; fk record; pred text; extra jsonb; combined jsonb; changed boolean; pass integer; t text; begin
 perform public.require_admin136();
 if not public.accounting_workspace_allowed123() then raise exception 'Accounting workspace access required'; end if;
 if not exists(select 1 from private.sheet_archive_years194 where year=p_year and sealed_at is not null) then raise exception 'Close the entire year and finish its verified Google history first'; end if;
 pack:=public.accounting_archive_preview127(make_date(p_year,1,1),make_date(p_year,12,31));
 -- Period locks and year-closure markers remain in the operational database.
 tables:=pack->'rows';
 for pass in 1..30 loop
  changed:=false;
  for fk in select c.*,ch.relname child,pa.relname parent from pg_constraint c join pg_class ch on ch.oid=c.conrelid join pg_class pa on pa.oid=c.confrelid join pg_namespace ns on ns.oid=ch.relnamespace
   where c.contype='f' and ns.nspname='public' and tables ? pa.relname and ch.relname<>'year_closings136' loop
   if not exists(select 1 from private.sheet_archive_catalog194 where name=fk.child) then raise exception 'Unarchived dependency % prevents cleanup',fk.child; end if;
   select string_agg(format('c.%I=p.%I',ca.attname,pa.attname),' and ') into pred from unnest(fk.conkey,fk.confkey) pair(ca,pa) join pg_attribute ca on ca.attrelid=fk.conrelid and ca.attnum=pair.ca join pg_attribute pa on pa.attrelid=fk.confrelid and pa.attnum=pair.pa;
   execute format('select coalesce(jsonb_agg(distinct to_jsonb(c)),''[]'') from public.%I c join public.%I p on %s where to_jsonb(p) in (select value from jsonb_array_elements($1))',fk.child,fk.parent,pred) into extra using tables->fk.parent;
   if jsonb_array_length(extra)=0 then continue; end if;
   if fk.child in ('accounts','sub_accounts','profiles','payroll_employees','employees','business_settings','user_permissions','currencies') then raise exception 'Protected master records depend on this year'; end if;
   if exists(select 1 from jsonb_array_elements(extra) r where (r->>'transaction_date' is not null and left(r->>'transaction_date',4)<>p_year::text) or (r->>'period_start' is not null and left(r->>'period_start',4)<>p_year::text)) then raise exception 'A record in another year references this year (%). Cleanup is blocked.',fk.child; end if;
   select coalesce(jsonb_agg(v order by v::text),'[]') into combined from (select distinct value v from jsonb_array_elements(coalesce(tables->fk.child,'[]')||extra)) x;
   if combined is distinct from tables->fk.child then tables:=tables||jsonb_build_object(fk.child,combined);changed:=true;end if;
  end loop;
  exit when not changed;
 end loop;
 if changed then raise exception 'Too many linked dependencies; cleanup is blocked';end if;
 return jsonb_build_object('format','oonjai-year-cleanup-194','year',p_year,'tables',tables-'accounting_periods');
end $$;
create function public.sheet_archive_delete_year194(p_token uuid,p_confirmation text) returns jsonb language plpgsql security definer set search_path='' as $$
declare permit private.sheet_archive_permits194; actual jsonb; name text; tr record; fk record; n bigint; total bigint:=0; counts jsonb:='{}'; begin
 perform public.require_admin136();if not public.accounting_workspace_allowed123() then raise exception 'Accounting workspace access required';end if;
 select * into permit from private.sheet_archive_permits194 where actor=auth.uid() and token=p_token and mode='year' and expires_at>now() for update;
 if not found then raise exception 'Fresh Google history verification is required';end if;
 if p_confirmation is distinct from 'DELETE VERIFIED YEAR '||(permit.pack->>'year') then raise exception 'Additional year confirmation does not match';end if;
 -- Freeze the selection and dependencies, then recheck exact source data in this same transaction.
 for name in select c.name from private.sheet_archive_catalog194 c order by c.name loop execute format('lock table public.%I in access exclusive mode',name);end loop;
 actual:=public.sheet_archive_year_pack194((permit.pack->>'year')::integer);
 if actual is distinct from permit.pack then raise exception 'Records changed after verification. No records were deleted';end if;
 create temporary table archive_triggers194(tbl text,tname text,mode char(1)) on commit drop;
 insert into pg_temp.archive_triggers194 select c.relname,t.tgname,t.tgenabled from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and actual->'tables' ? c.relname and not t.tgisinternal and t.tgenabled<>'D';
 create temporary table archive_fks194(tbl text,cname text,definition text) on commit drop;
 insert into pg_temp.archive_fks194 select ch.relname,c.conname,pg_get_constraintdef(c.oid,true) from pg_constraint c join pg_class ch on ch.oid=c.conrelid join pg_class pa on pa.oid=c.confrelid join pg_namespace ns on ns.oid=ch.relnamespace where c.contype='f' and ns.nspname='public' and actual->'tables' ? ch.relname and actual->'tables' ? pa.relname;
 -- All changes below roll back together if any preserved dependency or constraint fails.
 for tr in select * from pg_temp.archive_triggers194 loop execute format('alter table public.%I disable trigger %I',tr.tbl,tr.tname);end loop;
 for fk in select * from pg_temp.archive_fks194 loop execute format('alter table public.%I drop constraint %I',fk.tbl,fk.cname);end loop;
 for name in select jsonb_object_keys(actual->'tables') loop
  execute format('delete from public.%I r where to_jsonb(r) in (select value from jsonb_array_elements($1))',name) using actual->'tables'->name;
  get diagnostics n=row_count; if n<>jsonb_array_length(actual->'tables'->name) then raise exception 'Cleanup count mismatch in %',name;end if;
  total:=total+n;counts:=counts||jsonb_build_object(name,n);
 end loop;
 for fk in select * from pg_temp.archive_fks194 loop execute format('alter table public.%I add constraint %I %s',fk.tbl,fk.cname,fk.definition);end loop;
 for tr in select * from pg_temp.archive_triggers194 loop execute format('alter table public.%I %s trigger %I',tr.tbl,case tr.mode when 'R' then 'enable replica' when 'A' then 'enable always' else 'enable' end,tr.tname);end loop;
 delete from private.sheet_archive_permits194 where actor=auth.uid();
 delete from private.sheet_archive_excel194 where actor=auth.uid();
 update private.sheet_archive_years194 set purged_at=now() where year=(permit.pack->>'year')::integer;
 insert into public.backup_audit113(actor,kind,detail) values(auth.uid(),'google_verified_year_cleanup194',jsonb_build_object('year',permit.pack->'year','counts',counts,'google_digest',permit.digest));
 perform public.sheet_archive_wake194();return jsonb_build_object('mode','cleared','year',permit.pack->'year','counts',counts,'total',total);
end $$;
revoke all on function public.sheet_archive_year_pack194(integer),public.sheet_archive_delete_year194(uuid,text) from public,anon;
grant execute on function public.sheet_archive_year_pack194(integer),public.sheet_archive_delete_year194(uuid,text) to authenticated;

create table private.sheet_archive_excel194(actor uuid primary key, token uuid not null, mode text not null,digest text not null,expires_at timestamptz not null);
alter table private.sheet_archive_excel194 enable row level security;
revoke all on private.sheet_archive_excel194 from public,anon,authenticated;
create function public.sheet_archive_excel194(p_actor uuid,p_mode text,p_digest text,p_token uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare token uuid;begin
 if p_token is not null then
  select e.token into token from private.sheet_archive_excel194 e where e.actor=p_actor and e.token=p_token and e.mode=p_mode and e.digest=p_digest and e.expires_at>now();
  if token is null then raise exception 'Download a fresh database Excel backup before confirming deletion';end if;
  return token;
 end if;
 token:=gen_random_uuid();insert into private.sheet_archive_excel194 values(p_actor,token,p_mode,p_digest,now()+interval '15 minutes')
 on conflict(actor) do update set token=excluded.token,mode=excluded.mode,digest=excluded.digest,expires_at=excluded.expires_at;return token;
end $$;
create function public.sheet_archive_snapshot194() returns jsonb language sql security definer set search_path='' as $$ select private.sheet_archive_snapshot194(); $$;
revoke all on function public.sheet_archive_excel194(uuid,text,text,uuid),public.sheet_archive_snapshot194() from public,anon,authenticated;
grant execute on function public.sheet_archive_excel194(uuid,text,text,uuid),public.sheet_archive_snapshot194() to service_role;

create function public.sheet_archive_history_selection194(p_snapshot jsonb,p_year integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare tables jsonb:='{}'; t text; rows jsonb; fk record; pred text; extra jsonb; combined jsonb; changed boolean; pass integer;
begin
 foreach t in array array['accounting_periods','journal_entries','entry_submissions','scheduled_journal_occurrences','staff_journals','staff_journal_lines','fund_adjustment_requests','workspace_notifications','payroll_leave_records','payroll_runs','tax_sso_records','operational_reports'] loop
  select coalesce(jsonb_agg(r order by r::text),'[]') into rows from jsonb_array_elements(coalesce(p_snapshot->t,'[]')) r where
  case when t='accounting_periods' then left(r->>'period_month',4)=p_year::text
   when t in ('journal_entries','entry_submissions','staff_journal_lines') then left(r->>'transaction_date',4)=p_year::text
   when t='scheduled_journal_occurrences' then left(r->>'occurrence_date',4)=p_year::text
   when t in ('fund_adjustment_requests','workspace_notifications') then left(r->>'created_at',4)=p_year::text
   when t in ('payroll_leave_records','operational_reports') then left(r->'data'->>'from',4)=p_year::text and left(r->'data'->>'to',4)=p_year::text
   else left(r->>'period_start',4)=p_year::text and left(r->>'period_end',4)=p_year::text end;
  if jsonb_array_length(rows)>0 then tables:=tables||jsonb_build_object(t,rows);end if;
 end loop;
 for pass in 1..30 loop changed:=false;
  for fk in select c.*,ch.relname child,pa.relname parent from pg_constraint c join pg_class ch on ch.oid=c.conrelid join pg_class pa on pa.oid=c.confrelid join pg_namespace ns on ns.oid=ch.relnamespace where c.contype='f' and ns.nspname='public' and tables ? pa.relname and ch.relname<>'year_closings136' loop
   select string_agg(format('(c->%L)=(p->%L) and (c->>%L) is not null',ca.attname,pa.attname,ca.attname),' and ') into pred from unnest(fk.conkey,fk.confkey) pair(ca,pa) join pg_attribute ca on ca.attrelid=fk.conrelid and ca.attnum=pair.ca join pg_attribute pa on pa.attrelid=fk.confrelid and pa.attnum=pair.pa;
   execute 'select coalesce(jsonb_agg(distinct c),''[]'') from jsonb_array_elements($1) c join jsonb_array_elements($2) p on '||pred into extra using coalesce(p_snapshot->fk.child,'[]'),tables->fk.parent;
   if jsonb_array_length(extra)=0 then continue;end if;
   select coalesce(jsonb_agg(v order by v::text),'[]') into combined from (select distinct value v from jsonb_array_elements(coalesce(tables->fk.child,'[]')||extra)) x;
   if combined is distinct from tables->fk.child then tables:=tables||jsonb_build_object(fk.child,combined);changed:=true;end if;
  end loop;exit when not changed;
 end loop;
 if changed then raise exception 'History dependency comparison exceeds capacity';end if;
 return tables-'accounting_periods';
end $$;
revoke all on function public.sheet_archive_history_selection194(jsonb,integer) from public,anon,authenticated;
grant execute on function public.sheet_archive_history_selection194(jsonb,integer) to service_role;
