-- Active ledger: when an administrator removes the final audit record for a
-- voided main-journal entry, remove that entry and its lines in the same
-- transaction. Never recycle the normal posting sequence. Unposted sub-user
-- entries have no main journal ID and are outside this trigger's scope.
BEGIN;
CREATE OR REPLACE FUNCTION public.purge_voided_after_audit14260() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE target uuid;state text;
BEGIN
 IF OLD.table_name IS DISTINCT FROM 'journal_entries' OR
    OLD.record_id IS NULL OR OLD.record_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 THEN RETURN OLD; END IF;
 -- Audit deletion is administrator-only. A maintenance SQL cleanup uses its
 -- own explicit, separate script rather than silently purging journal records.
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RETURN OLD; END IF;
 target:=OLD.record_id::uuid;
 SELECT status::text INTO state FROM public.journal_entries WHERE id=target FOR UPDATE;
 IF state IS DISTINCT FROM 'voided' THEN RETURN OLD; END IF;
 IF EXISTS(SELECT 1 FROM public.audit_log WHERE table_name='journal_entries' AND record_id=target::text) THEN RETURN OLD; END IF;
 IF EXISTS(SELECT 1 FROM public.staff_journal_lines WHERE journal_entry_id=target) THEN
  RAISE EXCEPTION 'Voided journal remains linked to a sub-user report. Audit deletion rolled back.';
 END IF;
 -- Any other foreign-key references remain authoritative: a failed DELETE
 -- rolls back the audit deletion too. No CASCADE or trigger disabling.
 DELETE FROM public.journal_lines WHERE journal_entry_id=target;
 DELETE FROM public.journal_entries WHERE id=target AND status::text='voided';
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.purge_voided_after_audit14260() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS purge_voided_after_audit14260 ON public.audit_log;
CREATE TRIGGER purge_voided_after_audit14260 AFTER DELETE ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.purge_voided_after_audit14260();
COMMIT;
