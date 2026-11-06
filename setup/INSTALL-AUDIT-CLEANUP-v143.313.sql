-- Important Bookkeeping events only. Assisted-account activity is unchanged.
CREATE OR REPLACE FUNCTION public.audit_group313(p_action text,p_table text,p_old jsonb,p_new jsonb,p_reason text DEFAULT '')
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE a text:=upper(coalesce(p_action,''));
BEGIN
 IF a IN ('POST','AUTO_POST','APPROVED_SCHEDULE_POST','SCHEDULE_POST_ADVANCE','CREATE_SCHEDULE','MAINTENANCE_CLOSE','SUBMIT','REVIEW','REVIEW_FORWARD','APPROVE','APPROVE_AND_POST','LINK','LINK_PAYROLL','INSERT','CREATE') THEN RETURN NULL;END IF;
 IF a='PERIOD_STATUS' OR (a='UPDATE' AND p_table='accounting_periods') THEN
  RETURN CASE WHEN p_new->>'status'='open' AND p_old->>'status' IS DISTINCT FROM 'open' THEN 'periods' END;
 END IF;
 IF a ~ 'PERIOD.*(CLOSE|LOCK)|CLOSE.*PERIOD' THEN RETURN NULL;END IF;
 IF a ~ 'REOPEN' THEN RETURN 'periods';END IF;
 IF a ~ 'VOID' THEN RETURN 'voids';END IF;
 IF a ~ 'DELETE|REMOVE|PURGE|CANCEL|REVOK' THEN RETURN 'deletions';END IF;
 IF a ~ 'ERROR|FAIL|DENIED|WARN' OR a IN ('MARK_UNDER_REVIEW','PREPAID_REVIEW') THEN RETURN 'reviews';END IF;
 IF a='UPDATE_SCHEDULE' AND p_old IS DISTINCT FROM p_new THEN RETURN 'schedules';END IF;
 IF a ~ 'UPDATE|MODIFY|EDIT|ADJUST|CORRECT|RECLASS|CONSOLIDAT|RENUMBER' OR a IN ('CLASSIFY_PREPAID','RETURN_TO_UPCOMING','MANUAL_POSTING','PAYROLL_SIMPLIFY_ROUNDING','PAYROLL_VERIFY_TAX_BRIDGE') THEN
  RETURN CASE WHEN p_old IS DISTINCT FROM p_new THEN 'corrections' END;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.audit_group313(text,text,jsonb,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.audit_group313(text,text,jsonb,jsonb,text) TO authenticated;
CREATE OR REPLACE FUNCTION private.keep_important_audit313() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF public.audit_group313(NEW.action,NEW.table_name,NEW.old_data,NEW.new_data,NEW.reason) IS NULL THEN RETURN NULL;END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.keep_important_audit313() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS keep_important_audit313 ON public.audit_log;
CREATE TRIGGER keep_important_audit313 BEFORE INSERT OR UPDATE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION private.keep_important_audit313();

-- Retain only numbering metadata when deletion removes a log which reserved an ID.
ALTER TABLE private.reusable_journal_ids143120 ADD COLUMN IF NOT EXISTS log_cleared313 boolean NOT NULL DEFAULT false;
DO $$DECLARE name text;definition text;needle text;BEGIN
 FOREACH name IN ARRAY ARRAY['private.reusable_journal_ids143120(text,date,integer)','private.latest_journal_record143124(text)'] LOOP
  definition:=pg_get_functiondef(name::regprocedure);
  IF position('log_cleared313' in definition)=0 THEN
   needle:='WHERE EXISTS(SELECT 1 FROM public.audit_log a WHERE a.table_name=''journal_entries'' AND a.record_id=r.original_entry::text)';
   IF position(needle in definition)=0 THEN RAISE EXCEPTION 'Unexpected numbering function: %',name;END IF;
   definition:=replace(definition,needle,'WHERE r.log_cleared313 OR EXISTS(SELECT 1 FROM public.audit_log a WHERE a.table_name=''journal_entries'' AND a.record_id=r.original_entry::text)');
   EXECUTE definition;
  END IF;
 END LOOP;
 -- New log-only cleanup explicitly bypasses the older journal-purge behavior.
 FOREACH name IN ARRAY ARRAY['private.protect_audit_delete143124()','public.purge_voided_after_audit14260()'] LOOP
  definition:=pg_get_functiondef(name::regprocedure);
  IF position('audit_log_only313' in definition)=0 THEN
   IF position(E'BEGIN\n' in definition)=0 THEN RAISE EXCEPTION 'Unexpected audit trigger: %',name;END IF;
   definition:=regexp_replace(definition,E'BEGIN\n',E'BEGIN\n IF current_setting(''app.audit_log_only313'',true)=''on'' AND auth.uid() IS NOT NULL AND public.is_admin() AND public.active_account14228() THEN RETURN OLD;END IF;\n');
   EXECUTE definition;
  END IF;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.audit_cleanup313(
 p_scope text DEFAULT 'month',p_period date DEFAULT current_date,p_source text DEFAULT NULL,p_id text DEFAULT NULL,
 p_confirm boolean DEFAULT false,p_expected text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE start_at timestamptz;end_at timestamptz;items jsonb;fingerprint text;total integer;n integer;m integer;target_table text;target_id text;prior_mode text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() OR NOT public.active_account14228() OR NOT public.accounting_workspace_allowed123() OR public.password_change_required14257() THEN RAISE EXCEPTION 'Administrator access in your own workspace required' USING ERRCODE='42501';END IF;
 IF p_scope NOT IN ('record','entry','month','quarter','year','all') OR p_scope IS NULL THEN RAISE EXCEPTION 'Choose a log, month, quarter or year';END IF;
 IF p_scope IN ('record','entry') AND (p_source NOT IN ('audit_log','record_deletions108') OR p_source IS NULL OR nullif(p_id,'') IS NULL) THEN RAISE EXCEPTION 'Choose an audit log';END IF;
 IF p_scope IN ('month','quarter','year') THEN
  IF p_period IS NULL THEN RAISE EXCEPTION 'Choose a period';END IF;
  start_at:=date_trunc(p_scope,p_period::timestamp) AT TIME ZONE 'Asia/Vientiane';
  end_at:=(date_trunc(p_scope,p_period::timestamp)+CASE p_scope WHEN 'month' THEN interval '1 month' WHEN 'quarter' THEN interval '3 months' ELSE interval '1 year' END) AT TIME ZONE 'Asia/Vientiane';
 END IF;
 PERFORM pg_advisory_xact_lock(143120,1);
 IF p_confirm THEN LOCK TABLE public.audit_log,public.record_deletions108 IN SHARE ROW EXCLUSIVE MODE;END IF;
 IF p_scope='entry' THEN
  IF p_source='audit_log' THEN SELECT table_name,record_id INTO target_table,target_id FROM public.audit_log WHERE id::text=p_id;
  ELSE SELECT table_name,record_id::text INTO target_table,target_id FROM public.record_deletions108 WHERE id::text=p_id;END IF;
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY source,id),'[]'::jsonb) INTO items FROM (
  SELECT 'audit_log'::text source,a.id::text id,a.table_name,a.record_id,to_jsonb(a) snapshot FROM public.audit_log a
  WHERE p_scope='all' OR p_scope='record' AND p_source='audit_log' AND a.id::text=p_id OR p_scope='entry' AND a.table_name=target_table AND a.record_id=target_id OR p_scope IN ('month','quarter','year') AND a.created_at>=start_at AND a.created_at<end_at
  UNION ALL
  SELECT 'record_deletions108',d.id::text,d.table_name,d.record_id::text,to_jsonb(d) FROM public.record_deletions108 d
  WHERE p_scope='all' OR p_scope='record' AND p_source='record_deletions108' AND d.id::text=p_id OR p_scope='entry' AND d.table_name=target_table AND d.record_id::text=target_id OR p_scope IN ('month','quarter','year') AND d.deleted_at>=start_at AND d.deleted_at<end_at
 ) x;
 total:=jsonb_array_length(items);fingerprint:=md5(items::text);
 IF NOT p_confirm THEN RETURN jsonb_build_object('count',total,'expected',fingerprint,'scope',p_scope,'from',start_at,'to',end_at);END IF;
 IF p_expected IS DISTINCT FROM fingerprint THEN RAISE EXCEPTION 'The log list changed. Review the updated count and delete again.' USING ERRCODE='40001';END IF;
 UPDATE private.reusable_journal_ids143120 r SET log_cleared313=true WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(items) i WHERE i->>'table_name'='journal_entries' AND i->>'record_id'=r.original_entry::text);
 prior_mode:=current_setting('app.audit_log_only313',true);
 PERFORM set_config('app.audit_log_only313','on',true);
 DELETE FROM public.audit_log a WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(items) i WHERE i->>'source'='audit_log' AND i->>'id'=a.id::text);
 GET DIAGNOSTICS n=ROW_COUNT;
 DELETE FROM public.record_deletions108 d WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(items) i WHERE i->>'source'='record_deletions108' AND i->>'id'=d.id::text);
 GET DIAGNOSTICS m=ROW_COUNT;
 PERFORM set_config('app.audit_log_only313',coalesce(prior_mode,''),true);
 RETURN jsonb_build_object('deleted',n+m,'scope',p_scope,'journal_changes',0,'assisted_changes',0);
