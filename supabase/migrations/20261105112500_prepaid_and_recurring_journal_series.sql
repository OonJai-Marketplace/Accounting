-- Schedule definitions retain their IDs. Only future journal allocations change.
-- Never consume the manual OJM counter or reassign an issued journal number.
CREATE SEQUENCE private.amortization_entry_seq298 AS bigint;
CREATE SEQUENCE private.recurring_entry_seq298 AS bigint;
REVOKE ALL ON SEQUENCE private.amortization_entry_seq298, private.recurring_entry_seq298
 FROM PUBLIC, anon, authenticated, service_role;

DO $seed$
DECLARE issued record;
BEGIN
 FOR issued IN
  WITH ids AS (
   SELECT entry_no AS id FROM public.journal_entries
   UNION ALL
   SELECT new_data->>'entry_no' FROM public.audit_log WHERE table_name='journal_entries'
   UNION ALL
   SELECT old_data->>'entry_no' FROM public.audit_log WHERE table_name='journal_entries'
  )
  SELECT left(id,3) AS prefix, max(substring(id FROM 7)::bigint) AS last_id
  FROM ids WHERE id ~ '^(AMO|REC)[0-9]{2}-[0-9]{6,19}$' GROUP BY left(id,3)
 LOOP
  IF issued.last_id>0 THEN
   PERFORM setval(CASE WHEN issued.prefix='AMO' THEN 'private.amortization_entry_seq298'::regclass
                       ELSE 'private.recurring_entry_seq298'::regclass END,issued.last_id,true);
  END IF;
 END LOOP;
END $seed$;

-- Both the legacy two-line scheduler and the native plan editor use this chart
-- classification. A refund, original advance, or mixed recurring journal has
-- different sides and is not itself a simple prepaid expense release.
CREATE FUNCTION private.prepaid_release_lines298(p_lines jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE STRICT SECURITY INVOKER SET search_path='' AS $$
DECLARE line_count integer=jsonb_array_length(p_lines);
BEGIN
 IF line_count NOT IN (2,4) THEN RETURN false; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements(p_lines) debit
  JOIN public.accounts expense ON expense.id=(debit->>'account_id')::uuid
  CROSS JOIN jsonb_array_elements(p_lines) credit
  JOIN public.accounts prepaid ON prepaid.id=(credit->>'account_id')::uuid
  WHERE (debit->>'debit')::numeric>0 AND (credit->>'credit')::numeric>0
    AND expense.account_type='EXPENSE' AND prepaid.account_type='ASSET'
    AND expense.currency_code=prepaid.currency_code
    AND (NOT expense.is_technical OR expense.currency_code<>'LAK')
    AND NOT prepaid.is_technical AND prepaid.is_posting
    AND (prepaid.parent_code='1300' OR (prepaid.parent_code IS NULL AND prepaid.code ~ '^13[0-9]{2}$'))
 ) THEN RETURN false; END IF;
 IF line_count=4 THEN
  -- Use exactly the live foreign mapping and historic valuation rules. Other
  -- valid mixed recurring journals continue to use the recurring series.
  BEGIN
   PERFORM private.validate_plan_lines280(p_lines,'amortization');
  EXCEPTION WHEN raise_exception THEN RETURN false;
  END;
 END IF;
 RETURN true;
END
$$;

CREATE FUNCTION private.next_plan_entry_no298(p_kind text,p_lines jsonb,p_date date) RETURNS text
LANGUAGE plpgsql VOLATILE STRICT SECURITY INVOKER SET search_path='' AS $$
DECLARE prefix text; serial text; candidate text;
BEGIN
 IF p_kind NOT IN ('amortization','recurring') THEN RAISE EXCEPTION 'Unknown journal plan type'; END IF;
 IF p_kind='amortization' OR private.prepaid_release_lines298(p_lines) THEN
  prefix='AMO';
 ELSE
  prefix='REC';
 END IF;
 LOOP
  serial=nextval(CASE WHEN prefix='AMO' THEN 'private.amortization_entry_seq298'::regclass
                      ELSE 'private.recurring_entry_seq298'::regclass END)::text;
  candidate=prefix||to_char(p_date,'YY')||'-'||lpad(serial,greatest(6,length(serial)),'0');
  IF NOT EXISTS(SELECT 1 FROM public.journal_entries WHERE entry_no=candidate) AND
     NOT EXISTS(SELECT 1 FROM public.audit_log WHERE table_name='journal_entries' AND
                (new_data->>'entry_no'=candidate OR old_data->>'entry_no'=candidate)) THEN
   RETURN candidate;
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION private.prepaid_release_lines298(jsonb),
 private.next_plan_entry_no298(text,jsonb,date) FROM PUBLIC, anon, authenticated, service_role;

