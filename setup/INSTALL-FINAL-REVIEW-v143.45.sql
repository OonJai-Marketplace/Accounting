-- Closing and department fund confirmations. Preserves all existing entries.
BEGIN;
ALTER TABLE public.staff_journals ADD COLUMN IF NOT EXISTS reconciliation14345 jsonb;

CREATE OR REPLACE FUNCTION public.guard_period_end14345() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE difference record;
BEGIN
 IF NEW.status IN ('closed','locked') AND (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
  IF (NEW.period_month+interval '1 month')::date > (statement_timestamp() AT TIME ZONE 'Asia/Vientiane')::date THEN
   RAISE EXCEPTION 'This month has not ended. Finish, Close and Lock are available from %.',(NEW.period_month+interval '1 month')::date;
  END IF;
  FOR difference IN SELECT l.currency_code,sum(l.debit-l.credit) amount FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.journal_entry_id
   WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<(NEW.period_month+interval '1 month')::date GROUP BY l.currency_code HAVING abs(sum(l.debit-l.credit))>0.005 LOOP
   RAISE EXCEPTION 'Trial balance does not balance: % difference %',difference.currency_code,difference.amount;
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS a_period_end14345 ON public.accounting_periods;
CREATE TRIGGER a_period_end14345 BEFORE INSERT OR UPDATE OF status ON public.accounting_periods FOR EACH ROW EXECUTE FUNCTION public.guard_period_end14345();
REVOKE ALL ON FUNCTION public.guard_period_end14345() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.submission_context14345(p_journal uuid,p_as_of date DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE j public.staff_journals; day date; today date=(statement_timestamp() AT TIME ZONE 'Asia/Vientiane')::date; funds jsonb; fingerprint text;
BEGIN
 SELECT * INTO j FROM public.staff_journals WHERE id=p_journal;
 IF auth.uid() IS NULL OR NOT FOUND OR NOT public.can_workspace113(j.owner_id) OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND status='active')
  OR NOT public.can_action113(CASE WHEN j.owner_id=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'edit') THEN RAISE EXCEPTION 'Workspace submission access required';END IF;
 IF j.status NOT IN ('draft','returned') THEN RAISE EXCEPTION 'This report is no longer available for submission';END IF;
 day=coalesce(p_as_of,least(today,j.period_end));
 IF day<j.period_start OR day>j.period_end OR day>today OR EXISTS(SELECT 1 FROM public.staff_journal_lines WHERE staff_journal_id=j.id AND transaction_date>day) THEN RAISE EXCEPTION 'Choose a reconciliation date covering every report entry, within the reporting period and no later than today';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.code),'[]') INTO funds FROM (
  SELECT a.id account_id,a.code,a.name,a.currency_code currency,
   coalesce((SELECT sum(l.debit-l.credit) FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.journal_entry_id WHERE l.account_id=a.id AND e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<=day),0) posted,
   coalesce((SELECT sum(CASE WHEN s.direction='out' THEN -s.amount ELSE s.amount END) FROM public.staff_journal_lines s JOIN public.staff_journals h ON h.id=s.staff_journal_id JOIN public.accounts counterpart ON counterpart.id=s.account_id WHERE h.owner_id=j.owner_id AND h.status IN ('draft','returned','submitted') AND s.journal_entry_id IS NULL AND s.fund_account_id=a.id AND s.transaction_date<=day AND (s.direction='out' OR counterpart.account_type<>'ASSET')),0) unposted
  FROM public.accounts a JOIN public.user_permissions up ON up.user_id=j.owner_id AND a.id::text IN (SELECT jsonb_array_elements_text(coalesce(to_jsonb(up)->'assigned_fund_account_ids','[]')))
  WHERE a.is_posting
 ) f;
 -- Fingerprint includes source details, so equal-amount edits also invalidate review.
 SELECT md5(jsonb_build_object('journal',to_jsonb(j)-'reconciliation14345','date',day,'funds',funds,
  'lines',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id),'[]') FROM public.staff_journal_lines s JOIN public.staff_journals h ON h.id=s.staff_journal_id WHERE h.owner_id=j.owner_id AND s.transaction_date<=day AND (h.status IN ('draft','returned','submitted') OR h.id=j.id)))::text) INTO fingerprint;
 RETURN jsonb_build_object('journal',j.id,'owner',j.owner_id,'asOf',day,'fingerprint',fingerprint,'funds',funds,'responsible',(SELECT full_name FROM public.profiles WHERE id=j.owner_id));
