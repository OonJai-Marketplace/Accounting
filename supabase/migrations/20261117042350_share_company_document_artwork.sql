-- Preserve the document API and its RLS. Only the storage representation changes.
lock table public.company_documents105 in access exclusive mode;
create temporary table document_fingerprints on commit drop as
  select id, sha256(convert_to(to_jsonb(d)::text,'UTF8')) as digest
  from public.company_documents105 d;

create schema company_document_store;
revoke all on schema company_document_store from public;
grant usage on schema company_document_store to anon, authenticated, service_role;
alter table public.company_documents105 set schema company_document_store;
alter table company_document_store.company_documents105
  add column artwork jsonb not null default '{}'::jsonb;

create function company_document_store.expand_document(doc jsonb, artwork jsonb)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  parts jsonb;
  asset record;
begin
  if artwork = '{}'::jsonb then return doc; end if;
  select s.form_parts into parts from public.voucher_settings14299 s where s.id=1;
  for asset in select * from jsonb_each_text(artwork) loop
    if jsonb_typeof(parts->asset.value) is distinct from 'string' then
      raise exception 'Unable to load saved company document artwork';
    end if;
    doc := jsonb_set(doc, array['settings',asset.key], parts->asset.value);
  end loop;
  return doc;
end $$;
revoke all on function company_document_store.expand_document(jsonb,jsonb) from public;
grant execute on function company_document_store.expand_document(jsonb,jsonb)
  to anon, authenticated, service_role;

create function company_document_store.pack_document()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  field text;
  asset jsonb;
