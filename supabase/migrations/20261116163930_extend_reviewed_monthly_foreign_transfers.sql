create or replace function private.ensure_airfare_equity26() returns void
language plpgsql security invoker set search_path=pg_catalog as $func$
declare parent uuid; local_account uuid; target uuid; sub_id uuid; g public.account_groups143180;
begin
 perform pg_advisory_xact_lock(143180);
 select id into strict parent from public.accounts where code='3000' and account_type='EQUITY' and is_active and not is_posting and not is_technical;
 select id into strict local_account from public.accounts where code='3031' and account_type='EQUITY' and parent_code='3000' and currency_code='LAK' and is_posting and is_active;
 if not exists(select from public.accounts where code='3032') then
   perform public.save_sub_account_with_reporting_link(null,jsonb_build_object('parent_account_id',parent,'currency_code','USD','code','3032','name','Owner Support Contribution — Airfare — USD','description','','track_foreign_funds',false),null,local_account);
 end if;
 select a.id,s.id into strict target,sub_id from public.accounts a join public.sub_accounts s on s.posting_account_id14285=a.id
 join public.sub_account_reporting_links r on r.sub_account_id=s.id and r.lak_account_id=local_account
 where a.code='3032' and a.name='Owner Support Contribution — Airfare — USD' and a.account_type='EQUITY' and a.currency_code='USD' and a.is_active and a.is_posting and not a.is_technical and s.is_active and s.parent_account_id=parent;
 for g in select * from public.account_groups143180 where local_account=any(account_ids) order by id for update loop
   if not exists(select from public.account_groups143180 where target=any(account_ids)) then
     perform public.save_account_group143180(g.id,g.name,g.kind,g.parent_id,g.account_ids||target,g.revision);
   end if;
 end loop;
