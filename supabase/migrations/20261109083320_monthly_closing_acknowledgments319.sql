-- A successful monthly close saves the administrator's reasoning with the warning's source evidence.
CREATE TABLE IF NOT EXISTS private.monthly_closing_decisions319 (
 issue_id text NOT NULL, period_month date NOT NULL, source_hash text NOT NULL,
 balance_scope text, reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 3 AND 2000),
 actor_id uuid NOT NULL, saved_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(issue_id,period_month)
);
REVOKE ALL ON private.monthly_closing_decisions319 FROM PUBLIC,anon,authenticated;
ALTER TABLE private.monthly_closing_decisions319 ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.closing_decisions319(checkup jsonb,p_month date) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
#variable_conflict use_variable
DECLARE
 issue jsonb; key text; kind text; reference text; source jsonb; balance jsonb; scope text;
 signature text; prior private.monthly_closing_decisions319%ROWTYPE; item jsonb; decisions jsonb:='{}';
 cutoff date:=(p_month+interval '1 month')::date;
BEGIN
 FOR issue IN SELECT value FROM jsonb_array_elements(checkup->'issues') WHERE value->>'severity'='warning' LOOP
  key:=issue->>'id';kind:=split_part(key,':',1);reference:=split_part(key,':',2);
  scope:=NULL;source:=NULL;
  IF kind IN ('fx','draft','memo') THEN
   SELECT jsonb_build_array(to_jsonb(e),(SELECT jsonb_agg(jsonb_build_array(to_jsonb(l),a.code,a.account_type,a.is_technical,a.currency_code) ORDER BY l.id)
      FROM public.journal_lines l JOIN public.accounts a ON a.id=l.account_id WHERE l.journal_entry_id=e.id))
    INTO source FROM public.journal_entries e WHERE e.id=CASE WHEN kind='fx' AND reference='evidence'
      THEN (SELECT l.journal_entry_id FROM public.journal_lines l WHERE l.id=split_part(key,':',3)::uuid)
      WHEN kind='fx' THEN split_part(key,':',3)::uuid ELSE reference::uuid END;
  ELSIF kind='report' THEN
   SELECT jsonb_build_array(to_jsonb(j),(SELECT jsonb_agg(to_jsonb(l) ORDER BY l.id)
    FROM public.staff_journal_lines l WHERE l.staff_journal_id=j.id AND l.transaction_date<cutoff AND l.journal_entry_id IS NULL))
    INTO source FROM public.staff_journals j WHERE j.id=reference::uuid;
  ELSIF kind='payroll' THEN
   SELECT jsonb_build_array(to_jsonb(r),(SELECT jsonb_agg(to_jsonb(l) ORDER BY l.id) FROM public.payroll_lines l WHERE l.payroll_run_id=r.id))
    INTO source FROM public.payroll_runs r WHERE r.id=reference::uuid;
  ELSIF kind='submission' THEN
   SELECT to_jsonb(s) INTO source FROM public.entry_submissions s WHERE s.id=reference::uuid;
  ELSIF kind='clearing' THEN
   SELECT value INTO balance FROM jsonb_array_elements(checkup->'balances') WHERE value->>'id'=reference;
   IF balance->>'account_purpose' IN ('clearing','suspense','settlement') AND (balance->>'balance')::numeric<>0 THEN
    scope:=md5(jsonb_build_array(reference,balance->>'account_type',balance->>'account_purpose',balance->>'currency',sign((balance->>'balance')::numeric))::text);
    source:=jsonb_build_array(balance,(SELECT jsonb_agg(jsonb_build_array(e.id,l.id,l.debit,l.credit,coalesce(l.line_date,e.transaction_date)) ORDER BY l.id)
     FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.journal_entry_id WHERE l.account_id=reference::uuid AND e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<cutoff));
   END IF;
  ELSIF kind='schedule' AND reference='reminder' THEN
   SELECT to_jsonb(r) INTO source FROM public.recurring_transactions r WHERE r.id=split_part(key,':',3)::uuid;
  ELSIF kind='schedule' AND reference IN ('legacy','legacy-rate') THEN
   SELECT to_jsonb(s) INTO source FROM public.scheduled_journals s WHERE s.id=split_part(key,':',3)::uuid;
  ELSIF kind='schedule' AND reference='plan' THEN
   SELECT jsonb_build_array(to_jsonb(p),to_jsonb(o)) INTO source FROM private.journal_plans280 p
    JOIN private.journal_plan_occurrences280 o ON o.plan_id=p.id WHERE p.id=split_part(key,':',3)::uuid AND o.occurrence_no=split_part(key,':',4)::integer;
  END IF;
  -- Unknown or aggregate checks have no isolated source revision. Reuse only for the exact preflight.
  signature:=md5(jsonb_build_array(issue,coalesce(source,to_jsonb(checkup->>'fingerprint')))::text);
  item:=jsonb_build_object('source',signature,'balanceScope',scope);
  SELECT * INTO prior FROM private.monthly_closing_decisions319 WHERE issue_id=key AND period_month<=p_month ORDER BY period_month DESC LIMIT 1;
  IF FOUND AND (prior.source_hash=signature OR (prior.balance_scope IS NOT NULL AND prior.balance_scope=scope)) THEN
   item:=item||jsonb_build_object('saved',jsonb_build_object('reason',prior.reason,'month',prior.period_month,
    'allowCarry',prior.balance_scope IS NOT NULL AND prior.balance_scope=scope));
  END IF;
  decisions:=decisions||jsonb_build_object(key,item);
 END LOOP;
 RETURN decisions;
