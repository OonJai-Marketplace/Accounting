-- Server-enforced retention. Latest issued manual journal is the sole red/orange exception.
CREATE OR REPLACE FUNCTION private.latest_journal_record143124(p_record text)
RETURNS boolean LANGUAGE sql VOLATILE SET search_path=pg_catalog,public,pg_temp AS $$
 WITH target AS (
  SELECT entry_no,transaction_date entry_date FROM public.journal_entries WHERE id::text=p_record AND source='manual' AND status='voided'
  UNION ALL SELECT entry_no,entry_date FROM private.reusable_journal_ids143120 WHERE original_entry::text=p_record
 ), issued AS (
  SELECT entry_no FROM public.journal_entries UNION SELECT entry_no FROM private.reusable_journal_ids143120
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
  RETURN 'protected';
 ELSIF p_source='record_deletions108' THEN
  SELECT * INTO d FROM public.record_deletions108 WHERE id::text=p_id;
  IF NOT FOUND THEN RETURN 'missing';END IF;
  RETURN CASE WHEN d.table_name='journal_entries' AND private.latest_journal_record143124(d.record_id::text) THEN 'latest' ELSE 'protected' END;
 END IF;
 RETURN 'protected';
END $$;
REVOKE ALL ON FUNCTION private.latest_journal_record143124(text),private.audit_delete_policy143124(text,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.audit_delete_permissions143124(p_audit_ids text[] DEFAULT '{}',p_deletion_ids text[] DEFAULT '{}')
RETURNS TABLE(id text,source text,policy text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required';END IF;
 RETURN QUERY SELECT a.id::text,'audit_log'::text,private.audit_delete_policy143124('audit_log',a.id::text) FROM public.audit_log a WHERE a.id::text=ANY(p_audit_ids)
 UNION ALL SELECT d.id::text,'record_deletions108'::text,private.audit_delete_policy143124('record_deletions108',d.id::text) FROM public.record_deletions108 d WHERE d.id::text=ANY(p_deletion_ids);
END $$;
REVOKE ALL ON FUNCTION public.audit_delete_permissions143124(text[],text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.audit_delete_permissions143124(text[],text[]) TO authenticated;

CREATE OR REPLACE FUNCTION private.protect_audit_delete143124()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required';END IF;
 PERFORM pg_advisory_xact_lock(143120,1);
 IF private.audit_delete_policy143124(TG_TABLE_NAME,OLD.id::text) NOT IN ('green','latest') THEN
  RAISE EXCEPTION 'Protected audit history: older voided IDs and important events must be retained. Only green events or the latest issued voided journal may be deleted.';
 END IF;
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION private.protect_audit_delete143124() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS protect_audit_delete143124 ON public.audit_log;
CREATE TRIGGER protect_audit_delete143124 BEFORE DELETE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION private.protect_audit_delete143124();
DROP TRIGGER IF EXISTS protect_audit_delete143124 ON public.record_deletions108;
CREATE TRIGGER protect_audit_delete143124 BEFORE DELETE ON public.record_deletions108 FOR EACH ROW EXECUTE FUNCTION private.protect_audit_delete143124();

CREATE OR REPLACE FUNCTION public.audit_month1434(p_month date,p_confirm boolean DEFAULT false,p_audit_ids text[] DEFAULT '{}',p_deletion_ids text[] DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE start_at timestamptz;end_at timestamptz;ids text[];n integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required';END IF;
 IF p_month IS NULL OR p_month<>date_trunc('month',p_month)::date THEN RAISE EXCEPTION 'Select a valid month';END IF;
 PERFORM pg_advisory_xact_lock(143120,1);
 start_at:=p_month::timestamp at time zone 'UTC';end_at:=(p_month+interval '1 month')::timestamp at time zone 'UTC';
 SELECT coalesce(array_agg(id::text),'{}') INTO ids FROM public.audit_log
 WHERE created_at>=start_at AND created_at<end_at AND table_name IN ('journal_entries','accounting_periods','period_findings','scheduled_journals')
 AND private.audit_delete_policy143124('audit_log',id::text)='green';
 IF NOT p_confirm THEN RETURN jsonb_build_object('audit_ids',ids,'deletion_ids','[]'::jsonb);END IF;
 DELETE FROM public.audit_log WHERE id::text=ANY(ids) AND id::text=ANY(p_audit_ids);
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN jsonb_build_object('deleted',n);
END $$;
