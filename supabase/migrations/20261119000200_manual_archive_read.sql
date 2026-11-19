-- A manual, administrator-only export of reviewed business sources. No scheduled job.
create or replace function public.accounting_archive_read(p_table text default null,p_offset integer default 0,p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec record; result jsonb:='{}'; summary jsonb; source_sql text; ordering text;
begin
 if auth.uid() is null or not public.is_admin() or not public.active_account14228() or not public.accounting_workspace_allowed123()
    or public.password_change_required14257() or not public.can_action113('settings-accounting','view')
 then raise exception 'Sign in to the administrator Accounting workspace.' using errcode='42501'; end if;
 if p_table='@config' then
  return (select jsonb_build_object('client',data->'googleSheets143129'->>'client',
   'email',coalesce(nullif(data->'googleSheets143129'->>'accountEmail228',''),'oonjaimarketplace@gmail.com')) from public.budget_settings14313 where id=true);
 end if;
 if p_offset<0 or p_limit not between 1 and 250 then raise exception 'Invalid archive page'; end if;
 for rec in select * from (values
('account_groups143180','public', 'id'),
('accounting_feature_samples','public', 'sample_key'),
('accounting_id_settings','public', 'id'),
('accounting_periods','public', 'id'),
('accounts','public', 'id'),
('approved_reports1443','public', 'journal_id'),
('audit_log','public', 'id'),
('audit_reviews136','public', 'id'),
('backup_audit113','public', 'id'),
('backup_registry113','public', 'table_name'),
('book_sessions136','public', 'id'),
('budget_settings14313','public', 'id'),
('budget_templates14313','public', 'id'),
('business_settings','public', 'id'),
('cashier_currency_counts','public', 'id'),
('cashier_shift_closes','public', 'id'),
('cashier_shift_tenders','public', 'id'),
('company_documents105','public', 'id'),
('currencies','public', 'code'),
('drive_draft_dispositions143160','public', 'sheet,draft'),
('employees','public', 'id'),
('entry_prefix_reservations','public', 'stem'),
('entry_submissions','public', 'id'),
('fund_adjustment_lines','public', 'id'),
('fund_adjustment_requests','public', 'id'),
('hope_messages183','public', 'id'),
('hope_reads183','public', 'message_id,app,actor'),
('hr_calendar_events14306','public', 'id'),
('hr_calendar_history14306','public', 'id'),
('hr_calendar_settings14306','public', 'id'),
('hr_inbox_audit143168','public', 'id'),
('hr_inbox143168','public', 'sheet,request_id'),
('journal_entries','public', 'id'),
('journal_lines','public', 'id'),
('journal_sources14253','public', 'journal_line_id,source_line_id'),
('legal_documents','public', 'id'),
('opening_state14234','public', 'id'),
('operation_receipts14228','public', 'actor_id,request_key'),
('operational_reports','public', 'id'),
('payroll_employees','public', 'id'),
('payroll_leave_records','public', 'id'),
('payroll_lines','public', 'id'),
('payroll_runs','public', 'id'),
('payroll_tax_settings','public', 'id'),
('period_findings','public', 'id'),
('presentation_settings113','public', 'area'),
('print_settings','public', 'id'),
('profiles','public', 'id'),
('record_deletions108','public', 'id'),
('recovery_audit113','public', 'id'),
('recurring_reminders','public', 'id'),
('recurring_transactions','public', 'id'),
('report_types14253','public', 'id'),
('review_routes14229','public', 'journal_id'),
('scanner_documents208','public', 'id'),
('scheduled_journal_occurrences','public', 'id'),
('scheduled_journals','public', 'id'),
('staff_entry_sequences','public', 'user_id'),
('staff_journal_lines','public', 'id'),
('staff_journals','public', 'id'),
('sub_accounts','public', 'id'),
('tax_sso_records','public', 'id'),
('todo_completions1443','public', 'id'),
('todo_starter_installs14335','public', 'owner_id'),
('transaction_template_lines','public', 'id'),
('transaction_templates','public', 'id'),
('upcoming_reminders14229','public', 'owner_id'),
('user_fund_assignments','public', 'id'),
('user_permissions','public', 'user_id'),
('user_print_preferences1434','public', 'owner_id'),
('voucher_sequences14299','public', 'year_no,kind'),
('voucher_settings14299','public', 'id'),
('voucher_versions14299','public', 'id'),
('vouchers14299','public', 'id'),
('workspace_actor_audit138','public', 'id'),
('workspace_notifications','public', 'id'),
('workspace_todos136','public', 'id'),
('year_closings136','public', 'year'),
('journal_fx_evidence288','public', 'entry_id'),
('reconciliation_versions306','private', 'record_id,saved_at'),
('budget_report_wording','public', 'report_id'),
('portable_leave328','private', 'run_id,employee_id,leave_date,leave_type'),
('journal_template_collections275','public', 'owner_id'),
('workspace_fund_revision379','public', 'owner_id'),
('payroll_corrections277','private', 'id'),
('journal_plans280','private', 'id'),
('journal_plan_occurrences280','private', 'plan_id,occurrence_no'),
('hub_leave_intake','public', 'id'),
('reconciliation_periods305','private', 'month'),
('reconciliation_settings305','private', 'singleton'),
('reconciliation_records305','private', 'record_id'),
('budget_payroll_amendments','private', 'id'),
('negative_fund_notices475','public', 'owner_id'),
('sub_account_reporting_links','public', 'sub_account_id'),
('budget_utilization_journals','private', 'report_id'),
('storage.objects','storage','id')) allowlist(t,s,pk) where p_table is null or t=p_table
 loop
  if rec.t='storage.objects' then source_sql:='(select id,bucket_id,name,created_at,updated_at,metadata->>''size'' as bytes from storage.objects)';
  else source_sql:=format('%I.%I',rec.s,rec.t); end if;
  if p_table is null then
   execute format('select jsonb_build_object(''count'',count(*),''bytes'',coalesce(sum(octet_length(raw)),0),''hash'',encode(sha256(convert_to(coalesce(string_agg(h,'''' order by h),''''),''UTF8'')),''hex'')) from (select raw,encode(sha256(convert_to(raw,''UTF8'')),''hex'') h from (select to_jsonb(x)::text raw from %s x) j) hashes',source_sql) into summary;
   result:=result||jsonb_build_object(rec.t,summary||jsonb_build_object('keys',string_to_array(rec.pk,',')));
  else
   select string_agg(format('x.%I',k),',') into ordering from unnest(string_to_array(rec.pk,',')) k;
   if rec.t='company_documents105' then ordering:='to_jsonb(x)::text'; end if;
   execute format('select coalesce(jsonb_agg(s.raw order by s.pos),''[]'') from (select to_jsonb(x)::text raw,row_number() over(order by %s) pos from %s x order by %s offset $1 limit $2) s',ordering,source_sql,ordering)
    into result using p_offset,p_limit;
   return result;
  end if;
 end loop;
 if p_table is not null then raise exception 'Unknown archive source'; end if;
 return result;
end $$;
revoke all on function public.accounting_archive_read(text,integer,integer) from public,anon;
grant execute on function public.accounting_archive_read(text,integer,integer) to authenticated;
