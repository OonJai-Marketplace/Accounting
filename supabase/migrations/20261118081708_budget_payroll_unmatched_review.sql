create or replace function public.budget_payroll_protocol(p_report uuid,p_version integer,p_apply boolean default false,p_fingerprint text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog set lock_timeout='5s' as $$
declare
 r public.operational_reports%rowtype; pr public.payroll_runs%rowtype;
 source_count integer; e jsonb; m jsonb; line jsonb; wanted text; found_indices integer[];
 i integer; key text; gross numeric; rate numeric; before_amount numeric;
 moves jsonb; proposed jsonb; changes jsonb='[]'; skipped jsonb='[]'; fingerprint text; history jsonb;
begin
 if auth.uid() is null or public.is_admin() is not true or public.accounting_workspace_allowed123() is not true then
  raise exception 'Accounting administrator access required' using errcode='42501'; end if;
 select * into strict r from public.operational_reports where id=p_report for update;
 if r.version is distinct from p_version then raise exception 'Report changed. Reopen its current version before correcting salaries.'; end if;
 if r.data->>'kind' is distinct from 'finance' or r.data->>'mode' is distinct from 'utilization' then raise exception 'Choose a fund utilization report'; end if;
 select count(*) into source_count from public.payroll_runs where data->>'month'=r.data->>'budgetMonth290' and data->>'status'='finalized';
 if source_count<>1 then raise exception 'Exactly one finalized payroll is required for this reporting month'; end if;
 select * into strict pr from public.payroll_runs where data->>'month'=r.data->>'budgetMonth290' and data->>'status'='finalized' for share;
 moves=coalesce(r.data->'movements','[]');
 for e in select value from jsonb_array_elements(pr.data->'results') loop
  if e->>'currency' not in ('USD','LAK') then continue; end if;
  rate=case when e->>'currency'='LAK' then 1 else nullif((e->>'rate')::numeric,0) end;
  if rate is null or rate<=0 then raise exception 'Payroll conversion rate is missing for %',e->'employee'->>'name'; end if;
  gross=round((e->>'gross')::numeric/rate,2);
  if gross is null or gross<0 then raise exception 'Payroll gross amount is invalid'; end if;
  wanted=private.budget_payroll_name(e->'employee'->>'name');
  select array_agg((z.n-1)::integer) into found_indices
   from jsonb_array_elements(moves) with ordinality z(v,n)
   where coalesce(z.v->>'type290','spend')='spend'
    and (private.budget_payroll_name(z.v->>'destination290')=wanted
      or (nullif(z.v->>'destination290','') is null and exists(select from jsonb_array_elements(r.data->'lines') l
       where l->>'key117'=z.v->>'budgetKey117' and private.budget_payroll_name(l->>'description')=wanted)))
    and (coalesce(z.v->>'description290','') ~* '(salary|payroll|wages)' or exists(select from jsonb_array_elements(r.data->'lines') l
      where l->>'key117'=z.v->>'budgetKey117' and l->>'category' ~* '(personnel|salary|payroll)'));
  if cardinality(found_indices)>1 then
   skipped=skipped||jsonb_build_array(jsonb_build_object('employee',e->'employee'->>'name','reason','Multiple salary entries need an individual review'));
   continue;
  end if;
  if cardinality(found_indices)=1 then
   i=found_indices[1];m=moves->i;
   if m->>'currency' is distinct from e->>'currency' then
    skipped=skipped||jsonb_build_array(jsonb_build_object('employee',e->'employee'->>'name','reason','Recorded payment currency differs from payroll'));continue;
   end if;
   before_amount=(m->>'outflow')::numeric;
   if before_amount=gross then continue; end if;
   if gross<=0 then skipped=skipped||jsonb_build_array(jsonb_build_object('employee',e->'employee'->>'name','reason','Zero salary requires individual review'));continue;end if;
   if not (m ? 'cashDistributed') then moves=jsonb_set(moves,array[i::text,'cashDistributed'],to_jsonb(before_amount)); end if;
   moves=jsonb_set(moves,array[i::text,'outflow'],to_jsonb(gross));
   changes=changes||jsonb_build_array(jsonb_build_object('employee',e->'employee'->>'name','currency',e->>'currency','before',before_amount,'after',gross,'action','Correct earned gross'));
  else
   select l into line from jsonb_array_elements(r.data->'lines') l where private.budget_payroll_name(l->>'description')=wanted and l->>'category' ~* '(personnel|salary|payroll)' limit 1;
   if line is null then
    skipped=skipped||jsonb_build_array(jsonb_build_object('employee',e->'employee'->>'name','reason','No matching personnel item in this budget request'));continue;
   end if;
   if gross<=0 then continue;end if;
   key=line->>'key117';
   m=jsonb_build_object('id290',md5(r.id::text||pr.id::text||(e->>'employeeId')||'earned-gross')::uuid,
    'type290','spend','worksheetSpend',true,'budgetKey117',key,'currency',e->>'currency',
    'inflow',0,'outflow',gross,'cashDistributed',0,'cashUnconfirmed',true,
    'date290','','account','','destination290',line->>'description',
    'reference',coalesce(pr.data->>'reference','Payroll '||(pr.data->>'month')),
    'description290','Earned gross salary. Payroll obligation; cash payment details have not been entered.');
   moves=moves||jsonb_build_array(m);
   changes=changes||jsonb_build_array(jsonb_build_object('employee',e->'employee'->>'name','currency',e->>'currency','before',null,'after',gross,'action','Add missing salary; cash details pending'));
  end if;
 end loop;
 proposed=jsonb_set(r.data,'{movements}',moves);
 fingerprint=md5(r.version::text||pr.id::text||pr.version::text||proposed::text);
 select coalesce(jsonb_agg(jsonb_build_object('version',a.to_version,'date',a.created_at,'changes',a.changes) order by a.to_version desc),'[]') into history
  from private.budget_payroll_amendments a where a.report_id=r.id;
 if p_apply then
  if p_fingerprint is distinct from fingerprint then raise exception 'Payroll or report changed. Review the new correction preview.'; end if;
  if jsonb_array_length(changes)>0 then
   insert into private.budget_payroll_amendments(report_id,from_version,to_version,actor_id,transaction_id,payroll_id,payroll_version,before_data,after_data,changes)
    values(r.id,r.version,r.version+1,auth.uid(),txid_current(),pr.id,pr.version,r.data,proposed,changes);
   update public.operational_reports set data=proposed,version=version+1 where id=r.id returning * into r;
   update public.budget_report_wording set report_version=r.version where report_id=r.id and report_version=r.version-1;
  end if;
 end if;
 return jsonb_build_object('changes',changes,'skipped',skipped,'history',history,'fingerprint',fingerprint,'source',pr.data->>'reference',
  'record',to_jsonb(r)||jsonb_build_object('budget_report_wording',(select to_jsonb(w) from public.budget_report_wording w where w.report_id=r.id and w.report_version=r.version)));
end $$;
revoke all on function public.budget_payroll_protocol(uuid,integer,boolean,text) from public,anon;
grant execute on function public.budget_payroll_protocol(uuid,integer,boolean,text) to authenticated;
notify pgrst,'reload schema';
