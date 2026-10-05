-- Read-only installation diagnostics. Run after the new migration in STAGING.
BEGIN TRANSACTION READ ONLY;
SELECT 'required_functions' AS check_name,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
 p.prosecdef AS security_definer,has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anonymous_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
AND p.proname=ANY(ARRAY['current_access14228','admin_save_access1441','post_manual_journal14228','post_journal_batch14228','journal_receipt14228','save_staff_workspace_entry_v3','save_staff_editor1437','report_access1443','workspace_pre_request138']) ORDER BY p.proname;
SELECT 'obsolete_endpoints_denied' AS check_name,p.proname,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
AND p.proname=ANY(ARRAY['approve_staff_journal','save_staff_workspace_entry_v2','add_staff_workspace_entry']);
SELECT 'api_hook' AS check_name,r.rolname,s.setdatabase,setting FROM pg_db_role_setting s
 JOIN pg_roles r ON r.oid=s.setrole CROSS JOIN LATERAL unnest(s.setconfig) setting
 WHERE r.rolname='authenticator' AND setting LIKE 'pgrst.db_pre_request=%';
SELECT 'chained_hook' AS check_name,previous_hook::text FROM public.workspace_hook_config138 WHERE id;
SELECT 'ledger_constraint_triggers' AS check_name,c.relname,t.tgname,t.tgdeferrable,t.tginitdeferred
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE t.tgname='ledger_integrity14228';
SELECT 'recovery_truncate_denied' AS check_name,
 has_table_privilege('anon','public.record_deletions108','TRUNCATE') AS anonymous_truncate,
 has_table_privilege('authenticated','public.record_deletions108','TRUNCATE') AS authenticated_truncate;
SELECT 'existing_posted_journals_needing_review' AS check_name,count(*) AS count FROM public.journal_entries e
 WHERE e.status::text='posted' AND ((SELECT count(*) FROM public.journal_lines WHERE journal_entry_id=e.id)<2
 OR EXISTS(SELECT 1 FROM public.journal_lines WHERE journal_entry_id=e.id GROUP BY currency_code HAVING sum(debit)<>sum(credit))
 OR EXISTS(SELECT 1 FROM public.journal_lines l JOIN public.accounts a ON a.id=l.account_id WHERE l.journal_entry_id=e.id AND l.currency_code IS DISTINCT FROM a.currency_code));
SELECT 'nonadmin_mixed_workspace_accounts' AS check_name,count(*) AS count FROM public.profiles p
 JOIN public.restaurant_members121 m ON m.user_id=p.id JOIN public.user_permissions u ON u.user_id=p.id
 WHERE p.role<>'admin' AND (cardinality(u.assigned_fund_account_ids)>0 OR cardinality(u.modules)>0 OR coalesce(u.module_actions113,'{}')<>'{}'::jsonb);
COMMIT;
