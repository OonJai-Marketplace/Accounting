CREATE OR REPLACE FUNCTION private.latest_journal_record143124(p_record text)
RETURNS boolean LANGUAGE sql VOLATILE SET search_path=pg_catalog,public,pg_temp AS $$
 WITH target AS (
  SELECT entry_no,transaction_date entry_date FROM public.journal_entries WHERE id::text=p_record AND source='manual'
  UNION ALL SELECT entry_no,entry_date FROM private.reusable_journal_ids143120 WHERE original_entry::text=p_record
 ), issued AS (
  SELECT entry_no FROM public.journal_entries UNION SELECT r.entry_no FROM private.reusable_journal_ids143120 r WHERE EXISTS(SELECT 1 FROM public.audit_log a WHERE a.table_name='journal_entries' AND a.record_id=r.original_entry::text) OR EXISTS(SELECT 1 FROM public.record_deletions108 d WHERE d.table_name='journal_entries' AND d.record_id::text=r.original_entry::text)
 ), numbered AS (
  SELECT i.entry_no,s.journal_prefix prefix,s.journal_digits digits,
   CASE WHEN substring(i.entry_no from length(s.journal_prefix)+3) ~ '^[0-9]{1,18}$'
    THEN substring(i.entry_no from length(s.journal_prefix)+3)::bigint END number
  FROM issued i CROSS JOIN public.accounting_id_settings s
 )
 SELECT coalesce(bool_or(t.entry_no=private.format_entry_id143114(s.journal_prefix,t.entry_date,
  (SELECT max(n.number) FROM numbered n WHERE n.entry_no=private.format_entry_id143114(n.prefix,t.entry_date,n.number,n.digits)),s.journal_digits)),false)
 FROM target t CROSS JOIN public.accounting_id_settings s;
$$;
CREATE OR REPLACE FUNCTION private.audit_delete_policy143124(p_source text,p_id text)
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE a public.audit_log; d public.record_deletions108;
BEGIN
 IF p_source='audit_log' THEN
  SELECT * INTO a FROM public.audit_log WHERE id::text=p_id;
  IF NOT FOUND THEN RETURN 'missing';END IF;
  IF a.table_name='journal_entries' AND (EXISTS(SELECT 1 FROM public.journal_entries WHERE id::text=a.record_id AND status='voided') OR EXISTS(SELECT 1 FROM private.reusable_journal_ids143120 WHERE original_entry::text=a.record_id)) THEN
   RETURN CASE WHEN private.latest_journal_record143124(a.record_id) THEN 'latest' ELSE 'protected' END;
  END IF;
  IF a.table_name='journal_entries' AND NOT EXISTS(SELECT 1 FROM public.journal_entries WHERE id::text=a.record_id AND status<>'voided') THEN RETURN 'protected';END IF;
  IF upper(a.action) IN ('POST','AUTO_POST','SCHEDULE_POST_ADVANCE','CREATE_SCHEDULE','MAINTENANCE_CLOSE','SUBMIT','REVIEW','REVIEW_FORWARD','APPROVE','APPROVE_AND_POST','LINK') THEN RETURN 'green';END IF;
  IF a.table_name='journal_entries' AND private.latest_journal_record143124(a.record_id) THEN RETURN 'latest_active';END IF;
  RETURN 'protected';
 ELSIF p_source='record_deletions108' THEN
  SELECT * INTO d FROM public.record_deletions108 WHERE id::text=p_id;
  IF NOT FOUND THEN RETURN 'missing';END IF;
  RETURN CASE WHEN d.table_name='journal_entries' AND private.latest_journal_record143124(d.record_id::text) THEN 'latest' ELSE 'protected' END;
 END IF;
 RETURN 'protected';
END $$;
REVOKE ALL ON FUNCTION private.latest_journal_record143124(text),private.audit_delete_policy143124(text,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.protect_audit_delete143124()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required';END IF;
 PERFORM pg_advisory_xact_lock(143120,1);
 IF private.audit_delete_policy143124(TG_TABLE_NAME,OLD.id::text) NOT IN ('green','latest','latest_active') THEN
  RAISE EXCEPTION 'Protected audit history: older voided IDs and important events must be retained. Only routine events or the latest issued journal audit may be deleted.';
 END IF;
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION private.protect_audit_delete143124() FROM PUBLIC,anon,authenticated;

-- Reuse only released numbers beyond every remaining journal/audit record.
-- A retained higher entry covers older gaps; deleted trailing entries do not.
CREATE OR REPLACE FUNCTION private.reusable_journal_ids143120(p_prefix text,p_date date,p_digits integer)
RETURNS TABLE(entry_no text,number bigint) LANGUAGE sql STABLE SET search_path=pg_catalog,public,pg_temp AS $$
 WITH occupied AS (
  SELECT e.entry_no FROM public.journal_entries e
  UNION SELECT r.entry_no FROM private.reusable_journal_ids143120 r
   WHERE EXISTS(SELECT 1 FROM public.audit_log a WHERE a.table_name='journal_entries' AND a.record_id=r.original_entry::text)
   OR EXISTS(SELECT 1 FROM public.record_deletions108 d WHERE d.table_name='journal_entries' AND d.record_id::text=r.original_entry::text)
 ), numbered AS (
  SELECT i.entry_no,CASE WHEN substring(i.entry_no from length(p_prefix)+3) ~ '^[0-9]{1,18}$'
   THEN substring(i.entry_no from length(p_prefix)+3)::bigint END number FROM occupied i
 ), latest AS (
  SELECT coalesce(max(n.number),0) number FROM numbered n WHERE n.entry_no=private.format_entry_id143114(p_prefix,p_date,n.number,p_digits)
 )
 SELECT r.entry_no,n.number FROM private.reusable_journal_ids143120 r CROSS JOIN latest l
 CROSS JOIN LATERAL (SELECT CASE WHEN substring(r.entry_no from length(p_prefix)+3) ~ '^[0-9]{1,18}$' THEN substring(r.entry_no from length(p_prefix)+3)::bigint END number) n
 WHERE n.number>l.number AND r.entry_no=private.format_entry_id143114(p_prefix,p_date,n.number,p_digits)
 AND extract(year from r.entry_date)=extract(year from p_date)
 ORDER BY n.number LIMIT 1;
$$;
REVOKE ALL ON FUNCTION private.reusable_journal_ids143120(text,date,integer) FROM PUBLIC,anon,authenticated;
