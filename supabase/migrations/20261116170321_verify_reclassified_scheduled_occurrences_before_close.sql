-- A scheduled occurrence loses its review when the correction session replaces its lines.
-- Re-review prior approved occurrences only after comparing the actual transfer with its private plan.
create table private.category_transfer_occurrence_review26 (
    session_id uuid not null,
    transaction_id bigint not null,
    actor uuid not null,
    occurrence_id uuid not null,
    previous_occurrence jsonb not null,
    primary key (session_id, occurrence_id)
);
revoke all on table private.category_transfer_occurrence_review26 from public, anon, authenticated, service_role;

create function private.review_category_transfer_occurrences26(sid uuid) returns void
language plpgsql security invoker set search_path=pg_catalog as $function$
declare item record; h public.journal_entries; current_occurrence public.scheduled_journal_occurrences;
begin
    for item in
        select r.previous_occurrence, r.occurrence_id, t.entry_no, t.original_header, t.planned
        from private.category_transfer_occurrence_review26 r
        join private.category_transfer_entries26 t on (t.original_header->>'id')::uuid=(r.previous_occurrence->>'journal_entry_id')::uuid
        join public.book_sessions136 s on s.id=r.session_id and s.status='editing' and s.owner_id=r.actor
        join public.accounting_periods p on p.id=s.period_id and p.period_month=t.period_month
        where r.session_id=sid and r.transaction_id=txid_current() and r.actor=auth.uid()
        order by r.occurrence_id
    loop
        select * into strict h from public.journal_entries where id=(item.original_header->>'id')::uuid and entry_no=item.entry_no and status='posted';
        select * into strict current_occurrence from public.scheduled_journal_occurrences where id=item.occurrence_id and journal_entry_id=h.id for update;
        if item.previous_occurrence->>'reviewed_at' is null or item.previous_occurrence->>'reviewed_by' is null
           or (to_jsonb(current_occurrence)-'reviewed_at'-'reviewed_by') is distinct from (item.previous_occurrence-'reviewed_at'-'reviewed_by')
           or (to_jsonb(h)-'updated_at'-'accounting_period_id') is distinct from (item.original_header-'updated_at'-'accounting_period_id')
           or private.fx_reclass_values_2026(private.fx_reclass_live_lines_2026(h.id),h.transaction_date)
              is distinct from private.fx_reclass_values_2026(item.planned,h.transaction_date) then
            raise exception 'Scheduled transfer changed before review for %.',item.entry_no;
        end if;
        perform public.review_scheduled_occurrence91(item.occurrence_id);
    end loop;
end $function$;
revoke all on function private.review_category_transfer_occurrences26(uuid) from public, anon, authenticated, service_role;

do $migration$
declare definition text; needle text; capture text;
begin
    definition:=pg_get_functiondef('private.post_category_transfers26(date)'::regprocedure);
    needle:=' response:=public.maintenance_finish14324';
    capture:=$capture$
 if m=date '2026-10-01' then
   insert into private.category_transfer_occurrence_review26(session_id,transaction_id,actor,occurrence_id,previous_occurrence)
     select sid,txid_current(),actor,o.id,to_jsonb(o)
     from public.scheduled_journal_occurrences o join private.category_transfer_entries26 e on (e.original_header->>'id')::uuid=o.journal_entry_id
     where e.period_month=m for update of o;
 end if;
$capture$;
    if position(needle in definition)=0 then raise exception 'Monthly transfer review location unavailable'; end if;
    execute replace(definition,needle,capture||needle);
    definition:=pg_get_functiondef('public.finish_book_session136(uuid,boolean)'::regprocedure);
    needle:='PERFORM private.review_october_scheduled_2026(p_session);';
    if position(needle in definition)=0 then raise exception 'Scheduled journal review location unavailable'; end if;
    execute replace(definition,needle,needle||' PERFORM private.review_category_transfer_occurrences26(p_session);');
end $migration$;
