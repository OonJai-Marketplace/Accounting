CREATE TABLE public.hr_inbox143168 (
 sheet text NOT NULL, request_id text NOT NULL, source jsonb NOT NULL, data jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected')),
 version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
 PRIMARY KEY(sheet,request_id)
);
CREATE TABLE public.hr_inbox_audit143168 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, sheet text NOT NULL, request_id text NOT NULL,
 action text NOT NULL, before_data jsonb, after_data jsonb, changes jsonb,
 changed_at timestamptz NOT NULL DEFAULT now(), changed_by uuid NOT NULL DEFAULT auth.uid()
);
ALTER TABLE public.hr_inbox143168 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_inbox_audit143168 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hr_inbox143168,public.hr_inbox_audit143168 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.hr_inbox143168 TO authenticated;
GRANT SELECT,INSERT ON public.hr_inbox_audit143168 TO authenticated;
GRANT USAGE ON SEQUENCE public.hr_inbox_audit143168_id_seq TO authenticated;
CREATE POLICY hr_inbox_admin ON public.hr_inbox143168 TO authenticated USING (public.is_admin() AND public.active_account14228() AND public.accounting_workspace_allowed123() AND NOT public.password_change_required14257()) WITH CHECK (public.is_admin() AND public.active_account14228() AND public.accounting_workspace_allowed123() AND NOT public.password_change_required14257());
CREATE POLICY hr_inbox_audit_read ON public.hr_inbox_audit143168 FOR SELECT TO authenticated USING (public.is_admin() AND public.active_account14228() AND public.accounting_workspace_allowed123() AND NOT public.password_change_required14257());
CREATE POLICY hr_inbox_audit_insert ON public.hr_inbox_audit143168 FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND public.active_account14228() AND public.accounting_workspace_allowed123() AND NOT public.password_change_required14257() AND changed_by=auth.uid());
CREATE FUNCTION public.hr_inbox_guard143168() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.status<>'pending' THEN RAISE EXCEPTION 'Accepted/rejected requests are immutable. Submit a new correction request.'; END IF;
  IF NEW.sheet<>OLD.sheet OR NEW.request_id<>OLD.request_id OR NEW.source<>OLD.source OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Request identity or version changed'; END IF;
 END IF;
 NEW.updated_at=now(); NEW.updated_by=auth.uid();
 INSERT INTO public.hr_inbox_audit143168(sheet,request_id,action,before_data,after_data) VALUES(NEW.sheet,NEW.request_id,CASE WHEN TG_OP='INSERT' THEN 'imported' WHEN NEW.status<>OLD.status THEN NEW.status ELSE 'edited' END,CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW));
 RETURN NEW;
END $$;
CREATE TRIGGER hr_inbox_guard BEFORE INSERT OR UPDATE ON public.hr_inbox143168 FOR EACH ROW EXECUTE FUNCTION public.hr_inbox_guard143168();
CREATE FUNCTION public.hr_inbox_save143168(p_sheet text,p_items jsonb,p_action text DEFAULT 'save') RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE item jsonb; rec public.hr_inbox143168; result jsonb='[]';
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() OR NOT public.active_account14228() OR NOT public.accounting_workspace_allowed123() OR public.password_change_required14257() THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF p_action NOT IN ('import','save','reject') OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)>100 THEN RAISE EXCEPTION 'Invalid request batch'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  IF coalesce(item->>'id','') !~ '^[A-Za-z0-9_-]{4,80}$' OR jsonb_typeof(item->'data')<>'object' THEN RAISE EXCEPTION 'Invalid request'; END IF;
  SELECT * INTO rec FROM public.hr_inbox143168 WHERE sheet=p_sheet AND request_id=item->>'id' FOR UPDATE;
  IF NOT FOUND THEN
   IF p_action<>'import' THEN RAISE EXCEPTION 'Request not found'; END IF;
   INSERT INTO public.hr_inbox143168(sheet,request_id,source,data) VALUES(p_sheet,item->>'id',item->'source',item->'data') RETURNING * INTO rec;
  ELSIF p_action<>'import' THEN
   IF rec.status<>'pending' OR rec.version<>(item->>'version')::int THEN RAISE EXCEPTION 'Request changed elsewhere. Sync and review again.'; END IF;
   UPDATE public.hr_inbox143168 SET data=item->'data',status=CASE WHEN p_action='reject' THEN 'rejected' ELSE 'pending' END,version=version+1 WHERE sheet=p_sheet AND request_id=rec.request_id RETURNING * INTO rec;
  END IF;
  result=result||jsonb_build_array(to_jsonb(rec));
 END LOOP;
 RETURN result;
