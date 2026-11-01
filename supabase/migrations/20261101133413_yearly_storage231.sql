-- Annual destinations are private routing metadata, not financial records.
alter table private.sheet_archive_config194 add column if not exists annual231 jsonb;
create table private.storage_record_years231(table_name text not null,record_id text not null,years jsonb not null,primary key(table_name,record_id));
alter table private.storage_record_years231 enable row level security;
revoke all on private.storage_record_years231 from public,anon,authenticated;
create table private.storage_receipt_years231(file_id text primary key,owner_id uuid not null,year integer not null check(year between 1900 and 2198));
alter table private.storage_receipt_years231 enable row level security;
revoke all on private.storage_receipt_years231 from public,anon,authenticated;
create function public.storage_year_receipt231(p_file text,p_owner uuid,p_year integer) returns void language plpgsql security definer set search_path='' as $$begin
 if p_file!~'^[A-Za-z0-9_-]{10,160}$' then raise exception 'Invalid receipt file';end if;
 insert into private.storage_receipt_years231 values(p_file,p_owner,p_year) on conflict(file_id) do update set year=excluded.year where storage_receipt_years231.owner_id=excluded.owner_id;
 if not found then raise exception 'Receipt owner changed';end if;
end $$;
create function private.storage_receipt_stamp231() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.pdf_provider='drive' then
  select year into new.accounting_year231 from private.storage_receipt_years231 where file_id=new.pdf_path and owner_id=new.owner_id;
  if new.accounting_year231 is not null and (exists(select 1 from public.journal_entries where id=any(new.journal_ids) and extract(year from transaction_date)::integer<>new.accounting_year231) or exists(select 1 from public.staff_journal_lines where id=any(new.staff_line_ids) and extract(year from transaction_date)::integer<>new.accounting_year231)) then raise exception 'The entry year changed while uploading. Save a new PDF in the confirmed year; the uploaded copy is kept';end if;
 end if;return new;
end $$;

-- Old tabs and restored settings cannot turn off the server-enforced yearly route.
create function private.storage_settings_guard231() returns trigger language plpgsql security definer set search_path='' as $$declare cfg jsonb;a jsonb;begin
 select annual231 into cfg from private.sheet_archive_config194 where id;
 if cfg is not null then
  a:=new.data->'googleSheets143129'->'receiptDrive228'->'active';
  if a->>'annual231' is distinct from 'true' or a->>'connectionKey' is distinct from cfg->>'connectionKey' or a->>'id' is distinct from cfg->>'receiptRoot' or a->>'email' is distinct from cfg->>'email' or a->>'folderURL' is distinct from 'https://drive.google.com/drive/folders/'||(cfg->>'receiptRoot') then raise exception 'Automatic yearly storage is active. Refresh Settings before changing its company destination';end if;
 end if;return new;
end $$;
revoke all on function private.storage_settings_guard231() from public,anon,authenticated;
create trigger storage_settings_guard231 before update on public.budget_settings14313 for each row execute function private.storage_settings_guard231();
revoke all on function private.storage_receipt_stamp231() from public,anon,authenticated;
do $$begin if to_regclass('public.scanner_documents208') is not null then
 alter table public.scanner_documents208 add column if not exists accounting_year231 integer check(accounting_year231 between 1900 and 2198);
 create trigger storage_receipt_stamp231 before insert on public.scanner_documents208 for each row execute function private.storage_receipt_stamp231();
 insert into private.sheet_archive_catalog194 values('scanner_documents208') on conflict do nothing;
 create trigger sheet_archive_capture194 after insert or update or delete on public.scanner_documents208 for each row execute function private.sheet_archive_capture194();
