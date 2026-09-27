-- Oon Jai: shared ID digits and prefix registry. Run once in Supabase SQL Editor.
-- Existing entry IDs and journal amounts are not changed.
begin;
alter table public.accounting_id_settings add column if not exists automated_prefix text not null default 'AUTO';
alter table public.accounting_id_settings add column if not exists schedule_prefix text not null default 'SCH';
alter table public.accounting_id_settings add column if not exists adjustment_prefix text not null default 'ADJ';
create table if not exists public.entry_prefix_reservations (
 stem text primary key,
 owner_key text not null,
 reserved_at timestamptz not null default now()
);
alter table public.entry_prefix_reservations enable row level security;
drop policy if exists prefix_admin_read on public.entry_prefix_reservations;
create policy prefix_admin_read on public.entry_prefix_reservations for select to authenticated using (exists(select 1 from public.profiles where id=auth.uid() and role='admin'));
revoke all on public.entry_prefix_reservations from anon,authenticated;
grant select on public.entry_prefix_reservations to authenticated;
create or replace function public.reserve_entry_prefix89(p_stem text,p_owner text)
returns void language plpgsql security definer set search_path=public as $$
declare taken text;
begin
 if p_stem is null or p_stem='' then return; end if;
 insert into public.entry_prefix_reservations(stem,owner_key) values(upper(p_stem),p_owner) on conflict(stem) do nothing;
 select owner_key into taken from public.entry_prefix_reservations where stem=upper(p_stem);
 if taken is distinct from p_owner then raise exception 'Prefix % is already reserved for %',p_stem,taken;end if;
end $$;
revoke all on function public.reserve_entry_prefix89(text,text) from public,anon,authenticated;
create or replace function public.validate_id_settings89()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 new.journal_prefix:=upper(trim(new.journal_prefix));new.sub_user_prefix:=upper(trim(new.sub_user_prefix));
 new.automated_prefix:=upper(trim(new.automated_prefix));new.schedule_prefix:=upper(trim(new.schedule_prefix));new.adjustment_prefix:=upper(trim(new.adjustment_prefix));
 if new.journal_digits not between 3 and 9 then raise exception 'Number digits must be 3 to 9';end if;
 if new.journal_prefix!~'^[A-Z0-9]{1,8}$' or new.sub_user_prefix!~'^[A-Z0-9]{1,8}$' or new.automated_prefix!~'^[A-Z0-9]{1,8}$' or new.schedule_prefix!~'^[A-Z0-9]{1,8}$' or new.adjustment_prefix!~'^[A-Z0-9]{1,8}$' then raise exception 'Prefixes require 1 to 8 letters or numbers';end if;
 new.sub_user_digits:=new.journal_digits;
 perform public.reserve_entry_prefix89(new.journal_prefix,'main');
 perform public.reserve_entry_prefix89(new.automated_prefix,'automated');
 perform public.reserve_entry_prefix89(new.schedule_prefix,'schedule');
 perform public.reserve_entry_prefix89(new.adjustment_prefix,'adjustment');
 return new;
end $$;
create or replace function public.sync_id_digits89()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 update public.user_permissions set entry_digits=new.journal_digits where entry_digits is distinct from new.journal_digits;
 return new;
end $$;
create or replace function public.validate_user_prefix89()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 new.entry_prefix:=upper(trim(new.entry_prefix));new.entry_initials:=upper(trim(new.entry_initials));
 select journal_digits into new.entry_digits from public.accounting_id_settings where id=true;
 new.entry_digits:=coalesce(new.entry_digits,4);
 if coalesce(new.entry_initials,'')<>'' then
  if new.entry_prefix!~'^[A-Z0-9]{1,8}$' or new.entry_initials!~'^[A-Z0-9]{1,8}$' then raise exception 'Prefix and initials require 1 to 8 letters or numbers';end if;
  perform public.reserve_entry_prefix89(new.entry_prefix||'-'||new.entry_initials,'user:'||new.user_id::text);
 end if;
 return new;
end $$;
drop trigger if exists validate_id_settings89 on public.accounting_id_settings;
create trigger validate_id_settings89 before insert or update on public.accounting_id_settings for each row execute function public.validate_id_settings89();
drop trigger if exists sync_id_digits89 on public.accounting_id_settings;
create trigger sync_id_digits89 after insert or update of journal_digits on public.accounting_id_settings for each row execute function public.sync_id_digits89();
drop trigger if exists validate_user_prefix89 on public.user_permissions;
create trigger validate_user_prefix89 before insert or update of entry_prefix,entry_initials,entry_digits on public.user_permissions for each row execute function public.validate_user_prefix89();
-- Seed reservations and propagate the universal digit setting. Conflicting
-- existing assignments abort this transaction; resolve them before retrying.
update public.accounting_id_settings set journal_digits=journal_digits;
update public.user_permissions set entry_initials=entry_initials where coalesce(entry_initials,'')<>'';
create or replace function public.next_adjustment_no89()
returns text language plpgsql security definer set search_path=public as $$
declare p text;d integer;n text;
begin
 select adjustment_prefix,journal_digits into p,d from public.accounting_id_settings where id=true;
 n:=nextval('public.fund_adjustment_request_seq')::text;
 return coalesce(p,'ADJ')||'-'||lpad(n,greatest(coalesce(d,4),length(n)),'0');
end $$;
revoke all on function public.next_adjustment_no89() from public,anon;
grant execute on function public.next_adjustment_no89() to authenticated;
alter table public.fund_adjustment_requests alter column request_no set default public.next_adjustment_no89();
commit;
select journal_prefix,automated_prefix,schedule_prefix,adjustment_prefix,journal_digits from public.accounting_id_settings;