end $func$;
revoke all on function private.ensure_airfare_equity26() from public,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.post_category_transfers26(m date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
 SET lock_timeout TO '5s'
 SET statement_timeout TO '90s'
AS $function$
declare actor uuid:=public.require_admin136(); per public.accounting_periods; sid uuid; plans private.category_transfer_entries26;
 h public.journal_entries; oldfx jsonb; fp jsonb; parts jsonb; chk jsonb; ack jsonb='{}'; issue jsonb; why text; reason text;
 missing jsonb:='[]'; report jsonb; response jsonb; kinds jsonb; nums jsonb; original_count int;
begin
 if actor is null or not public.accounting_workspace_allowed123() or public.password_change_required14257()
   or not public.has_user_permission('post') or not public.can_action113('sec-chart-accounts','edit') or not public.can_action113('journal','post') then
   raise exception 'Sign in as an active Accounting administrator.'; end if;
 if m is null or m <> date_trunc('month', m)::date or m not between date '2026-01-01' and date '2026-10-01' then
   raise exception 'Outside the reviewed months.'; end if;
 perform pg_advisory_xact_lock(hashtext('oonjai-fx-reclass-2026'));
 select posted into report from private.category_transfer_receipts26 where period_month=m;
 if found then return report; end if;
 select * into strict per from public.accounting_periods where period_month=m for update;
 if per.status<>'closed' or per.locked_at is not null or exists(select from public.year_closings136 where year=2026) or
   exists(select from public.book_sessions136 where period_id=per.id and status='editing') then raise exception 'Period is locked, open or already being edited.'; end if;
 select jsonb_agg(entry_no order by entry_no),count(*) into nums,original_count from private.category_transfer_entries26 where period_month=m;
 if original_count<>(case extract(month from m)::int when 1 then 4 when 2 then 2 when 3 then 3 when 4 then 2 when 5 then 5 when 6 then 7 when 7 then 5 when 8 then 6 when 9 then 6 when 10 then 9 end) then raise exception 'Reviewed journal list is incomplete.'; end if;
 if m < date '2026-05-01' then
   perform private.category_transfer_chart26();
 elsif m >= date '2026-09-01' then
   perform private.ensure_airfare_equity26();
 end if;
 fp:=private.fx_reclass_fingerprints_2026(m,null);
 reason:=case when m < date '2026-05-01' then 'Reclassify documented foreign sales, owner receipts, withdrawals and opening retained earnings into their regular accounts'
   else 'Transfer reviewed foreign-currency journal lines to their corresponding operating and equity accounts' end;
 sid:=(public.begin_book_session136(m,reason)->>'id')::uuid;
 for plans in select * from private.category_transfer_entries26 where period_month=m order by entry_no loop
   select * into strict h from public.journal_entries where entry_no=plans.entry_no and status='posted' for update;
   select to_jsonb(f) into oldfx from public.journal_fx_evidence288 f where f.entry_id=h.id for share;
   if plans.original_header is distinct from to_jsonb(h) or plans.original_lines is distinct from private.fx_reclass_live_lines_2026(h.id)
    or plans.original_evidence is distinct from oldfx or (jsonb_typeof(oldfx->'proposed_revision')='object' and oldfx->'proposed_revision'->>'applied_entry_updated_at' is null)
    or exists(select from public.journal_lines l where l.journal_entry_id=h.id and
     (l.sub_account_id is not null or exists(select from public.journal_sources14253 t where t.journal_line_id=l.id))) then
    raise exception 'Source or evidence changed for %.',h.entry_no; end if;
   if exists(with mv as (select a.account_type,z.s*((l->>'base_debit')::numeric-(l->>'base_credit')::numeric) value
     from (values(-1,plans.original_lines),(1,plans.planned)) z(s,ls) cross join jsonb_array_elements(z.ls) l
     join public.accounts a on a.code=l->>'code' where not a.is_technical)
     select from mv group by account_type having sum(value)<>0)
    or exists(select from jsonb_array_elements(plans.planned) l group by l->>'currency_code' having sum((l->>'debit')::numeric-(l->>'credit')::numeric)<>0)
    or (select sum((l->>'base_debit')::numeric-(l->>'base_credit')::numeric) from jsonb_array_elements(plans.planned) l)<>0 then
    raise exception 'Currency or statement totals differ for %.',h.entry_no; end if;
   select jsonb_agg((v-'line_no'-'code'-'base_debit'-'base_credit'-'evidence_kind')||jsonb_build_object('account_id',a.id) order by n) into parts
    from jsonb_array_elements(plans.planned) with ordinality t(v,n) join public.accounts a on a.code=v->>'code' and a.is_active and a.is_posting and a.currency_code=v->>'currency_code';
   if jsonb_array_length(parts) is distinct from jsonb_array_length(plans.planned) then raise exception 'Posting account unavailable.'; end if;
   perform public.stage_book_operation136(sid,'revise',jsonb_build_object('p_request_key','direct-categories-'||h.id,
     'p_entry_id',h.id,'p_reason',reason,'p_transaction_date',h.transaction_date,'p_memo',h.memo,'p_lines',parts));
 end loop;
 if fp is null or fp is distinct from private.fx_reclass_fingerprints_2026(m,sid) then raise exception 'Cash or bank movement differs.'; end if;
 chk:=public.maintenance_preflight14324(m);
 if chk->'reconciliation305'->>'complete' is distinct from 'true' or exists(select from jsonb_array_elements(chk->'issues') v where v->>'severity'='block') then
   raise exception 'Month close requires reconciliation or a blocking review: %',chk->'issues'; end if;
 for issue in select value from jsonb_array_elements(chk->'issues') where value->>'severity'='warning' loop
   select reason_text into why from private.category_transfer_notes26 where period_month=m and title=issue->>'title' and detail=issue->>'detail';
   why:=coalesce(why,chk->'decisions319'->(issue->>'id')->'saved'->>'reason');
   if nullif(trim(why),'') is null then missing:=missing||jsonb_build_array(jsonb_build_object('title',issue->>'title','detail',issue->>'detail')); continue; end if;
   ack:=ack||jsonb_build_object(issue->>'id',jsonb_build_object('acknowledged',true,'reason',why));
 end loop;
 if jsonb_array_length(missing)>0 then raise exception 'Review these close findings: %',missing; end if;
 response:=public.maintenance_finish14324(m,'session',chk->>'fingerprint',jsonb_build_object('coverageConfirmed',true,'acknowledgments',ack),'closed',sid);
 if response->>'status' is distinct from 'committed' or fp is distinct from private.fx_reclass_fingerprints_2026(m,null) then raise exception 'Final close comparison failed.'; end if;
 for plans in select * from private.category_transfer_entries26 where period_month=m loop
   select * into strict h from public.journal_entries where entry_no=plans.entry_no;
   if (to_jsonb(h)-'updated_at'-'accounting_period_id') is distinct from (plans.original_header-'updated_at'-'accounting_period_id')
     or private.fx_reclass_values_2026(private.fx_reclass_live_lines_2026(h.id),h.transaction_date)
       is distinct from private.fx_reclass_values_2026(plans.planned,h.transaction_date) then raise exception 'Posted journal differs for %.',h.entry_no; end if;
   if plans.original_evidence is not null and (plans.original_evidence->>'entry_updated_at')::timestamptz=(plans.original_header->>'updated_at')::timestamptz then
     select coalesce(jsonb_object_agg(n::text,coalesce(v->'evidence_kind',plans.original_evidence->'line_kinds'->(v->>'line_no'))),'{}') into kinds
       from jsonb_array_elements(plans.planned) with ordinality t(v,n) where v->>'evidence_kind' is not null or plans.original_evidence->'line_kinds' ? (v->>'line_no');
     update public.journal_fx_evidence288 f set entry_updated_at=h.updated_at,line_kinds=kinds,revision=gen_random_uuid()
       where f.entry_id=h.id and to_jsonb(f)=plans.original_evidence;
     if not found then raise exception 'Evidence changed for %.',h.entry_no; end if;
   end if;
 end loop;
 report:=jsonb_build_object('month',m,'posted',nums);
 insert into private.category_transfer_receipts26 values(m,sid,report);
 return report;
end $function$;
