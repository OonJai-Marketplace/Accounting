-- Non-destructive: closing acknowledgments and later-period report posting.
-- Requires the existing accounting workflows and INSTALL-MONEY-IN-v142.78.sql.
BEGIN;
CREATE OR REPLACE FUNCTION public.period_pending14317(p_month date) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE items jsonb; first_day date=date_trunc('month',p_month)::date;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Active administrator required';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb) INTO items FROM (
  SELECT j.id,j.owner_id,coalesce(u.full_name,u.email,'Former user') owner_name,j.status,
   min(l.transaction_date) AS "from",max(l.transaction_date) AS "to",count(*) AS count,
   jsonb_agg(to_jsonb(l) ORDER BY l.id) AS source_rows
  FROM public.staff_journals j JOIN public.staff_journal_lines l ON l.staff_journal_id=j.id LEFT JOIN public.profiles u ON u.id=j.owner_id
  WHERE j.status IN('draft','returned','submitted') AND l.journal_entry_id IS NULL
    AND l.transaction_date>=first_day AND l.transaction_date<(first_day+interval '1 month')
  GROUP BY j.id,j.owner_id,u.full_name,u.email,j.status
 ) p;
 RETURN jsonb_build_object('month',first_day,'items',items,'revision',md5(items::text));
END $$;
CREATE OR REPLACE FUNCTION public.ack_period14317(p_month date,p_revision text,p_acknowledged boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE current_check jsonb; context jsonb; key text=to_char(p_month,'YYYY-MM');
BEGIN
 -- Hold submissions and their lines stable until the closing transaction commits.
 LOCK TABLE public.staff_journals,public.staff_journal_lines IN SHARE MODE;
 current_check=public.period_pending14317(p_month);
 IF p_revision IS DISTINCT FROM current_check->>'revision' THEN RAISE EXCEPTION 'Pending submissions changed. Review the current warning and acknowledge again.';END IF;
 IF jsonb_array_length(current_check->'items')>0 AND p_acknowledged IS DISTINCT FROM true THEN RAISE EXCEPTION 'Acknowledge pending submissions before closing or locking.';END IF;
 context=coalesce(nullif(current_setting('app.period_ack14317',true),'')::jsonb,'{}'::jsonb);
 PERFORM set_config('app.period_ack14317',(context||jsonb_build_object(key,jsonb_build_object('actor',auth.uid(),'revision',p_revision)))::text,true);
 IF jsonb_array_length(current_check->'items')>0 THEN
  INSERT INTO public.audit_log(table_name,record_id,action,new_data,reason,actor_id)
  VALUES('accounting_periods',key,'UPDATE',current_check,'Acknowledged unposted submissions; excluded from closing and retained for a later open posting period',auth.uid());
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.guard_period_ack14317() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE current_check jsonb; acknowledgment jsonb;
BEGIN
 IF NEW.status IN('closed','locked') AND (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
  current_check=public.period_pending14317(NEW.period_month);
  IF jsonb_array_length(current_check->'items')>0 THEN
   acknowledgment=coalesce(nullif(current_setting('app.period_ack14317',true),'')::jsonb,'{}'::jsonb)->to_char(NEW.period_month,'YYYY-MM');
   IF acknowledgment->>'actor' IS DISTINCT FROM auth.uid()::text OR acknowledgment->>'revision' IS DISTINCT FROM current_check->>'revision' THEN RAISE EXCEPTION 'Pending submissions require acknowledgment before closing or locking this month.';END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_period_ack14317 ON public.accounting_periods;
CREATE TRIGGER guard_period_ack14317 BEFORE INSERT OR UPDATE OF status ON public.accounting_periods FOR EACH ROW EXECUTE FUNCTION public.guard_period_ack14317();
CREATE OR REPLACE FUNCTION public.set_period_status14317(p_month date,p_status text,p_revision text,p_acknowledged boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF p_status NOT IN('closed','locked') THEN RAISE EXCEPTION 'Choose closing or locking';END IF;
 PERFORM public.ack_period14317(p_month,p_revision,p_acknowledged);
 -- Preserve the installed permissions, balance, finding and period-state checks.
 PERFORM public.set_accounting_period_status(p_month,p_status);
 RETURN jsonb_build_object('month',p_month,'status',p_status);
END $$;
CREATE OR REPLACE FUNCTION public.finish_book_session14317(p_session uuid,p_month date,p_revision text,p_acknowledged boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE book jsonb;
BEGIN
 SELECT to_jsonb(b) INTO book FROM public.book_sessions136 b WHERE b.id=p_session;
 IF book IS NULL OR date_trunc('month',coalesce(book->>'month',book->>'period_month')::date)::date IS DISTINCT FROM date_trunc('month',p_month)::date THEN RAISE EXCEPTION 'Correction session month changed. Reopen the current session.';END IF;
 PERFORM public.ack_period14317(p_month,p_revision,p_acknowledged);
 PERFORM public.finish_book_session136(p_session,false);
 RETURN jsonb_build_object('closed',true);
END $$;
CREATE OR REPLACE FUNCTION public.close_year14317(p_year integer,p_confirmation text,p_fingerprint text,p_acknowledgments jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE m integer; d date; a jsonb;
BEGIN
 FOR m IN 1..12 LOOP
  d=make_date(p_year,m,1);a=p_acknowledgments->to_char(d,'YYYY-MM');
  PERFORM public.ack_period14317(d,a->>'revision',coalesce((a->>'acknowledged')::boolean,false));
 END LOOP;
 PERFORM public.close_year136(p_year,p_confirmation,p_fingerprint);
 RETURN jsonb_build_object('year',p_year,'closed',true);
END $$;
-- Patch the *installed* summary function so later money-in, permission,
-- snapshot, idempotency and exact-source checks are preserved.
DO $$
DECLARE source text; old_clause text=$old$IF p_date IS NULL OR date_trunc('month',p_date)<>date_trunc('month',j.period_start) THEN RAISE EXCEPTION 'Posting date must be within the reporting month';END IF;$old$;
 new_clause text=$new$IF p_date IS NULL OR date_trunc('month',p_date)<date_trunc('month',j.period_start) THEN RAISE EXCEPTION 'Choose the reporting month or a later open posting month';END IF;
 IF date_trunc('month',p_date)>date_trunc('month',j.period_start) AND NOT EXISTS(SELECT 1 FROM public.accounting_periods WHERE period_month=date_trunc('month',j.period_start)::date AND status IN('closed','locked')) THEN RAISE EXCEPTION 'Use the original reporting month while it is open';END IF;$new$;
BEGIN
 source=pg_get_functiondef('public.post_summary14253(uuid,date,text,jsonb,text,integer)'::regprocedure);
 IF position(old_clause in source)>0 THEN EXECUTE replace(source,old_clause,new_clause);
 ELSIF position('Choose the reporting month or a later open posting month' in source)=0 THEN RAISE EXCEPTION 'Summary function differs from supported versions. No changes applied. Review its date gate before installing.';END IF;
END $$;
REVOKE ALL ON FUNCTION public.period_pending14317(date),public.set_period_status14317(date,text,text,boolean),public.finish_book_session14317(uuid,date,text,boolean),public.close_year14317(integer,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.period_pending14317(date),public.set_period_status14317(date,text,text,boolean),public.finish_book_session14317(uuid,date,text,boolean),public.close_year14317(integer,text,text,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.ack_period14317(date,text,boolean),public.guard_period_ack14317() FROM PUBLIC,anon,authenticated;
COMMIT;