END $$;
CREATE FUNCTION public.hr_inbox_baseline143168() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
SELECT jsonb_build_object('employees',(SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.payroll_employees t),'runs',(SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.payroll_runs t),'leaves',(SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.payroll_leave_records t),'events',(SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.hr_calendar_events14306 t),'calendar',(SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.hr_calendar_settings14306 t),'payroll',(SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.payroll_tax_settings t));
$$;
CREATE FUNCTION public.hr_inbox_apply143168(p_sheet text,p_items jsonb,p_plan jsonb,p_baseline jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE item jsonb; op jsonb; rec public.hr_inbox143168; oldrow jsonb; oldversion int; d jsonb; m text; stamp text; result jsonb='[]'; current_baseline jsonb; before_records jsonb='[]';
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() OR NOT public.active_account14228() OR NOT public.accounting_workspace_allowed123() OR public.password_change_required14257() THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 OR jsonb_array_length(p_plan->'operations') NOT BETWEEN 1 AND 3000 THEN RAISE EXCEPTION 'Invalid approval batch'; END IF;
 -- Lock all inputs until changes and immutable approval receipts commit together.
 LOCK TABLE public.payroll_runs,public.payroll_employees,public.payroll_leave_records,public.hr_calendar_events14306,public.hr_calendar_settings14306,public.payroll_tax_settings IN SHARE ROW EXCLUSIVE MODE;
 current_baseline=public.hr_inbox_baseline143168();
 IF current_baseline<>p_baseline THEN RAISE EXCEPTION 'HR or payroll changed since preview. Review again.'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  SELECT * INTO rec FROM public.hr_inbox143168 WHERE sheet=p_sheet AND request_id=item->>'id' FOR UPDATE;
  IF NOT FOUND OR rec.status<>'pending' OR rec.version<>(item->>'version')::int OR rec.data<>item->'data' THEN RAISE EXCEPTION 'Request changed or already processed. Sync the inbox.'; END IF;
 END LOOP;
 FOR op IN SELECT value FROM jsonb_array_elements(p_plan->'operations') LOOP
  IF op->>'table' NOT IN ('payroll_runs','payroll_leave_records','hr_calendar_events14306') THEN RAISE EXCEPTION 'Unsupported HR record'; END IF;
  d=op->'data';
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1',op->>'table') INTO oldrow USING (op->>'id')::uuid;
  before_records=before_records||jsonb_build_array(jsonb_build_object('table',op->>'table','id',op->>'id','record',oldrow));
  IF op->>'table'='payroll_runs' THEN
   m=d->>'month'; IF m !~ '^\d{4}-(0[1-9]|1[0-2])$' OR d->>'status'<>'draft' OR coalesce((d->>'isSample')::boolean,false) OR jsonb_typeof(d->'rows')<>'array' THEN RAISE EXCEPTION 'Only actual draft payroll can change'; END IF;
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
    IF d->>'status'<>'approved' THEN RAISE EXCEPTION 'Invalid leave status'; END IF;
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
REVOKE ALL ON FUNCTION public.hr_inbox_guard143168(),public.hr_inbox_save143168(text,jsonb,text),public.hr_inbox_apply143168(text,jsonb,jsonb,jsonb),public.hr_inbox_baseline143168() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hr_inbox_save143168(text,jsonb,text),public.hr_inbox_apply143168(text,jsonb,jsonb,jsonb),public.hr_inbox_baseline143168() TO authenticated;
