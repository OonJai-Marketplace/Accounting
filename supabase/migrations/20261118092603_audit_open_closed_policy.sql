-- Audit severity follows the book at the time of the event, never today's status.
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS book_closed469 boolean;
ALTER TABLE public.workspace_actor_audit138 ADD COLUMN IF NOT EXISTS book_closed469 boolean;
ALTER TABLE public.record_deletions108 ADD COLUMN IF NOT EXISTS book_closed469 boolean;

CREATE OR REPLACE FUNCTION public.audit_fields469(p_value jsonb,p_pattern text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; k text; v jsonb; child jsonb;
BEGIN
 IF jsonb_typeof(p_value)='object' THEN
  result:='{}';
  FOR k,v IN SELECT * FROM jsonb_each(p_value) LOOP
   IF k~*p_pattern THEN
    IF jsonb_typeof(v) IN ('number','string') AND v#>>'{}' ~ '^-?[0-9]+([.][0-9]+)?$' THEN v:=to_jsonb((v#>>'{}')::numeric);END IF;
    result:=result||jsonb_build_object(k,v);
   ELSIF jsonb_typeof(v) IN ('object','array') THEN
    child:=public.audit_fields469(v,p_pattern);
    IF child IS NOT NULL THEN result:=result||jsonb_build_object(k,child);END IF;
   END IF;
  END LOOP;
  RETURN nullif(result,'{}');
 ELSIF jsonb_typeof(p_value)='array' THEN
  SELECT jsonb_agg(x ORDER BY x::text) INTO result FROM (SELECT public.audit_fields469(value,p_pattern) x FROM jsonb_array_elements(p_value)) q WHERE x IS NOT NULL;
  RETURN result;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.audit_fields469(jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.audit_fields469(jsonb,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_classify469(p_action text,p_table text,p_old jsonb,p_new jsonb,p_reason text,p_closed boolean)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,public AS $$
DECLARE a text:=upper(coalesce(p_action,''));t text:=lower(coalesce(p_table,'')); account_pattern text:='^(account_id|accountId|account_code|accountCode|sub_account_id|fund_account_id|currency_code|currency)$'; money_pattern text:='^(debit|credit|amount|base_debit|base_credit|total|balance|salary|gross|net|tax|pit|sso|deduction|withholding|paid|price|wage|bonus|allowance|fx_rate_lak|book_rate_lak)$';
BEGIN
 IF a='AUDIT_LOG_CLEARED' THEN RETURN 'O9';END IF;
 IF t !~ '(journal|ledger|payroll|salary|cash|reconcil|amort|recurr|schedul|fund|opening|voucher|entry|submission|period|transaction|account|balance|receipt|financial|book_session)' THEN RETURN NULL;END IF;
 IF a ~ '(DELETE|PURGE|REMOVE|VOID|REVERSE)' OR p_old->>'status'='posted' AND p_new->>'status'='voided' THEN
  RETURN CASE WHEN coalesce(p_closed,false) THEN CASE WHEN a~'(VOID|REVERSE)' THEN 'R5' WHEN a~'(BULK|PERIOD|MONTH|YEAR|QUARTER)' THEN 'R4' ELSE 'R1' END ELSE 'O4' END;
 END IF;
 -- Reopening/closing is administrative; the resulting financial edits have separate before/after logs.
 IF t~'(accounting_period|book_session|year_closing|closing)' AND (a~'(REOPEN|CLOSE|LOCK)' OR p_old IS NULL) THEN RETURN 'O3';END IF;
 -- Routine new postings remain excluded; edits keep their before/after snapshots.
 IF a IN ('INSERT','POST','CREATE') AND p_old IS NULL THEN RETURN NULL;END IF;
 IF public.audit_fields469(p_old,money_pattern) IS DISTINCT FROM public.audit_fields469(p_new,money_pattern) THEN RETURN CASE WHEN coalesce(p_closed,false) THEN 'R2' ELSE 'O1' END;END IF;
 IF public.audit_fields469(p_old,account_pattern) IS DISTINCT FROM public.audit_fields469(p_new,account_pattern) OR public.audit_fields469(p_old,money_pattern||'|'||account_pattern) IS DISTINCT FROM public.audit_fields469(p_new,money_pattern||'|'||account_pattern) THEN RETURN CASE WHEN coalesce(p_closed,false) THEN 'R8' ELSE 'O5' END;END IF;
 IF (coalesce(p_old,'{}')-ARRAY['updated_at','updated_by','created_at']) IS DISTINCT FROM (coalesce(p_new,'{}')-ARRAY['updated_at','updated_by','created_at']) OR a~'(REOPEN|REASON|MEMO|DESCRIPTION)' THEN RETURN 'O3';END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.audit_classify469(text,text,jsonb,jsonb,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.audit_classify469(text,text,jsonb,jsonb,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION private.audit_book_closed469(p_table text,p_old jsonb,p_new jsonb,p_at timestamptz)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE doc jsonb; date_text text; dates date[]:='{}'; ids uuid[]:='{}'; p public.accounting_periods; first_closed timestamptz; key text; v text;
BEGIN
 FOR doc IN WITH RECURSIVE documents(v) AS (
  SELECT jsonb_build_array(p_old,p_new)
  UNION ALL SELECT child.value FROM documents d CROSS JOIN LATERAL (
   SELECT value FROM jsonb_each(CASE WHEN jsonb_typeof(d.v)='object' THEN d.v ELSE '{}'::jsonb END)
   UNION ALL SELECT value FROM jsonb_array_elements(CASE WHEN jsonb_typeof(d.v)='array' THEN d.v ELSE '[]'::jsonb END)
  ) child WHERE jsonb_typeof(child.value) IN ('object','array')
 ) SELECT documents.v FROM documents WHERE jsonb_typeof(documents.v)='object' LOOP
  FOREACH key IN ARRAY ARRAY['transaction_date','line_date','period_month','period_start','month','date'] LOOP
   date_text:=doc->>key;
   IF date_text~'^\d{4}-\d{2}(-\d{2})?$' THEN BEGIN dates:=array_append(dates,(left(date_text,7)||'-01')::date);EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN NULL;END;END IF;
  END LOOP;
  IF p_table='accounting_periods' AND doc->>'id'~*'^[0-9a-f-]{36}$' THEN ids:=array_append(ids,(doc->>'id')::uuid);END IF;
  FOREACH key IN ARRAY ARRAY['accounting_period_id','period_id'] LOOP
   v:=doc->>key;IF v~*'^[0-9a-f-]{36}$' THEN ids:=array_append(ids,v::uuid);END IF;
  END LOOP;
  v:=coalesce(doc->>'journal_entry_id',doc->>'entry_id');
  IF v~*'^[0-9a-f-]{36}$' THEN SELECT transaction_date::text INTO date_text FROM public.journal_entries WHERE id=v::uuid;IF FOUND THEN dates:=array_append(dates,date_trunc('month',date_text::date)::date);END IF;END IF;
 END LOOP;
 FOR p IN SELECT * FROM public.accounting_periods WHERE id=ANY(ids) OR period_month=ANY(dates) LOOP
  -- A correction workspace proves the book had already been closed, even when
  -- committing temporarily changes its status to open in the same transaction.
  SELECT min(x) INTO first_closed FROM (
   SELECT p.closed_at x UNION ALL SELECT p.locked_at
   UNION ALL SELECT s.created_at FROM public.book_sessions136 s WHERE s.period_id=p.id
   UNION ALL SELECT a.created_at FROM public.audit_log a WHERE a.table_name='accounting_periods' AND a.record_id=p.id::text
    AND (a.action~*'(CLOSE|LOCK|REOPEN)' OR a.old_data->>'status' IN ('closed','locked') OR a.new_data->>'status' IN ('closed','locked'))
  ) evidence WHERE x<=p_at;
  IF first_closed IS NOT NULL THEN RETURN true;END IF;
  IF p_at>=transaction_timestamp() AND p.status IN ('closed','locked') THEN RETURN true;END IF;
 END LOOP;
 RETURN false;
END $$;
REVOKE ALL ON FUNCTION private.audit_book_closed469(text,jsonb,jsonb,timestamptz) FROM PUBLIC,anon,authenticated;

-- Compatibility for existing insert-side callers; retained rows use their snapshot column.
CREATE OR REPLACE FUNCTION public.audit_code143324(p_action text,p_table text,p_old jsonb,p_new jsonb,p_reason text DEFAULT '')
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT public.audit_classify469(p_action,p_table,p_old,p_new,p_reason,private.audit_book_closed469(p_table,p_old,p_new,transaction_timestamp()));
$$;
REVOKE ALL ON FUNCTION public.audit_code143324(text,text,jsonb,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.audit_code143324(text,text,jsonb,jsonb,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_group313(p_action text,p_table text,p_old jsonb,p_new jsonb,p_reason text DEFAULT '')
RETURNS text LANGUAGE sql STABLE SET search_path=pg_catalog,public AS $$
 SELECT CASE WHEN code IN ('R1','R4','O4') THEN 'deletions' WHEN code='R5' THEN 'voids' WHEN code IS NOT NULL THEN 'corrections' END
 FROM (SELECT public.audit_code143324(p_action,p_table,p_old,p_new,p_reason) code) c;
$$;

CREATE OR REPLACE FUNCTION private.keep_important_audit313()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.book_closed469 IS NOT NULL THEN NEW.book_closed469:=OLD.book_closed469;END IF;
 IF TG_OP='INSERT' THEN NEW.book_closed469:=private.audit_book_closed469(NEW.table_name,NEW.old_data,NEW.new_data,NEW.created_at);END IF;
 IF public.audit_classify469(NEW.action,NEW.table_name,NEW.old_data,NEW.new_data,NEW.reason,NEW.book_closed469) IS NULL THEN RETURN NULL;END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION private.capture_audit_book469()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='record_deletions108' THEN NEW.book_closed469:=private.audit_book_closed469(NEW.table_name,NEW.record_data,NULL,NEW.deleted_at);
 ELSE NEW.book_closed469:=private.audit_book_closed469(NEW.table_name,NEW.before_data,NEW.after_data,NEW.created_at);END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.capture_audit_book469() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER capture_audit_book469 BEFORE INSERT ON public.record_deletions108 FOR EACH ROW EXECUTE FUNCTION private.capture_audit_book469();
CREATE TRIGGER capture_audit_book469 BEFORE INSERT ON public.workspace_actor_audit138 FOR EACH ROW EXECUTE FUNCTION private.capture_audit_book469();

UPDATE public.audit_log SET book_closed469=private.audit_book_closed469(table_name,old_data,new_data,created_at) WHERE book_closed469 IS NULL;
UPDATE public.workspace_actor_audit138 SET book_closed469=private.audit_book_closed469(table_name,before_data,after_data,created_at) WHERE book_closed469 IS NULL;
UPDATE public.record_deletions108 SET book_closed469=private.audit_book_closed469(table_name,record_data,NULL,deleted_at) WHERE book_closed469 IS NULL;

CREATE OR REPLACE FUNCTION private.audit_delete_policy143124(p_source text,p_id text)
RETURNS text LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE code text;present boolean:=false;
BEGIN
 IF p_source='audit_log' THEN SELECT public.audit_classify469(action,table_name,old_data,new_data,reason,book_closed469),true INTO code,present FROM public.audit_log WHERE id::text=p_id;
 ELSIF p_source='workspace_actor_audit138' THEN SELECT public.audit_classify469(operation,table_name,before_data,after_data,'',book_closed469),true INTO code,present FROM public.workspace_actor_audit138 WHERE id::text=p_id;
 ELSIF p_source='record_deletions108' THEN SELECT public.audit_classify469('DELETE_RECORD',table_name,record_data,NULL,'',book_closed469),true INTO code,present FROM public.record_deletions108 WHERE id::text=p_id;
 END IF;
 RETURN CASE WHEN NOT coalesce(present,false) THEN 'missing' WHEN code LIKE 'O%' THEN 'green' ELSE 'protected' END;
END $$;

CREATE OR REPLACE FUNCTION private.audit_clear_receipt469()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF current_setting('app.audit_clear_batch469',true) IS DISTINCT FROM 'on' THEN
  INSERT INTO public.audit_log(table_name,record_id,action,new_data,reason,actor_id)
  VALUES('audit_logs',OLD.id::text,'AUDIT_LOG_CLEARED',jsonb_build_object('source',TG_TABLE_NAME,'log_id',OLD.id,'record_id',to_jsonb(OLD)->>'record_id','count',1),'Reviewed orange audit log deleted',auth.uid());
 END IF;
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION private.audit_clear_receipt469() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER audit_clear_receipt469 AFTER DELETE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION private.audit_clear_receipt469();
CREATE TRIGGER audit_clear_receipt469 AFTER DELETE ON public.workspace_actor_audit138 FOR EACH ROW EXECUTE FUNCTION private.audit_clear_receipt469();
CREATE TRIGGER audit_clear_receipt469 AFTER DELETE ON public.record_deletions108 FOR EACH ROW EXECUTE FUNCTION private.audit_clear_receipt469();
CREATE OR REPLACE FUNCTION public.audit_page143198(p_month date DEFAULT NULL::date, p_offset integer DEFAULT 0, p_limit integer DEFAULT 50, p_group text DEFAULT 'all'::text, p_assisted boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE result jsonb;chosen date;months jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required';END IF;
 IF p_group NOT IN ('all','red','orange') THEN RAISE EXCEPTION 'Unknown audit category';END IF;
 SELECT coalesce(jsonb_agg(m ORDER BY m DESC),'[]'::jsonb) INTO months FROM (
  SELECT DISTINCT to_char(created_at AT TIME ZONE 'Asia/Vientiane','YYYY-MM') m FROM public.audit_log
  WHERE public.audit_classify469(action,table_name,old_data,new_data,reason,book_closed469) IS NOT NULL
  UNION SELECT DISTINCT to_char(deleted_at AT TIME ZONE 'Asia/Vientiane','YYYY-MM') FROM public.record_deletions108
  UNION SELECT DISTINCT to_char(created_at AT TIME ZONE 'Asia/Vientiane','YYYY-MM') FROM public.workspace_actor_audit138
   WHERE public.audit_classify469(operation,table_name,before_data,after_data,'',book_closed469) IS NOT NULL
 ) x;
 chosen:=date_trunc('month',coalesce(p_month,((months->>0)||'-01')::date,current_date))::date;
 WITH sources AS MATERIALIZED (
  SELECT a.id::text id,'audit_log'::text source,a.table_name,a.record_id,a.action,left(a.reason,2000) reason,a.actor_id,
    a.created_at,NULL::uuid effective_user_id,
    jsonb_strip_nulls(jsonb_build_object('entry_no',coalesce(a.old_data->>'entry_no',a.old_data->>'entryNo',a.old_data->'entry'->>'entry_no'),'status',a.old_data->>'status')) old_data,
    jsonb_strip_nulls(jsonb_build_object('entry_no',coalesce(a.new_data->>'entry_no',a.new_data->>'entryNo',a.new_data->'entry'->>'entry_no'),'status',a.new_data->>'status')) new_data,
    public.audit_classify469(a.action,a.table_name,a.old_data,a.new_data,a.reason,a.book_closed469) category
  FROM public.audit_log a
  WHERE a.created_at>=chosen::timestamp AT TIME ZONE 'Asia/Vientiane' AND a.created_at<(chosen+interval '1 month')::timestamp AT TIME ZONE 'Asia/Vientiane'
  UNION ALL
  SELECT d.id::text,'record_deletions108',d.table_name,d.record_id::text,'DELETE_RECORD','Deleted financial record',d.deleted_by,d.deleted_at,NULL::uuid,
    jsonb_strip_nulls(jsonb_build_object('entry_no',d.record_data->>'entry_no')),NULL::jsonb,public.audit_classify469('DELETE_RECORD',d.table_name,d.record_data,NULL,'',d.book_closed469)
  FROM public.record_deletions108 d
  WHERE d.deleted_at>=chosen::timestamp AT TIME ZONE 'Asia/Vientiane' AND d.deleted_at<(chosen+interval '1 month')::timestamp AT TIME ZONE 'Asia/Vientiane'
  UNION ALL
  SELECT w.id::text,'workspace_actor_audit138',w.table_name,w.row_id,w.operation,
    'Financial record change',w.actor_id,w.created_at,w.effective_user_id,
    jsonb_strip_nulls(jsonb_build_object('entry_no',w.before_data->>'entry_no','status',w.before_data->>'status')) ,
    jsonb_strip_nulls(jsonb_build_object('entry_no',w.after_data->>'entry_no','status',w.after_data->>'status')),
    public.audit_classify469(w.operation,w.table_name,w.before_data,w.after_data,'',w.book_closed469)
  FROM public.workspace_actor_audit138 w
  WHERE w.created_at>=chosen::timestamp AT TIME ZONE 'Asia/Vientiane' AND w.created_at<(chosen+interval '1 month')::timestamp AT TIME ZONE 'Asia/Vientiane'
 ),visible AS MATERIALIZED (
  SELECT *,CASE WHEN left(category,1)='R' THEN 'red' ELSE 'orange' END group_name FROM sources WHERE category IS NOT NULL
 ),filtered AS MATERIALIZED (
  SELECT * FROM visible WHERE p_group='all' OR group_name=p_group
 ),page AS (
  SELECT * FROM filtered ORDER BY created_at DESC,source,id DESC
  OFFSET greatest(coalesce(p_offset,0),0) LIMIT least(greatest(coalesce(p_limit,50),1),100)
 )
 SELECT jsonb_build_object(
 'month',to_char(chosen,'YYYY-MM'),'months',months,'total',(SELECT count(*) FROM filtered),
 'counts',(SELECT coalesce(jsonb_object_agg(group_name,n),'{}'::jsonb) FROM (SELECT group_name,count(*) n FROM visible GROUP BY group_name) s),
 'rows',coalesce((SELECT jsonb_agg(jsonb_build_object(
  'id',id,'auditSource1434',source,'table_name',table_name,'record_id',record_id,
  'action',action,'reason',reason,'actor_id',actor_id,'effective_user_id',effective_user_id,'created_at',created_at,
  'old_data',old_data,'new_data',new_data,'summary143198',true,'group143198',group_name,'category143324',category,'tier313',group_name
 ) ORDER BY created_at DESC,source,id DESC) FROM page),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END $function$;

CREATE OR REPLACE FUNCTION private.protect_audit_delete143124()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() OR NOT public.active_account14228() OR NOT public.accounting_workspace_allowed123() OR public.password_change_required14257()
 THEN RAISE EXCEPTION 'Active administrator access required to clear reviewed Orange logs.' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(143120,1);
 IF private.audit_delete_policy143124(TG_TABLE_NAME,OLD.id::text)<>'green'
 THEN RAISE EXCEPTION 'Red audit evidence is permanent. Only Orange activity can be cleared after review.' USING ERRCODE='42501';END IF;
 PERFORM set_config('app.audit_log_only313','on',true);
 RETURN OLD;
END $function$;

CREATE OR REPLACE FUNCTION public.audit_cleanup313(p_scope text DEFAULT 'month'::text, p_period date DEFAULT CURRENT_DATE, p_source text DEFAULT NULL::text, p_id text DEFAULT NULL::text, p_confirm boolean DEFAULT false, p_expected text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE start_at timestamptz;end_at timestamptz;items jsonb;fingerprint text;total int;n int:=0;m int:=0;target_table text;target_id text;d_count int:=0;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() OR NOT public.active_account14228() OR NOT public.accounting_workspace_allowed123() OR public.password_change_required14257()
 THEN RAISE EXCEPTION 'Administrator access in your own workspace required' USING ERRCODE='42501';END IF;
 IF p_scope NOT IN ('record','entry','month') OR p_scope IS NULL THEN RAISE EXCEPTION 'Only individual Orange logs or a reviewed month may be cleared.';END IF;
 IF p_scope IN ('record','entry') AND (p_source NOT IN ('audit_log','workspace_actor_audit138','record_deletions108') OR nullif(p_id,'') IS NULL) THEN RAISE EXCEPTION 'Choose an Orange audit log.';END IF;
 IF p_scope='month' THEN
  IF p_period IS NULL THEN RAISE EXCEPTION 'Choose a month';END IF;
  start_at:=date_trunc('month',p_period::timestamp) AT TIME ZONE 'Asia/Vientiane';
  end_at:=(date_trunc('month',p_period::timestamp)+interval '1 month') AT TIME ZONE 'Asia/Vientiane';
 END IF;
 PERFORM pg_advisory_xact_lock(143120,1);
 IF p_confirm THEN LOCK TABLE public.audit_log,public.workspace_actor_audit138,public.record_deletions108 IN SHARE ROW EXCLUSIVE MODE;END IF;
 IF p_scope='entry' THEN
  IF p_source='audit_log' THEN SELECT table_name,record_id INTO target_table,target_id FROM public.audit_log WHERE id::text=p_id;
  ELSIF p_source='record_deletions108' THEN SELECT table_name,record_id::text INTO target_table,target_id FROM public.record_deletions108 WHERE id::text=p_id;
  ELSE SELECT table_name,row_id INTO target_table,target_id FROM public.workspace_actor_audit138 WHERE id::text=p_id;END IF;
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.source,x.id),'[]'::jsonb) INTO items FROM (
  SELECT 'audit_log'::text source,a.id::text id,a.table_name,a.record_id,to_jsonb(a) snapshot FROM public.audit_log a
  WHERE (p_scope='record' AND p_source='audit_log' AND a.id::text=p_id OR
    p_scope='entry' AND a.table_name=target_table AND a.record_id=target_id OR
    p_scope='month' AND a.created_at>=start_at AND a.created_at<end_at)
   AND public.audit_classify469(a.action,a.table_name,a.old_data,a.new_data,a.reason,a.book_closed469) LIKE 'O%'
  UNION ALL
  SELECT 'workspace_actor_audit138',w.id::text,w.table_name,w.row_id,to_jsonb(w)
  FROM public.workspace_actor_audit138 w
  WHERE (p_scope='record' AND p_source='workspace_actor_audit138' AND w.id::text=p_id OR
    p_scope='entry' AND w.table_name=target_table AND w.row_id=target_id OR
    p_scope='month' AND w.created_at>=start_at AND w.created_at<end_at)
   AND public.audit_classify469(w.operation,w.table_name,w.before_data,w.after_data,'',w.book_closed469) LIKE 'O%'
 UNION ALL
  SELECT 'record_deletions108',d.id::text,d.table_name,d.record_id::text,to_jsonb(d) FROM public.record_deletions108 d
  WHERE (p_scope='record' AND p_source='record_deletions108' AND d.id::text=p_id OR
   p_scope='entry' AND d.table_name=target_table AND d.record_id::text=target_id OR
   p_scope='month' AND d.deleted_at>=start_at AND d.deleted_at<end_at)
  AND public.audit_classify469('DELETE_RECORD',d.table_name,d.record_data,NULL,'',d.book_closed469) LIKE 'O%'
 ) x;
 total:=jsonb_array_length(items);fingerprint:=md5(items::text);
 IF NOT p_confirm THEN RETURN jsonb_build_object('count',total,'expected',fingerprint,'scope',p_scope,'from',start_at,'to',end_at,'orange_only',true);END IF;
 IF p_expected IS DISTINCT FROM fingerprint THEN RAISE EXCEPTION 'Orange log list changed. Review the updated count before clearing.' USING ERRCODE='40001';END IF;
 PERFORM set_config('app.audit_log_only313','on',true);
 PERFORM set_config('app.audit_clear_batch469','on',true);
 DELETE FROM public.audit_log a WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(items) i WHERE i->>'source'='audit_log' AND i->>'id'=a.id::text);
 GET DIAGNOSTICS n=ROW_COUNT;
 DELETE FROM public.workspace_actor_audit138 w WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(items) i WHERE i->>'source'='workspace_actor_audit138' AND i->>'id'=w.id::text);
 GET DIAGNOSTICS m=ROW_COUNT;
 DELETE FROM public.record_deletions108 d WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(items) i WHERE i->>'source'='record_deletions108' AND i->>'id'=d.id::text);
 GET DIAGNOSTICS d_count=ROW_COUNT;
 PERFORM set_config('app.audit_clear_batch469','off',true);
 IF n+m+d_count>0 THEN
  INSERT INTO public.audit_log(table_name,record_id,action,new_data,reason,actor_id)
  VALUES('audit_logs',coalesce(p_id,p_period::text),'AUDIT_LOG_CLEARED',
   jsonb_build_object('scope',p_scope,'count',n+m+d_count,'fingerprint',fingerprint,'logs',(SELECT jsonb_agg(jsonb_build_object('source',i->>'source','id',i->>'id','record',i->>'record_id')) FROM jsonb_array_elements(items)i)),
   'Reviewed orange audit logs deleted',auth.uid());
 END IF;
 RETURN jsonb_build_object('deleted',n+m+d_count,'scope',p_scope,'orange_only',true,'journal_changes',0,'assisted_changes',m);
END $function$;