END $$;
REVOKE ALL ON FUNCTION private.closing_decisions319(jsonb,date) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.save_closing_decisions319(p_month date,checkup jsonb,review jsonb) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item record;answer jsonb;carry boolean;prior jsonb;
BEGIN
 FOR item IN SELECT * FROM jsonb_each(checkup->'decisions319') LOOP
  answer:=review->'acknowledgments'->item.key;prior:=item.value->'saved';
  carry:=coalesce((answer->>'allowCarry')::boolean,false);
  IF carry AND item.value->>'balanceScope' IS NULL THEN RAISE EXCEPTION 'Monthly balance exception is unavailable for this finding';END IF;
  IF prior->>'reason'=btrim(answer->>'reason') AND (prior->>'allowCarry')::boolean=carry THEN CONTINUE;END IF;
  INSERT INTO private.monthly_closing_decisions319(issue_id,period_month,source_hash,balance_scope,reason,actor_id)
   VALUES(item.key,p_month,item.value->>'source',CASE WHEN carry THEN item.value->>'balanceScope' END,btrim(answer->>'reason'),auth.uid())
   ON CONFLICT(issue_id,period_month) DO UPDATE SET source_hash=excluded.source_hash,balance_scope=excluded.balance_scope,reason=excluded.reason,actor_id=excluded.actor_id,saved_at=now();
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION private.save_closing_decisions319(date,jsonb,jsonb) FROM PUBLIC,anon,authenticated;

-- Extend the installed checks in place, retaining all journal, schedule and reconciliation guards.
DO $migration$
DECLARE body text; start_text text; end_text text;
BEGIN
 body:=pg_get_functiondef('public.maintenance_preflight14324(date)'::regprocedure);
 IF position('private.closing_decisions319' IN body)=0 THEN
  start_text:='RETURN base||';end_text:='END $function$';
  IF position(start_text IN body)=0 OR position(end_text IN body)=0 THEN RAISE EXCEPTION 'Unexpected monthly preflight definition';END IF;
  body:=replace(body,start_text,'base:=base||');
  body:=replace(body,end_text,'extra:=private.closing_decisions319(base,p_month);
   RETURN base||jsonb_build_object(''decisions319'',extra,''decisionRevision319'',md5(extra::text));
   END $function$');
  EXECUTE body;
 END IF;
 body:=pg_get_functiondef('public.maintenance_finish14324(date,text,text,jsonb,text,uuid,integer,text,text)'::regprocedure);
 IF position('private.save_closing_decisions319' IN body)=0 THEN
  start_text:='checkup=public.maintenance_preflight14324(p_month);';end_text:='RETURN result;';
  IF position(start_text IN body)=0 OR position(end_text IN body)=0 THEN RAISE EXCEPTION 'Unexpected monthly closing definition';END IF;
  body:=replace(body,start_text,'LOCK TABLE private.monthly_closing_decisions319 IN SHARE ROW EXCLUSIVE MODE;
   '||start_text||'
   IF p_review ? ''decisionRevision319'' AND p_review->>''decisionRevision319'' IS DISTINCT FROM checkup->>''decisionRevision319'' THEN
    RAISE EXCEPTION ''Saved reasons changed. Reopen the closing review.'';
   END IF;');
  body:=replace(body,end_text,'IF p_kind IN (''period'',''session'') AND p_review ? ''decisionRevision319'' THEN
    PERFORM private.save_closing_decisions319(p_month,checkup,p_review);
   END IF;
   '||end_text);
  EXECUTE body;
 END IF;
END $migration$;
