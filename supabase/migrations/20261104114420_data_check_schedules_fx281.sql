-- Read-only checks. No journals, rates, schedules or approvals are changed.
-- Keep the installed preflight's existing checks and authorization intact.
DO $copy$
DECLARE body text;
BEGIN
 IF to_regprocedure('private.maintenance_base281(date)') IS NULL THEN
  body:=pg_get_functiondef('public.maintenance_preflight14324(date)'::regprocedure);
  EXECUTE replace(body,'public.maintenance_preflight14324(', 'private.maintenance_base281(');
 END IF;
END $copy$;
REVOKE ALL ON FUNCTION private.maintenance_base281(date) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.check_issue281(severity text,id text,title text,detail text,category text)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_build_array(jsonb_build_object('severity',severity,'id',id,'title',title,'detail',detail,'category',category))
$$;
CREATE OR REPLACE FUNCTION private.valid_rate281(rate numeric) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(rate>0 AND rate::text NOT IN ('NaN','Infinity','-Infinity'),false)
$$;

-- Reconstruct the authorised allocation without saving or posting anything.
CREATE OR REPLACE FUNCTION private.expected_amortization281(d jsonb)
RETURNS TABLE(occurrence_no integer,due_date date,lines jsonb)
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE first_date date:=(d->>'start')::date;last_date date:=(d->>'end')::date;
 month_date date;weight numeric;total_weight numeric;used numeric:=0;previous numeric;months integer;
 source jsonb;l jsonb;result jsonb;dr numeric;cr numeric;lak numeric;rate numeric;amount numeric;i integer;
