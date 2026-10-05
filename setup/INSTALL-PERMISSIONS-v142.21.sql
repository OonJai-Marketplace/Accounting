-- Historical installer. Preserved for reference only after v142.28.
DO $$ BEGIN RAISE EXCEPTION 'Superseded installer: use INSTALL-SECURITY-v142.28.sql and START-HERE-v142.28.txt';END $$;
-- Apply as the database owner after reviewing this file. No accounting records are changed.
-- Updates saved-report access: active account, assigned owner/reviewer,
-- View + Export permissions, and only report-related accounts and their parents.
-- Also adds atomic administrator role/permission saving.
-- This file has not been executed against the live database.
BEGIN;
create or replace function public.staff_report1434(p_journal uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.staff_journals%rowtype; actor_permissions jsonb; owner_permissions jsonb;
 source_lines jsonb; posted_entries jsonb; account_rows jsonb; user_data jsonb;
 linked uuid[]; permitted boolean; reviewer boolean;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Active sign-in required'; end if;
 select * into j from public.staff_journals where id=p_journal;
 if not found then raise exception 'Saved report not found'; end if;
 select to_jsonb(p) into actor_permissions from public.user_permissions p where user_id=auth.uid();
 select to_jsonb(p) into owner_permissions from public.user_permissions p where user_id=j.owner_id;
 permitted:=coalesce(actor_permissions->'module_actions113'->'document-editor105','[]'::jsonb) @> '["view","export"]'::jsonb;
 reviewer:=coalesce(actor_permissions->'module_actions113'->'user-entry-review','[]'::jsonb) @> '["view","export"]'::jsonb
  and owner_permissions->>'manager_id'=auth.uid()::text;
 if not public.is_admin() then
  if not coalesce(permitted,false) or not ((j.owner_id=auth.uid() and coalesce(actor_permissions->'module_actions113'->'sub-users-workspace','[]'::jsonb) @> '["view"]'::jsonb) or coalesce(reviewer,false)) then raise exception 'Report print permission required'; end if;
  if j.status::text not in ('approved','posted','reviewed','approved_posted') then raise exception 'Only approved reports can be printed'; end if;
 end if;
 select coalesce(jsonb_agg(to_jsonb(l) order by l.transaction_date,l.line_no),'[]'::jsonb),
  coalesce(array_agg(distinct l.journal_entry_id) filter(where l.journal_entry_id is not null),array[]::uuid[])
 into source_lines,linked from public.staff_journal_lines l where staff_journal_id=j.id;
 select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('lines',
  (select coalesce(jsonb_agg(to_jsonb(l) order by l.id),'[]'::jsonb) from public.journal_lines l where l.journal_entry_id=e.id))),'[]'::jsonb)
 into posted_entries from public.journal_entries e where e.id=any(linked) and e.status::text='posted';
 if jsonb_array_length(posted_entries)<>cardinality(linked) then raise exception 'A linked journal is missing or no longer posted. Review this report before printing'; end if;
 with recursive report_account_ids(id) as (
  select a.id from public.accounts a where a.id in (
   select account_id from public.staff_journal_lines where staff_journal_id=j.id
   union select fund_account_id from public.staff_journal_lines where staff_journal_id=j.id
   union select account_id from public.journal_lines where journal_entry_id=any(linked)
  )
  union
  select parent.id from public.accounts parent join public.accounts child
   on parent.code=to_jsonb(child)->>'parent_code'
  join report_account_ids selected on selected.id=child.id
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'code',a.code,'name',a.name,
  'currency_code',a.currency_code,'account_type',a.account_type,'parent_code',to_jsonb(a)->>'parent_code')),'[]'::jsonb)
 into account_rows from public.accounts a join report_account_ids selected on selected.id=a.id;
 select jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,'role',p.role,'job_title',owner_permissions->>'job_title') into user_data
 from public.profiles p where p.id=j.owner_id;
 return jsonb_build_object('journal',to_jsonb(j)||jsonb_build_object('lines',source_lines),
  'user',user_data,'accounts',account_rows,'posted',posted_entries);
