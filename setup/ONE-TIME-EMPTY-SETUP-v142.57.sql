-- OPTIONAL: run only while preparing an EMPTY practice ledger for first use.
-- This does not delete transactions, audit history, receipts, or closing records.
-- Reopens opening balances and starts journal numbering at 1 for initial use only.
-- Any retained journal identity blocks the reset. Never attach this to audit deletion.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.initial_number_reset14257(id boolean PRIMARY KEY DEFAULT true CHECK(id),done_at timestamptz NOT NULL DEFAULT now(),previous_opening jsonb,previous_number bigint);
REVOKE ALL ON private.initial_number_reset14257 FROM PUBLIC,anon,authenticated;
LOCK TABLE public.journal_entries IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.accounting_periods, public.audit_log IN SHARE ROW EXCLUSIVE MODE;
DO $$DECLARE t text; populated boolean; BEGIN
 IF EXISTS(SELECT 1 FROM private.initial_number_reset14257) THEN RAISE EXCEPTION 'The one-time initial numbering reset has already been used'; END IF;
 IF EXISTS(SELECT 1 FROM public.journal_entries) THEN RAISE EXCEPTION 'Journal records still exist, including any retained voided entries. Numbering was not reset.'; END IF;
 FOR t IN SELECT unnest(ARRAY['journal_lines','year_closings136','accounting_archives','archive_batches','staff_journal_lines']) LOOP
  IF to_regclass('public.'||t) IS NOT NULL THEN
   EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE',t);
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I)',t) INTO populated;
   IF populated THEN RAISE EXCEPTION 'Retained records in % block the initial reset. Use the established practice-data reset workflow first.',t; END IF;
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.audit_log WHERE table_name IN ('journal_entries','journal_lines','year_closings136')) THEN RAISE EXCEPTION 'Financial audit records still retain previous IDs. Initial setup was not reset.'; END IF;
 -- Old retry receipts are deliberately preserved: retrying an old request must
 -- return its old result rather than creating another transaction after setup.
 IF EXISTS(SELECT 1 FROM public.accounting_periods WHERE status<>'open') THEN RAISE EXCEPTION 'Closed periods block initial numbering reset'; END IF;
 IF to_regclass('public.opening_state14234') IS NULL THEN RAISE EXCEPTION 'Install the opening balance SQL first'; END IF;
 INSERT INTO private.initial_number_reset14257(id,previous_opening,previous_number)
 SELECT true,(SELECT to_jsonb(s) FROM public.opening_state14234 s WHERE id),(SELECT last_value FROM public.journal_entry_number_seq);
 UPDATE public.opening_state14234 SET closed=false,generation=gen_random_uuid(),request_key=NULL,payload=NULL,result=NULL WHERE id;

END $$;
-- Transactional sequence restart; posting is blocked by the journal table lock.
ALTER SEQUENCE public.journal_entry_number_seq RESTART WITH 1;
COMMIT;
