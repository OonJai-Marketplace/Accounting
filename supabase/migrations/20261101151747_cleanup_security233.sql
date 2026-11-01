-- v143.233: preserve existing authorization while removing repeated work and
-- preventing accidental API exposure of future objects. No financial data writes.
SET lock_timeout = '3s';
SET statement_timeout = '30s';

-- These invoker functions only use built-ins or schema-qualified tables.
DO $hardening$
DECLARE signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.handle_updated_at()',
    'public.schedule_next_date91(date,text,text,integer,integer)',
    'public.ojm_guard_postable_account_20260929()'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, pg_temp', signature);
    END IF;
  END LOOP;
END $hardening$;

-- auth.uid() is constant for one SQL statement. Cache it once; retain the
-- policy command, roles, permissive/restrictive mode, ownership and WITH CHECK.
-- pg_policies renders existing subselects as " SELECT auth.uid() AS uid";
-- the negative lookbehind prevents wrapping an already cached call again.
DO $policies$
DECLARE p record; next_using text; next_check text; command text;
BEGIN
  FOR p IN SELECT * FROM pg_policies WHERE schemaname='public' LOOP
    next_using := regexp_replace(p.qual, '(?<!SELECT )auth[.]uid[(][)]', '(select auth.uid())', 'gi');
    next_check := regexp_replace(p.with_check, '(?<!SELECT )auth[.]uid[(][)]', '(select auth.uid())', 'gi');
    IF next_using IS DISTINCT FROM p.qual OR next_check IS DISTINCT FROM p.with_check THEN
      command := format('ALTER POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename);
      IF next_using IS NOT NULL THEN command:=command||' USING ('||next_using||')'; END IF;
      IF next_check IS NOT NULL THEN command:=command||' WITH CHECK ('||next_check||')'; END IF;
      EXECUTE command;
    END IF;
  END LOOP;
END $policies$;

-- Both policies currently express exactly the same admin access. Remove the
-- older duplicate only when every authorization field still matches.
DO $duplicate$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies a JOIN pg_policies b
      ON b.schemaname=a.schemaname AND b.tablename=a.tablename
    WHERE a.schemaname='public' AND a.tablename='payroll_runs'
      AND a.policyname='admin_all_payroll_runs' AND b.policyname='admin_records82'
      AND a.permissive=b.permissive AND a.roles=b.roles AND a.cmd=b.cmd
      AND a.qual IS NOT DISTINCT FROM b.qual
      AND a.with_check IS NOT DISTINCT FROM b.with_check
  ) THEN
    DROP POLICY admin_all_payroll_runs ON public.payroll_runs;
  END IF;
END $duplicate$;

-- This equality lookup is used by journal visibility checks. The live query
-- plan scanned staff_journal_lines because no leading index covered it.
CREATE INDEX IF NOT EXISTS staff_journal_lines_entry233_idx
  ON public.staff_journal_lines(journal_entry_id);

-- Existing objects keep all their grants. Future migrations must explicitly
-- grant intended API access and supply RLS before exposing tables.
-- PUBLIC's built-in function EXECUTE default must be revoked globally, not only
-- per schema. Keep service_role and all Supabase-managed owners unchanged.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

RESET lock_timeout;
RESET statement_timeout;
NOTIFY pgrst, 'reload schema';
