-- The first close of these books predates full-month reconciliation reports.
-- Preserve that decision only for the signed administrator's exact chart change.
-- A posting receipt is evidence of equal movements, never a bank or cash count.
create table private.fx_reclass_prior_close_2026 (
    session_id uuid primary key references public.book_sessions136(id),
    period_month date not null unique,
    actor_id uuid not null,
    prior_closed_at timestamptz not null,
    transaction_id bigint not null,
    approved_at timestamptz not null default now(),
    journal_numbers text[] not null,
    fingerprints jsonb not null
);
alter table private.fx_reclass_prior_close_2026 enable row level security;
revoke all on private.fx_reclass_prior_close_2026 from public,anon,authenticated,service_role;

-- Include opening, turnover, dated movements and closing. Protect *both* date
-- bases for every required bank even when only one report was previously saved.
create function private.fx_reclass_fingerprints_2026(m date, sid uuid)
returns jsonb language sql stable set search_path=pg_catalog as $$
    select jsonb_object_agg((a->>'id')||'/'||b.basis,
      private.reconciliation_snapshot305((a->>'id')::uuid,m,
        (m+interval '1 month - 1 day')::date,b.basis,sid)->>'fingerprint')
    from jsonb_array_elements(private.reconciliation_requirements305(m)) a
    cross join lateral unnest(case when a->>'method'='bank' then array['posting','receipt']
                                   else array['posting'] end) b(basis)
$$;

-- Only a receipt created in this transaction by the posting operation can use the
-- prior close. A later close, including the year-end, sees the ordinary findings.
create function private.fx_reclass_prior_close_check_2026(m date, original_check jsonb)
returns jsonb language plpgsql stable set search_path=pg_catalog as $$
declare
    proof private.fx_reclass_prior_close_2026;
    carried text[];
    issue_list jsonb;
    item_list jsonb;
begin
    select * into proof from private.fx_reclass_prior_close_2026
    where period_month=m and actor_id=auth.uid() and transaction_id=txid_current();
    if not found then return original_check; end if;
    if private.fx_reclass_fingerprints_2026(m,private.reconciliation_session305(m))
       is distinct from proof.fingerprints then
        raise exception 'Protected account movements changed for %',m;
    end if;
    select array_agg('reconciliation:'||(i->>'id')) into carried
    from jsonb_array_elements(original_check->'items') i
    where i->>'state'='Not reconciled'
      and proof.fingerprints ? ((i->>'id')||'/posting');
    if carried is null then return original_check; end if;
    select coalesce(jsonb_agg(i order by n),'[]'::jsonb) into issue_list
    from jsonb_array_elements(original_check->'issues') with ordinality v(i,n)
    where not ((i->>'id')=any(carried));
    select jsonb_agg(case when ('reconciliation:'||(i->>'id'))=any(carried) then
        i||jsonb_build_object('state','Prior close retained for unchanged movements',
          'priorClosedAt',proof.prior_closed_at,'closureEvidence','unchanged_movements')
        else i end order by n) into item_list
    from jsonb_array_elements(original_check->'items') with ordinality v(i,n);
    -- Leave the physical-report completion boolean and report IDs intact.
    return original_check||jsonb_build_object('issues',issue_list,'items',item_list,
       'chartChangeSession',proof.session_id,'priorClosedAt',proof.prior_closed_at);
end $$;

-- Preserve independently installed modules or stop on an unknown closing workflow.
do $migration$
declare body text:=pg_get_functiondef('public.maintenance_preflight14324(date)'::regprocedure);
    old_part text:='reconciliation=private.reconciliation_check305(p_month);';
begin
    if position(old_part in body)=0 then raise exception 'Unrecognized closing preflight'; end if;
    execute replace(body,old_part,
      'reconciliation=private.fx_reclass_prior_close_check_2026(p_month,private.reconciliation_check305(p_month));');
end $migration$;

