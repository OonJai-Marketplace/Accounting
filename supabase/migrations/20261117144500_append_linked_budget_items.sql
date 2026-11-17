-- A request amendment appends items to the existing request and its open allocations in one transaction.
create or replace function public.budget_link_guard14316() returns trigger
language plpgsql set search_path=pg_catalog,public,pg_temp as $$
declare
 parent public.operational_reports%rowtype;
 old_lines jsonb;
 new_lines jsonb;
begin
 new.budget_request_id14316=nullif(new.data->>'requestId14316','')::uuid;
 if tg_op='UPDATE' and old.data->>'kind'='finance' and new.data is distinct from old.data then
  if old.data->>'status'='finalized' then raise exception 'Finalized fund allocation is read-only'; end if;
  if exists(select 1 from public.operational_reports where budget_request_id14316=old.id) then
   old_lines=old.data->'lines'; new_lines=new.data->'lines';
   if old.data->>'mode' is distinct from 'request' or
     (new.data-'lines'-'document14316') is distinct from (old.data-'lines'-'document14316') or
     jsonb_typeof(new_lines) is distinct from 'array' or jsonb_array_length(new_lines)<=jsonb_array_length(old_lines) or
     exists(select from jsonb_array_elements(old_lines) with ordinality p(line,n) where new_lines->(n::integer-1) is distinct from p.line) then
    raise exception 'Only additional items can be saved to a request with a utilization draft';
   end if;
   if exists(select from public.operational_reports r where r.budget_request_id14316=old.id
    and (r.data->>'status' is distinct from 'draft' or public.budget_utilization_journal(r.id) is not null)) then
    raise exception 'This request has a finalized or posted utilization report';
   end if;
   if exists(select from jsonb_array_elements(new_lines) with ordinality p(line,n)
    where n>jsonb_array_length(old_lines) and (coalesce(trim(line->>'key117'),'')='' or coalesce(trim(line->>'description'),'')=''
     or coalesce(trim(line->>'category'),'')='' or coalesce(trim(line->>'currency'),'')=''
     or jsonb_typeof(line->'amount') is distinct from 'number' or (line->>'amount')::numeric<=0)) or
    exists(select from jsonb_array_elements(new_lines) p(line) where line->>'key117' is not null group by line->>'key117' having count(*)>1) then
    raise exception 'Each new budget item needs a unique key, category, name, currency and positive amount';
   end if;
  end if;
 end if;
 if new.budget_request_id14316 is not null then
  select * into parent from public.operational_reports where id=new.budget_request_id14316 for update;
  if not found or parent.data->>'kind' is distinct from 'finance' or parent.data->>'mode'='utilization' or parent.budget_request_id14316 is not null
    or new.data->>'mode' is distinct from 'utilization' or new.data->>'kind' is distinct from 'finance' then raise exception 'Choose an original saved budget request'; end if;
  if new.data->'lines' is distinct from parent.data->'lines' or (new.data->>'requestVersion14316')::integer is distinct from parent.version then raise exception 'Budget request changed. Reopen its current version'; end if;
 end if;
 return new;
end $$;

create or replace function public.sync_draft_budget_items() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$
begin
 update public.operational_reports set version=version+1,
  data=data||jsonb_build_object('lines',new.data->'lines','requestVersion14316',new.version)
 where budget_request_id14316=new.id;
 return null;
end $$;
revoke all on function public.sync_draft_budget_items() from public,anon,authenticated;
create trigger sync_draft_budget_items after update on public.operational_reports for each row
 when (new.data->>'mode'='request' and old.data->'lines' is distinct from new.data->'lines') execute function public.sync_draft_budget_items();

create or replace function public.append_budget_request_items(p_request uuid,p_version integer,p_items jsonb,p_document jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare
 r public.operational_reports%rowtype;
 kids jsonb;
 wording public.budget_report_wording%rowtype;
begin
 if auth.uid() is null or public.is_admin() is not true or public.accounting_workspace_allowed123() is not true then
  raise exception 'Accounting administrator access required' using errcode='42501';
 end if;
 select * into strict r from public.operational_reports where id=p_request for update;
 if r.data->>'mode' is distinct from 'request' or r.version is distinct from p_version then raise exception 'Request changed. Reopen the current version.'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)=0 or jsonb_typeof(p_document) is distinct from 'object'
   or nullif(p_document->>'html','') is null then raise exception 'Choose the items to add'; end if;
 perform id from public.operational_reports where budget_request_id14316=p_request order by id for update;
 if not found then raise exception 'Linked draft changed. Reopen the request.'; end if;
 select * into wording from public.budget_report_wording where report_id=p_request and report_version=p_version;
 update public.operational_reports set version=version+1,data=data||jsonb_build_object('lines',(data->'lines')||p_items,'document14316',p_document)
 where id=p_request returning * into r;
 if wording.report_id is not null then
  perform public.save_budget_report_wording(p_request,r.version,wording.revision,wording.notes,wording.descriptions);
 end if;
 select jsonb_agg(to_jsonb(d)) into kids from public.operational_reports d where budget_request_id14316=p_request;
 return jsonb_build_object('request',to_jsonb(r)||jsonb_build_object('budget_report_wording',(select to_jsonb(w) from public.budget_report_wording w where w.report_id=p_request and w.report_version=r.version)),'drafts',kids);
end $$;
revoke all on function public.append_budget_request_items(uuid,integer,jsonb,jsonb) from public,anon;
grant execute on function public.append_budget_request_items(uuid,integer,jsonb,jsonb) to authenticated;
notify pgrst,'reload schema';
