-- A fixed, owner-staged reconstruction. A client can select a month but cannot
-- supply accounts, rates, amounts, the acting user, or its own revision data.
create table private.fx_reclass_receipts_2026 (
    entry_no text primary key references private.fx_reclass_journals_2026(entry_no),
    session_id uuid references public.book_sessions136(id),
    actor_id uuid not null,
    requested_at timestamptz not null default now(),
    applied_at timestamptz
);
revoke all on private.fx_reclass_receipts_2026 from public, anon, authenticated, service_role;
alter table private.fx_reclass_receipts_2026 enable row level security;

-- The canonical comparison permits new database-generated line identities and
-- consecutive line numbers on a normal revise, while retaining field-level checks.
create function private.fx_reclass_values_2026(p_lines jsonb, p_date date)
returns jsonb language sql immutable set search_path=pg_catalog as $$
 select jsonb_agg(jsonb_build_array(v->>'code',v->>'currency_code',
   (v->>'debit')::numeric,(v->>'credit')::numeric,
   (v->>'base_debit')::numeric,(v->>'base_credit')::numeric,
   (v->>'fx_rate_lak')::numeric,(v->>'book_rate_lak')::numeric,
   coalesce((v->>'line_date')::date,p_date),v->>'description',v->>'sub_account_id') order by n)
 from jsonb_array_elements(p_lines) with ordinality t(v,n)
$$;

create function private.fx_reclass_live_lines_2026(p_id uuid)
returns jsonb language sql stable set search_path=pg_catalog as $$
 select jsonb_agg(to_jsonb(l)||jsonb_build_object('code',a.code) order by l.line_no)
 from public.journal_lines l join public.accounts a on a.id=l.account_id where l.journal_entry_id=p_id
$$;

create function public.prepare_foreign_chart_2026()
returns integer language plpgsql security definer set search_path=pg_catalog as $$
declare actor uuid:=public.require_admin136(); row_spec private.fx_reclass_chart_2026; parent public.accounts; added integer:=0;
    g public.account_groups143180; group_additions uuid[];
begin
 if not public.accounting_workspace_allowed123() or public.password_change_required14257() then
   raise exception 'An active accounting administrator session is required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext('oonjai-fx-reclass-2026'));
 perform pg_advisory_xact_lock(143180);
 if (select count(*) from private.fx_reclass_chart_2026 where not defer_support)<>21 then
    raise exception 'The reviewed chart is incomplete'; end if;
 for row_spec in select * from private.fx_reclass_chart_2026 where not defer_support order by code loop
   select * into strict parent from public.accounts where code=row_spec.parent_code and is_active and not is_posting
     and not is_technical and account_purpose='regular' and account_type=row_spec.account_type for share;
   perform 1 from public.accounts where code=row_spec.local_code and parent_code=parent.code and is_active and is_posting
     and not is_technical and account_purpose='regular' and currency_code='LAK' for share;
   if not found then raise exception 'Original LAK account % changed',row_spec.local_code; end if;
   if exists(select from public.accounts where code=row_spec.code) then
     if not exists(select from public.accounts a join public.sub_accounts s on s.posting_account_id14285=a.id
       where a.code=row_spec.code and a.name=row_spec.account_name and a.currency_code=row_spec.currency_code
        and a.parent_code=parent.code and s.parent_account_id=parent.id and a.is_active and s.is_active
        and a.account_type=parent.account_type and a.is_posting and not a.is_technical and a.account_purpose='regular') then
       raise exception 'Existing account % differs from the reviewed chart',row_spec.code; end if;
   else
     insert into public.sub_accounts(parent_account_id,code,name,currency_code,description,is_active,track_foreign_funds)
      values(parent.id,row_spec.code,row_spec.account_name,row_spec.currency_code,'',true,parent.account_type='ASSET');
     added:=added+1;
   end if;
 end loop;
 for g in select * from public.account_groups143180 order by id for update loop
   select array_agg(a.id) into group_additions
   from private.fx_reclass_chart_2026 c
     join public.accounts original on original.code=c.local_code
     join public.accounts a on a.code=c.code
   where not c.defer_support and original.id=any(g.account_ids) and not a.id=any(g.account_ids)
     and not exists(select from public.account_groups143180 existing where a.id=any(existing.account_ids));
   if group_additions is not null then
     perform public.save_account_group143180(g.id,g.name,g.kind,g.parent_id,g.account_ids||group_additions,g.revision);
   end if;
 end loop;
 return added;
end $$;