END $$;
REVOKE ALL ON FUNCTION public.submission_context14345(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submission_context14345(uuid,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_submission14345() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE approval jsonb=coalesce(nullif(current_setting('app.submission14345',true),'')::jsonb,'{}');
BEGIN
 IF ((TG_OP='INSERT' AND (NEW.reconciliation14345 IS NOT NULL OR NEW.status='submitted')) OR (TG_OP='UPDATE' AND (NEW.reconciliation14345 IS DISTINCT FROM OLD.reconciliation14345 OR (NEW.status='submitted' AND OLD.status IS DISTINCT FROM NEW.status))))
  AND (approval->>'actor' IS DISTINCT FROM auth.uid()::text OR approval->>'journal' IS DISTINCT FROM NEW.id::text) THEN
  RAISE EXCEPTION 'Select report types and confirm remaining funds before submitting';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS submission_confirmation14345 ON public.staff_journals;
CREATE TRIGGER submission_confirmation14345 BEFORE INSERT OR UPDATE ON public.staff_journals FOR EACH ROW EXECUTE FUNCTION public.guard_submission14345();
REVOKE ALL ON FUNCTION public.guard_submission14345() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.submit_reconciled14345(p_journal uuid,p_types uuid[],p_as_of date,p_fingerprint text,p_actuals jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE context jsonb; f jsonb; a jsonb; actual numeric; expected numeric; checks jsonb='[]'; j public.staff_journals;
BEGIN
 -- One transaction saves the report labels, checked balances and submitted state.
 LOCK TABLE public.staff_journals,public.staff_journal_lines,public.journal_entries,public.journal_lines,public.accounts,public.user_permissions IN SHARE ROW EXCLUSIVE MODE;
 context=public.submission_context14345(p_journal,p_as_of);
 IF context->>'fingerprint' IS DISTINCT FROM p_fingerprint THEN RAISE EXCEPTION 'Records changed. Review the remaining balances again before submitting';END IF;
 IF jsonb_typeof(p_actuals) IS DISTINCT FROM 'array' OR jsonb_array_length(p_actuals)<>jsonb_array_length(context->'funds') THEN RAISE EXCEPTION 'Confirm every assigned fund';END IF;
 FOR f IN SELECT value FROM jsonb_array_elements(context->'funds') LOOP
  IF (SELECT count(*) FROM jsonb_array_elements(p_actuals) x WHERE x->>'account_id'=f->>'account_id')<>1 THEN RAISE EXCEPTION 'Confirm each assigned fund exactly once';END IF;
  SELECT value INTO a FROM jsonb_array_elements(p_actuals) WHERE value->>'account_id'=f->>'account_id';
  IF coalesce(a->>'actual','') !~ '^-?[0-9]+([.][0-9]{1,2})?$' OR length(a->>'actual')>18 THEN RAISE EXCEPTION 'Enter a valid actual remaining balance for %',f->>'name';END IF;
  actual=(a->>'actual')::numeric;expected=(f->>'posted')::numeric+(f->>'unposted')::numeric;
  IF abs(actual-expected)>0.005 AND length(btrim(coalesce(a->>'reason','')))<3 THEN RAISE EXCEPTION 'Explain the difference for %',f->>'name';END IF;
  IF length(coalesce(a->>'reason',''))>2000 OR length(coalesce(a->>'reference',''))>500 THEN RAISE EXCEPTION 'Reconciliation note is too long';END IF;
  checks=checks||jsonb_build_array(f||jsonb_build_object('recorded',expected,'actual',actual,'difference',actual-expected,'reason',btrim(coalesce(a->>'reason','')),'reference',btrim(coalesce(a->>'reference',''))));
 END LOOP;
 PERFORM set_config('app.submission14345',jsonb_build_object('actor',auth.uid(),'journal',p_journal)::text,true);
 UPDATE public.staff_journals SET reconciliation14345=jsonb_build_object('asOf',p_as_of,'funds',checks,'responsible',context->>'responsible','confirmedBy',auth.uid(),'confirmedAt',statement_timestamp()) WHERE id=p_journal;
 PERFORM public.submit_report14253(p_journal,p_types);
 SELECT * INTO j FROM public.staff_journals WHERE id=p_journal;
 RETURN jsonb_build_object('id',j.id,'status',j.status,'submitted_at',j.submitted_at,'report_types14253',j.report_types14253,'reconciliation14345',j.reconciliation14345);
END $$;
REVOKE ALL ON FUNCTION public.submit_reconciled14345(uuid,uuid[],date,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_reconciled14345(uuid,uuid[],date,text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
