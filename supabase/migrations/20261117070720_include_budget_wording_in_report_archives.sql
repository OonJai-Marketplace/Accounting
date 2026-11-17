-- Include display revisions when exporting and resetting saved operational reports.
do $migration$
declare source text; amended text;
begin
  if to_regprocedure('public.reset_scope_catalog14232()') is null then return; end if;
  if exists(select 1 from jsonb_array_elements(public.reset_scope_catalog14232()) s
     where s->>'id'='reports' and s->'tables' ? 'budget_report_wording') then return; end if;
  select pg_get_functiondef('public.reset_scope_catalog14232()'::regprocedure) into source;
  amended=regexp_replace(source,'("tables"\s*:\s*\[\s*"operational_reports")(\s*\])','\1,"budget_report_wording"\2');
  if amended=source then raise exception 'Saved report archive catalog differs'; end if;
  execute amended;
  if not exists(select 1 from jsonb_array_elements(public.reset_scope_catalog14232()) s
     where s->>'id'='reports' and s->'tables' ? 'budget_report_wording') then raise exception 'Saved report wording is missing from the archive catalog'; end if;
end $migration$;