begin
  new.artwork := '{}';
  foreach field in array array['headerImage','footerImage'] loop
    asset := new.data #> array['settings',field];
    if jsonb_typeof(asset) = 'string' and
       left(new.data #>> array['settings',field],11) = 'data:image/' then
      new.artwork := new.artwork || jsonb_build_object(field,private.voucher_part(asset));
      new.data := new.data #- array['settings',field];
    end if;
  end loop;
  return new;
end $$;
revoke all on function company_document_store.pack_document()
  from public, anon, authenticated, service_role;
create trigger store_document_artwork before insert or update of data
  on company_document_store.company_documents105 for each row
  execute function company_document_store.pack_document();

-- A user-initiated deletion retains the same self-contained recovery record.
create function company_document_store.archive_deleted_document()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_admin() is not true then raise exception 'Administrator access required'; end if;
  insert into public.record_deletions108(table_name,record_id,record_data)
    values(tg_table_name,old.id,(to_jsonb(old)-'artwork') ||
           jsonb_build_object('data',company_document_store.expand_document(old.data,old.artwork)));
  return old;
end $$;
revoke all on function company_document_store.archive_deleted_document()
  from public, anon, authenticated, service_role;
create or replace trigger guard_delete108 before delete on company_document_store.company_documents105
  for each row execute function company_document_store.archive_deleted_document();

create view public.company_documents105 with (security_invoker=true) as
  select id,company_document_store.expand_document(data,artwork) as data,
         version,created_at,updated_at,updated_by
  from company_document_store.company_documents105;
alter view public.company_documents105 alter column id set default gen_random_uuid();
alter view public.company_documents105 alter column data set default '{}'::jsonb;
alter view public.company_documents105 alter column version set default 1;
alter view public.company_documents105 alter column created_at set default now();
alter view public.company_documents105 alter column updated_at set default now();
revoke all on public.company_documents105 from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.company_documents105 to anon, authenticated, service_role;

-- INSERT and UPDATE accept the legacy full document. DELETE uses PostgreSQL's
-- automatically updatable view behavior and the base table deletion guard.
create function company_document_store.write_document()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  saved company_document_store.company_documents105;
begin
  if tg_op='INSERT' then
    insert into company_document_store.company_documents105(id,data,version,created_at,updated_at,updated_by)
      values(new.id,new.data,new.version,new.created_at,new.updated_at,new.updated_by) returning * into saved;
  else
    update company_document_store.company_documents105 set
      id=new.id,data=new.data,version=new.version,created_at=new.created_at,
      updated_at=new.updated_at,updated_by=new.updated_by
      where id=old.id and version=old.version returning * into saved;
    if not found then raise exception 'Record changed; reload before editing'; end if;
  end if;
  new.id := saved.id;
  new.version := saved.version;
  new.created_at := saved.created_at;
  new.updated_at := saved.updated_at;
  new.updated_by := saved.updated_by;
  -- Packing only extracts exact image strings. Return the original JSON supplied
  -- by the caller, including newly inserted images in this same SQL statement.
  return new;
end $$;
revoke all on function company_document_store.write_document()
  from public, anon, authenticated, service_role;
create trigger write_document instead of insert or update on public.company_documents105
  for each row execute function company_document_store.write_document();

alter table company_document_store.company_documents105 disable trigger stamp_workspace105;
update company_document_store.company_documents105 set data=data
where left(data#>>'{settings,headerImage}',11)='data:image/'
   or left(data#>>'{settings,footerImage}',11)='data:image/';
alter table company_document_store.company_documents105 enable trigger stamp_workspace105;

do $$
begin
  if exists (
    select 1 from pg_temp.document_fingerprints f full join public.company_documents105 d using(id)
    where f.digest is distinct from sha256(convert_to(to_jsonb(d)::text,'UTF8'))
  ) then raise exception 'Document content or metadata changed during artwork migration'; end if;
end $$;

-- Metadata-driven backup/reset paths read expanded rows via public, but inspect
-- primary keys, foreign keys and administrative triggers on the physical table.
create function company_document_store.table_schema(table_name text)
returns text language sql immutable security invoker set search_path='' as $$
  select case when table_name='company_documents105' then 'company_document_store' else 'public' end
$$;
revoke all on function company_document_store.table_schema(text) from public;
grant execute on function company_document_store.table_schema(text) to authenticated, service_role;

-- Preserve the installed versions of these routines, including all retention
-- and authorization logic. Fail on a different source instead of editing blindly.
create function pg_temp.patch_document_storage(routine regprocedure, original text, replacement text)
returns void language plpgsql as $$
declare definition text := pg_get_functiondef(routine);
begin
  if strpos(definition,original)=0 then
    raise exception 'Expected catalog lookup missing in %',routine;
  end if;
  execute replace(definition,original,replacement);
end $$;

select pg_temp.patch_document_storage('public.operational_data_backup142()',
  $s$c.conrelid=to_regclass(format('public.%I',t.name))$s$,
  $s$c.conrelid=to_regclass(format('%I.%I',company_document_store.table_schema(t.name),t.name))$s$);

select pg_temp.patch_document_storage('public.operational_data_reset142(jsonb,boolean,text)',
  $s$ns.nspname='public' and not tg.tgisinternal$s$,
  $s$ns.nspname=company_document_store.table_schema(c.relname) and not tg.tgisinternal$s$);
select pg_temp.patch_document_storage('public.operational_data_reset142(jsonb,boolean,text)',
  $s$'alter table public.%I disable trigger %I',trig.tbl$s$,
  $s$'alter table %I.%I disable trigger %I',company_document_store.table_schema(trig.tbl),trig.tbl$s$);
select pg_temp.patch_document_storage('public.operational_data_reset142(jsonb,boolean,text)',
  $s$'alter table public.%I %s trigger %I',trig.tbl$s$,
  $s$'alter table %I.%I %s trigger %I',company_document_store.table_schema(trig.tbl),trig.tbl$s$);

select pg_temp.patch_document_storage('public.scoped_reset_before194(jsonb,boolean,text)',
  $s$format('public.%I',n),', ' ORDER BY n$s$,
  $s$format('%I.%I',company_document_store.table_schema(n),n),', ' ORDER BY n$s$);
select pg_temp.patch_document_storage('public.scoped_reset_before194(jsonb,boolean,text)',
  $s$pn.nspname='public' AND parent.relname=ANY(names) AND (cn.nspname<>'public'$s$,
  $s$pn.nspname=company_document_store.table_schema(parent.relname) AND parent.relname=ANY(names) AND (cn.nspname<>company_document_store.table_schema(child.relname)$s$);
select pg_temp.patch_document_storage('public.scoped_reset_before194(jsonb,boolean,text)',
  $s$n.nspname='public' AND c.relname=ANY(names)$s$,
  $s$n.nspname=company_document_store.table_schema(c.relname) AND c.relname=ANY(names)$s$);

select pg_temp.patch_document_storage('public.sheet_archive_delete_year194(uuid,text)',
  $s$ns.nspname='public' and actual->'tables' ? c.relname$s$,
  $s$ns.nspname=company_document_store.table_schema(c.relname) and actual->'tables' ? c.relname$s$);
select pg_temp.patch_document_storage('public.sheet_archive_delete_year194(uuid,text)',
  $s$'alter table public.%I disable trigger %I',tr.tbl$s$,
  $s$'alter table %I.%I disable trigger %I',company_document_store.table_schema(tr.tbl),tr.tbl$s$);
select pg_temp.patch_document_storage('public.sheet_archive_delete_year194(uuid,text)',
  $s$'alter table public.%I %s trigger %I',tr.tbl$s$,
  $s$'alter table %I.%I %s trigger %I',company_document_store.table_schema(tr.tbl),tr.tbl$s$);
select pg_temp.patch_document_storage('public.sheet_archive_year_pack194(integer)',
  $s$ns.nspname='public' and tables ? pa.relname$s$,
  $s$ns.nspname=company_document_store.table_schema(ch.relname) and tables ? pa.relname$s$);

drop function pg_temp.patch_document_storage(regprocedure,text,text);
notify pgrst,'reload schema';
