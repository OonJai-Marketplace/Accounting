CREATE OR REPLACE FUNCTION public.hr_inbox_save143168(p_sheet text,p_items jsonb,p_action text DEFAULT 'save') RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE item jsonb; rec public.hr_inbox143168; result jsonb='[]';
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() OR NOT public.active_account14228() OR NOT public.accounting_workspace_allowed123() OR public.password_change_required14257() THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF p_sheet IS NULL OR btrim(p_sheet)='' OR p_action IS NULL OR p_action NOT IN ('import','save','reject') OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid request batch'; END IF;
 IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid request batch'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  IF coalesce(item->>'id','') !~ '^[A-Za-z0-9_-]{4,80}$' OR jsonb_typeof(item->'data') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid request'; END IF;
  SELECT * INTO rec FROM public.hr_inbox143168 WHERE sheet=p_sheet AND request_id=item->>'id' FOR UPDATE;
  IF NOT FOUND THEN
   IF p_action<>'import' THEN RAISE EXCEPTION 'Request not found'; END IF;
   INSERT INTO public.hr_inbox143168(sheet,request_id,source,data) VALUES(p_sheet,item->>'id',item->'source',item->'data') RETURNING * INTO rec;
  ELSIF p_action<>'import' THEN
   IF rec.status<>'pending' OR rec.version IS DISTINCT FROM (item->>'version')::int THEN RAISE EXCEPTION 'Request changed elsewhere. Sync and review again.'; END IF;
   UPDATE public.hr_inbox143168 SET data=item->'data',status=CASE WHEN p_action='reject' THEN 'rejected' ELSE 'pending' END,version=version+1 WHERE sheet=p_sheet AND request_id=rec.request_id RETURNING * INTO rec;
  END IF;
  result=result||jsonb_build_array(to_jsonb(rec));
 END LOOP;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.hr_inbox_apply143168(p_sheet text,p_items jsonb,p_plan jsonb,p_baseline jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE item jsonb; op jsonb; rec public.hr_inbox143168; oldrow jsonb; oldversion int; d jsonb; m text; stamp text; result jsonb='[]'; current_baseline jsonb; before_records jsonb='[]';
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() OR NOT public.active_account14228() OR NOT public.accounting_workspace_allowed123() OR public.password_change_required14257() THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF p_sheet IS NULL OR btrim(p_sheet)='' OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_typeof(p_plan) IS DISTINCT FROM 'object' OR jsonb_typeof(p_plan->'operations') IS DISTINCT FROM 'array' OR jsonb_typeof(p_baseline) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid approval batch'; END IF;
 IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 OR jsonb_array_length(p_plan->'operations') NOT BETWEEN 1 AND 3000 THEN RAISE EXCEPTION 'Invalid approval batch'; END IF;
 -- Lock all inputs until changes and immutable approval receipts commit together.
 LOCK TABLE public.payroll_runs,public.payroll_employees,public.payroll_leave_records,public.hr_calendar_events14306,public.hr_calendar_settings14306,public.payroll_tax_settings IN SHARE ROW EXCLUSIVE MODE;
 current_baseline=public.hr_inbox_baseline143168();
 IF current_baseline IS DISTINCT FROM p_baseline THEN RAISE EXCEPTION 'HR or payroll changed since preview. Review again.'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  SELECT * INTO rec FROM public.hr_inbox143168 WHERE sheet=p_sheet AND request_id=item->>'id' FOR UPDATE;
  IF NOT FOUND OR rec.status<>'pending' OR rec.version IS DISTINCT FROM (item->>'version')::int OR rec.data IS DISTINCT FROM item->'data' THEN RAISE EXCEPTION 'Request changed or already processed. Sync the inbox.'; END IF;
 END LOOP;
 FOR op IN SELECT value FROM jsonb_array_elements(p_plan->'operations') LOOP
  IF coalesce(op->>'table','') NOT IN ('payroll_runs','payroll_leave_records','hr_calendar_events14306') THEN RAISE EXCEPTION 'Unsupported HR record'; END IF;
  d=op->'data';IF jsonb_typeof(d) IS DISTINCT FROM 'object' OR op->>'id' IS NULL OR op->>'version' IS NULL THEN RAISE EXCEPTION 'Invalid HR operation'; END IF;
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1',op->>'table') INTO oldrow USING (op->>'id')::uuid;
  before_records=before_records||jsonb_build_array(jsonb_build_object('table',op->>'table','id',op->>'id','record',oldrow));
  IF op->>'table'='payroll_runs' THEN
   m=d->>'month'; IF m IS NULL OR m !~ '^\d{4}-(0[1-9]|1[0-2])$' OR d->>'status' IS DISTINCT FROM 'draft' OR coalesce((d->>'isSample')::boolean,false) OR jsonb_typeof(d->'rows') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Only actual draft payroll can change'; END IF;
   IF EXISTS(SELECT 1 FROM public.payroll_runs WHERE data->>'month'=m AND (status='finalized' OR data->>'status'='finalized')) THEN RAISE EXCEPTION 'Finalized payroll is protected'; END IF;
   IF (op->>'version')::int=0 AND EXISTS(SELECT 1 FROM public.payroll_runs WHERE data->>'month'=m AND coalesce((data->>'isSample')::boolean,false)=false) THEN RAISE EXCEPTION 'Payroll already exists. Review again.'; END IF;
   IF (op->>'version')::int=0 THEN
    INSERT INTO public.payroll_runs(id,period_start,period_end,status,data,version) VALUES((op->>'id')::uuid,(m||'-01')::date,((m||'-01')::date+interval '1 month - 1 day')::date,'draft',d,1);
   ELSE
    UPDATE public.payroll_runs SET data=d,version=version+1 WHERE id=(op->>'id')::uuid AND version=(op->>'version')::int AND status='draft'; IF NOT FOUND THEN RAISE EXCEPTION 'Payroll version conflict'; END IF;
   END IF;
  ELSE
   IF (op->>'version')::int<>0 THEN RAISE EXCEPTION 'Inbox creates new leave/event records only'; END IF;
   IF op->>'table'='payroll_leave_records' THEN
    IF d->>'status' IS DISTINCT FROM 'approved' THEN RAISE EXCEPTION 'Invalid leave status'; END IF;
    IF EXISTS(SELECT 1 FROM public.payroll_runs WHERE data->>'month'=d->>'month' AND (status='finalized' OR data->>'status'='finalized')) THEN RAISE EXCEPTION 'Finalized payroll is protected'; END IF;
    INSERT INTO public.payroll_leave_records(id,data,version) VALUES((op->>'id')::uuid,d,1);
   ELSE
    IF EXISTS(SELECT 1 FROM public.payroll_runs WHERE (status='finalized' OR data->>'status'='finalized') AND period_start<=(d->>'end')::date AND period_end>=(d->>'start')::date) THEN RAISE EXCEPTION 'Calendar overlaps finalized payroll'; END IF;
    INSERT INTO public.hr_calendar_events14306(id,data,version) VALUES((op->>'id')::uuid,d,1);
   END IF;
  END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  UPDATE public.hr_inbox143168 SET status='accepted',version=version+1 WHERE sheet=p_sheet AND request_id=item->>'id' RETURNING * INTO rec;
  INSERT INTO public.hr_inbox_audit143168(sheet,request_id,action,before_data,changes) VALUES(p_sheet,rec.request_id,'applied',before_records,p_plan);
  result=result||jsonb_build_array(to_jsonb(rec));
 END LOOP;
 RETURN result;
END $$;

CREATE INDEX IF NOT EXISTS hr_inbox_order143170 ON public.hr_inbox143168(sheet,updated_at DESC,request_id);
CREATE INDEX IF NOT EXISTS hr_inbox_audit_order143170 ON public.hr_inbox_audit143168(sheet,id DESC);
