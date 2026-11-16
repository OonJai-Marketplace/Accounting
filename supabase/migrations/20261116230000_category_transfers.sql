-- A privately loaded historical plan. Installations without a reviewed plan cannot post.
create table private.category_transfer_entries26 (
 entry_no text primary key, period_month date not null, original_header jsonb not null,
 original_lines jsonb not null, original_evidence jsonb, planned jsonb not null,
 check (jsonb_typeof(planned)='array' and jsonb_array_length(planned)>=2)
);
create table private.category_transfer_receipts26 (
 period_month date primary key, session_id uuid not null unique references public.book_sessions136(id),
 posted jsonb not null
);
alter table private.category_transfer_entries26 enable row level security;
alter table private.category_transfer_receipts26 enable row level security;
revoke all on private.category_transfer_entries26,private.category_transfer_receipts26 from public,anon,authenticated,service_role;

create function private.category_transfer_chart26() returns void language plpgsql set search_path=pg_catalog as $$
declare spec record; parent public.accounts; s public.sub_accounts; dest uuid; g public.account_groups143180; added uuid[];
begin
 perform pg_advisory_xact_lock(143180);
 for spec in select * from (values
   (1,'3027','Owner Financial Support Received — LAK','LAK','3020',null::text),
   (2,'3026','Owner Financial Support Received — USD','USD','3020','3027'),
   (3,'3043','Owner Withdrawal – Cash — USD','USD','3040','3041'),
   (4,'3111','Retained Earnings — USD','USD','3100','3110'),
   (5,'3112','Retained Earnings — THB','THB','3100','3110')
 ) z(seq,code,label,curr,parent_code,link_code) order by seq loop
   select * into strict parent from public.accounts where code=spec.parent_code and is_active and not is_posting and not is_technical and account_type='EQUITY';
   dest:=null;
   if spec.link_code is not null then
     select id into strict dest from public.accounts where code=spec.link_code and is_active and is_posting and not is_technical and account_type='EQUITY' and currency_code='LAK';
   end if;
   if not exists(select from public.accounts where code=spec.code) then
     perform public.save_sub_account_with_reporting_link(null,jsonb_build_object('parent_account_id',parent.id,'currency_code',spec.curr,
       'code',spec.code,'name',spec.label,'description','','track_foreign_funds',false),null,dest);
   end if;
   select ss.* into strict s from public.sub_accounts ss join public.accounts a on a.id=ss.posting_account_id14285
     where a.code=spec.code and a.name=spec.label and a.account_type='EQUITY' and a.is_active and ss.is_active and a.is_posting and not a.is_technical
       and a.parent_code=parent.code and ss.parent_account_id=parent.id and a.currency_code=spec.curr and a.account_purpose='regular';
   if (select lak_account_id from public.sub_account_reporting_links where sub_account_id=s.id) is distinct from dest then
      raise exception 'Reporting link differs for %.',spec.code; end if;
 end loop;
 for g in select * from public.account_groups143180 order by id for update loop
   select array_agg(a.id) into added from (values ('3026','3023'),('3027','3023'),('3043','3041'),('3111','3110'),('3112','3110')) c(src,dst)
     join public.accounts a on a.code=c.src join public.accounts d on d.code=c.dst
     where d.id=any(g.account_ids) and not exists(select from public.account_groups143180 other where a.id=any(other.account_ids));
   if added is not null then perform public.save_account_group143180(g.id,g.name,g.kind,g.parent_id,g.account_ids||added,g.revision); end if;
 end loop;
end $$;

create function private.post_category_transfers26(m date) returns jsonb
language plpgsql security definer set search_path=pg_catalog set lock_timeout='5s' set statement_timeout='90s' as $$
declare actor uuid:=public.require_admin136(); per public.accounting_periods; sid uuid; plans private.category_transfer_entries26;
 h public.journal_entries; oldfx jsonb; fp jsonb; parts jsonb; chk jsonb; ack jsonb='{}'; issue jsonb; why text; reason text;
 report jsonb; response jsonb; kinds jsonb; nums jsonb; original_count int;
