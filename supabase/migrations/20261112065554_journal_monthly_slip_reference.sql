-- A printed Monthly Cash Slip row is a journal reference, independent of the
-- numbered voucher register. Old entries and old posting clients remain valid.
ALTER TABLE public.journal_entries ADD COLUMN cash_slip_ref text
 CHECK (cash_slip_ref ~ '^S[0-9]{2}(0[1-9]|1[0-2])-(0[1-9]|[1-9][0-9]{1,5})$');

DO $migration$
DECLARE definition text; needle text;
BEGIN
 -- Store the reference inside the existing transaction and idempotency receipt.
 definition := pg_get_functiondef('private.post_batch335(text,text,jsonb)'::regprocedure);
 needle := '  result:=result||jsonb_build_array(';
 IF strpos(definition,needle)=0 THEN RAISE EXCEPTION 'Unexpected journal batch definition'; END IF;
 EXECUTE replace(definition,needle,$body$  IF entry->>'p_cash_slip_ref' IS NOT NULL THEN
   UPDATE public.journal_entries SET cash_slip_ref=entry->>'p_cash_slip_ref' WHERE id=saved.entry_id;
  END IF;
$body$||needle);

 -- Keep the original journal revision, period locks, reason, and retry semantics.
 -- Older clients omit both keys, preserving any newer supporting document.
 definition := pg_get_functiondef('public.change_journal14385(text,uuid,text,text,jsonb,jsonb)'::regprocedure);
 needle := ' IF p_kind=''revise'' THEN';
 IF strpos(definition,needle)=0 THEN RAISE EXCEPTION 'Unexpected journal change definition'; END IF;
 definition := replace(definition,needle,$body$ IF (p_expected ? 'cashSlipRef' OR p_value ? 'cashSlipRef') AND
    entry.cash_slip_ref IS DISTINCT FROM (p_expected->>'cashSlipRef') THEN
  RAISE EXCEPTION 'The supporting document changed. Reopen the entry.' USING ERRCODE='40001';
 END IF;
$body$||needle);
 needle := ' ELSE' || chr(10) || '  PERFORM public.void_journal_entry';
 IF strpos(definition,needle)=0 THEN RAISE EXCEPTION 'Unexpected journal revision branch'; END IF;
 EXECUTE replace(definition,needle,$body$  IF (p_expected ? 'cashSlipRef' OR p_value ? 'cashSlipRef') AND
     entry.cash_slip_ref IS DISTINCT FROM (p_value->>'cashSlipRef') THEN
   UPDATE public.journal_entries SET cash_slip_ref=p_value->>'cashSlipRef' WHERE id=p_entry_id;
  END IF;
$body$||needle);

 definition := pg_get_functiondef('public.journal_window14333(date,date,integer)'::regprocedure);
 needle := 'e.memo AS "generalMemo",';
 IF strpos(definition,needle)=0 OR strpos(definition,'e.memo,e.status,e.updated_at')=0 THEN RAISE EXCEPTION 'Unexpected journal window definition'; END IF;
 IF strpos(definition,'LEFT JOIN public.journal_fx_evidence288 n')=0 THEN RAISE EXCEPTION 'Unexpected journal window joins'; END IF;
 definition := replace(definition,needle,needle||$projection$ e.cash_slip_ref AS "cashSlipRef",
  CASE WHEN voucher.id IS NOT NULL THEN jsonb_build_object('id',voucher.id,'number',voucher.number,'documentType',coalesce(voucher.data->>'documentType','voucher')) END AS "supportingDocument",$projection$);
 definition := replace(definition,'LEFT JOIN public.journal_fx_evidence288 n',
  'LEFT JOIN public.vouchers14299 voucher ON voucher.journal_entry_id=e.id AND (SELECT public.is_admin()) LEFT JOIN public.journal_fx_evidence288 n');
 needle := 'WHERE e.status=''posted'' AND coalesce(l.line_date,e.transaction_date)<=p_to';
 IF strpos(definition,needle)=0 THEN RAISE EXCEPTION 'Unexpected journal revision query'; END IF;
 definition := replace(definition,needle,'LEFT JOIN public.vouchers14299 voucher ON voucher.journal_entry_id=e.id AND (SELECT public.is_admin()) '||needle);
 EXECUTE replace(replace(definition,'e.memo,e.status,e.updated_at','e.memo,e.cash_slip_ref,voucher.id,voucher.updated_at,e.status,e.updated_at'),
  'fx-evidence288:', 'support-doc363:');
END $migration$;
