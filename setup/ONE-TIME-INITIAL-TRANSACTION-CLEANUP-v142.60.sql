-- INITIAL SETUP ONLY. Clear the five confirmed voided main-journal samples,
-- unposted sub-user entries and review/transaction records in one transaction.
-- Separate sub-user numbers never allocate from or reset the main journal sequence.
-- Preserves accounts, settings, people, HR, payroll, tax, audit history and receipts.
-- Run in Supabase SQL Editor as database owner while other users are signed out.
BEGIN;
SET LOCAL lock_timeout='10s';
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.initial_number_reset14257(id boolean PRIMARY KEY DEFAULT true CHECK(id),done_at timestamptz NOT NULL DEFAULT now(),previous_opening jsonb,previous_number bigint);
REVOKE ALL ON private.initial_number_reset14257 FROM PUBLIC,anon,authenticated;
LOCK TABLE public.journal_entries,public.journal_lines IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.accounting_periods,public.audit_log,public.opening_state14234 IN SHARE ROW EXCLUSIVE MODE;
DO $cleanup$
DECLARE
 expected uuid[]:=ARRAY['7e1de261-b2ec-441c-a6de-dac59c884a03','85251586-0794-48ef-8bca-f4b55644dfde','c1e73845-03c8-44a7-97f6-4311690b7553','7744add0-6ce7-4840-a79d-e6e84cb4846b','e2daffb6-8874-4a5e-8637-93888f39cc63']::uuid[];
 relations oid[]; seeds oid[]; r record; t text; populated boolean; names text;
