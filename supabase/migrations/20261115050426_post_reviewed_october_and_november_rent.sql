-- The approved October funding, its two October releases, and the November
-- house rent release use one database transaction and the normal posting APIs.
create table private.october_chart_posting_2026 (
    session_id uuid primary key references public.book_sessions136(id),
    period_id uuid not null unique references private.october_monthly_lock_release_2026(period_id),
    posted_by uuid not null references public.profiles(id),
    transaction_id bigint not null,
    posted_at timestamptz not null default now(),
    journal_numbers text[] not null,
    reviewed_occurrences jsonb not null,
    november_movements jsonb not null
);
alter table private.october_chart_posting_2026 enable row level security;
revoke all on private.october_chart_posting_2026 from public,anon,authenticated,service_role;

-- Only these obsolete number annotations are removed from the displayed memo.
-- Full original headers, reference fields, line memos, links and audit remain.
create function private.reviewed_chart_memo_2026(journal_no text, original text)
returns text language sql immutable set search_path=pg_catalog as $$
    select case journal_no
      when 'AMO26-000001' then regexp_replace(original,' Former journal ID AUTO260001[.]$','')
      when 'AMO26-000003' then regexp_replace(original,' Former journal ID OJM260377[.]$','')
      else original end
$$;

-- Keep one staging implementation. The ordinary API retains its original scope;
-- the private variant accepts the fixed set supplied by the paired posting only.
do $migration$
declare
    definition text:=pg_get_functiondef('public.prepare_foreign_journal_month_2026(date)'::regprocedure);
    signature text:='public.prepare_foreign_journal_month_2026(p_month date)';
    rent_check text:=$old$if exists(select from jsonb_array_elements(j.proposed_lines) l where l->>'code'='1314') then continue; end if;$old$;
    memo text:='h.memo';
    new_memo text:='private.reviewed_chart_memo_2026(j.entry_no,h.memo)';
    verifier text:=pg_get_functiondef('private.fx_reclass_verify_result_2026(text)'::regprocedure);
    expected_header text:=$old$(j.original_header-'updated_at'-'accounting_period_id')$old$;
begin
    if position(signature in definition)=0 or position(rent_check in definition)=0
       or (length(definition)-length(replace(definition,memo,'')))/length(memo)<>2
       or position(expected_header in verifier)=0 then raise exception 'Unexpected reviewed journal workflow'; end if;
    definition:=replace(definition,signature,'private.prepare_reviewed_chart_month_2026(p_month date,p_numbers text[])');
    definition:=replace(definition,rent_check,$new$if p_numbers is null then
       if exists(select from jsonb_array_elements(j.proposed_lines) l where l->>'code'='1314') then continue; end if;
     elsif not (j.entry_no=any(p_numbers)) then continue; end if;$new$);
    execute replace(definition,memo,new_memo);
    execute replace(verifier,expected_header,$new$((j.original_header-'updated_at'-'accounting_period_id') ||
        jsonb_build_object('memo',private.reviewed_chart_memo_2026(j.entry_no,j.original_header->>'memo')))$new$);
end $migration$;

create or replace function public.prepare_foreign_journal_month_2026(p_month date)
returns jsonb language sql security definer set search_path=pg_catalog as $$
    select private.prepare_reviewed_chart_month_2026(p_month,null)
$$;

-- A line revision resets scheduled review in the normal workflow. The approved
-- comparison includes this exact scheduled occurrence. Re-review its actual
-- posted lines with the native administrator action before the close checks it.
create function private.review_october_scheduled_2026(sid uuid) returns void
language plpgsql set search_path=pg_catalog as $$
declare receipt private.october_chart_posting_2026; scheduled jsonb; j private.fx_reclass_journals_2026;
    h public.journal_entries;
begin
    select * into receipt from private.october_chart_posting_2026 where session_id=sid
      and transaction_id=txid_current() and posted_by=auth.uid();
    if not found then return; end if;
    for scheduled in select value from jsonb_array_elements(receipt.reviewed_occurrences) loop
        select * into strict j from private.fx_reclass_journals_2026
          where entry_id=(scheduled->>'journal_entry_id')::uuid and entry_no=any(receipt.journal_numbers);
        select * into strict h from public.journal_entries where id=j.entry_id and entry_no=j.entry_no and status='posted';
        if scheduled->>'reviewed_at' is null or scheduled->>'reviewed_by' is null
           or h.memo is distinct from private.reviewed_chart_memo_2026(j.entry_no,j.original_header->>'memo')
           or h.transaction_date is distinct from (j.original_header->>'transaction_date')::date
           or private.fx_reclass_values_2026(private.fx_reclass_live_lines_2026(h.id),h.transaction_date)
              is distinct from private.fx_reclass_values_2026(j.proposed_lines,h.transaction_date)
           or not exists(select from public.scheduled_journal_occurrences where id=(scheduled->>'id')::uuid
                and journal_entry_id=h.id) then
            raise exception 'The approved scheduled journal changed';
        end if;
        perform public.review_scheduled_occurrence91((scheduled->>'id')::uuid);
    end loop;
