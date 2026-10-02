-- READ ONLY. Run in Supabase SQL Editor to inspect installed security definitions.
-- Returns metadata, never accounting rows, passwords, or recovery tokens.
-- A table policy can still be too broad: inspect its USING and WITH CHECK rules.
BEGIN READ ONLY;
SELECT c.relname AS table_name,c.relrowsecurity AS rls_enabled,
 has_table_privilege('anon',c.oid,'SELECT') AS anonymous_select,
 has_table_privilege('authenticated',c.oid,'SELECT') AS signed_in_select,
 has_table_privilege('authenticated',c.oid,'INSERT') AS signed_in_insert,
 has_table_privilege('authenticated',c.oid,'UPDATE') AS signed_in_update,
 has_table_privilege('authenticated',c.oid,'DELETE') AS signed_in_delete
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname;
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY schemaname,tablename,policyname;
SELECT p.oid::regprocedure::text AS function_name,p.prosecdef AS security_definer,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anonymous_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS signed_in_execute,
 pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prokind='f' AND
 (p.proname~'(permission|workspace|staff|journal|backup|archive|report|admin|profile|reset|recovery)')
ORDER BY p.proname,p.oid;
COMMIT;