create function private.fx_reclass_validate_month_2026(m date)
returns void language plpgsql stable set search_path=pg_catalog as $$
begin
    -- All of the numbers are from the frozen comparison. Keep each original
    -- journal's statement amounts and each bank/cash line, including book value.
    if exists (
      with amounts as (
        select j.entry_no,a.code,a.account_type,a.is_technical,x.sign,
          coalesce((v->>'line_date')::date,(j.original_header->>'transaction_date')::date) as effective_date,
          (v->>'debit')::numeric as dr,(v->>'credit')::numeric as cr,
          (v->>'base_debit')::numeric as base_dr,(v->>'base_credit')::numeric as base_cr
        from private.fx_reclass_journals_2026 j
        cross join lateral (values (j.original_lines,-1),(j.proposed_lines,1)) x(lines,sign)
        cross join lateral jsonb_array_elements(x.lines) v join public.accounts a on a.code=v->>'code'
        where j.period_month=m)
      select 1 from amounts where not is_technical group by entry_no,account_type
      having sum(sign*(base_dr-base_cr))<>0
      union all
      select 1 from amounts where code~'^10[0-9]{2}$' or code='9051'
      group by entry_no,code,effective_date,dr,cr,base_dr,base_cr having sum(sign)<>0
    ) then raise exception 'The proposed lines change a protected movement or a financial statement total for %',m; end if;
end $$;

create function public.post_reviewed_foreign_month_2026(p_month date)
returns jsonb language plpgsql security definer set search_path=pg_catalog set statement_timeout='55s' set lock_timeout='5s' as $$
declare
    actor uuid:=public.require_admin136(); period public.accounting_periods;
    session public.book_sessions136; j private.fx_reclass_journals_2026;
    receipt private.fx_reclass_receipts_2026; h public.journal_entries;
    op jsonb; payload jsonb; current_fx jsonb; expected text[];
    before_fingerprints jsonb; checks jsonb; warnings jsonb; outcome jsonb;
    applied_count int;