end if;end $$;
alter table private.sheet_archive_queue194 add column if not exists accounting_years231 jsonb;
create function private.storage_record_year231(t text,r jsonb,depth integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare d jsonb:=coalesce(r->'data','{}');dt text;parent text;field text;pr jsonb;answer jsonb;begin
 if depth>8 then raise exception 'Circular accounting year reference';end if;
 if t=any(array['accounts','sub_accounts','currencies','account_groups143180','accounting_id_settings','business_settings','budget_settings14313','budget_templates14313','employees','payroll_employees','payroll_tax_settings','profiles','user_permissions','user_fund_assignments','user_print_preferences1434','print_settings','presentation_settings113','voucher_settings14299','transaction_templates','transaction_template_lines','report_types14253','hr_calendar_settings14306','entry_prefix_reservations','staff_entry_sequences','opening_state14234','backup_registry113','review_routes14229','upcoming_reminders14229']) then return null;end if;
 dt:=coalesce(r->>'accounting_year231',r->>'transaction_date',r->>'period_month',r->>'period_start',r->>'occurrence_date',r->>'voucher_date',d->>'month',d->>'date',d->>'from',r->>'date',r->>'year',r->>'year_no');
 if dt~'^(19|20|21)[0-9]{2}($|-)' then return jsonb_build_array(left(dt,4)::integer);end if;
 if t='scanner_documents208' then
  select jsonb_agg(distinct y order by y) into answer from (
   select extract(year from j.transaction_date)::integer y from public.journal_entries j where j.id::text in(select jsonb_array_elements_text(coalesce(r->'journal_ids','[]')))
   union select extract(year from l.transaction_date)::integer from public.staff_journal_lines l where l.id::text in(select jsonb_array_elements_text(coalesce(r->'staff_line_ids','[]')))
  ) dates;if answer is not null then return answer;end if;
 end if;
 select value->>0,value->>1 into field,parent from jsonb_each('{"journal_lines":["journal_entry_id","journal_entries"],"journal_sources14253":["journal_line_id","journal_lines"],"payroll_lines":["payroll_run_id","payroll_runs"],"fund_adjustment_lines":["request_id","fund_adjustment_requests"],"voucher_versions14299":["voucher_id","vouchers14299"],"cashier_shift_closes":["staff_journal_id","staff_journals"],"cashier_shift_tenders":["shift_close_id","cashier_shift_closes"],"cashier_currency_counts":["shift_close_id","cashier_shift_closes"],"approved_reports1443":["journal_id","staff_journals"],"book_sessions136":["period_id","accounting_periods"],"period_findings":["accounting_period_id","accounting_periods"],"audit_reviews136":["period_id","accounting_periods"]}'::jsonb) where key=t;
 if parent is not null and r->>field is not null then
  execute format('select to_jsonb(p) from public.%I p where id::text=$1',parent) into pr using r->>field;
  if pr is not null then return private.storage_record_year231(parent,pr,depth+1);end if;
  select years into answer from private.storage_record_years231 where table_name=parent and record_id=r->>field;
  return coalesce(answer,'[]'::jsonb);
 end if;
 dt:=coalesce(r->>'created_at',r->>'captured_at',r->>'submitted_at',r->>'updated_at',d->>'createdAt',d->>'updatedAt');
 if dt~'^(19|20|21)[0-9]{2}-' then return jsonb_build_array(left(dt,4)::integer);end if;return null;
end $$;
create function private.storage_queue_year231() returns trigger language plpgsql security definer set search_path='' as $$begin
 new.accounting_years231:=private.storage_record_year231(new.table_name,new.record);
 if new.record->>'id' is not null and new.accounting_years231 is not null and new.accounting_years231<>'[]'::jsonb then
  insert into private.storage_record_years231 values(new.table_name,new.record->>'id',new.accounting_years231) on conflict(table_name,record_id) do update set years=excluded.years;
 end if;return new;
end $$;
create trigger storage_queue_year231 before insert on private.sheet_archive_queue194 for each row execute function private.storage_queue_year231();
revoke all on function private.storage_record_year231(text,jsonb,integer),private.storage_queue_year231() from public,anon,authenticated;
create table private.storage_years231(
 destination uuid not null,year integer not null check(year between 1900 and 2198),
 sheet text,receipt_folder text,initialized boolean not null default false,
 revision bigint not null default -1,phase text not null default 'write' check(phase in ('write','verify')),
 cursor integer not null default 0,saved_revision bigint not null default -1,
 saved_at timestamptz,history_digest text,history_rows integer,history_sheet_id integer,
 provision_lease uuid,provision_until timestamptz,notified_at timestamptz,
 notification_id uuid not null default gen_random_uuid(),primary key(destination,year)
);
alter table private.storage_years231 enable row level security;
revoke all on private.storage_years231 from public,anon,authenticated;

create function public.storage_year_state231() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('config',(select annual231 from private.sheet_archive_config194 where id),
 'years',coalesce((select jsonb_agg(to_jsonb(y)-'provision_lease'-'provision_until' order by year)
 from private.storage_years231 y where destination=(select (annual231->>'id')::uuid from private.sheet_archive_config194 where id)),'[]'::jsonb));
$$;
create function public.storage_year_claim231(p_destination uuid,p_year integer,p_lease uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare r private.storage_years231;begin
 if not exists(select 1 from private.sheet_archive_config194 where (annual231->>'id')::uuid=p_destination) then raise exception 'Storage destination changed';end if;
 insert into private.storage_years231(destination,year) values(p_destination,p_year) on conflict do nothing;
 update private.storage_years231 set provision_lease=p_lease,provision_until=now()+interval '3 minutes'
 where destination=p_destination and year=p_year and (provision_until is null or provision_until<now()) returning * into r;
 if not found then return null;end if;return to_jsonb(r);
end $$;
create function public.storage_year_save231(p_destination uuid,p_year integer,p_lease uuid,p_sheet text,p_receipt_folder text,p_initialized boolean,p_release boolean default false) returns void
language plpgsql security definer set search_path='' as $$begin
 if p_sheet is not null and p_sheet!~'^[A-Za-z0-9_-]{10,160}$' or p_receipt_folder is not null and p_receipt_folder!~'^[A-Za-z0-9_-]{10,160}$' then raise exception 'Invalid Drive identity';end if;
 update private.storage_years231 set sheet=coalesce(p_sheet,sheet),receipt_folder=coalesce(p_receipt_folder,receipt_folder),initialized=initialized or p_initialized,
 provision_lease=case when p_release then null else provision_lease end,provision_until=case when p_release then null else now()+interval '3 minutes' end
 where destination=p_destination and year=p_year and provision_lease=p_lease;
 if not found then raise exception 'Year preparation lease changed';end if;
end $$;
create function public.storage_year_progress231(p_destination uuid,p_year integer,p_lease uuid,p_revision bigint,p_phase text,p_cursor integer,p_done boolean default false) returns void
language plpgsql security definer set search_path='' as $$begin
 if p_phase not in ('write','verify') or p_cursor<0 or not exists(select 1 from private.sheet_archive_config194 where lease=p_lease and (annual231->>'id')::uuid=p_destination) then raise exception 'Archive lease or destination changed';end if;
 update private.storage_years231 set revision=p_revision,phase=p_phase,cursor=p_cursor,
 saved_revision=case when p_done then p_revision else saved_revision end,saved_at=case when p_done then now() else saved_at end
 where destination=p_destination and year=p_year;
 if not found then raise exception 'Prepare the annual workbook first';end if;
end $$;
create function public.storage_year_seal231(p_destination uuid,p_year integer,p_lease uuid,p_digest text,p_rows integer,p_sheet_id integer) returns void
language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from private.sheet_archive_config194 where lease=p_lease and (annual231->>'id')::uuid=p_destination) then raise exception 'Archive lease or destination changed';end if;
 update private.storage_years231 set history_digest=p_digest,history_rows=p_rows,history_sheet_id=p_sheet_id where destination=p_destination and year=p_year and history_digest is null;
 perform public.sheet_archive_seal194(p_year,p_digest,p_rows,p_sheet_id);
end $$;

-- Add one notification type without weakening the existing type check.
alter table public.workspace_notifications drop constraint if exists workspace_notifications_notification_type_check;
alter table public.workspace_notifications add constraint workspace_notifications_notification_type_check check(notification_type in('adjustment_approved','submission_returned','submission_posted','storage_year_ready231'));
create function public.storage_year_notify231(p_destination uuid,p_year integer) returns void
language plpgsql security definer set search_path='' as $$declare r private.storage_years231;begin
 select * into r from private.storage_years231 where destination=p_destination and year=p_year for update;
 if not found or not r.initialized or r.receipt_folder is null or r.notified_at is not null then return;end if;
 insert into public.workspace_notifications(owner_id,notification_type,title,message,related_id,payload)
 select id,'storage_year_ready231','Accounting '||p_year||' storage is ready',
 'The yearly workbook and receipt folder are prepared. Records are routed by their accounting date; preparation does not change the current year.',r.notification_id,
 jsonb_build_object('target','settings-accounting','year',p_year,'sheet',r.sheet,'folder',r.receipt_folder)
 from public.profiles where role='admin' and status='active' on conflict(owner_id,notification_type,related_id) do nothing;
 update private.storage_years231 set notified_at=now() where destination=p_destination and year=p_year;
end $$;

-- Explicit activation is atomic with the saved roots; merely preparing a year never activates it.
create function public.storage_year_activate231(p_actor uuid,p_email text,p_receipt_root text,p_archive_root text,p_connection text) returns jsonb
language plpgsql security definer set search_path='' as $$declare s public.budget_settings14313;cfg jsonb;annual jsonb;old jsonb;t text;begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin' and status='active') then raise exception 'Administrator required';end if;
 select * into s from public.budget_settings14313 where id for update;cfg:=s.data->'googleSheets143129';
 if cfg->>'accountEmail228' is distinct from p_email or cfg->'receiptDrive228'->>'folderURL' is distinct from 'https://drive.google.com/drive/folders/'||p_receipt_root or cfg->'archiveDrive230'->>'folderURL' is distinct from 'https://drive.google.com/drive/folders/'||p_archive_root then raise exception 'Saved account or folder changed; check the current details again';end if;
 perform 1 from private.sheet_archive_config194 where id for update;
 if exists(select 1 from private.sheet_archive_config194 where lease_until>now()) then raise exception 'An archive save is finishing. Retry activation shortly';end if;
 select annual231 into old from private.sheet_archive_config194 where id;
 if old is not null then
  if old->>'email'=p_email and old->>'receiptRoot'=p_receipt_root and old->>'archiveRoot'=p_archive_root then
   annual:=jsonb_set(old,'{connectionKey}',to_jsonb(p_connection));
   update private.sheet_archive_config194 set annual231=annual where id;
   cfg:=jsonb_set(cfg,'{receiptDrive228,active,connectionKey}',to_jsonb(p_connection));
   update public.budget_settings14313 set data=jsonb_set(data,'{googleSheets143129}',cfg),version=version+1 where id;return annual;
  end if;
  raise exception 'Existing yearly destinations are preserved. A different account or root needs a verified migration before activation';
 end if;
 if exists(select 1 from private.sheet_archive_years194 where sealed_at is not null) then raise exception 'Closed legacy history needs verified migration before yearly storage can be activated';end if;
 if p_connection!~'^documents-company228:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$' then raise exception 'Verified company connection required';end if;
 annual:=jsonb_build_object('id',gen_random_uuid(),'email',p_email,'owner',p_actor,'receiptRoot',p_receipt_root,'archiveRoot',p_archive_root,'connectionKey',p_connection,'activatedAt',now());
 update private.sheet_archive_config194 set annual231=annual,revision=revision+1,saved_revision=-1,work_revision=-1,work_phase='write',work_cursor=0,enabled=true where id;
 cfg:=jsonb_set(cfg,'{links}',coalesce((select jsonb_agg(case when value->>0='Journal receipts' then jsonb_build_array('Journal receipts','https://drive.google.com/drive/folders/'||p_receipt_root,'Company receipt folders by accounting year.') when value->>0='Accounting Web — Current and History' then jsonb_build_array('Previous archive — retained',value->>1,'Previous workbook retained for recovery; new exports use the company yearly archive.') else value end order by ord) from jsonb_array_elements(coalesce(cfg->'links','[]')) with ordinality l(value,ord)),'[]')||jsonb_build_array(jsonb_build_array('Company accounting archives','https://drive.google.com/drive/folders/'||p_archive_root,'Separate Accounting YYYY workbooks.')));
 cfg:=jsonb_set(cfg,'{receiptDrive228,active}',jsonb_build_object('id',p_receipt_root,'name','Receipts by accounting year','email',p_email,'folderURL','https://drive.google.com/drive/folders/'||p_receipt_root,'connectionKey',p_connection,'annual231',true));
 update public.budget_settings14313 set data=jsonb_set(data,'{googleSheets143129}',cfg),version=version+1 where id;
 for t in select name from private.sheet_archive_catalog194 loop
  execute format('insert into private.sheet_archive_queue194(table_name,operation,record) select %L,''BASELINE231'',to_jsonb(r) from public.%I r',t,t);
 end loop;
 perform public.sheet_archive_wake194();return annual;
end $$;

create function public.storage_year_prepare231() returns void language plpgsql security definer set search_path='' as $$begin
 update private.sheet_archive_config194 set annual231=jsonb_set(annual231,'{prepareYear}',to_jsonb(extract(year from now() at time zone 'Asia/Vientiane')::integer+1)),revision=revision+1 where id and annual231 is not null;
 if not found then raise exception 'Activate automatic yearly storage first';end if;perform public.sheet_archive_wake194();
end $$;

create function public.storage_year_finish231(p_lease uuid,p_ids bigint[],p_continue boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from private.sheet_archive_config194 where lease=p_lease) then raise exception 'Archive lease changed';end if;
 delete from private.sheet_archive_queue194 where id=any(p_ids);
 update private.sheet_archive_config194 set lease=null,lease_until=null,last_error=null,last_saved=now() where lease=p_lease;
 if p_continue then perform public.sheet_archive_wake194();end if;
end $$;

-- Annual exports need the same coherent snapshot while draining dated revisions.
create or replace function public.sheet_archive_job194(p_lease uuid) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='60s' as $$
declare c private.sheet_archive_config194; queued jsonb;snapshot jsonb;begin
 update private.sheet_archive_config194 set lease=p_lease,lease_until=now()+interval '5 minutes' where id and enabled and (lease_until is null or lease_until<now()) returning * into c;
 if not found then return null;end if;
 select coalesce(jsonb_agg(q order by id),'[]') into queued from(select * from private.sheet_archive_queue194 q0 order by case when c.annual231 is not null and exists(select 1 from jsonb_array_elements_text(coalesce(q0.accounting_years231,'[]')) y where y::integer>extract(year from now() at time zone 'Asia/Vientiane')::integer) then 1 else 0 end,id limit 1000)q;
 if c.annual231 is not null or c.saved_revision<>c.revision then snapshot:=private.sheet_archive_snapshot194();else snapshot:='{}'::jsonb;end if;
 return jsonb_build_object('config',to_jsonb(c),'tables',snapshot,'queue',queued,'years',(select coalesce(jsonb_agg(y order by year),'[]') from private.sheet_archive_years194 y));
end $$;

-- The existing queue retries failures. The hourly check prepares upcoming storage
-- on December 30 in Asia/Vientiane and catches up after outages without a browser.
select cron.schedule('accounting-yearly-storage231','5 * * * *',$job$
 select public.sheet_archive_wake194() where exists(select 1 from private.sheet_archive_config194 c where c.enabled and c.annual231 is not null and (c.lease_until is null or c.lease_until<now()) and (
 not exists(select 1 from private.storage_years231 y where y.destination=(c.annual231->>'id')::uuid and y.year=extract(year from now() at time zone 'Asia/Vientiane')::integer and y.initialized and y.receipt_folder is not null)
 or(to_char(now() at time zone 'Asia/Vientiane','MM-DD')>='12-30' and not exists(select 1 from private.storage_years231 y where y.destination=(c.annual231->>'id')::uuid and y.year=extract(year from now() at time zone 'Asia/Vientiane')::integer+1 and y.initialized and y.receipt_folder is not null))))
 $job$);

do $$declare p record;begin for p in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname like 'storage_year_%231' loop
 execute format('revoke all on function %s from public,anon,authenticated',p.sig);execute format('grant execute on function %s to service_role',p.sig);end loop;end $$;
revoke all on function public.sheet_archive_job194(uuid) from public,anon,authenticated;
grant execute on function public.sheet_archive_job194(uuid) to service_role;
notify pgrst,'reload schema';
