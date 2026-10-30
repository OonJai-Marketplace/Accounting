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
  SELECT DISTINCT to_char(created_at AT TIME ZONE 'UTC','YYYY-MM') m FROM public.audit_log WHERE NOT p_assisted
  UNION SELECT DISTINCT to_char(deleted_at AT TIME ZONE 'UTC','YYYY-MM') FROM public.record_deletions108 WHERE NOT p_assisted
  UNION SELECT DISTINCT to_char(created_at AT TIME ZONE 'UTC','YYYY-MM') FROM public.workspace_actor_audit138 WHERE p_assisted
 ) x;
 chosen := date_trunc('month',coalesce(p_month,((months->>0)||'-01')::date,current_date))::date;
 WITH summaries AS MATERIALIZED (
  SELECT a.id::text id, 'audit_log'::text source,a.table_name,a.record_id,a.action,left(a.reason,2000) reason,a.actor_id,
   a.created_at,NULL::uuid effective_user_id,
   jsonb_strip_nulls(jsonb_build_object('entry_no',coalesce(a.old_data->>'entry_no',a.old_data->>'entryNo',a.old_data->'entry'->>'entry_no'),'status',a.old_data->>'status')) old_data,
   jsonb_strip_nulls(jsonb_build_object('entry_no',coalesce(a.new_data->>'entry_no',a.new_data->>'entryNo',a.new_data->'entry'->>'entry_no'),'status',a.new_data->>'status')) new_data,
   j.status::text journal_status
  FROM public.audit_log a LEFT JOIN public.journal_entries j ON j.id::text=a.record_id AND a.table_name='journal_entries'
  WHERE NOT p_assisted AND a.created_at>=chosen::timestamp AT TIME ZONE 'UTC' AND a.created_at<(chosen+interval '1 month')::timestamp AT TIME ZONE 'UTC'
   AND a.table_name IN ('journal_entries','accounting_periods','period_findings','scheduled_journals','maintenance')
  UNION ALL
  SELECT d.id::text,'record_deletions108',d.table_name,d.record_id::text,'DELETE_RECORD','Deleted from '||d.table_name,d.deleted_by,d.deleted_at,NULL::uuid,
   jsonb_strip_nulls(jsonb_build_object('entry_no',d.record_data->>'entry_no')),NULL::jsonb,NULL::text
  FROM public.record_deletions108 d WHERE NOT p_assisted AND d.deleted_at>=chosen::timestamp AT TIME ZONE 'UTC' AND d.deleted_at<(chosen+interval '1 month')::timestamp AT TIME ZONE 'UTC'
  UNION ALL
  SELECT w.id::text,'workspace_actor_audit138',w.table_name,w.row_id,w.operation,'Administrator-assisted activity',w.actor_id,w.created_at,w.effective_user_id,
   jsonb_strip_nulls(jsonb_build_object('entry_no',w.before_data->>'entry_no','status',w.before_data->>'status')),
   jsonb_strip_nulls(jsonb_build_object('entry_no',w.after_data->>'entry_no','status',w.after_data->>'status')),NULL::text
  FROM public.workspace_actor_audit138 w WHERE p_assisted AND w.created_at>=chosen::timestamp AT TIME ZONE 'UTC' AND w.created_at<(chosen+interval '1 month')::timestamp AT TIME ZONE 'UTC'
 ), classified AS MATERIALIZED (
  SELECT *,CASE
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
   ELSE 'reviews' END group_name FROM summaries
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
   'voidedJournal143122',journal_status='voided','summary143198',true,'group143198',group_name) ORDER BY created_at DESC,source,id DESC) FROM page),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.audit_page143198(date,integer,integer,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.audit_page143198(date,integer,integer,text,boolean) TO authenticated;
CREATE INDEX IF NOT EXISTS audit_log_page143198 ON public.audit_log(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS record_deletions_page143198 ON public.record_deletions108(deleted_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS workspace_actor_page143198 ON public.workspace_actor_audit138(created_at DESC,id DESC);
