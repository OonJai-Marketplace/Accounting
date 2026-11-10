-- Apply after the v143.324 red/orange audit migrations.
-- The invoker-rights audit reader calls these pure classifiers under the signed-in role.
-- Neither helper reads audit tables. The audit reader and table policies enforce access.
GRANT EXECUTE ON FUNCTION public.audit_code143324(text, text, jsonb, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_money_delta143324(jsonb, jsonb, text, text) TO authenticated;