begin
    if actor is null or not public.accounting_workspace_allowed123() or public.password_change_required14257()
       or not public.has_user_permission('post') or not public.can_action113('sec-chart-accounts','edit')
       or not public.can_action113('journal','post') then
        raise exception 'An active posting and chart administrator is required' using errcode='42501';
    end if;
    if p_month is null or p_month<date '2026-01-01' or p_month>date '2026-09-01'
       or p_month<>date_trunc('month',p_month)::date then raise exception 'This period is outside the reviewed prior closes'; end if;
    perform pg_advisory_xact_lock(hashtext('oonjai-fx-reclass-2026'));
    -- Match the normal monthly closing lock order and take the same snapshot for
    -- verification and posting. Avoid waiting indefinitely on another live user.
    lock table private.journal_plans280,private.journal_plan_occurrences280,public.scheduled_journals,
        public.scheduled_journal_occurrences,public.recurring_transactions in share row exclusive mode;
    lock table public.accounting_periods,public.accounts,public.journal_entries,public.journal_lines,
        public.staff_journals,public.staff_journal_lines,public.payroll_runs,public.entry_submissions,
        public.period_findings,public.audit_reviews136,public.book_sessions136 in share row exclusive mode;
    lock table private.reconciliation_settings305,private.reconciliation_records305,private.reconciliation_periods305,
        private.monthly_closing_decisions319 in share row exclusive mode;
    select * into strict period from public.accounting_periods where period_month=p_month for update;
    select array_agg(entry_no order by entry_no) into expected from private.fx_reclass_journals_2026 where period_month=p_month;
    if cardinality(expected) is null or 'OJM260311'=any(expected) then raise exception 'Unexpected approved journal list'; end if;
    select count(*) into applied_count from private.fx_reclass_receipts_2026 where entry_no=any(expected) and applied_at is not null;
    if applied_count=cardinality(expected) then
        return jsonb_build_object('period',p_month,'alreadyPosted',true,'journals',expected);
    end if;
    if applied_count<>0 or period.status<>'closed' or period.locked_at is not null or period.closed_at is null
      or period.closed_at>=timestamptz '2026-11-06 00:00:00+00'
      or exists(select from public.year_closings136 where year=extract(year from p_month))
      or exists(select from private.reconciliation_periods305 where month=p_month) then
        raise exception 'This is not an eligible pre-policy closed book';
    end if;
    select * into strict session from public.book_sessions136 where period_id=period.id and status='editing' and owner_id=actor for update;
    if public.book_snapshot136(period.id) is distinct from session.original
       or jsonb_array_length(session.operations)<>cardinality(expected) then raise exception 'The correction workspace has changed'; end if;
    for j in select * from private.fx_reclass_journals_2026 where period_month=p_month order by entry_no loop
        select * into strict receipt from private.fx_reclass_receipts_2026 where entry_no=j.entry_no and session_id=session.id and actor_id=actor and applied_at is null for update;
        select * into strict h from public.journal_entries where id=j.entry_id and entry_no=j.entry_no and status='posted' for update;
        if to_jsonb(h) is distinct from j.original_header or private.fx_reclass_live_lines_2026(h.id) is distinct from j.original_lines then
            raise exception 'Original journal % changed',j.entry_no; end if;
        select to_jsonb(f) into current_fx from public.journal_fx_evidence288 f where f.entry_id=h.id for share;
        if current_fx is distinct from j.original_evidence or exists(select from public.journal_lines l where l.journal_entry_id=h.id
           and (l.sub_account_id is not null or exists(select from public.journal_sources14253 src where src.journal_line_id=l.id))) then
            raise exception 'The evidence or source links changed for %',j.entry_no;
        end if;
        select jsonb_agg((v-'id'-'line_no'-'code'-'base_debit'-'base_credit')||jsonb_build_object('account_id',a.id) order by n)
        into payload from jsonb_array_elements(j.proposed_lines) with ordinality t(v,n)
        join public.accounts a on a.code=v->>'code' and a.currency_code=v->>'currency_code' and a.is_active and a.is_posting;
        select x into strict op from jsonb_array_elements(session.operations) x
          where x->>'kind'='revise' and x->'payload'->>'p_entry_id'=h.id::text;
        if jsonb_array_length(payload) is distinct from jsonb_array_length(j.proposed_lines)
           or op->'payload'->'p_lines' is distinct from payload
           or op->'payload'->>'p_memo' is distinct from h.memo
           or (op->'payload'->>'p_transaction_date')::date is distinct from h.transaction_date
           or op->'payload'->>'p_reason' is distinct from 'Reclassify foreign-currency postings at their recorded LAK values'
           or op->>'request_key14228' is distinct from ('fx-reclass-2026-'||h.id::text) then
            raise exception 'Staged changes differ from the approved journal %',j.entry_no;
        end if;
    end loop;
    perform private.fx_reclass_validate_month_2026(p_month);
    before_fingerprints:=private.fx_reclass_fingerprints_2026(p_month,null);
    if before_fingerprints is null or before_fingerprints is distinct from private.fx_reclass_fingerprints_2026(p_month,session.id) then
        raise exception 'A protected cash, bank or reconciliation movement changes for %',p_month;
    end if;
    insert into private.fx_reclass_prior_close_2026(session_id,period_month,actor_id,prior_closed_at,transaction_id,journal_numbers,fingerprints)
        values(session.id,p_month,actor,period.closed_at,txid_current(),expected,before_fingerprints);
    checks:=public.maintenance_preflight14324(p_month);
    if exists(select from jsonb_array_elements(checks->'issues') x where x->>'severity'='block') then
        raise exception 'A closing integrity check needs review: %',
           (select string_agg(x->>'detail',', ') from jsonb_array_elements(checks->'issues') x where x->>'severity'='block');
    end if;
    select coalesce(jsonb_object_agg(x->>'id',jsonb_build_object('acknowledged',true,'reason',
        coalesce(checks->'decisions319'->(x->>'id')->'saved'->>'reason',
        'Prior monthly close retained for this account change. Dated cash and bank movements and original journal statement totals match.'))),'{}')
        into warnings from jsonb_array_elements(checks->'issues') x where x->>'severity'='warning';
    outcome:=public.maintenance_finish14324(p_month,'session',checks->>'fingerprint',
        jsonb_build_object('coverageConfirmed',true,'acknowledgments',warnings,'priorCloseEvidence',session.id),
        'closed',session.id);
    if outcome->>'status' is distinct from 'committed' or
       not exists(select from public.accounting_periods where id=period.id and status='closed') or
       before_fingerprints is distinct from private.fx_reclass_fingerprints_2026(p_month,null) or
       (select count(*) from private.fx_reclass_receipts_2026 where session_id=session.id and applied_at is not null)<>cardinality(expected) then
        raise exception 'The committed book failed its read-back check';
    end if;
    return jsonb_build_object('period',p_month,'posted',cardinality(expected),'journals',expected);
end $$;
revoke all on function private.fx_reclass_fingerprints_2026(date,uuid),private.fx_reclass_prior_close_check_2026(date,jsonb),
    private.fx_reclass_validate_month_2026(date),public.post_reviewed_foreign_month_2026(date) from public,anon,authenticated,service_role;
grant execute on function public.post_reviewed_foreign_month_2026(date) to authenticated;
