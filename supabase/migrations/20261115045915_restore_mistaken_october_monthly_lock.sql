-- Restore the documented pre-year-end monthly lock to the close it followed.
-- Installation never changes a period. The administrator who made that lock
-- must request the transition through the normal signed-in closing workflow.
create table private.october_monthly_lock_release_2026 (
    period_id uuid primary key references public.accounting_periods(id),
    released_by uuid not null references public.profiles(id),
    released_at timestamptz not null default now(),
    transaction_id bigint not null,
    previous_period jsonb not null,
    previous_book jsonb not null,
    reconciliations jsonb not null,
    movements jsonb not null
);
alter table private.october_monthly_lock_release_2026 enable row level security;
revoke all on private.october_monthly_lock_release_2026 from public,anon,authenticated,service_role;

create function private.october_chart_actor_2026() returns uuid
language plpgsql stable set search_path=pg_catalog as $$
declare actor uuid:=public.require_admin136();
begin
    if actor is null or not public.accounting_workspace_allowed123() or public.password_change_required14257()
       or not public.has_user_permission('post') or not public.can_action113('journal','post')
       or not public.can_action113('sec-chart-accounts','edit') then
        raise exception 'Sign in as the accounting administrator' using errcode='42501';
    end if;
    return actor;
end $$;

create function private.october_chart_locks_2026() returns void
language plpgsql set search_path=pg_catalog as $$
begin
    perform pg_advisory_xact_lock(hashtext('oonjai-fx-reclass-2026'));
    lock table private.journal_plans280,private.journal_plan_occurrences280,public.scheduled_journals,
      public.scheduled_journal_occurrences,public.recurring_transactions in share row exclusive mode;
    lock table public.accounting_periods,public.accounts,public.journal_entries,public.journal_lines,
      public.staff_journals,public.staff_journal_lines,public.payroll_runs,public.entry_submissions,
      public.period_findings,public.audit_reviews136,public.book_sessions136 in share row exclusive mode;
    lock table private.reconciliation_settings305,private.reconciliation_records305,private.reconciliation_periods305,
      private.monthly_closing_decisions319,public.year_closings136 in share row exclusive mode;
end $$;

create function private.is_october_monthly_lock_2026(p public.accounting_periods) returns boolean
language sql stable set search_path=pg_catalog as $$
    select p.period_month=date '2026-10-01' and p.status='locked' and p.updated_by=auth.uid()
      and p.closed_at is not null and p.locked_at>=p.closed_at
      and p.locked_at<timestamptz '2026-11-09 10:13:01+00'
      and not exists(select from public.year_closings136 where year=2026)
$$;

-- The entire prior period must match the immutable release receipt. Only its
-- status metadata can change, in the authenticated request recording that receipt.
create function private.october_month_lock_transition_2026(before_row jsonb,after_row jsonb) returns boolean
language sql stable set search_path=pg_catalog as $$
    select before_row->>'status'='locked' and after_row->>'status'='closed'
      and before_row->>'period_month'='2026-10-01' and after_row->>'updated_by'=auth.uid()::text
      and (before_row-array['status','closed_at','updated_at','updated_by'])=
          (after_row-array['status','closed_at','updated_at','updated_by'])
      and not exists(select from public.year_closings136 where year=2026)
      and exists(select from private.october_monthly_lock_release_2026 receipt
          where receipt.period_id=(before_row->>'id')::uuid and receipt.previous_period=before_row
            and receipt.released_by=auth.uid() and receipt.transaction_id=txid_current())
$$;

do $migration$
declare
    definition text:=pg_get_functiondef('public.ledger_boundary136()'::regprocedure);
    old_clause text:=$old$IF TG_OP='UPDATE' AND OLD.status='locked' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Locked periods are final; add an audit review and post any adjustment in an open period';END IF;$old$;
    new_clause text:=$new$IF TG_OP='UPDATE' AND OLD.status='locked' AND NEW IS DISTINCT FROM OLD THEN
    IF private.october_month_lock_transition_2026(to_jsonb(OLD),to_jsonb(NEW)) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Locked periods are final; add an audit review and post any adjustment in an open period';
    END IF;
    NEW.closed_at:=OLD.closed_at;
    NEW.locked_at:=NULL;
  END IF;$new$;
begin
    if position(old_clause in definition)=0 then raise exception 'Unexpected period lifecycle version'; end if;
    execute replace(definition,old_clause,new_clause);
end $migration$;