end $$;

do $migration$
declare definition text:=pg_get_functiondef('public.finish_book_session136(uuid,boolean)'::regprocedure);
    needle text:='IF EXISTS(SELECT 1 FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id';
begin
    if position(needle in definition)=0 then raise exception 'Unexpected book session version'; end if;
    execute replace(definition,needle,'PERFORM private.review_october_scheduled_2026(p_session); '||needle);
end $migration$;

-- Calculate the cumulative new prepaid balance using the book's actual posted
-- dates. Amount and LAK carrying value stay separate.
create function private.house_prepaid_balance_2026(cutoff date) returns numeric[]
language sql stable set search_path=pg_catalog as $$
    select array[coalesce(sum(l.debit-l.credit),0),coalesce(sum(l.base_debit-l.base_credit),0)]
    from public.accounts a join public.journal_lines l on l.account_id=a.id
    join public.journal_entries e on e.id=l.journal_entry_id
    where a.code='1314' and e.status='posted' and coalesce(l.line_date,e.transaction_date)<cutoff
$$;

create function public.post_approved_october_and_november_2026() returns jsonb
language plpgsql security definer set search_path=pg_catalog set statement_timeout='55s' set lock_timeout='5s' as $$
declare
    actor uuid:=private.october_chart_actor_2026();
    oct constant date:='2026-10-01'; nov constant date:='2026-11-01'; dec_start constant date:='2026-12-01';
    expected constant text[]:=array['AMO26-000001','AMO26-000003','AMO26-000004','OJM260330','OJM260332','OJM260343','OJM260366','OJM260375'];
    nov_rent constant text:='AMO26-000004';
    period public.accounting_periods; prior private.october_monthly_lock_release_2026; session public.book_sessions136;
    j private.fx_reclass_journals_2026; op jsonb; target_lines jsonb; before_nov jsonb; occurrences jsonb;
    before_unsigned jsonb; actual_unsigned jsonb; oct_funds numeric[]; nov_funds numeric[];
    sid uuid; result jsonb; applied int; selected text[];
