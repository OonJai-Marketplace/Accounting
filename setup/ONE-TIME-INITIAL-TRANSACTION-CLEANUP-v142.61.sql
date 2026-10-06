-- INITIAL SETUP ONLY. Clear the five confirmed voided main-journal samples,
-- unposted sub-user entries and review/transaction records in one transaction.
-- Separate sub-user numbers never allocate from or reset the main journal sequence.
-- Preserves accounts, settings, people, HR, payroll, tax, audit history and receipts.
-- Run in Supabase SQL Editor as database owner while other users are signed out.
BEGIN;
SET LOCAL lock_timeout='10s';
SET LOCAL search_path=public,pg_catalog;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.initial_number_reset14257(id boolean PRIMARY KEY DEFAULT true CHECK(id),done_at timestamptz NOT NULL DEFAULT now(),previous_opening jsonb,previous_number bigint);
REVOKE ALL ON private.initial_number_reset14257 FROM PUBLIC,anon,authenticated;
LOCK TABLE public.journal_entries,public.journal_lines IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.accounting_periods,public.audit_log,public.opening_state14234 IN SHARE ROW EXCLUSIVE MODE;
DO $cleanup$
DECLARE
 expected uuid[]:=ARRAY['7e1de261-b2ec-441c-a6de-dac59c884a03','85251586-0794-48ef-8bca-f4b55644dfde','c1e73845-03c8-44a7-97f6-4311690b7553','7744add0-6ce7-4840-a79d-e6e84cb4846b','e2daffb6-8874-4a5e-8637-93888f39cc63']::uuid[];
 relations oid[]; seeds oid[]; r record; fk record; t text; populated boolean; names text;
 protected text[]:=ARRAY['accounts','sub_accounts','currencies','profiles','user_permissions','user_fund_assignments','business_settings','accounting_id_settings','print_settings','presentation_settings113','payroll_runs','payroll_lines','payroll_employees','payroll_leave_records','employees','legal_documents','tax_sso_records','staff_entry_sequences','entry_prefix_reservations','audit_log','record_deletions108','operation_receipts14228'];
 restore_sql text[]:=ARRAY[]::text[];statement text;predicate text; linked_rows boolean;
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
 -- are never truncated, even when empty. References from protected tables are
 -- checked separately and their constraints restored within this transaction.
 WITH RECURSIVE linked(rel) AS (
  SELECT unnest(seeds)
  UNION SELECT c.conrelid FROM pg_constraint c JOIN linked l ON c.confrelid=l.rel
   JOIN pg_class ch ON ch.oid=c.conrelid JOIN pg_namespace ns ON ns.oid=ch.relnamespace
   WHERE c.contype='f' AND ns.nspname='public' AND NOT ch.relname=ANY(protected)
 ) SELECT array_agg(rel ORDER BY rel) INTO relations FROM linked;
 FOR r IN SELECT c.oid,n.nspname,c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=ANY(relations) ORDER BY c.oid LOOP
  IF r.nspname<>'public' OR r.relkind<>'r' OR EXISTS(SELECT 1 FROM pg_inherits WHERE inhparent=r.oid OR inhrelid=r.oid)
  THEN RAISE EXCEPTION 'Related table % requires separate review.',r.relname; END IF;
  EXECUTE format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE',r.nspname,r.relname);
  IF r.relname=ANY(protected) THEN
   RAISE EXCEPTION 'Protected area % is linked to these records. Nothing was deleted.',r.relname; END IF;
  IF NOT(r.oid=ANY(seeds)) THEN
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I)',r.nspname,r.relname) INTO populated;
   IF populated THEN RAISE EXCEPTION 'Related table % contains records. Nothing was deleted.',r.relname; END IF;
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=ANY(relations) AND NOT tgisinternal AND (tgtype::integer & 32)>0)
 THEN RAISE EXCEPTION 'A custom truncate trigger requires review. Nothing was deleted.'; END IF;
 -- Temporarily lift only FK declarations from protected tables to selected
 -- transaction tables, after proving none of their rows references ANY selected
 -- row. Recreate each original declaration before commit. Any error rolls back
 -- the entire transaction and restores all constraints automatically.
 FOR fk IN SELECT c.oid,c.conname,c.conrelid,c.confrelid,c.conkey,c.confkey,
                  c.convalidated,ch.relname AS child_name,ns.nspname AS child_schema
  FROM pg_constraint c JOIN pg_class ch ON ch.oid=c.conrelid
  JOIN pg_namespace ns ON ns.oid=ch.relnamespace
  WHERE c.contype='f' AND c.confrelid=ANY(relations) AND NOT(c.conrelid=ANY(relations))
  ORDER BY c.oid
 LOOP
  IF fk.child_schema<>'public' OR NOT fk.child_name=ANY(protected) THEN
   RAISE EXCEPTION 'Unexpected linked table %. Nothing was deleted.',fk.child_name; END IF;
  EXECUTE format('LOCK TABLE %s IN ACCESS EXCLUSIVE MODE',fk.conrelid::regclass);
  SELECT string_agg(format('c.%I=p.%I',child_col.attname,parent_col.attname),' AND ' ORDER BY key.ord)
  INTO predicate FROM unnest(fk.conkey,fk.confkey) WITH ORDINALITY AS key(child_att,parent_att,ord)
   JOIN pg_attribute child_col ON child_col.attrelid=fk.conrelid AND child_col.attnum=key.child_att
   JOIN pg_attribute parent_col ON parent_col.attrelid=fk.confrelid AND parent_col.attnum=key.parent_att;
  IF predicate IS NULL THEN RAISE EXCEPTION 'Could not inspect foreign key %. Nothing was deleted.',fk.conname; END IF;
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM %s c JOIN %s p ON %s)',fk.conrelid::regclass,fk.confrelid::regclass,predicate) INTO linked_rows;
  IF linked_rows THEN RAISE EXCEPTION 'Protected area % has rows linked to the selected transactions. Nothing was deleted.',fk.child_name; END IF;
  statement:=format('ALTER TABLE %s ADD CONSTRAINT %I %s',fk.conrelid::regclass,fk.conname,pg_get_constraintdef(fk.oid));
  IF NOT fk.convalidated AND position('NOT VALID' IN statement)=0 THEN statement:=statement||' NOT VALID'; END IF;
  restore_sql:=array_append(restore_sql,statement);
  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',fk.conrelid::regclass,fk.conname);
 END LOOP;
 INSERT INTO private.initial_number_reset14257(id,previous_opening,previous_number)
 SELECT true,(SELECT to_jsonb(s) FROM public.opening_state14234 s WHERE id),(SELECT last_value FROM public.journal_entry_number_seq);
 SELECT string_agg(format('%I.%I',n.nspname,c.relname),', ' ORDER BY c.oid) INTO names FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=ANY(relations);
 EXECUTE 'TRUNCATE TABLE '||names||' RESTRICT';
 FOREACH statement IN ARRAY restore_sql LOOP EXECUTE statement; END LOOP;
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
