-- Replace two source requests with one amended request while retaining the utilization record.
create or replace function public.combine_draft_budget_requests(
 p_report uuid, p_version integer, p_parent_version integer, p_extra uuid, p_extra_version integer,
 p_links jsonb, p_assignments jsonb, p_lines jsonb, p_notes text, p_html text
) returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare
 draft public.operational_reports%rowtype;
 base public.operational_reports%rowtype;
 extra public.operational_reports%rowtype;
 combined public.operational_reports%rowtype;
 lines jsonb;
 movements jsonb;
 line jsonb;
 movement jsonb;
 dest text;
 idx integer;
 notes text;
begin
 if auth.uid() is null or public.is_admin() is not true or public.accounting_workspace_allowed123() is not true then
  raise exception 'Accounting administrator access required' using errcode='42501';
 end if;
 select * into strict draft from public.operational_reports where id=p_report for update;
 perform id from public.operational_reports where id in (draft.budget_request_id14316,p_extra) order by id for update;
 select * into strict base from public.operational_reports where id=draft.budget_request_id14316;
 select * into strict extra from public.operational_reports where id=p_extra;
 if base.id=extra.id or draft.version is distinct from p_version or base.version is distinct from p_parent_version
  or extra.version is distinct from p_extra_version or draft.data->>'status' is distinct from 'draft'
  or draft.data->>'mode' is distinct from 'utilization' or base.data->>'kind' is distinct from 'finance'
  or extra.data->>'kind' is distinct from 'finance' or base.data->>'mode' is distinct from 'request'
  or extra.data->>'mode' is distinct from 'request' or base.data->>'budgetMonth290' is null
  or extra.data->>'budgetMonth290' is distinct from base.data->>'budgetMonth290'
  or exists(select from public.operational_reports where budget_request_id14316 in (base.id,extra.id) and id<>draft.id)
  or public.budget_utilization_journal(p_report) is not null then
  raise exception 'These requests or their allocations changed. Reopen the selected draft.';
 end if;
 if jsonb_typeof(p_links) is distinct from 'object' or jsonb_typeof(p_assignments) is distinct from 'object'
  or nullif(trim(p_html),'') is null then raise exception 'Invalid request correction'; end if;
 lines=base.data->'lines';
 for line in select value from jsonb_array_elements(extra.data->'lines') loop
  dest=p_links->>(line->>'key117');
  if dest is null then
   lines=lines||jsonb_build_array(line);
  else
   select ordinality-1 into strict idx from jsonb_array_elements(base.data->'lines') with ordinality
    where value->>'key117'=dest and value->>'currency'=line->>'currency';
   if coalesce(draft.data->'fundingByItem'->('item:'||dest)->>'status','approved')<>'approved' then
    raise exception 'Add a separate item for a declined or partially funded budget line';
   end if;
   lines=jsonb_set(lines,array[idx::text,'amount'],to_jsonb((lines->idx->>'amount')::numeric+(line->>'amount')::numeric));
  end if;
 end loop;
 if lines is distinct from p_lines or exists(select from jsonb_array_elements(lines) group by value->>'key117' having count(*)>1)
  then raise exception 'Request items changed. Reopen the draft.'; end if;
 movements=draft.data->'movements';
 for dest in select jsonb_object_keys(p_assignments) loop
  select ordinality-1,value into strict idx,movement from jsonb_array_elements(movements) with ordinality where value->>'id290'=dest;
  if movement->>'type290' is distinct from 'spend' or coalesce(movement->>'budgetKey117','')<>'' or movement ? 'worksheetLine'
    or not exists(select from jsonb_array_elements(lines) where value->>'key117'=p_assignments->>dest) then
   raise exception 'Choose an unassigned expense and a current budget item';
  end if;
  movements=jsonb_set(movements,array[idx::text,'budgetKey117'],p_assignments->dest);
 end loop;
 select concat_ws(E'\n\n',nullif(coalesce((select w.notes from public.budget_report_wording w where w.report_id=base.id and w.report_version=base.version),base.data->>'notes'),''),
  nullif(coalesce((select w.notes from public.budget_report_wording w where w.report_id=extra.id and w.report_version=extra.version),extra.data->>'notes'),'')) into notes;
 if notes is distinct from p_notes then raise exception 'Request notes changed. Reopen the draft.'; end if;
 insert into public.operational_reports(data,version) values (
  (base.data-'sharedSnapshot14313')||jsonb_build_object('lines',lines,'notes',notes,'document14316',
   coalesce(base.data->'document14316','{}')||jsonb_build_object('html',p_html,'title','Budget Request — '||(base.data->>'purpose'))),1)
 returning * into combined;
 update public.operational_reports set version=version+1,data=data||jsonb_build_object('lines',lines,'movements',movements,
  'requestId14316',combined.id,'requestVersion14316',combined.version)
 where id=draft.id returning * into draft;
 perform public.delete_budget14316(base.id,base.version);
 perform public.delete_budget14316(extra.id,extra.version);
 return jsonb_build_object('request',to_jsonb(combined),'draft',to_jsonb(draft));
end $$;
revoke all on function public.combine_draft_budget_requests(uuid,integer,integer,uuid,integer,jsonb,jsonb,jsonb,text,text) from public,anon;
grant execute on function public.combine_draft_budget_requests(uuid,integer,integer,uuid,integer,jsonb,jsonb,jsonb,text,text) to authenticated;
notify pgrst,'reload schema';