begin
 if actor is null or not public.accounting_workspace_allowed123() or public.password_change_required14257()
   or not public.has_user_permission('post') or not public.can_action113('sec-chart-accounts','edit') or not public.can_action113('journal','post') then
   raise exception 'Sign in as an active Accounting administrator.'; end if;
 if m is null or m not in (date '2026-01-01','2026-02-01','2026-03-01','2026-04-01') then raise exception 'Outside January–April.'; end if;
 perform pg_advisory_xact_lock(hashtext('oonjai-fx-reclass-2026'));
 select posted into report from private.category_transfer_receipts26 where period_month=m;
 if found then return report; end if;
 select * into strict per from public.accounting_periods where period_month=m for update;
 if per.status<>'closed' or per.locked_at is not null or exists(select from public.year_closings136 where year=2026) or
   exists(select from public.book_sessions136 where period_id=per.id and status='editing') then raise exception 'Period is locked, open or already being edited.'; end if;
 select jsonb_agg(entry_no order by entry_no),count(*) into nums,original_count from private.category_transfer_entries26 where period_month=m;
 if original_count<>(case extract(month from m)::int when 1 then 4 when 2 then 2 when 3 then 3 else 2 end) then raise exception 'Reviewed journal list is incomplete.'; end if;
 perform private.category_transfer_chart26();
 fp:=private.fx_reclass_fingerprints_2026(m,null);
 reason:='Reclassify documented foreign sales, owner receipts, withdrawals and opening retained earnings into their regular accounts';
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
   select jsonb_agg((v-'line_no'-'code'-'base_debit'-'base_credit')||jsonb_build_object('account_id',a.id) order by n) into parts
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
   if nullif(trim(why),'') is null then raise exception 'New close finding in %: % — %',m,issue->>'title',issue->>'detail'; end if;
   ack:=ack||jsonb_build_object(issue->>'id',jsonb_build_object('acknowledged',true,'reason',why));
 end loop;
 response:=public.maintenance_finish14324(m,'session',chk->>'fingerprint',jsonb_build_object('coverageConfirmed',true,'acknowledgments',ack),'closed',sid);
 if response->>'status' is distinct from 'committed' or fp is distinct from private.fx_reclass_fingerprints_2026(m,null) then raise exception 'Final close comparison failed.'; end if;
 for plans in select * from private.category_transfer_entries26 where period_month=m loop
   select * into strict h from public.journal_entries where entry_no=plans.entry_no;
   if (to_jsonb(h)-'updated_at'-'accounting_period_id') is distinct from (plans.original_header-'updated_at'-'accounting_period_id')
     or private.fx_reclass_values_2026(private.fx_reclass_live_lines_2026(h.id),h.transaction_date)
       is distinct from private.fx_reclass_values_2026(plans.planned,h.transaction_date) then raise exception 'Posted journal differs for %.',h.entry_no; end if;
   if plans.original_evidence is not null and (plans.original_evidence->>'entry_updated_at')::timestamptz=(plans.original_header->>'updated_at')::timestamptz then
     select coalesce(jsonb_object_agg(n::text,plans.original_evidence->'line_kinds'->(v->>'line_no')),'{}') into kinds
       from jsonb_array_elements(plans.planned) with ordinality t(v,n) where plans.original_evidence->'line_kinds' ? (v->>'line_no');
     update public.journal_fx_evidence288 f set entry_updated_at=h.updated_at,line_kinds=kinds,revision=gen_random_uuid()
       where f.entry_id=h.id and to_jsonb(f)=plans.original_evidence;
     if not found then raise exception 'Evidence changed for %.',h.entry_no; end if;
   end if;
 end loop;
 report:=jsonb_build_object('month',m,'posted',nums);
 insert into private.category_transfer_receipts26 values(m,sid,report);
 return report;
end $$;
create table private.category_transfer_notes26(period_month date,title text,detail text,reason_text text not null,primary key(period_month,title,detail));
alter table private.category_transfer_notes26 enable row level security;
revoke all on private.category_transfer_notes26 from public,anon,authenticated,service_role;
revoke all on function private.category_transfer_chart26(),private.post_category_transfers26(date) from public,anon,authenticated,service_role;
create function public.post_category_transfers26(p_month date) returns jsonb language sql security definer set search_path=pg_catalog
as $$ select private.post_category_transfers26(p_month) $$;
revoke all on function public.post_category_transfers26(date) from public,anon,service_role;
grant execute on function public.post_category_transfers26(date) to authenticated;
notify pgrst,'reload schema';