BEGIN
 IF EXISTS(SELECT 1 FROM private.initial_number_reset14257) THEN RAISE EXCEPTION 'Initial setup reset was already used. Nothing was deleted.'; END IF;
 IF (SELECT count(*) FROM public.journal_entries)<>5
 OR EXISTS(SELECT 1 FROM public.journal_entries WHERE NOT(id=ANY(expected)) OR status::text IS DISTINCT FROM 'voided')
 THEN RAISE EXCEPTION 'Journal records changed: expected exactly the five confirmed voided samples. Nothing was deleted.'; END IF;
 IF (SELECT count(*) FROM public.journal_lines)<>10
 OR EXISTS(SELECT 1 FROM public.journal_lines WHERE journal_entry_id IS NULL OR NOT(journal_entry_id=ANY(expected)))
 OR EXISTS(SELECT 1 FROM public.journal_entries e WHERE (SELECT count(*) FROM public.journal_lines l WHERE l.journal_entry_id=e.id)<>2)
 THEN RAISE EXCEPTION 'Journal lines changed: expected two lines for each sample. Nothing was deleted.'; END IF;
 IF EXISTS(SELECT 1 FROM public.audit_log WHERE table_name IN ('journal_entries','journal_lines','year_closings136')) THEN RAISE EXCEPTION 'Financial audit records remain. Nothing was deleted.'; END IF;
 IF EXISTS(SELECT 1 FROM public.accounting_periods WHERE status IS DISTINCT FROM 'open') THEN RAISE EXCEPTION 'A closed or non-open period blocks initial cleanup.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.opening_state14234 WHERE id AND closed) THEN RAISE EXCEPTION 'Expected closed opening setup was not found.'; END IF;
 FOREACH t IN ARRAY ARRAY['year_closings136','accounting_archives','archive_batches'] LOOP
  IF to_regclass('public.'||t) IS NOT NULL THEN
   EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE',t);
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I)',t) INTO populated;
   IF populated THEN RAISE EXCEPTION 'Retained records in % block initial cleanup. Nothing was deleted.',t; END IF;
  END IF;
 END LOOP;
 -- Use the established reset catalog for the requested transaction and sub-user
 -- scopes. Staff entry sequences belong to user settings and are not selected.
 SELECT array_agg(DISTINCT to_regclass(format('public.%I',scope_table.value))::oid) INTO seeds
 FROM jsonb_array_elements(public.reset_scope_catalog14232()) sc
 CROSS JOIN LATERAL jsonb_array_elements_text(sc->'tables') scope_table(value)
 WHERE sc->>'id'=ANY(ARRAY['journal','periods','submissions','scheduled','staff','funds'])
 AND to_regclass(format('public.%I',scope_table.value)) IS NOT NULL;
 IF seeds IS NULL OR NOT('public.staff_journal_lines'::regclass::oid=ANY(seeds))
 THEN RAISE EXCEPTION 'Expected transaction and staff reset catalog is not installed. Nothing was deleted.'; END IF;
 -- Extend to the FK closure only for empty supporting tables. Protected areas
 -- are never truncated, even when empty.
 WITH RECURSIVE linked(rel) AS (
  SELECT unnest(seeds)
  UNION SELECT c.conrelid FROM pg_constraint c JOIN linked l ON c.confrelid=l.rel WHERE c.contype='f'
 ) SELECT array_agg(rel ORDER BY rel) INTO relations FROM linked;
 FOR r IN SELECT c.oid,n.nspname,c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=ANY(relations) ORDER BY c.oid LOOP
  IF r.nspname<>'public' OR r.relkind<>'r' OR EXISTS(SELECT 1 FROM pg_inherits WHERE inhparent=r.oid OR inhrelid=r.oid)
  THEN RAISE EXCEPTION 'Related table % requires separate review.',r.relname; END IF;
  EXECUTE format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE',r.nspname,r.relname);
  IF r.relname=ANY(ARRAY['accounts','sub_accounts','currencies','profiles','user_permissions','user_fund_assignments','business_settings','accounting_id_settings','print_settings','presentation_settings113','payroll_runs','payroll_lines','payroll_employees','payroll_leave_records','employees','legal_documents','tax_sso_records','staff_entry_sequences','entry_prefix_reservations','audit_log','record_deletions108','operation_receipts14228']) THEN
   RAISE EXCEPTION 'Protected area % is linked to these records. Nothing was deleted.',r.relname; END IF;
  IF NOT(r.oid=ANY(seeds)) THEN
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I)',r.nspname,r.relname) INTO populated;
   IF populated THEN RAISE EXCEPTION 'Related table % contains records. Nothing was deleted.',r.relname; END IF;
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=ANY(relations) AND NOT tgisinternal AND (tgtype::integer & 32)>0)
 THEN RAISE EXCEPTION 'A custom truncate trigger requires review. Nothing was deleted.'; END IF;
 INSERT INTO private.initial_number_reset14257(id,previous_opening,previous_number)
 SELECT true,(SELECT to_jsonb(s) FROM public.opening_state14234 s WHERE id),(SELECT last_value FROM public.journal_entry_number_seq);
 SELECT string_agg(format('%I.%I',n.nspname,c.relname),', ' ORDER BY c.oid) INTO names FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=ANY(relations);
 EXECUTE 'TRUNCATE TABLE '||names||' RESTRICT';
 -- Clear only audit rows for the selected sub-user/transaction scopes.
 -- HR and payroll audit history remains untouched.
 DELETE FROM public.audit_log WHERE table_name=ANY(ARRAY[
  'staff_journals','staff_journal_lines','entry_submissions','approved_reports1443',
  'review_routes14229','report_review_steps14229','fund_adjustment_requests',
  'fund_adjustment_lines','scheduled_journals','scheduled_journal_lines',
  'scheduled_journal_occurrences','recurring_transactions']);
 UPDATE public.opening_state14234 SET closed=false,generation=gen_random_uuid(),request_key=NULL,payload=NULL,result=NULL WHERE id;
END $cleanup$;
ALTER SEQUENCE public.journal_entry_number_seq RESTART WITH 1;
COMMIT;
SELECT (SELECT count(*) FROM public.journal_entries) AS journal_count,
 (SELECT count(*) FROM public.journal_lines) AS journal_line_count,
 (SELECT count(*) FROM public.staff_journal_lines) AS sub_user_lines,
 (SELECT closed FROM public.opening_state14234 WHERE id) AS opening_setup_closed,
 (SELECT CASE WHEN is_called THEN last_value+1 ELSE last_value END FROM public.journal_entry_number_seq) AS next_journal_number;
