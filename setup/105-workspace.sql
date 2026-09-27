-- Run setup/104-inventory-menu.sql first if version 104's tables are missing.
-- This adds separate ingredient costing and saved documents; it does not delete existing records.
begin;
create table if not exists public.menu_ingredients105 (
 id uuid primary key default gen_random_uuid(), data jsonb not null default '{}'::jsonb,
 version integer not null default 1, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id)
);
-- Preserve existing recipe references by copying only referenced inventory items into ingredients.
insert into public.menu_ingredients105(id,data)
 select i.id,i.data from public.inventory_items104 i
 where not exists(select 1 from public.menu_ingredients105 existing where existing.id=i.id) and exists(select 1 from public.menu_items104 m, jsonb_array_elements(coalesce(m.data->'recipe','[]'::jsonb)) r where r->>'itemId'=i.id::text)
 on conflict(id) do nothing;
create unique index if not exists menu_ingredient_code105 on public.menu_ingredients105(lower(data->>'code')) where coalesce(data->>'code','')<>'';
create table if not exists public.company_documents105 (
 id uuid primary key default gen_random_uuid(),data jsonb not null default '{}'::jsonb,
 version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references public.profiles(id)
);
create or replace function public.stamp_workspace105() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if current_user not in ('postgres','supabase_admin') and not public.is_admin() then raise exception 'Administrator access required';end if;
 if tg_op='UPDATE' and new.version<>old.version+1 then raise exception 'Record changed; reload before editing';end if;
 if tg_op='INSERT' then new.version=1;end if;
 new.updated_at=now();new.updated_by=auth.uid();return new;
end $$;
do $$ declare t text;begin
 foreach t in array array['menu_ingredients105','company_documents105'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('drop policy if exists admin_workspace105 on public.%I',t);
 execute format('create policy admin_workspace105 on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
 execute format('grant select,insert,update on public.%I to authenticated',t);
 execute format('drop trigger if exists stamp_workspace105 on public.%I',t);
 execute format('create trigger stamp_workspace105 before insert or update on public.%I for each row execute function public.stamp_workspace105()',t);
 end loop;
end $$;
commit;