create function private.fx_reclass_verify_result_2026(p_no text)
returns void language plpgsql set search_path=pg_catalog as $$
declare j private.fx_reclass_journals_2026; h public.journal_entries; actual jsonb; kinds jsonb;
begin
 select * into strict j from private.fx_reclass_journals_2026 where entry_no=p_no;
 select * into strict h from public.journal_entries where id=j.entry_id and entry_no=j.entry_no and status='posted' for share;
 if (to_jsonb(h)-'updated_at'-'accounting_period_id') is distinct from
    (j.original_header-'updated_at'-'accounting_period_id') then raise exception 'Header changed for %',p_no; end if;
 actual:=private.fx_reclass_live_lines_2026(j.entry_id);
 if private.fx_reclass_values_2026(actual,h.transaction_date) is distinct from
    private.fx_reclass_values_2026(j.proposed_lines,h.transaction_date) then raise exception 'Committed amounts, dates or rates differ for %',p_no; end if;
 -- Bind valid pre-existing evidence to surviving rows after the revision RPC
 -- renumbers them. An obsolete review must never be made current again.
 if j.original_evidence is not null and (j.original_evidence->>'entry_updated_at')::timestamptz=(j.original_header->>'updated_at')::timestamptz then
   select coalesce(jsonb_object_agg(n::text,j.original_evidence->'line_kinds'->(v->>'line_no')),'{}') into kinds
    from jsonb_array_elements(j.proposed_lines) with ordinality t(v,n)
    where v->>'id' is not null and j.original_evidence->'line_kinds' ? (v->>'line_no')
      and v->>'currency_code'<>'LAK';
   update public.journal_fx_evidence288 f set entry_updated_at=h.updated_at,line_kinds=kinds,
       proposed_revision=null,revision=gen_random_uuid()
     where f.entry_id=j.entry_id and to_jsonb(f)=j.original_evidence;
   if not found then raise exception 'FX review changed for %',p_no; end if;
 end if;
 update private.fx_reclass_receipts_2026 set applied_at=now() where entry_no=p_no and applied_at is null;
end $$;

create function public.prepare_foreign_journal_month_2026(p_month date)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare actor uuid:=public.require_admin136(); p public.accounting_periods; j private.fx_reclass_journals_2026;
 h public.journal_entries; sid uuid; active_session uuid; payload jsonb; fx jsonb; prior private.fx_reclass_receipts_2026;
 reason text:='Reclassify foreign-currency postings at their recorded LAK values'; n integer:=0;
begin
 perform pg_advisory_xact_lock(hashtext('oonjai-fx-reclass-2026'));
 select * into strict p from public.accounting_periods where period_month=p_month for update;
 if p.status not in ('closed','open') or exists(select from public.year_closings136 where year=extract(year from p_month)) then
   raise exception 'This accounting period is locked'; end if;
 perform public.prepare_foreign_chart_2026();
 if p.status='closed' then
   select id into active_session from public.book_sessions136 where period_id=p.id and status='editing';
   if active_session is not null and not exists(select from private.fx_reclass_receipts_2026
     where session_id=active_session and actor_id=actor and applied_at is null) then
     raise exception 'Another correction is already being prepared for this month'; end if;
 end if;
 for j in select * from private.fx_reclass_journals_2026 where period_month=p_month order by entry_no loop
   -- Release and acquisition of USD prepaid rent must move together. The
   -- October acquisition is protected by the period lock.
   if exists(select from jsonb_array_elements(j.proposed_lines) l where l->>'code'='1314') then continue; end if;
   select * into prior from private.fx_reclass_receipts_2026 where entry_no=j.entry_no;
   if found then
     if prior.applied_at is null and prior.session_id is distinct from active_session then
       raise exception 'The pending correction changed for %',j.entry_no; end if;
     continue;
   end if;
   select * into strict h from public.journal_entries where id=j.entry_id for update;
   if to_jsonb(h)<>j.original_header or private.fx_reclass_live_lines_2026(h.id) is distinct from j.original_lines then
     raise exception 'The posted journal % changed since it was checked',j.entry_no; end if;
   select to_jsonb(f) into fx from public.journal_fx_evidence288 f where entry_id=h.id for share;
   if fx is distinct from j.original_evidence then raise exception 'FX evidence changed for %',j.entry_no; end if;
   if jsonb_typeof(fx->'proposed_revision')='object' and fx->'proposed_revision'->>'applied_entry_updated_at' is null then
     raise exception 'An FX correction is pending for %',j.entry_no; end if;
   if exists(select from public.journal_lines l where l.journal_entry_id=h.id and
      (l.sub_account_id is not null or exists(select from public.journal_sources14253 s where s.journal_line_id=l.id))) then
     raise exception 'Linked journal-line evidence requires individual revision for %',j.entry_no; end if;
   select jsonb_agg((v-'id'-'line_no'-'code'-'base_debit'-'base_credit')||jsonb_build_object('account_id',a.id) order by ord)
    into payload from jsonb_array_elements(j.proposed_lines) with ordinality t(v,ord)
    join public.accounts a on a.code=v->>'code' and a.currency_code=v->>'currency_code' and a.is_active and a.is_posting;
   if jsonb_array_length(payload) is distinct from jsonb_array_length(j.proposed_lines) then
     raise exception 'An account is unavailable for %',j.entry_no; end if;
   if p.status='closed' and sid is null then sid:=(public.begin_book_session136(p_month,reason)->>'id')::uuid; end if;
   insert into private.fx_reclass_receipts_2026(entry_no,session_id,actor_id) values(j.entry_no,sid,actor);
   if p.status='open' then
     perform public.revise_open_journal_entry(h.id,reason,h.transaction_date,h.memo,payload);
     perform private.fx_reclass_verify_result_2026(j.entry_no);
   else
     perform public.stage_book_operation136(sid,'revise',jsonb_build_object('p_request_key','fx-reclass-2026-'||h.id::text,
       'p_entry_id',h.id,'p_reason',reason,'p_transaction_date',h.transaction_date,'p_memo',h.memo,'p_lines',payload));
   end if;
   n:=n+1;
 end loop;
 return jsonb_build_object('count',n,'period',p.status,'session',coalesce(sid,active_session));