BEGIN
 months:=(extract(year FROM last_date)-extract(year FROM first_date))*12+extract(month FROM last_date)-extract(month FROM first_date)+1;
 IF months NOT BETWEEN 1 AND 599 THEN RAISE EXCEPTION 'Invalid amortization month range';END IF;
 total_weight:=CASE WHEN d->>'allocation'='daily' THEN last_date-first_date+1 ELSE months END;
 SELECT x INTO source FROM jsonb_array_elements(d->'lines') x WHERE x->>'currency_code'<>'LAK' AND (x->>'credit')::numeric>0;
 FOR i IN 1..months LOOP
  month_date:=(date_trunc('month',first_date)+(i-1)*interval '1 month')::date;
  weight:=CASE WHEN d->>'allocation'='daily' THEN least(last_date,(month_date+interval '1 month - 1 day')::date)-greatest(first_date,month_date)+1 ELSE 1 END;
  previous:=used;used:=used+weight;result:='[]';
  IF source IS NOT NULL THEN
   amount:=(source->>'credit')::numeric;rate:=(source->>'book_rate_lak')::numeric;
   lak:=CASE WHEN d->>'amount_basis'='total' THEN round(round(amount*used/total_weight,2)*rate,2)-round(round(amount*previous/total_weight,2)*rate,2) ELSE round(amount*i*rate,2)-round(amount*(i-1)*rate,2) END;
  END IF;
  FOR l IN SELECT value FROM jsonb_array_elements(d->'lines') LOOP
   dr:=(l->>'debit')::numeric;cr:=(l->>'credit')::numeric;
   IF d->>'amount_basis'='total' THEN dr:=round(dr*used/total_weight,2)-round(dr*previous/total_weight,2);cr:=round(cr*used/total_weight,2)-round(cr*previous/total_weight,2);END IF;
   IF source IS NOT NULL AND l->>'currency_code'='LAK' THEN IF (l->>'debit')::numeric>0 THEN dr:=lak;ELSE cr:=lak;END IF;END IF;
   result:=result||jsonb_build_array(jsonb_build_array(l->>'account_id',l->>'currency_code',dr,cr,
    CASE WHEN l->>'currency_code'='LAK' THEN dr ELSE coalesce(lak,round(dr*(l->>'book_rate_lak')::numeric,2))*CASE WHEN dr>0 THEN 1 ELSE 0 END END,
    CASE WHEN l->>'currency_code'='LAK' THEN cr ELSE coalesce(lak,round(cr*(l->>'book_rate_lak')::numeric,2))*CASE WHEN cr>0 THEN 1 ELSE 0 END END));
  END LOOP;
  occurrence_no:=i;due_date:=CASE WHEN d->>'posting_day'='first' THEN month_date ELSE (month_date+interval '1 month - 1 day')::date END;lines:=result;RETURN NEXT;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION private.extended_check281(p_month date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
#variable_conflict use_column
DECLARE
 cutoff date:=(p_month+interval '1 month')::date; issues jsonb:='[]'; checks jsonb:='[]';
 e record;l record;m record;o record;s record;b record; actual numeric; expected numeric; rate numeric;
 base_gap numeric; fx_actual numeric; fx_expected numeric; business_value numeric; rate_fx numeric;
 foreign_count integer; line_count integer; before_count integer; all_rates boolean; supported boolean;
 has_disposal boolean; has_cash boolean; has_prepaid boolean; is_opening boolean; maps_ok boolean;
 r jsonb; snapshot_lines jsonb; posted_lines jsonb; fingerprint text; schedules integer:=0;
 map_codes jsonb:='{"9101":["4010","9190"],"9102":["4010","9190"],"9111":["4110","9190"],"9112":["4110","9190"],"9121":["4120","9190"],"9131":["4130","9190"],"9132":["4130","9190"],"9201":["5010","9290"],"9202":["5010","9290"],"9211":["5111","9290"],"9212":["5111","9290"],"9222":["5119","9290"],"9231":["5311","9290"],"9232":["5311","9290"],"9233":["5315","9290"],"9234":["5315","9290"],"9241":["5414","9290"],"9242":["5414","9290"],"9311":["3023","9390"],"9312":["3023","9390"],"9321":["3024","9390"],"9322":["3024","9390"],"9331":["3031","9390"],"9332":["3031","9390"],"9411":["1310","9490"]}';
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required';END IF;
 IF p_month IS NULL OR p_month<>date_trunc('month',p_month)::date THEN RAISE EXCEPTION 'Choose a valid accounting month';END IF;

 FOR e IN SELECT * FROM public.journal_entries WHERE status::text='posted' AND transaction_date<cutoff ORDER BY transaction_date,entry_no,id LOOP
  before_count:=jsonb_array_length(issues); all_rates:=true; supported:=true;maps_ok:=true;
  base_gap:=0;business_value:=0;fx_actual:=0;rate_fx:=0;foreign_count:=0;line_count:=0;
  has_disposal:=false;has_cash:=false;has_prepaid:=false;
  is_opening:=coalesce(e.reference,'') LIKE 'ANNUAL-OPENING-%' OR coalesce(e.reference,'') LIKE 'YEAR-CLOSE-%' OR e.source::text='opening' OR e.memo='Opening Balances';
  FOR l IN SELECT j.*,a.code,a.name,a.is_technical,a.account_type FROM public.journal_lines j JOIN public.accounts a ON a.id=j.account_id WHERE j.journal_entry_id=e.id ORDER BY j.line_no LOOP
   line_count:=line_count+1;
   rate:=CASE WHEN l.currency_code='LAK' THEN 1 ELSE coalesce(l.book_rate_lak,l.fx_rate_lak) END;
   IF l.currency_code<>'LAK' THEN
    foreign_count:=foreign_count+1;
    IF NOT private.valid_rate281(rate) OR (l.fx_rate_lak IS NOT NULL AND NOT private.valid_rate281(l.fx_rate_lak)) OR (l.book_rate_lak IS NOT NULL AND NOT private.valid_rate281(l.book_rate_lak)) THEN
     all_rates:=false;
     issues:=issues||private.check_issue281('block','fx:rate:'||l.id,'Missing or invalid foreign rate',e.entry_no||' / line '||l.line_no||' / '||l.code||' '||l.currency_code||': a positive finite recorded rate is required.','foreign');
     CONTINUE;
    END IF;
    IF l.book_rate_lak IS NULL OR l.fx_rate_lak IS NULL THEN
     issues:=issues||private.check_issue281('warning','fx:evidence:'||l.id,'Foreign rate evidence needs review',e.entry_no||' / line '||l.line_no||': '||CASE WHEN l.book_rate_lak IS NULL THEN 'original carrying rate' ELSE 'transaction rate' END||' is not separately stored. Verify the source before accepting this calculation.','foreign');
    END IF;
   ELSIF (l.book_rate_lak IS NOT NULL AND l.book_rate_lak<>1) OR (l.fx_rate_lak IS NOT NULL AND l.fx_rate_lak<>1) THEN
    issues:=issues||private.check_issue281('block','fx:lak-rate:'||l.id,'LAK line has a foreign rate',e.entry_no||' / line '||l.line_no||': LAK must use rate 1.','foreign');
   END IF;
   IF l.debit::text IN('NaN','Infinity','-Infinity') OR l.credit::text IN('NaN','Infinity','-Infinity') THEN all_rates:=false;CONTINUE;END IF;
   expected:=round(l.debit*rate,2)-round(l.credit*rate,2);
   base_gap:=base_gap+expected;
   IF l.base_debit IS DISTINCT FROM round(l.debit*rate,2) OR l.base_credit IS DISTINCT FROM round(l.credit*rate,2) THEN
    issues:=issues||private.check_issue281('block','fx:conversion:'||l.id,'Stored LAK conversion does not match',e.entry_no||' / line '||l.line_no||': amount × recorded rate '||rate||'; expected debit/credit '||round(l.debit*rate,2)||' / '||round(l.credit*rate,2)||' LAK, recorded '||coalesce(l.base_debit::text,'missing')||' / '||coalesce(l.base_credit::text,'missing')||'.','foreign');
   END IF;
   IF l.code='5419' THEN fx_actual:=fx_actual+l.debit-l.credit;
   ELSIF NOT l.is_technical THEN business_value:=business_value+expected;END IF;
   IF NOT l.is_technical AND l.code ~ '^10[0-9]{2}$' THEN has_cash:=true;END IF;
   IF NOT l.is_technical AND l.code ~ '^13[0-9]{2}$' AND l.credit>0 THEN has_prepaid:=true;END IF;
   IF l.currency_code<>'LAK' AND NOT l.is_technical AND (l.code ~ '^(10|11|12)[0-9]{2}$' OR l.account_type='LIABILITY') THEN
    rate_fx:=rate_fx+round((l.debit-l.credit)*coalesce(l.fx_rate_lak,rate),2)-expected;
    IF (l.code ~ '^10[0-9]{2}$' AND l.credit>0) OR (l.code ~ '^(11|12)[0-9]{2}$' AND l.debit>0) OR (l.account_type='LIABILITY' AND l.debit>0) THEN has_disposal:=true;END IF;
   END IF;
   IF l.is_technical AND NOT (map_codes ? l.code) AND l.code NOT IN('9010','9011','9012','9041','9042','9190','9290','9390','9490') THEN supported:=false;END IF;
  END LOOP;
  -- Each accounting date must balance separately, even when an entire entry balances.
  FOR b IN SELECT coalesce(line_date,e.transaction_date) posting_day,currency_code,sum(debit-credit) gap FROM public.journal_lines WHERE journal_entry_id=e.id GROUP BY 1,2 HAVING abs(sum(debit-credit))>0.005 LOOP
   issues:=issues||private.check_issue281('block','entry-day:'||e.id||':'||b.posting_day||':'||b.currency_code,'Journal date does not balance',e.entry_no||' / '||b.posting_day||' / '||b.currency_code||': difference '||b.gap||'.','ledger');
  END LOOP;
  IF foreign_count>0 AND all_rates AND abs(base_gap)>0.005 THEN
   issues:=issues||private.check_issue281('block','fx:base:'||e.id,'Journal carrying values do not balance',e.entry_no||': foreign amounts at their recorded book rates plus LAK lines differ by '||base_gap||' LAK.','foreign');
  END IF;
  -- Match known foreign mapping accounts to actual LAK accounts. Additional local
  -- activity on that same account needs review; never infer an allocation from a memo.
  IF all_rates THEN
   FOR m IN SELECT map_codes->a.code->>0 code,sum(round((j.debit-j.credit)*coalesce(j.fx_rate_lak,j.book_rate_lak),2)) amount
    FROM public.journal_lines j JOIN public.accounts a ON a.id=j.account_id WHERE j.journal_entry_id=e.id AND a.currency_code<>'LAK' AND map_codes ? a.code GROUP BY 1 LOOP
    SELECT coalesce(sum(j.debit-j.credit),0) INTO actual FROM public.journal_lines j JOIN public.accounts a ON a.id=j.account_id WHERE j.journal_entry_id=e.id AND a.currency_code='LAK' AND a.code=m.code;
    IF abs(actual-m.amount)>0.005 THEN
     maps_ok:=false;
     issues:=issues||private.check_issue281('warning','fx:mapping:'||e.id||':'||m.code,'Foreign mapping needs review',e.entry_no||' / LAK account '||m.code||': expected signed amount '||m.amount||' from foreign amount × transaction rate; recorded '||actual||'; difference '||(actual-m.amount)||'. Check missing mapping or separately entered local amounts.','foreign');
    END IF;
   END LOOP;
   FOR m IN SELECT map_codes->a.code->>1 code,-sum(round((j.debit-j.credit)*coalesce(j.book_rate_lak,j.fx_rate_lak),2)) amount
    FROM public.journal_lines j JOIN public.accounts a ON a.id=j.account_id WHERE j.journal_entry_id=e.id AND a.currency_code<>'LAK' AND map_codes ? a.code GROUP BY 1 LOOP
    SELECT coalesce(sum(j.debit-j.credit),0) INTO actual FROM public.journal_lines j JOIN public.accounts a ON a.id=j.account_id WHERE j.journal_entry_id=e.id AND a.currency_code='LAK' AND a.code=m.code;
    IF abs(actual-m.amount)>0.005 THEN
     maps_ok:=false;
     issues:=issues||private.check_issue281('warning','fx:offset:'||e.id||':'||m.code,'Historical LAK mapping needs review',e.entry_no||' / account '||m.code||': expected signed amount '||m.amount||' at the saved book rate; recorded '||actual||'; difference '||(actual-m.amount)||'.','foreign');
    END IF;
   END LOOP;
  END IF;
  fx_expected:=NULL;
  IF foreign_count>0 AND all_rates AND supported AND NOT is_opening THEN
   IF has_prepaid AND NOT has_cash AND NOT has_disposal THEN
    fx_expected:=0;
    IF fx_actual<>0 THEN issues:=issues||private.check_issue281('block','fx:prepaid-gain:'||e.id,'Amortization contains exchange gain or loss',e.entry_no||': prepaid release uses historical cost; expected FX 0, recorded '||fx_actual||' LAK.','foreign');END IF;
    IF EXISTS(SELECT 1 FROM public.journal_lines WHERE journal_entry_id=e.id AND currency_code<>'LAK' AND book_rate_lak IS DISTINCT FROM fx_rate_lak) THEN
     issues:=issues||private.check_issue281('warning','fx:prepaid-rate:'||e.id,'Amortization historical rate differs',e.entry_no||': transaction and carrying rates differ. Compare with the original prepaid lot; do not use a new market rate.','foreign');
    END IF;
   ELSIF has_disposal AND maps_ok THEN
    -- The economic legs, excluding technical bridges and FX, supply a second
    -- comparison independent of the entered FX/bridge balancing rows.
    fx_expected:=-business_value;
    IF abs(fx_actual-fx_expected)>0.005 THEN
     issues:=issues||private.check_issue281('block','fx:gain-loss:'||e.id,'Exchange gain or loss does not match',e.entry_no||': expected '||fx_expected||' LAK from saved business carrying values; recorded '||fx_actual||'; difference '||(fx_actual-fx_expected)||'. Positive = loss/debit; negative = gain/credit.','foreign');
    END IF;
    IF abs(rate_fx-fx_expected)>0.02 THEN
     issues:=issues||private.check_issue281('warning','fx:settlement-rate:'||e.id,'Settlement rate basis needs review',e.entry_no||': monetary amount × (transaction rate − book rate) gives '||rate_fx||' LAK; business consideration gives '||fx_expected||'. Verify actual exchange proceeds, historical lots, fees and split payments. Do not use FX to fill missing business amounts.','foreign');
    END IF;
   ELSIF fx_actual<>0 THEN
    issues:=issues||private.check_issue281('warning','fx:unverified:'||e.id,'Exchange adjustment needs source review',e.entry_no||': recorded '||fx_actual||' LAK. This transaction does not provide an unambiguous supported settlement calculation.','foreign');
   END IF;
  ELSIF fx_actual<>0 OR (foreign_count>0 AND NOT supported AND NOT is_opening) THEN
   issues:=issues||private.check_issue281('warning','fx:unverified:'||e.id,'Foreign calculation needs source review',e.entry_no||': verify original rates and the specialised or legacy mapping. This entry is not certified by the standard settlement checks.','foreign');
  END IF;
  checks:=checks||jsonb_build_array(jsonb_build_object('id',e.id,'entry_no',e.entry_no,'date',e.transaction_date,'lines',line_count,'foreign_lines',foreign_count,'base_difference',CASE WHEN all_rates THEN base_gap END,'fx_expected',fx_expected,'fx_recorded',fx_actual,'findings',jsonb_array_length(issues)-before_count));
 END LOOP;

 FOR s IN SELECT * FROM private.journal_plans280 WHERE kind='amortization' AND (definition->>'start')::date<cutoff LOOP
  BEGIN
   FOR m IN SELECT * FROM private.expected_amortization281(s.definition) LOOP
    SELECT * INTO o FROM private.journal_plan_occurrences280 WHERE plan_id=s.id AND occurrence_no=m.occurrence_no;
    SELECT jsonb_agg(jsonb_build_array(x->>'account_id',x->>'currency_code',(x->>'debit')::numeric,(x->>'credit')::numeric,
     round((x->>'debit')::numeric*CASE WHEN x->>'currency_code'='LAK' THEN 1 ELSE (x->>'book_rate_lak')::numeric END,2),
     round((x->>'credit')::numeric*CASE WHEN x->>'currency_code'='LAK' THEN 1 ELSE (x->>'book_rate_lak')::numeric END,2)) ORDER BY n)
     INTO snapshot_lines FROM jsonb_array_elements(o.lines) WITH ORDINALITY q(x,n);
    IF o.plan_id IS NULL OR o.due_date IS DISTINCT FROM m.due_date OR snapshot_lines IS DISTINCT FROM m.lines THEN
     issues:=issues||private.check_issue281('block','schedule:allocation:'||s.id||':'||m.occurrence_no,'Amortization allocation does not match',s.title||' / occurrence '||m.occurrence_no||': compare date, monthly/daily share, native amount and historical LAK value with the approved plan. Expected '||m.due_date||'; saved '||coalesce(o.due_date::text,'missing')||'.','schedules');
    END IF;
   END LOOP;
   IF (SELECT count(*) FROM private.journal_plan_occurrences280 WHERE plan_id=s.id)<>(SELECT count(*) FROM private.expected_amortization281(s.definition)) THEN
    issues:=issues||private.check_issue281('block','schedule:count:'||s.id,'Amortization occurrence count differs',s.title||': missing or extra monthly occurrences; verify the service period and year carryover.','schedules');
   END IF;
  EXCEPTION WHEN OTHERS THEN
   issues:=issues||private.check_issue281('block','schedule:definition:'||s.id,'Amortization plan cannot be checked',s.title||': '||SQLERRM,'schedules');
  END;
 END LOOP;
 FOR o IN SELECT x.*,p.title,p.kind,p.status plan_status,p.last_error,e.entry_no,e.status::text entry_status,e.transaction_date
  FROM private.journal_plan_occurrences280 x JOIN private.journal_plans280 p ON p.id=x.plan_id LEFT JOIN public.journal_entries e ON e.id=x.journal_entry_id
  WHERE x.coverage_month<=p_month ORDER BY x.coverage_month,p.id,x.occurrence_no LOOP
  schedules:=schedules+1;
  IF o.status='pending' AND o.plan_status<>'complete' THEN
   issues:=issues||private.check_issue281(CASE WHEN o.kind='amortization' AND o.plan_status='active' THEN 'block' ELSE 'warning' END,'schedule:plan:'||o.plan_id||':'||o.occurrence_no,
    CASE WHEN o.kind='amortization' THEN 'Unposted amortization' ELSE 'Recurring occurrence needs review' END,
    o.title||' / due '||o.due_date||' / '||o.plan_status||'. '||CASE WHEN o.last_error IS NOT NULL THEN 'Last attempt: '||o.last_error||'. ' ELSE '' END||'Open Upcoming; post the complete journal or explicitly review why it remains excluded.','schedules');
  END IF;
  IF o.status='posted' THEN
   IF o.entry_status IS DISTINCT FROM 'posted' OR o.transaction_date IS DISTINCT FROM o.due_date THEN
    issues:=issues||private.check_issue281('block','schedule:link:'||o.plan_id||':'||o.occurrence_no,'Schedule posting link does not match',o.title||' / '||o.due_date||': journal '||coalesce(o.entry_no,'missing')||' is missing, voided or in another accounting month.','schedules');
   ELSE
    SELECT jsonb_agg(jsonb_build_array(x->>'account_id',x->>'currency_code',(x->>'debit')::numeric,(x->>'credit')::numeric,(x->>'book_rate_lak')::numeric,(x->>'fx_rate_lak')::numeric) ORDER BY n) INTO snapshot_lines FROM jsonb_array_elements(o.lines) WITH ORDINALITY q(x,n);
    SELECT jsonb_agg(jsonb_build_array(account_id::text,currency_code,debit,credit,book_rate_lak,fx_rate_lak) ORDER BY line_no) INTO posted_lines FROM public.journal_lines WHERE journal_entry_id=o.journal_entry_id;
    IF snapshot_lines IS DISTINCT FROM posted_lines THEN issues:=issues||private.check_issue281('block','schedule:amount:'||o.plan_id||':'||o.occurrence_no,'Posted schedule differs from its approved lines',o.title||' / '||o.entry_no||': accounts, amounts, currencies or historical rates no longer match the saved occurrence.','schedules');END IF;
   END IF;
  ELSIF o.journal_entry_id IS NOT NULL THEN
   issues:=issues||private.check_issue281('block','schedule:state:'||o.plan_id||':'||o.occurrence_no,'Schedule status and journal disagree',o.title||' / '||o.due_date||': a non-posted occurrence still links a journal.','schedules');
  END IF;
  IF o.status='pending' AND o.plan_status='active' THEN
   BEGIN
    PERFORM private.validate_plan_lines280(o.lines,o.kind);
   EXCEPTION WHEN OTHERS THEN
    issues:=issues||private.check_issue281('block','schedule:invalid:'||o.plan_id||':'||o.occurrence_no,'Schedule lines need correction',o.title||' / '||o.due_date||': '||SQLERRM,'schedules');
   END;
  END IF;
 END LOOP;
 -- Duplicate links are never a second legitimate posting.
 FOR b IN SELECT journal_entry_id,count(*) n FROM private.journal_plan_occurrences280 WHERE coverage_month<=p_month AND journal_entry_id IS NOT NULL GROUP BY journal_entry_id HAVING count(*)>1 LOOP
  issues:=issues||private.check_issue281('block','schedule:duplicate:'||b.journal_entry_id,'Journal linked to multiple occurrences',b.journal_entry_id||': '||b.n||' occurrences link the same journal.','schedules');
 END LOOP;
 FOR s IN SELECT s.*,a.code credit_code,a.account_type credit_type FROM public.scheduled_journals s LEFT JOIN public.accounts a ON a.id=s.credit_account_id WHERE NOT s.is_sample AND s.start_date<cutoff ORDER BY s.id LOOP
  schedules:=schedules+1;
  IF s.status='active' AND s.next_due<cutoff AND (s.end_date IS NULL OR s.next_due<=s.end_date) AND (s.max_occurrences IS NULL OR s.posted_count<s.max_occurrences) THEN
   issues:=issues||private.check_issue281(CASE WHEN s.credit_type='ASSET' AND s.credit_code~'^13' THEN 'block' ELSE 'warning' END,'schedule:legacy:'||s.id,'Legacy schedule is due',s.schedule_no||' / '||s.title||' / due '||s.next_due||': '||s.amount||' '||s.currency_code||'. Check the full foreign and LAK pair before posting. '||coalesce(s.last_error,''),'schedules');
  END IF;
  IF s.status='active' AND s.next_due<cutoff AND s.currency_code<>'LAK' AND NOT private.valid_rate281(s.fixed_book_rate_lak) THEN
   issues:=issues||private.check_issue281('warning','schedule:legacy-rate:'||s.id,'Schedule historical rate is missing',s.schedule_no||': verify the original carrying value before approval.','schedules');
  END IF;
 END LOOP;
 FOR o IN SELECT o.*,s.schedule_no,e.entry_no,e.status::text entry_status,e.transaction_date FROM public.scheduled_journal_occurrences o JOIN public.scheduled_journals s ON s.id=o.schedule_id LEFT JOIN public.journal_entries e ON e.id=o.journal_entry_id WHERE NOT s.is_sample AND o.occurrence_date<cutoff AND o.cancelled_at IS NULL LOOP
  IF o.entry_status IS DISTINCT FROM 'posted' OR date_trunc('month',o.transaction_date) IS DISTINCT FROM date_trunc('month',o.occurrence_date) THEN
   issues:=issues||private.check_issue281('block','schedule:legacy-link:'||o.id,'Legacy schedule posting needs review',o.schedule_no||' / '||o.occurrence_date||': linked journal '||coalesce(o.entry_no,'missing')||' is missing, voided or in another month.','schedules');
  END IF;
 END LOOP;
 FOR s IN SELECT * FROM public.recurring_transactions WHERE NOT is_paused AND next_due_date<cutoff ORDER BY id LOOP
  schedules:=schedules+1;
  issues:=issues||private.check_issue281('warning','schedule:reminder:'||s.id,'Recurring reminder remains due',coalesce(s.memo,'Recurring transaction')||' / due '||s.next_due_date||': verify whether it was posted, deferred or no longer applies.','schedules');
 END LOOP;
 -- Unfunded allocations and excessive remaining plans, with annual opening
 -- balances counted once. Do not modify a plan to force the balance to fit.
 FOR b IN
  WITH needs AS (
   SELECT (x->>'account_id')::uuid account_id,sum((x->>'credit')::numeric) need
   FROM private.journal_plan_occurrences280 o JOIN private.journal_plans280 p ON p.id=o.plan_id CROSS JOIN LATERAL jsonb_array_elements(o.lines) x
   JOIN public.accounts a ON a.id=(x->>'account_id')::uuid
   WHERE p.kind='amortization' AND p.status='active' AND o.status='pending' AND a.account_type='ASSET' AND NOT a.is_technical AND (x->>'credit')::numeric>0
   GROUP BY 1
  ) SELECT n.*,a.code,a.currency_code,coalesce((SELECT sum(l.debit-l.credit) FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.journal_entry_id WHERE l.account_id=n.account_id AND e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)>=date_trunc('year',p_month)::date AND coalesce(l.line_date,e.transaction_date)<cutoff),0) balance
  FROM needs n JOIN public.accounts a ON a.id=n.account_id LOOP
  IF b.need>b.balance+0.005 THEN issues:=issues||private.check_issue281('warning','schedule:balance:'||b.account_id,'Remaining amortization exceeds recorded prepaid balance',b.code||': pending allocations '||b.need||', balance at month-end '||b.balance||' '||b.currency_code||'. Verify original payment, future funding, overlapping plans and remaining months.','schedules');END IF;
 END LOOP;
 SELECT md5(jsonb_build_object(
  'plans',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]') FROM private.journal_plans280 p),
  'occurrences',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.plan_id,o.occurrence_no),'[]') FROM private.journal_plan_occurrences280 o),
  'legacy',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id),'[]') FROM public.scheduled_journals s WHERE NOT s.is_sample),
  'legacyOccurrences',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]') FROM public.scheduled_journal_occurrences o),
  'recurring',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id),'[]') FROM public.recurring_transactions r),
  'accounts',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]') FROM public.accounts a))::text) INTO fingerprint;
 RETURN jsonb_build_object('issues',issues,'entry_checks',checks,'coverage',jsonb_build_object('version',281,'entries',jsonb_array_length(checks),'foreign_entries',(SELECT count(*) FROM jsonb_array_elements(checks) x WHERE (x->>'foreign_lines')::integer>0),'schedule_items',schedules,'rate_evidence','Arithmetic uses saved rates; external rate source, date and historical lot evidence still require review.'),'fingerprint',fingerprint);
