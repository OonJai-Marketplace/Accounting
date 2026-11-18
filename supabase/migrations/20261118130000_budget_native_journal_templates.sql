-- Manual journal preparation reads only the saved report's named sources.
-- Its fingerprint is rechecked inside the normal atomic posting transaction.
create function private.budget_utilization_evidence478(p_report uuid,p_version integer,p_lock boolean default false)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare r public.operational_reports; numbers text[]; entries jsonb;
begin
 if public.is_admin() is not true or public.accounting_workspace_allowed123() is not true
  or public.can_action113('transactions-budget14313','view') is not true or public.can_action113('journal','post') is not true then
  raise exception 'Budget administrator and journal posting access are required';
 end if;
 select * into strict r from public.operational_reports where id=p_report for share;
 if r.version<>p_version or r.data->>'mode' is distinct from 'utilization' or r.data->>'kind' is distinct from 'finance' then
  raise exception 'The saved utilization report changed. Reopen it before preparing or posting';
 end if;
 select coalesce(array_agg(distinct m[1]),array[]::text[]) into numbers
 from (
  select r.data->>'receiptReference290' as value
  union all select v->>'reference' from jsonb_array_elements(coalesce(r.data->'movements','[]')) v
  union all select v->>'evidence' from jsonb_array_elements(coalesce(r.data->'conversions','[]')) v
 ) text_fields cross join lateral regexp_matches(upper(value),'\m(OJM[0-9]{6}(-[0-9]+)?)\M','g') m;
 if p_lock then
  perform 1 from public.journal_entries e where e.entry_no=any(numbers) order by e.id for share;
  perform 1 from public.journal_lines l join public.journal_entries e on e.id=l.journal_entry_id where e.entry_no=any(numbers) order by l.id for share of l;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'entry_no',e.entry_no,'status',e.status,'updated_at',e.updated_at,
  'journal_lines',(select coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object('accounts',jsonb_build_object('id',a.id,'code',a.code,'name',a.name,'is_active',a.is_active)) order by l.line_no),'[]')
  from public.journal_lines l join public.accounts a on a.id=l.account_id where l.journal_entry_id=e.id)) order by e.entry_no),'[]') into entries
 from public.journal_entries e where e.entry_no=any(numbers);
 return jsonb_build_object('journals',entries,'fingerprint',md5(entries::text));
end $$;
revoke all on function private.budget_utilization_evidence478(uuid,integer,boolean) from public,anon,authenticated;
create function public.budget_utilization_evidence478(p_report uuid,p_version integer)
returns jsonb language sql security definer set search_path=pg_catalog as $$
 select private.budget_utilization_evidence478(p_report,p_version,false)
$$;
revoke all on function public.budget_utilization_evidence478(uuid,integer) from public,anon;
grant execute on function public.budget_utilization_evidence478(uuid,integer) to authenticated;

create or replace function private.link_budget_utilization_journal() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare parts text[]:=string_to_array(new.request_key,':'); r public.operational_reports; evidence jsonb;
begin
 if public.can_action113('transactions-budget14313','view') is not true or public.is_admin() is not true then
  raise exception 'Budget administrator access is required';
 end if;
 if cardinality(parts) not in (3,4) then raise exception 'Invalid utilization posting reference';end if;
 select * into strict r from public.operational_reports where id=parts[2]::uuid for share;
 if r.version<>parts[3]::integer or r.data->>'mode' is distinct from 'utilization' or r.data->>'kind' is distinct from 'finance' or jsonb_array_length(new.result)<>1 then
  raise exception 'The saved utilization report changed. Reopen it before posting';
 end if;
 if cardinality(parts)=4 then
  evidence:=private.budget_utilization_evidence478(r.id,r.version,true);
  if parts[4] is distinct from evidence->>'fingerprint' then raise exception 'A referenced journal changed. Reopen the utilization report and review the prepared journal';end if;
 end if;
 insert into private.budget_utilization_journals(report_id,report_version,entry_id)
 values(r.id,r.version,(new.result->0->>'entry_id')::uuid);
 return new;
exception when unique_violation then raise exception 'This utilization report already has a journal entry';
end $$;
revoke all on function private.link_budget_utilization_journal() from public,anon,authenticated;
