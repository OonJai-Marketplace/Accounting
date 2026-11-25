-- Only a revision number is published. The protected HR inbox supplies the form details.
create table public.hub_leave_inbox_signal (
 id boolean primary key check (id), revision bigint not null default 0
);
insert into public.hub_leave_inbox_signal(id) values(true);
alter table public.hub_leave_inbox_signal enable row level security;
revoke all on public.hub_leave_inbox_signal from anon,authenticated;
grant select on public.hub_leave_inbox_signal to authenticated;
create policy admin_inbox_signal on public.hub_leave_inbox_signal for select to authenticated using
 (public.is_admin() and public.active_account14228() and public.accounting_workspace_allowed123() and not public.password_change_required14257());
create function private.signal_hub_leave_inbox() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.hub_leave_inbox_signal set revision=revision+1 where id=true;
 return null;
end $$;
revoke all on function private.signal_hub_leave_inbox() from public,anon,authenticated;
create trigger hub_leave_inbox_changed after insert or update or delete on public.hub_leave_intake
 for each row execute function private.signal_hub_leave_inbox();
alter publication supabase_realtime add table public.hub_leave_inbox_signal;