end $$;
revoke all on function public.staff_report1434(uuid) from public;
grant execute on function public.staff_report1434(uuid) to authenticated;

-- Role and permission updates commit together or roll back together.
CREATE OR REPLACE FUNCTION public.admin_save_access1441(
 p_user uuid,p_name text,p_role text,p_permissions jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor AND status='active' AND role='admin') THEN
  RAISE EXCEPTION 'Active administrator required' USING ERRCODE='42501';
 END IF;
 IF p_user IS NULL OR p_role NOT IN ('admin','submitter') OR p_role IS NULL OR nullif(btrim(p_name),'') IS NULL THEN RAISE EXCEPTION 'Invalid user details';END IF;
 IF jsonb_typeof(p_permissions) IS DISTINCT FROM 'object' OR p_permissions->>'user_id' IS DISTINCT FROM p_user::text
  OR jsonb_typeof(p_permissions->'module_actions113') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid permission map';END IF;
 PERFORM 1 FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found. Refresh Users.';END IF;
 UPDATE public.profiles SET (full_name,role)=(SELECT r.full_name,r.role FROM jsonb_populate_record(NULL::public.profiles,jsonb_build_object('full_name',p_name,'role',p_role)) r) WHERE id=p_user;
 INSERT INTO public.user_permissions (user_id,user_type,manager_id,job_title,modules,can_approve,can_post_directly,can_void,can_export,can_manage_data,module_actions113,allow_any_account,allowed_account_ids,destination_account_ids,assigned_fund_account_ids,fund_allocations,default_out_credit_account_id,default_in_debit_account_id,allowed_directions,allow_multiple_funds,money_in_counterpart_account_id,entry_prefix,entry_initials,entry_digits,updated_by,updated_at)
 SELECT r.user_id,r.user_type,r.manager_id,r.job_title,r.modules,r.can_approve,r.can_post_directly,r.can_void,r.can_export,r.can_manage_data,r.module_actions113,r.allow_any_account,r.allowed_account_ids,r.destination_account_ids,r.assigned_fund_account_ids,r.fund_allocations,r.default_out_credit_account_id,r.default_in_debit_account_id,r.allowed_directions,r.allow_multiple_funds,r.money_in_counterpart_account_id,r.entry_prefix,r.entry_initials,r.entry_digits,r.updated_by,r.updated_at FROM jsonb_populate_record(NULL::public.user_permissions,
  p_permissions||jsonb_build_object('user_id',p_user,'updated_by',actor,'updated_at',now())) r
 ON CONFLICT (user_id) DO UPDATE SET user_type=EXCLUDED.user_type,manager_id=EXCLUDED.manager_id,job_title=EXCLUDED.job_title,modules=EXCLUDED.modules,can_approve=EXCLUDED.can_approve,can_post_directly=EXCLUDED.can_post_directly,can_void=EXCLUDED.can_void,can_export=EXCLUDED.can_export,can_manage_data=EXCLUDED.can_manage_data,module_actions113=EXCLUDED.module_actions113,allow_any_account=EXCLUDED.allow_any_account,allowed_account_ids=EXCLUDED.allowed_account_ids,destination_account_ids=EXCLUDED.destination_account_ids,assigned_fund_account_ids=EXCLUDED.assigned_fund_account_ids,fund_allocations=EXCLUDED.fund_allocations,default_out_credit_account_id=EXCLUDED.default_out_credit_account_id,default_in_debit_account_id=EXCLUDED.default_in_debit_account_id,allowed_directions=EXCLUDED.allowed_directions,allow_multiple_funds=EXCLUDED.allow_multiple_funds,money_in_counterpart_account_id=EXCLUDED.money_in_counterpart_account_id,entry_prefix=EXCLUDED.entry_prefix,entry_initials=EXCLUDED.entry_initials,entry_digits=EXCLUDED.entry_digits,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at;
 RETURN jsonb_build_object('user_id',p_user,'saved',true);
END $$;
REVOKE ALL ON FUNCTION public.admin_save_access1441(uuid,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_save_access1441(uuid,text,text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
