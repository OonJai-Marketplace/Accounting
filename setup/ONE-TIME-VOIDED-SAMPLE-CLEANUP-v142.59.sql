-- INITIAL SETUP ONLY. Permanently removes the five voided samples confirmed
-- on 2026-10-06 and their ten lines. Run as database owner in Supabase SQL Editor.
-- Reopens opening balances and restarts journal numbering at 1 in one transaction.
-- Does not delete accounts, users, settings, audits, receipts, or closing records.
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
 relations oid[]; r record; t text; populated boolean; names text;
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
 FOREACH t IN ARRAY ARRAY['year_closings136','accounting_archives','archive_batches','staff_journal_lines'] LOOP
  IF to_regclass('public.'||t) IS NOT NULL THEN
   EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE',t);
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I)',t) INTO populated;
   IF populated THEN RAISE EXCEPTION 'Retained records in % block initial cleanup. Nothing was deleted.',t; END IF;
  END IF;
 END LOOP;
 -- Like the existing practice-data reset, use TRUNCATE RESTRICT. Its FK closure
 -- may include empty dependent tables, but NO additional populated table.
 -- No CASCADE, trigger disabling, role impersonation, or constraint removal.
 WITH RECURSIVE linked(rel) AS (
  SELECT unnest(ARRAY['public.journal_entries'::regclass::oid,'public.journal_lines'::regclass::oid])
  UNION SELECT c.conrelid FROM pg_constraint c JOIN linked l ON c.confrelid=l.rel WHERE c.contype='f'
 ) SELECT array_agg(rel ORDER BY rel) INTO relations FROM linked;
 FOR r IN SELECT c.oid,n.nspname,c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=ANY(relations) ORDER BY c.oid LOOP
  IF r.nspname<>'public' OR r.relkind<>'r' OR EXISTS(SELECT 1 FROM pg_inherits WHERE inhparent=r.oid OR inhrelid=r.oid)
  THEN RAISE EXCEPTION 'Related table % requires separate review.',r.relname; END IF;
  EXECUTE format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE',r.nspname,r.relname);
  IF r.oid NOT IN ('public.journal_entries'::regclass::oid,'public.journal_lines'::regclass::oid) THEN
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
 UPDATE public.opening_state14234 SET closed=false,generation=gen_random_uuid(),request_key=NULL,payload=NULL,result=NULL WHERE id;
END $cleanup$;
ALTER SEQUENCE public.journal_entry_number_seq RESTART WITH 1;
COMMIT;
SELECT (SELECT count(*) FROM public.journal_entries) AS journal_count,
 (SELECT count(*) FROM public.journal_lines) AS journal_line_count,
 (SELECT closed FROM public.opening_state14234 WHERE id) AS opening_setup_closed,
 (SELECT CASE WHEN is_called THEN last_value+1 ELSE last_value END FROM public.journal_entry_number_seq) AS next_journal_number;
