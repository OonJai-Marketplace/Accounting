-- Account-owned template collection. No journals, posting or financial data.
create table public.journal_template_collections275 (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null,
 version integer not null default 1 check (version > 0),
 updated_at timestamptz not null default now()
);
alter table public.journal_template_collections275 enable row level security;
revoke all on public.journal_template_collections275 from public, anon, authenticated;
grant select, insert, update on public.journal_template_collections275 to authenticated;
create policy template_owner275 on public.journal_template_collections275 for all to authenticated
 using (owner_id = (select auth.uid()) and (select public.active_account14228()) and (select public.accounting_workspace_allowed123()) and not (select public.password_change_required14257()))
 with check (owner_id = (select auth.uid()) and (select public.active_account14228()) and (select public.accounting_workspace_allowed123()) and not (select public.password_change_required14257()));
create function public.validate_template_collection275() returns trigger language plpgsql security invoker set search_path = '' as $$
declare item jsonb; n jsonb; k text; used_numbers integer[] := '{}'; ids text[] := '{}';
begin
 if tg_op = 'INSERT' and new.version <> 1 or tg_op = 'UPDATE' and (new.owner_id <> old.owner_id or new.version <> old.version + 1) then
  raise exception 'Template revision changed; reload and merge before saving' using errcode='40001';
 end if;
 if pg_catalog.pg_column_size(new.data) > 2097152 or jsonb_typeof(new.data) is distinct from 'object'
 or jsonb_typeof(new.data->'templates') is distinct from 'array' or jsonb_typeof(new.data->'numbers') is distinct from 'object'
 or jsonb_typeof(new.data#>'{numbers,ids}') is distinct from 'object'
 or coalesce(new.data#>>'{numbers,next}','') !~ '^[1-9][0-9]{0,8}$' then raise exception 'Invalid template collection'; end if;
 if jsonb_array_length(new.data->'templates') > 5000 then raise exception 'Too many templates'; end if;
 for item in select value from jsonb_array_elements(new.data->'templates') loop
  if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'id') is distinct from 'string'
  or length(item->>'id') not between 1 and 180 or (item->>'id') = any(ids)
  or (coalesce(item->>'deleted','false') <> 'true' and (jsonb_typeof(item->'name') is distinct from 'string' or jsonb_typeof(item->'lines') is distinct from 'array')) then raise exception 'Invalid template identity or lines'; end if;
  ids := array_append(ids,item->>'id');
  if not ((new.data#>'{numbers,ids}') ? (item->>'id')) then raise exception 'Template needs its permanent number'; end if;
 end loop;
 for k,n in select key,value from jsonb_each(new.data#>'{numbers,ids}') loop
  if jsonb_typeof(n) <> 'number' or n::text !~ '^[1-9][0-9]{0,8}$' then raise exception 'Invalid template number'; end if;
  if n::text::integer = any(used_numbers) or n::text::integer >= (new.data#>>'{numbers,next}')::integer then raise exception 'Duplicate or invalid template number'; end if;
  used_numbers := array_append(used_numbers,n::text::integer);
 end loop;
 if tg_op = 'UPDATE' then
  for k,n in select key,value from jsonb_each(old.data#>'{numbers,ids}') loop
   if new.data#>array['numbers','ids',k] is distinct from n then raise exception 'Permanent template numbers cannot be changed or removed'; end if;
  end loop;
  for item in select value from jsonb_array_elements(old.data->'templates') loop
   if not ((item->>'id') = any(ids)) then raise exception 'Retain removed templates as tombstones'; end if;
  end loop;
  if (new.data#>>'{numbers,next}')::integer < (old.data#>>'{numbers,next}')::integer then raise exception 'Template number sequence cannot move backwards'; end if;
 end if;
 new.updated_at := now(); return new;
end $$;
revoke all on function public.validate_template_collection275() from public, anon, authenticated;
create trigger validate_template_collection275 before insert or update on public.journal_template_collections275 for each row execute function public.validate_template_collection275();
comment on table public.journal_template_collections275 is 'Private journal templates, permanent numbers and deletion tombstones; optimistic revision checks, no financial postings.';