END $$;

CREATE OR REPLACE FUNCTION public.maintenance_preflight14324(p_month date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE base jsonb;extra jsonb;
BEGIN
 base:=private.maintenance_base281(p_month);
 extra:=private.extended_check281(p_month);
 RETURN base||jsonb_build_object('issues',(base->'issues')||(extra->'issues'),'entry_checks',extra->'entry_checks','coverage',extra->'coverage','fingerprint',md5((base->>'fingerprint')||':'||(extra->>'fingerprint')));
END $$;
REVOKE ALL ON FUNCTION private.check_issue281(text,text,text,text,text),private.valid_rate281(numeric),private.expected_amortization281(jsonb),private.extended_check281(date) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.maintenance_preflight14324(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.maintenance_preflight14324(date) TO authenticated;

-- Freeze schedule sources in the same lock order as posting (plan before ledger),
-- and recheck after correction-session operations before committing a close.
DO $patch$
DECLARE body text;
BEGIN
 body:=pg_get_functiondef('public.maintenance_finish14324(date,text,text,jsonb,text,uuid,integer,text,text)'::regprocedure);
 IF position('LOCK TABLE private.journal_plans280' IN body)=0 THEN
  body:=replace(body,'LOCK TABLE public.accounting_periods,','LOCK TABLE private.journal_plans280,private.journal_plan_occurrences280,public.scheduled_journals,public.scheduled_journal_occurrences,public.recurring_transactions IN SHARE ROW EXCLUSIVE MODE;'||chr(10)||' LOCK TABLE public.accounting_periods,');
  IF position('LOCK TABLE private.journal_plans280' IN body)=0 THEN RAISE EXCEPTION 'Closing lock insertion failed';END IF;
 END IF;
 IF position('Post-correction integrity check failed' IN body)=0 THEN
  body:=replace(body,'result=public.finish_book_session136(p_session,false);','result=public.finish_book_session136(p_session,false);'||chr(10)||'  IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.maintenance_preflight14324(p_month)->''issues'') i WHERE i->>''severity''=''block'') THEN RAISE EXCEPTION ''Post-correction integrity check failed. Review the staged journal calculations.'';END IF;');
 END IF;
 EXECUTE body;
END $patch$;