end $$;

create function public.foreign_account_review_2026()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare actor uuid:=public.require_admin136(); months jsonb; chart jsonb;
begin
 if not public.accounting_workspace_allowed123() or public.password_change_required14257() then
   raise exception 'An active accounting administrator session is required' using errcode='42501'; end if;
 select jsonb_agg(jsonb_build_object('code',c.code,'name',c.account_name,'local',c.local_code,
    'mapping',c.original_code,'deferred',c.defer_support,'created',a.id is not null) order by c.code)
 into chart from private.fx_reclass_chart_2026 c left join public.accounts a on a.code=c.code;
 select jsonb_agg(jsonb_build_object('month',g.period_month,'status',g.status,'journals',g.journals) order by g.period_month) into months
 from (select p.period_month,p.status,jsonb_agg(jsonb_build_object('number',j.entry_no,
      'old',jsonb_array_length(j.original_lines),'new',jsonb_array_length(j.proposed_lines),
      'result',case when r.applied_at is not null then 'Applied' when r.session_id is not null then 'In correction'
        when p.status='locked' then 'Locked'
        when exists(select from jsonb_array_elements(j.proposed_lines) l where l->>'code'='1314') then 'Held with October rent'
        else 'Prepared' end) order by j.entry_no) as journals
   from private.fx_reclass_journals_2026 j join public.accounting_periods p on p.period_month=j.period_month
   left join private.fx_reclass_receipts_2026 r on r.entry_no=j.entry_no group by p.period_month,p.status) g;
 return jsonb_build_object('chart',coalesce(chart,'[]'),'months',coalesce(months,'[]'));
end $$;

-- Verify even when the administrator finishes in the standard Closing screen.
-- Returning an error rolls the whole commit back into its original closed state.
create function private.fx_reclass_session_result_2026()
returns trigger language plpgsql security definer set search_path=pg_catalog as $$
declare journal_no text;
begin
 if new.status='cancelled' then
   delete from private.fx_reclass_receipts_2026 where session_id=new.id and applied_at is null;
 elsif new.status='committed' then
   for journal_no in select entry_no from private.fx_reclass_receipts_2026 where session_id=new.id and applied_at is null loop
     perform private.fx_reclass_verify_result_2026(journal_no);
   end loop;
 end if;
 return new;
end $$;
create trigger fx_reclass_session_result_2026 after update of status on public.book_sessions136
for each row when (old.status='editing' and new.status in ('cancelled','committed'))
execute function private.fx_reclass_session_result_2026();

revoke all on function private.fx_reclass_values_2026(jsonb,date),private.fx_reclass_live_lines_2026(uuid),
 private.fx_reclass_verify_result_2026(text),private.fx_reclass_session_result_2026() from public,anon,authenticated,service_role;
revoke all on function public.prepare_foreign_chart_2026(),public.prepare_foreign_journal_month_2026(date),public.foreign_account_review_2026()
 from public,anon,authenticated,service_role;
grant execute on function public.prepare_foreign_chart_2026(),public.prepare_foreign_journal_month_2026(date),public.foreign_account_review_2026() to authenticated;
