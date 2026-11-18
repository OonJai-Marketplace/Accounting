-- Synthetic records only; every insert/update is rolled back.
begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where email='santos@oonjai.org' and role='admin' and status='active'),true);
set local role authenticated;
do $test$
declare id uuid=gen_random_uuid(); parent uuid=gen_random_uuid(); d jsonb; r jsonb; again jsonb;
begin
 d=jsonb_build_object('kind','finance','mode','utilization','status','draft','budgetMonth290','2099-06','lines','[]'::jsonb,'movements','[]'::jsonb,'conversions','[]'::jsonb);
 r=public.save_budget_utilization(id,null,d);
 assert (r->>'version')::integer=1 and r->'data'=d,'Draft insertion must return its exact receipt';
 again=public.save_budget_utilization(id,null,d);
 assert again=r,'Retry of committed insertion must return the existing receipt';
 d=d||jsonb_build_object('notes','Manual edit');r=public.save_budget_utilization(id,1,d);
 assert (r->>'version')::integer=2,'Draft must remain editable';
 begin
  perform public.save_budget_utilization(id,1,d||jsonb_build_object('notes','Stale edit'));
  raise exception 'Stale write was accepted';
 exception when serialization_failure then null;end;
 d=d||jsonb_build_object('status','finalized','finalizedAt14316',now());r=public.save_budget_utilization(id,2,d);
 again=public.save_budget_utilization(id,2,d);
 assert (r->>'version')::integer=3 and r=again,'Lost finalization receipt must be idempotent';
 begin
  perform public.save_budget_utilization(id,3,d||jsonb_build_object('status','draft'));
  raise exception 'Finalized report was editable';
 exception when raise_exception then
  if sqlerrm<>'Finalized fund allocation is read-only' then raise;end if;
 end;
 insert into public.operational_reports(id,version,data) values(parent,1,jsonb_build_object('kind','finance','mode','request','lines','[]'::jsonb));
 begin
  perform public.save_budget_utilization(gen_random_uuid(),null,d||jsonb_build_object('status','draft','requestId14316',parent,'requestVersion14316',2));
  raise exception 'Stale parent was accepted';
 exception when raise_exception then
  if sqlerrm<>'Budget request changed. Reopen its current version' then raise;end if;
 end;
 begin
  perform public.save_budget_utilization(gen_random_uuid(),null,d||jsonb_build_object('kind','subuser'));
  raise exception 'Wrong record type was accepted';
 exception when invalid_parameter_value then null;end;
 perform set_config('request.jwt.claim.sub','',true);
 begin
  perform public.save_budget_utilization(gen_random_uuid(),null,d);
  raise exception 'Anonymous save was accepted';
 exception when insufficient_privilege then null;end;
end $test$;
rollback;
select 'PASS: exact receipts, retry idempotency, manual editing, version conflicts, immutable finals, parent version checks, record type and authorization; all test data rolled back.' as result;