-- Require all eight genuine reconciliations for both the restored monthly close
-- and the later approved journal session. Preserve any previously saved reasons.
create function private.finish_october_close_2026(sid uuid,reason text) returns jsonb
language plpgsql set search_path=pg_catalog as $$
declare m constant date:='2026-10-01'; checks jsonb; report jsonb; warnings jsonb;
begin
    checks:=public.maintenance_preflight14324(m);
    report:=checks->'reconciliation305';
    if report->>'complete' is distinct from 'true'
       or jsonb_array_length(report->'items') is distinct from 8
       or exists(select from jsonb_array_elements(report->'items') a
            where a->>'complete' is distinct from 'true' or nullif(a->>'reportId','') is null) then
        raise exception 'All eight saved October reconciliations must still match';
    end if;
    if exists(select from jsonb_array_elements(checks->'issues') i where i->>'severity'='block') then
        raise exception 'October closing check: %',(select string_agg(i->>'detail',', ')
          from jsonb_array_elements(checks->'issues') i where i->>'severity'='block');
    end if;
    select coalesce(jsonb_object_agg(i->>'id',jsonb_build_object('acknowledged',true,'reason',
        coalesce(checks->'decisions319'->(i->>'id')->'saved'->>'reason',reason))),'{}'::jsonb)
        into warnings from jsonb_array_elements(checks->'issues') i where i->>'severity'='warning';
    return public.maintenance_finish14324(m,case when sid is null then 'period' else 'session' end,
        checks->>'fingerprint',jsonb_build_object('coverageConfirmed',true,'acknowledgments',warnings,
        'reason',reason),'closed',sid);
end $$;

create function public.restore_october_monthly_close_2026() returns jsonb
language plpgsql security definer set search_path=pg_catalog set statement_timeout='55s' set lock_timeout='5s' as $$
declare
    actor uuid:=private.october_chart_actor_2026(); m constant date:='2026-10-01';
    p public.accounting_periods; prior_book jsonb; movements jsonb; reports jsonb; result jsonb;
    reason constant text:='The administrator selected the legacy monthly Lock while testing. The intended status was Closed. The original close and all eight reconciliations are retained.';
begin
    perform private.october_chart_locks_2026();
    select * into strict p from public.accounting_periods where period_month=m for update;
    if p.status='closed' and p.locked_at is null and exists(select from private.october_monthly_lock_release_2026
        where period_id=p.id and released_by=actor) then
        return jsonb_build_object('month',m,'status','closed','alreadyRestored',true);
    end if;
    if private.is_october_monthly_lock_2026(p) is distinct from true
       or not exists(select from private.reconciliation_periods305 where month=m)
       or exists(select from public.book_sessions136 where period_id=p.id and status='editing') then
        raise exception 'This is not the original October monthly lock';
    end if;
    prior_book:=public.book_snapshot136(p.id);
    movements:=private.fx_reclass_fingerprints_2026(m,null);
    reports:=private.reconciliation_check305(m);
    insert into private.october_monthly_lock_release_2026
        (period_id,released_by,transaction_id,previous_period,previous_book,reconciliations,movements)
        values(p.id,actor,txid_current(),to_jsonb(p),prior_book,reports,movements);
    result:=private.finish_october_close_2026(null,reason);
    if result->>'status' is distinct from 'closed'
       or not exists(select from public.accounting_periods where id=p.id and status='closed'
            and locked_at is null and closed_at=p.closed_at)
       or prior_book is distinct from public.book_snapshot136(p.id)
       or reports is distinct from private.reconciliation_check305(m)
       or movements is distinct from private.fx_reclass_fingerprints_2026(m,null) then
        raise exception 'Restoring the monthly close failed the ledger read-back';
    end if;
    insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
      values('accounting_periods',p.id::text,'MONTHLY_LOCK_RELEASE',to_jsonb(p),
        (select to_jsonb(v) from public.accounting_periods v where v.id=p.id),reason,actor);
    return result;
end $$;

-- The button appears only to the original lock administrator for an eligible
-- historical month, and disappears permanently if the year was later closed.
do $migration$
declare definition text:=pg_get_functiondef('public.foreign_account_review_2026()'::regprocedure);
    needle text:='return jsonb_build_object(''chart'',';
begin
    if position(needle in lower(definition))=0 then raise exception 'Unexpected chart review version'; end if;
    execute replace(definition,needle,$replacement$return jsonb_build_object('canRestoreOctober',
      coalesce((select private.is_october_monthly_lock_2026(p) from public.accounting_periods p where p.period_month=date '2026-10-01'),false),
      'octoberRestored',exists(select from private.october_monthly_lock_release_2026 r join public.accounting_periods p on p.id=r.period_id
         where r.released_by=actor and p.status='closed' and p.locked_at is null and not exists(select from public.year_closings136 where year=2026)),
      'chart',$replacement$);
end $migration$;

revoke all on function private.october_chart_actor_2026(),private.october_chart_locks_2026(),
  private.is_october_monthly_lock_2026(public.accounting_periods),private.october_month_lock_transition_2026(jsonb,jsonb),
  private.finish_october_close_2026(uuid,text),public.restore_october_monthly_close_2026() from public,anon,authenticated,service_role;
grant execute on function public.restore_october_monthly_close_2026() to authenticated;