-- Preserve deployed variants of the posting routines, their grants, and all
-- their authentication, approval, date, balance, and receipt checks. Match
-- the existing allocation statements exactly; abort on a different contract.
DO $upgrade$
DECLARE definition text; expected text; replacement text; legacy_sequence text;
BEGIN
 definition=replace(pg_get_functiondef('private.post_journal_plan280(uuid,integer,date,jsonb,text)'::regprocedure),chr(13),'');
 expected=$old$  v_sequence=nextval('private.journal_plan_entry_seq280')::text;
  v_entry_no=(CASE WHEN p.kind='amortization' THEN 'AMO' ELSE 'REC' END)||to_char(o.due_date,'YY')||'-'||lpad(v_sequence,greatest(6,length(v_sequence)),'0');$old$;
 IF strpos(definition,expected)=0 THEN RAISE EXCEPTION 'Unknown native plan allocation; migration cancelled'; END IF;
 definition=replace(definition,expected,'  v_entry_no=private.next_plan_entry_no298(p.kind,ls,o.due_date);');
 definition=replace(definition,';v_sequence text;',';');
 EXECUTE definition;

 definition=replace(pg_get_functiondef('public.post_scheduled_one91(uuid,boolean)'::regprocedure),chr(13),'');
 IF strpos(definition,'app.schedule_approval225')=0 THEN RAISE EXCEPTION 'Install the signed schedule approval workflow first'; END IF;
 legacy_sequence=CASE WHEN strpos(definition,'private.scheduled_entry_number_seq')>0
                      THEN 'private.scheduled_entry_number_seq' ELSE 'public.journal_entry_number_seq' END;
 expected=format($old$  v_num:=nextval(%L)::text;
  v_no:=private.format_entry_id143114(coalesce(v_prefix,'AUTO'),v_post,v_num::bigint,coalesce(v_digits,4));$old$,legacy_sequence);
 IF strpos(definition,expected)=0 THEN RAISE EXCEPTION 'Unknown legacy schedule allocation; migration cancelled'; END IF;
 replacement=$new$  v_no:=private.next_plan_entry_no298('recurring',jsonb_build_array(
   jsonb_build_object('account_id',s.debit_account_id,'debit',s.amount),
   jsonb_build_object('account_id',s.credit_account_id,'credit',s.amount)
  ),v_post);$new$;
 definition=replace(definition,expected,replacement);
 definition=replace(definition,' select automated_prefix,journal_digits into v_prefix,v_digits from public.accounting_id_settings where id=true;','');
 definition=replace(definition,'v_num text;v_prefix text;v_digits integer;','');
 definition=replace(definition,'Do not reuse an AUTO number','Do not reuse a number');
 EXECUTE definition;

 definition=replace(pg_get_functiondef('private.save_journal_plan280(uuid,jsonb)'::regprocedure),chr(13),'');
 -- Check only new plans, after the existing idempotent save-receipt check.
 expected=$old$ IF kind='amortization' THEN
  SELECT (x->>'account_id')::uuid INTO prepaid_id$old$;
 IF strpos(definition,expected)=0 THEN RAISE EXCEPTION 'Unknown plan-save definition; migration cancelled'; END IF;
 replacement=$new$ IF kind='recurring' AND private.prepaid_release_lines298(p_definition->'lines') THEN
  RAISE EXCEPTION 'Choose Amortization to release a prepaid expense';
 END IF;
$new$||expected;
 EXECUTE replace(definition,expected,replacement);
END $upgrade$;