begin
    perform private.october_chart_locks_2026();
    if not public.schedule_admin91() or exists(select from public.year_closings136 where year=2026) then
        raise exception 'The year must be open and scheduled journal review authorized';
    end if;
    select * into strict period from public.accounting_periods where period_month=oct and status='closed' and locked_at is null for update;
    select * into strict prior from private.october_monthly_lock_release_2026 where period_id=period.id and released_by=actor;
    select array_agg(entry_no order by entry_no) into selected from private.fx_reclass_journals_2026
       where period_month=oct or (period_month=nov and entry_no=nov_rent);
    if selected is distinct from expected then raise exception 'The list of eight approved journals changed'; end if;
    select count(*) into applied from private.fx_reclass_receipts_2026 where entry_no=any(expected) and applied_at is not null;
    if applied=cardinality(expected) and exists(select from private.october_chart_posting_2026 b
        where b.period_id=period.id and b.journal_numbers=expected) then
        return jsonb_build_object('journals',expected,'alreadyPosted',true);
    end if;
    if applied<>0 or not exists(select from public.accounting_periods where period_month=nov and status='open' and locked_at is null)
       or prior.previous_book is distinct from public.book_snapshot136(period.id)
       or private.reconciliation_check305(oct) is distinct from prior.reconciliations
       or private.fx_reclass_fingerprints_2026(oct,null) is distinct from prior.movements then
        raise exception 'October, November or their saved evidence changed since the monthly lock was released';
    end if;
    perform private.fx_reclass_validate_month_2026(oct);
    perform private.fx_reclass_validate_month_2026(nov);
    before_nov:=private.fx_reclass_fingerprints_2026(nov,null);
    oct_funds:=private.house_prepaid_balance_2026(nov);
    nov_funds:=private.house_prepaid_balance_2026(dec_start);
    if before_nov is null then raise exception 'November protected accounts could not be verified'; end if;
    select coalesce(jsonb_agg(to_jsonb(o) order by o.id),'[]'::jsonb) into occurrences
      from public.scheduled_journal_occurrences o join private.fx_reclass_journals_2026 prepared on prepared.entry_id=o.journal_entry_id
      where prepared.period_month=oct and prepared.entry_no=any(expected);
    if exists(select from jsonb_array_elements(occurrences) s where s->>'reviewed_by' is null or s->>'reviewed_at' is null) then
        raise exception 'A scheduled journal has an outstanding review';
    end if;
    result:=private.prepare_reviewed_chart_month_2026(oct,expected);
    sid:=(result->>'session')::uuid;
    select * into strict session from public.book_sessions136 where id=sid and period_id=period.id and owner_id=actor and status='editing';
    if session.original is distinct from prior.previous_book or jsonb_array_length(session.operations) is distinct from 7
       or (select count(*) from private.fx_reclass_receipts_2026 where session_id=sid and entry_no=any(expected)
             and actor_id=actor and applied_at is null)<>7 then raise exception 'The October correction workspace changed'; end if;
    for j in select * from private.fx_reclass_journals_2026 where period_month=oct loop
        select x into strict op from jsonb_array_elements(session.operations) x
          where x->>'kind'='revise' and x->'payload'->>'p_entry_id'=j.entry_id::text;
        select jsonb_agg((l-'id'-'line_no'-'code'-'base_debit'-'base_credit')||jsonb_build_object('account_id',a.id) order by n)
          into target_lines from jsonb_array_elements(j.proposed_lines) with ordinality t(l,n)
          join public.accounts a on a.code=l->>'code' and a.currency_code=l->>'currency_code' and a.is_active and a.is_posting;
        if jsonb_array_length(target_lines) is distinct from jsonb_array_length(j.proposed_lines)
           or op->'payload'->'p_lines' is distinct from target_lines
           or op->'payload'->>'p_transaction_date' is distinct from j.original_header->>'transaction_date'
           or op->'payload'->>'p_memo' is distinct from private.reviewed_chart_memo_2026(j.entry_no,j.original_header->>'memo')
           or op->>'request_key14228' is distinct from ('fx-reclass-2026-'||j.entry_id::text) then
            raise exception 'The staged lines changed for %',j.entry_no;
        end if;
    end loop;
    if private.fx_reclass_fingerprints_2026(oct,sid) is distinct from prior.movements then
        raise exception 'October cash or bank movements would change';
    end if;
    insert into private.october_chart_posting_2026(session_id,period_id,posted_by,transaction_id,journal_numbers,reviewed_occurrences,november_movements)
       values(sid,period.id,actor,txid_current(),expected,occurrences,before_nov);
    result:=private.finish_october_close_2026(sid,'The eight approved original-ID revisions preserve the dated cash and bank movements and statement totals. The scheduled October restaurant rent is included in this approval.');
    if result->>'status' is distinct from 'committed' then raise exception 'October posting did not commit'; end if;
    result:=private.prepare_reviewed_chart_month_2026(nov,array[nov_rent]);
    if (result->>'count')::int is distinct from 1 then raise exception 'November house rent was not applied'; end if;
    -- Verify every untouched October journal byte for byte, plus each revised
    -- original ID, amount, memo, currency and rate, including the November entry.
    select jsonb_agg(e order by e->'entry'->>'id') into before_unsigned from jsonb_array_elements(prior.previous_book) e
      where not (e->'entry'->>'entry_no'=any(expected));
    select jsonb_agg(e order by e->'entry'->>'id') into actual_unsigned from jsonb_array_elements(public.book_snapshot136(period.id)) e
      where not (e->'entry'->>'entry_no'=any(expected));
    if before_unsigned is distinct from actual_unsigned or
       (select count(*) from private.fx_reclass_journals_2026 a join public.journal_entries e on e.id=a.entry_id and e.entry_no=a.entry_no
          join private.fx_reclass_receipts_2026 r on r.entry_no=a.entry_no and r.applied_at is not null
          where a.entry_no=any(expected) and e.status='posted' and e.transaction_date=(a.original_header->>'transaction_date')::date
            and e.memo=private.reviewed_chart_memo_2026(a.entry_no,a.original_header->>'memo')
            and private.fx_reclass_values_2026(private.fx_reclass_live_lines_2026(e.id),e.transaction_date)=
                private.fx_reclass_values_2026(a.proposed_lines,e.transaction_date))<>8
       or private.fx_reclass_fingerprints_2026(oct,null) is distinct from prior.movements
       or private.fx_reclass_fingerprints_2026(nov,null) is distinct from before_nov
       or private.reconciliation_check305(oct) is distinct from prior.reconciliations
       or not exists(select from public.accounting_periods where id=period.id and status='closed' and locked_at is null)
       or private.house_prepaid_balance_2026(nov) is distinct from array[oct_funds[1]+2000,oct_funds[2]+44456000]
       or private.house_prepaid_balance_2026(dec_start) is distinct from array[nov_funds[1]+1500,nov_funds[2]+33342000] then
        raise exception 'October or November failed its final ledger read-back';
    end if;
    return jsonb_build_object('journals',expected,'posted',8,'october','closed');
end $$;

revoke all on function private.reviewed_chart_memo_2026(text,text),private.prepare_reviewed_chart_month_2026(date,text[]),
  private.review_october_scheduled_2026(uuid),private.house_prepaid_balance_2026(date),public.post_approved_october_and_november_2026()
  from public,anon,authenticated,service_role;
grant execute on function public.post_approved_october_and_november_2026() to authenticated;