END $$;
REVOKE ALL ON FUNCTION public.audit_cleanup313(text,date,text,text,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.audit_cleanup313(text,date,text,text,boolean,text) TO authenticated;

-- Read-only, bounded audit summaries. Existing table RLS and deletion rules apply.
CREATE OR REPLACE FUNCTION public.audit_page143198(
 p_month date DEFAULT NULL, p_offset integer DEFAULT 0,
 p_limit integer DEFAULT 50, p_group text DEFAULT 'all', p_assisted boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public AS $$
DECLARE result jsonb; chosen date; months jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 SELECT coalesce(jsonb_agg(m ORDER BY m DESC),'[]'::jsonb) INTO months FROM (
  SELECT DISTINCT to_char(created_at AT TIME ZONE 'Asia/Vientiane','YYYY-MM') m FROM public.audit_log WHERE NOT p_assisted AND public.audit_group313(action,table_name,old_data,new_data,reason) IS NOT NULL
  UNION SELECT DISTINCT to_char(deleted_at AT TIME ZONE 'Asia/Vientiane','YYYY-MM') FROM public.record_deletions108 WHERE NOT p_assisted
  UNION SELECT DISTINCT to_char(created_at AT TIME ZONE 'UTC','YYYY-MM') FROM public.workspace_actor_audit138 WHERE p_assisted
 ) x;
 chosen := date_trunc('month',coalesce(p_month,((months->>0)||'-01')::date,current_date))::date;
 WITH summaries AS MATERIALIZED (
  SELECT a.id::text id, 'audit_log'::text source,a.table_name,a.record_id,a.action,left(a.reason,2000) reason,a.actor_id,
   a.created_at,NULL::uuid effective_user_id,
   jsonb_strip_nulls(jsonb_build_object('entry_no',coalesce(a.old_data->>'entry_no',a.old_data->>'entryNo',a.old_data->'entry'->>'entry_no'),'status',a.old_data->>'status')) old_data,
   jsonb_strip_nulls(jsonb_build_object('entry_no',coalesce(a.new_data->>'entry_no',a.new_data->>'entryNo',a.new_data->'entry'->>'entry_no'),'status',a.new_data->>'status')) new_data,
   j.status::text journal_status,public.audit_group313(a.action,a.table_name,a.old_data,a.new_data,a.reason) important_group
  FROM public.audit_log a LEFT JOIN public.journal_entries j ON j.id::text=a.record_id AND a.table_name='journal_entries'
  WHERE NOT p_assisted AND a.created_at>=chosen::timestamp AT TIME ZONE 'Asia/Vientiane' AND a.created_at<(chosen+interval '1 month')::timestamp AT TIME ZONE 'Asia/Vientiane'
   AND a.table_name IN ('journal_entries','accounting_periods','period_findings','scheduled_journals','maintenance')
  UNION ALL
  SELECT d.id::text,'record_deletions108',d.table_name,d.record_id::text,'DELETE_RECORD','Deleted from '||d.table_name,d.deleted_by,d.deleted_at,NULL::uuid,
   jsonb_strip_nulls(jsonb_build_object('entry_no',d.record_data->>'entry_no')),NULL::jsonb,NULL::text,'deletions'::text
  FROM public.record_deletions108 d WHERE NOT p_assisted AND d.deleted_at>=chosen::timestamp AT TIME ZONE 'Asia/Vientiane' AND d.deleted_at<(chosen+interval '1 month')::timestamp AT TIME ZONE 'Asia/Vientiane'
  UNION ALL
  SELECT w.id::text,'workspace_actor_audit138',w.table_name,w.row_id,w.operation,'Administrator-assisted activity',w.actor_id,w.created_at,w.effective_user_id,
   jsonb_strip_nulls(jsonb_build_object('entry_no',w.before_data->>'entry_no','status',w.before_data->>'status')),
   jsonb_strip_nulls(jsonb_build_object('entry_no',w.after_data->>'entry_no','status',w.after_data->>'status')),NULL::text,NULL::text
  FROM public.workspace_actor_audit138 w WHERE p_assisted AND w.created_at>=chosen::timestamp AT TIME ZONE 'UTC' AND w.created_at<(chosen+interval '1 month')::timestamp AT TIME ZONE 'UTC'
 ), classified AS MATERIALIZED (
  SELECT *,CASE WHEN NOT p_assisted THEN important_group ELSE CASE
   WHEN journal_status='voided' AND action IN ('POST','AUTO_POST') THEN 'voids'
   WHEN action IN ('POST','AUTO_POST','SCHEDULE_POST_ADVANCE','CREATE_SCHEDULE','MAINTENANCE_CLOSE','SUBMIT','REVIEW','REVIEW_FORWARD','APPROVE','APPROVE_AND_POST','LINK') THEN CASE WHEN table_name='journal_entries' AND journal_status IS NULL AND NOT p_assisted THEN 'reviews' ELSE 'routine' END
   WHEN action='PERIOD_STATUS' THEN CASE WHEN new_data->>'status'='open' THEN 'periods' ELSE NULL END
   WHEN action ~ 'PERIOD.*(CLOSE|LOCK)|CLOSE.*PERIOD' THEN NULL
   WHEN action ~ 'REOPEN' THEN 'periods'
   WHEN action IN ('DELETE_SCHEDULE','UPDATE_SCHEDULE') THEN 'schedules'
   WHEN action ~ 'VOID' THEN 'voids'
   WHEN action ~ 'DELETE|REMOVE|PURGE|CANCEL' THEN 'deletions'
   WHEN action='MARK_UNDER_REVIEW' THEN 'reviews'
   WHEN action='UPDATE' AND table_name='accounting_periods' THEN CASE WHEN new_data->>'status'='open' THEN 'periods' WHEN new_data->>'status' IN ('closed','locked') THEN NULL ELSE 'corrections' END
   WHEN action='UPDATE' AND reason ILIKE '%acknowledged unposted submissions%' THEN 'periods'
   WHEN action ~ 'UPDATE|MODIFY|EDIT|ADJUST' THEN 'corrections'
   ELSE 'reviews' END END group_name FROM summaries
 ), visible AS MATERIALIZED (SELECT * FROM classified WHERE group_name IS NOT NULL),
 filtered AS MATERIALIZED (SELECT * FROM visible WHERE p_group='all' OR group_name=p_group),
 page AS (
  SELECT * FROM filtered ORDER BY created_at DESC,source,id DESC
  OFFSET greatest(coalesce(p_offset,0),0) LIMIT least(greatest(coalesce(p_limit,50),1),100)
 )
 SELECT jsonb_build_object('month',to_char(chosen,'YYYY-MM'),'months',months,'total',(SELECT count(*) FROM filtered),
  'counts',(SELECT coalesce(jsonb_object_agg(group_name,n),'{}'::jsonb) FROM (SELECT group_name,count(*) n FROM visible GROUP BY group_name) c),
  'rows',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'auditSource1434',source,'table_name',table_name,'record_id',record_id,
   'action',action,'reason',reason,'actor_id',actor_id,'effective_user_id',effective_user_id,'created_at',created_at,'old_data',old_data,'new_data',new_data,
   'voidedJournal143122',journal_status='voided','summary143198',true,'group143198',group_name,'tier313',CASE WHEN group_name IN ('voids','periods','deletions') THEN 'red' ELSE 'orange' END) ORDER BY created_at DESC,source,id DESC) FROM page),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.audit_page143198(date,integer,integer,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.audit_page143198(date,integer,integer,text,boolean) TO authenticated;
CREATE INDEX IF NOT EXISTS audit_log_page143198 ON public.audit_log(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS record_deletions_page143198 ON public.record_deletions108(deleted_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS workspace_actor_page143198 ON public.workspace_actor_audit138(created_at DESC,id DESC);
