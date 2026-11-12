-- One selected ledger is fetched on demand. Month changes reuse the same snapshot.
CREATE FUNCTION public.account_ledger379(p_account uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin() AND public.active_account14228()
   AND public.accounting_workspace_allowed123() AND NOT public.password_change_required14257()
   AND public.can_action113('journal','view'),false) THEN RAISE EXCEPTION 'Administrator journal access required' USING ERRCODE='42501';END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('date',coalesce(l.line_date,e.transaction_date),'id',e.entry_no,'dbEntryId',e.id,
   'memo',coalesce(nullif(l.description,''),e.memo),'currency',l.currency_code,'debit',l.debit,'credit',l.credit,
   'annualOpening',coalesce(e.reference LIKE 'ANNUAL-OPENING-%' OR e.memo='Opening Balances' OR e.memo LIKE 'Annual opening balances %',false))
   ORDER BY coalesce(l.line_date,e.transaction_date),e.created_at,e.id,l.line_no),'[]'::jsonb)
  FROM public.journal_lines l JOIN public.journal_entries e ON e.id=l.journal_entry_id
  WHERE l.account_id=p_account AND e.status='posted' AND e.voided_at IS NULL);
END $$;

CREATE FUNCTION public.reconciliation_differences379(p_month date DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE work jsonb; first_day date; last_day date; sid uuid; a jsonb; saved private.reconciliation_records305;
 snap jsonb; actual numeric; outstanding numeric; results jsonb:='[]';
BEGIN
 PERFORM private.reconciliation_admin305();
 IF public.password_change_required14257() THEN RAISE EXCEPTION 'Password change required' USING ERRCODE='42501'; END IF;
 work:=public.reconciliation_workspace306(p_month);
 first_day:=((work->>'month')||'-01')::date;
 IF first_day IS NOT NULL THEN
  last_day:=(first_day+interval '1 month - 1 day')::date;sid:=private.reconciliation_session305(first_day);
  FOR a IN WITH required AS (SELECT value v FROM jsonb_array_elements(work#>'{progress,items}')),
   others AS (SELECT DISTINCT ON (r.account_id) jsonb_build_object('id',r.account_id,'code',c.code,'name',c.name,'currency',c.currency_code,'method',r.method) v
    FROM private.reconciliation_records305 r JOIN public.accounts c ON c.id=r.account_id WHERE r.owner_id=auth.uid() AND r.period_from=first_day AND r.period_to=last_day
    AND NOT EXISTS(SELECT FROM required WHERE v->>'id'=r.account_id::text) ORDER BY r.account_id,r.saved_at DESC)
   SELECT v FROM (SELECT v FROM required UNION ALL SELECT v FROM others) items ORDER BY v->>'code'
  LOOP
   SELECT * INTO saved FROM private.reconciliation_records305 r WHERE r.owner_id=auth.uid() AND r.period_from=first_day AND r.period_to=last_day
    AND r.account_id=(a->>'id')::uuid AND r.method=a->>'method' ORDER BY r.saved_at DESC,r.record_id DESC LIMIT 1;
   snap:=private.reconciliation_snapshot305((a->>'id')::uuid,first_day,last_day,coalesce(saved.basis,CASE WHEN a->>'method'='bank' THEN 'receipt' ELSE 'posting' END),sid);
   actual:=round(nullif(saved.report->>'statement','')::numeric*100);
   SELECT coalesce(sum(round((f->>'amount')::numeric*100)),0) INTO outstanding FROM jsonb_array_elements(coalesce(saved.report->'findings','[]')) f WHERE f->>'kind'='outstanding';
   IF actual IS NULL OR (snap->>'closing')::numeric<>actual+outstanding OR saved.fingerprint IS DISTINCT FROM snap->>'fingerprint' THEN
    results:=results||jsonb_build_array(a||jsonb_build_object('book',snap->'closing','actual',actual,'outstanding',outstanding,
     'difference',(snap->>'closing')::numeric-actual-outstanding,'changed',saved.record_id IS NOT NULL AND saved.fingerprint IS DISTINCT FROM snap->>'fingerprint'));
   END IF;
  END LOOP;
 END IF;
 RETURN jsonb_build_object('month',work->'month','months',work->'months','rows',results);
END $$;
REVOKE ALL ON FUNCTION public.account_ledger379(uuid),public.reconciliation_differences379(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.account_ledger379(uuid),public.reconciliation_differences379(date) TO authenticated;
NOTIFY pgrst,'reload schema';
