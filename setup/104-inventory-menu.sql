-- Apply in the existing Supabase project's SQL Editor before using Inventory or Menu.
-- Stock movements are append-only. Items and menu records can be revised by administrators.
begin;
create table if not exists public.inventory_items104 (
 id uuid primary key default gen_random_uuid(), data jsonb not null default '{}'::jsonb,
 version integer not null default 1, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id)
);
create table if not exists public.inventory_movements104 (
 id uuid primary key default gen_random_uuid(), data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), created_by uuid references public.profiles(id)
);
create table if not exists public.menu_items104 (
 id uuid primary key default gen_random_uuid(), data jsonb not null default '{}'::jsonb,
 version integer not null default 1, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id)
);
create table if not exists public.menu_categories104 (
 id uuid primary key default gen_random_uuid(), data jsonb not null default '{}'::jsonb,
 version integer not null default 1, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id)
);
create unique index if not exists inventory_item_code104 on public.inventory_items104(lower(data->>'code')) where coalesce(data->>'code','')<>'';
create unique index if not exists menu_item_code104 on public.menu_items104(lower(data->>'code')) where coalesce(data->>'code','')<>'';
create unique index if not exists menu_category_code104 on public.menu_categories104(lower(data->>'code')) where coalesce(data->>'code','')<>'';
create or replace function public.stamp_inventory_menu104() returns trigger language plpgsql security invoker as $$
declare on_hand numeric;
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if tg_table_name='inventory_movements104' then
  if tg_op<>'INSERT' then raise exception 'Stock movements are immutable; create a correcting movement'; end if;
  if not exists(select 1 from public.inventory_items104 where id::text=new.data->>'itemId') then raise exception 'Inventory item does not exist'; end if;
  if (new.data->>'quantity')::numeric<=0 or new.data->>'kind' not in ('in','out','adjust-in','adjust-out') then raise exception 'Invalid stock movement'; end if;
  -- Serialize movements on this item so two simultaneous issues cannot overspend stock.
  perform 1 from public.inventory_items104 where id::text=new.data->>'itemId' for update;
  if new.data->>'kind' in ('out','adjust-out') then
   select coalesce(sum(case when data->>'kind' in ('in','adjust-in') then (data->>'quantity')::numeric else -(data->>'quantity')::numeric end),0) into on_hand
   from public.inventory_movements104 where data->>'itemId'=new.data->>'itemId';
   if on_hand<(new.data->>'quantity')::numeric then raise exception 'Insufficient stock';end if;
  end if;
  new.created_by=auth.uid(); return new;
 end if;
 if coalesce(trim(new.data->>'code'),'')='' or coalesce(trim(new.data->>'name'),'')='' then raise exception 'Code and name are required'; end if;
 new.updated_by=auth.uid();new.updated_at=now();
 if tg_op='UPDATE' then
  if new.version<>old.version+1 then raise exception 'Record changed; reload before editing'; end if;
 else new.version=1;end if;
 return new;
end $$;
drop trigger if exists inventory_items_guard104 on public.inventory_items104;
create trigger inventory_items_guard104 before insert or update on public.inventory_items104 for each row execute function public.stamp_inventory_menu104();
drop trigger if exists inventory_movements_guard104 on public.inventory_movements104;
create trigger inventory_movements_guard104 before insert or update or delete on public.inventory_movements104 for each row execute function public.stamp_inventory_menu104();
drop trigger if exists menu_items_guard104 on public.menu_items104;
create trigger menu_items_guard104 before insert or update on public.menu_items104 for each row execute function public.stamp_inventory_menu104();
alter table public.inventory_items104 enable row level security;
alter table public.inventory_movements104 enable row level security;
alter table public.menu_items104 enable row level security;
alter table public.menu_categories104 enable row level security;
do $$ declare t text;begin
 foreach t in array array['inventory_items104','inventory_movements104','menu_items104','menu_categories104'] loop
 execute format('drop policy if exists admin_records104 on public.%I',t);
 execute format('create policy admin_records104 on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
 execute format('grant select,insert,update on public.%I to authenticated',t);
 end loop;
end $$;
commit;
