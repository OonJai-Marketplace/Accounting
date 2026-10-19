-- User-requested recovery of fully deleted manual IDs. Never rewind the sequence.
ALTER TABLE private.reusable_journal_ids143120 ADD COLUMN selected_by uuid;
CREATE OR REPLACE FUNCTION private.reusable_journal_ids143120(p_prefix text,p_date date,p_digits integer)
RETURNS TABLE(entry_no text,number bigint) LANGUAGE sql STABLE SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT r.entry_no,n.number FROM private.reusable_journal_ids143120 r
 CROSS JOIN LATERAL (SELECT CASE WHEN substring(r.entry_no from length(p_prefix)+3) ~ '^[0-9]{1,18}$' THEN substring(r.entry_no from length(p_prefix)+3)::bigint END number) n
 WHERE extract(year from r.entry_date)=extract(year from p_date)
 AND r.entry_no=private.format_entry_id143114(p_prefix,p_date,n.number,p_digits)
 AND NOT EXISTS(SELECT 1 FROM public.journal_entries e WHERE e.entry_no=r.entry_no)
 AND (r.selected_by IS NULL OR r.selected_by=auth.uid())
 ORDER BY (r.selected_by=auth.uid()) DESC NULLS LAST,n.number;
$$;
REVOKE ALL ON FUNCTION private.reusable_journal_ids143120(text,date,integer) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.purge_voided_after_audit14260()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE target uuid;state text; released public.journal_entries; latest boolean;
BEGIN
 IF OLD.table_name IS DISTINCT FROM 'journal_entries' OR
    OLD.record_id IS NULL OR OLD.record_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 THEN RETURN OLD; END IF;
 -- Audit deletion is administrator-only. A maintenance SQL cleanup uses its
 -- own explicit, separate script rather than silently purging journal records.
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RETURN OLD; END IF;
 PERFORM pg_advisory_xact_lock(143120,1);
 target:=OLD.record_id::uuid;
 SELECT status::text INTO state FROM public.journal_entries WHERE id=target FOR UPDATE;
 IF state IS DISTINCT FROM 'voided' THEN RETURN OLD; END IF;
 IF EXISTS(SELECT 1 FROM public.audit_log WHERE table_name='journal_entries' AND record_id=target::text) THEN RETURN OLD; END IF;
 IF EXISTS(SELECT 1 FROM public.staff_journal_lines WHERE journal_entry_id=target) THEN
  RAISE EXCEPTION 'Voided journal remains linked to a sub-user report. Audit deletion rolled back.';
 END IF;
 -- Any other foreign-key references remain authoritative: a failed DELETE
 -- rolls back the audit deletion too. No CASCADE or trigger disabling.
 SELECT * INTO released FROM public.journal_entries WHERE id=target;
 latest:=released.source='manual' AND NOT EXISTS(
  SELECT 1 FROM public.journal_entries e WHERE e.source='manual' AND e.id<>target
  AND (e.created_at,length(e.entry_no),e.entry_no)>(released.created_at,length(released.entry_no),released.entry_no));
 -- Freeze the complete voided entry before removing its lines. Failure rolls back the delete.
 INSERT INTO public.record_deletions108(table_name,record_id,record_data)
 SELECT 'journal_entries',e.id,jsonb_build_object('entry',to_jsonb(e),'lines',(SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.line_no),'[]') FROM public.journal_lines l WHERE l.journal_entry_id=e.id),'accounts',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.code),'[]') FROM public.accounts a WHERE a.id IN (SELECT account_id FROM public.journal_lines WHERE journal_entry_id=e.id)),'last_audit',to_jsonb(OLD),'archive_reason','Voided journal removed after its final audit record') FROM public.journal_entries e WHERE e.id=target;
 DELETE FROM public.journal_lines WHERE journal_entry_id=target;
 DELETE FROM public.journal_entries WHERE id=target AND status::text='voided';
 IF released.source='manual' THEN
  INSERT INTO private.reusable_journal_ids143120(entry_no,original_entry,entry_date)
  VALUES(released.entry_no,released.id,released.transaction_date) ON CONFLICT(entry_no) DO NOTHING;
 END IF;
 RETURN OLD;
END $function$

;

CREATE FUNCTION public.select_available_journal_id143121(p_entry_no text,p_date date,p_prefix text,p_digits integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE actor uuid:=auth.uid(); chosen text:=upper(trim(p_entry_no));
BEGIN
 IF actor IS NULL OR NOT public.is_admin() OR NOT public.has_user_permission('post') THEN
  RAISE EXCEPTION 'Administrator posting access required' USING ERRCODE='42501';
 END IF;
 PERFORM pg_advisory_xact_lock(143120,1);
 IF chosen IS NULL OR chosen='' THEN
  UPDATE private.reusable_journal_ids143120 SET selected_by=NULL WHERE selected_by=actor;
  RETURN NULL;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM private.reusable_journal_ids143120(upper(trim(p_prefix)),p_date,p_digits) r WHERE r.entry_no=chosen) THEN
  RAISE EXCEPTION 'ID is unavailable. Void the transaction and delete its final audit record first. Use the same year and ID format.';
 END IF;
 UPDATE private.reusable_journal_ids143120 SET selected_by=NULL WHERE selected_by=actor;
 UPDATE private.reusable_journal_ids143120 SET selected_by=actor WHERE entry_no=chosen;
 RETURN chosen;
END $$;
CREATE FUNCTION public.available_journal_ids143121(p_date date,p_prefix text,p_digits integer)
RETURNS TABLE(entry_no text,selected boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT r.entry_no,coalesce(t.selected_by=auth.uid(),false)
 FROM private.reusable_journal_ids143120(upper(trim(p_prefix)),p_date,p_digits) r
 JOIN private.reusable_journal_ids143120 t ON t.entry_no=r.entry_no;
END $$;
REVOKE ALL ON FUNCTION public.select_available_journal_id143121(text,date,text,integer),public.available_journal_ids143121(date,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.select_available_journal_id143121(text,date,text,integer),public.available_journal_ids143121(date,text,integer) TO authenticated;
