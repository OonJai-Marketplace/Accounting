-- Typed receipts, shared voucher numbering and retained PDF copies.
-- Existing documents, amounts, IDs and audit history are preserved.
BEGIN;
ALTER TABLE public.voucher_sequences14299 DROP CONSTRAINT voucher_sequences14299_kind_check;
ALTER TABLE public.voucher_sequences14299 ADD CONSTRAINT voucher_sequences14299_kind_check CHECK(kind IN ('H','E','S'));
CREATE OR REPLACE FUNCTION public.receipt_number245(p_date date,p_sequence integer)
RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog AS $$
 SELECT 'OJM'||to_char(p_date,'YY')||'-'||chr(65+((p_sequence-1)/99)%26)||to_char(p_date,'MM')||lpad((((p_sequence-1)%99)+1)::text,2,'0')
$$;
REVOKE ALL ON FUNCTION public.receipt_number245(date,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receipt_number245(date,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.voucher_issue14299(p_kind text,p_count integer,p_date date,p_data jsonb,p_request_key uuid)
RETURNS SETOF public.vouchers14299 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE item public.vouchers14299; yr integer; serial integer; ord integer; n integer; attempts integer; label text; assigned text; payload jsonb;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required';END IF;
 IF p_kind IS NULL OR p_kind NOT IN ('H','E') OR p_count IS NULL OR p_count NOT BETWEEN 1 AND 50 OR p_date IS NULL OR p_request_key IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid voucher request';END IF;
 IF p_kind='E' AND (p_count<>1 OR length(coalesce(p_data->>'tentative_number',''))<8 OR length(coalesce(p_data->>'html',''))<30 OR coalesce(p_data->>'total','') !~ '^[0-9]+([.][0-9]{1,2})?$' OR coalesce(p_data->>'currency','') NOT IN ('LAK','USD','THB')) THEN RAISE EXCEPTION 'Valid document content, amount and currency required';END IF;
 payload=jsonb_build_object('kind',p_kind,'count',p_count,'date',p_date,'data',p_data);
 -- Serialize the request as well as the yearly allocator, including retries with a changed year.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_key::text,245));
 IF EXISTS(SELECT 1 FROM public.vouchers14299 WHERE batch_key=p_request_key) THEN
  IF EXISTS(SELECT 1 FROM public.vouchers14299 WHERE batch_key=p_request_key AND request_payload IS DISTINCT FROM payload) THEN RAISE EXCEPTION 'Document request already used for different data';END IF;
  RETURN QUERY SELECT * FROM public.vouchers14299 WHERE batch_key=p_request_key ORDER BY ordinal;RETURN;
 END IF;
 yr=extract(year FROM p_date)::integer;
 INSERT INTO public.voucher_sequences14299(year_no,kind,next_no) VALUES(yr,'S',1) ON CONFLICT DO NOTHING;
 SELECT next_no INTO serial FROM public.voucher_sequences14299 WHERE year_no=yr AND kind='S' FOR UPDATE;
 INSERT INTO public.voucher_sequences14299(year_no,kind,next_no) VALUES(yr,p_kind,1) ON CONFLICT DO NOTHING;
 SELECT greatest(next_no,coalesce((SELECT max(v.ordinal)+1 FROM public.vouchers14299 v WHERE v.year_no=yr AND v.kind=p_kind),1)) INTO ord FROM public.voucher_sequences14299 WHERE year_no=yr AND kind=p_kind FOR UPDATE;
 FOR n IN 0..p_count-1 LOOP
  attempts=0;
  LOOP
   assigned=public.receipt_number245(p_date,serial);
   EXIT WHEN NOT EXISTS(SELECT 1 FROM public.vouchers14299 WHERE number=assigned OR journal_number=assigned);
   serial=serial+1;attempts=attempts+1;
   IF attempts>=2574 THEN RAISE EXCEPTION 'All receipt/voucher IDs for this month have been used. No existing ID was reused.';END IF;
  END LOOP;
  label=CASE WHEN p_data->>'documentType'='receipt' THEN 'Receipt' WHEN p_kind='H' THEN 'Handwritten voucher' ELSE 'Editor voucher' END;
  INSERT INTO public.vouchers14299(request_key,batch_key,request_payload,number,year_no,ordinal,kind,status,voucher_date,data,created_by)
  VALUES(CASE WHEN n=0 THEN p_request_key ELSE gen_random_uuid() END,p_request_key,payload,assigned,yr,ord+n,p_kind,CASE WHEN p_kind='H' THEN 'reserved' ELSE 'issued' END,p_date,
   (CASE WHEN p_kind='E' THEN jsonb_set(p_data,'{html}',to_jsonb(replace(p_data->>'html',p_data->>'tentative_number',assigned)),true)-'tentative_number' ELSE p_data END)-'pdf245'||jsonb_build_object('date',p_date,'sequence245',serial,'id_format',jsonb_build_object('scheme','shared245','prefix','OJM','label',label,'code',substring(assigned,7,1))),auth.uid()) RETURNING * INTO item;
  INSERT INTO public.voucher_versions14299(voucher_id,version,data,reason,changed_by) VALUES(item.id,1,item.data,'Issued',auth.uid());
  serial=serial+1;RETURN NEXT item;
 END LOOP;
 UPDATE public.voucher_sequences14299 SET next_no=serial WHERE year_no=yr AND kind='S';
 UPDATE public.voucher_sequences14299 SET next_no=ord+p_count WHERE year_no=yr AND kind=p_kind;
END $$;
REVOKE ALL ON FUNCTION public.voucher_issue14299(text,integer,date,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.voucher_issue14299(text,integer,date,jsonb,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.receipt_preview245(p_date date,p_count integer DEFAULT 1)
RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE serial integer; assigned text; result text[]='{}'; attempts integer=0;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required';END IF;
 IF p_date IS NULL OR p_count IS NULL OR p_count NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Choose a date and 1 to 50 documents';END IF;
 SELECT next_no INTO serial FROM public.voucher_sequences14299 WHERE year_no=extract(year FROM p_date)::integer AND kind='S';serial=coalesce(serial,1);
 WHILE cardinality(result)<p_count LOOP
  assigned=public.receipt_number245(p_date,serial);serial=serial+1;attempts=attempts+1;
  IF NOT EXISTS(SELECT 1 FROM public.vouchers14299 WHERE number=assigned OR journal_number=assigned) AND NOT assigned=ANY(result) THEN result=array_append(result,assigned);END IF;
  IF attempts>=2574 AND cardinality(result)<p_count THEN RAISE EXCEPTION 'Not enough unused IDs in this month';END IF;
 END LOOP;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.receipt_preview245(date,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receipt_preview245(date,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.receipt_pdf245(p_id uuid,p_version integer,p_pdf text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE item public.vouchers14299; evidence jsonb;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required';END IF;
 SELECT * INTO item FROM public.vouchers14299 WHERE id=p_id FOR UPDATE;
 IF item.id IS NULL OR item.version<>p_version OR item.status='void' OR item.data->>'documentType' IS DISTINCT FROM 'receipt' THEN RAISE EXCEPTION 'Receipt changed or is unavailable. Reopen it.';END IF;
 evidence=item.data->'pdf245';
 IF p_pdf IS NOT NULL THEN
  IF length(p_pdf)>20000000 OR length(p_pdf)<12 OR substring(decode(p_pdf,'base64'),1,5)<>convert_to('%PDF-','UTF8') THEN RAISE EXCEPTION 'Invalid or oversized PDF';END IF;
  IF evidence IS NOT NULL AND evidence->>'base64' IS DISTINCT FROM p_pdf THEN RAISE EXCEPTION 'A different PDF is already retained for this version. Reopen the saved receipt.';END IF;
  evidence=jsonb_build_object('base64',p_pdf,'filename',item.number||'.pdf','version',item.version);
  UPDATE public.vouchers14299 SET data=jsonb_set(data,'{pdf245}',evidence),updated_at=now() WHERE id=p_id;
  UPDATE public.voucher_versions14299 SET data=jsonb_set(data,'{pdf245}',evidence) WHERE voucher_id=p_id AND version=p_version;
 END IF;
 RETURN evidence;
END $$;
REVOKE ALL ON FUNCTION public.receipt_pdf245(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receipt_pdf245(uuid,integer,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.voucher_link14299(p_id uuid, p_entry_id uuid)
 RETURNS vouchers14299
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE item public.vouchers14299; entry public.journal_entries; snapshot jsonb; lines jsonb; journal_total numeric; setting public.voucher_settings14299; entry_ordinal text; linked_number text;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required';END IF;
 SELECT * INTO item FROM public.vouchers14299 WHERE id=p_id FOR UPDATE;
 SELECT * INTO entry FROM public.journal_entries WHERE id=p_entry_id AND status='posted' FOR SHARE;
 IF item.id IS NULL OR entry.id IS NULL OR item.status='void' THEN RAISE EXCEPTION 'Choose an available voucher and posted journal entry';END IF;
 IF item.journal_entry_id=p_entry_id THEN RETURN item;END IF;
 IF item.journal_entry_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.vouchers14299 WHERE journal_entry_id=p_entry_id) THEN RAISE EXCEPTION 'Voucher or journal entry is already linked';END IF;
 IF item.kind='E' AND item.data ? 'total' THEN
   SELECT coalesce(sum(l.debit),0) INTO journal_total FROM public.journal_lines l WHERE l.journal_entry_id=p_entry_id AND l.currency_code=item.data->>'currency';
   IF EXISTS(SELECT 1 FROM public.journal_lines l WHERE l.journal_entry_id=p_entry_id AND l.debit>0 AND l.currency_code IS DISTINCT FROM item.data->>'currency')
      OR journal_total IS DISTINCT FROM (item.data->>'total')::numeric THEN
      RAISE EXCEPTION 'Voucher total/currency differs from the posted journal. Correct the voucher or choose a matching entry';
   END IF;
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('account_id',l.account_id,'account',a.name,'code',a.code,'description',coalesce(nullif(l.description,''),entry.memo),'debit',l.debit,'credit',l.credit,'currency',l.currency_code) ORDER BY l.id::text),'[]'::jsonb) INTO lines
 FROM public.journal_lines l LEFT JOIN public.accounts a ON a.id=l.account_id WHERE l.journal_entry_id=p_entry_id;
 SELECT * INTO setting FROM public.voucher_settings14299 WHERE id=1 FOR SHARE;
 entry_ordinal=substring(entry.entry_no FROM '([0-9]+)$');
 IF entry_ordinal IS NULL THEN RAISE EXCEPTION 'Journal Entry ID needs a numeric suffix';END IF;
 entry_ordinal=(entry_ordinal::bigint)::text;
 linked_number=coalesce(item.data->'id_format'->>'prefix',setting.prefix)||'-'||right(extract(year FROM entry.transaction_date)::integer::text,coalesce((item.data->'id_format'->>'year_digits')::integer,setting.year_digits))||coalesce(item.data->'id_format'->>'code',CASE WHEN item.kind='H' THEN setting.handwritten_code ELSE setting.editor_code END)||'-'||lpad(entry_ordinal,greatest(coalesce((item.data->'id_format'->>'digits')::integer,setting.digits),length(entry_ordinal)),'0');
 IF item.data->'id_format'->>'scheme'='shared245' THEN linked_number=item.number;END IF;
 snapshot=jsonb_build_object('entry_id',entry.id,'entry_no',entry.entry_no,'date',entry.transaction_date,'memo',entry.memo,'lines',lines);
 UPDATE public.vouchers14299 SET journal_entry_id=p_entry_id,journal_number=linked_number,status='linked',data=item.data||jsonb_build_object('journal',snapshot),version=version+1,updated_at=now() WHERE id=p_id RETURNING * INTO item;
 INSERT INTO public.voucher_versions14299(voucher_id,version,data,reason,changed_by) VALUES(item.id,item.version,item.data,'Linked to journal '||entry.entry_no,auth.uid());
 RETURN item;
END $function$
;
CREATE OR REPLACE FUNCTION public.voucher_update14299(p_id uuid, p_version integer, p_date date, p_data jsonb, p_reason text)
 RETURNS vouchers14299
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE item public.vouchers14299;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required';END IF;
 IF length(trim(coalesce(p_reason,'')))<4 OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Explain the correction and provide voucher data';END IF;
 SELECT * INTO item FROM public.vouchers14299 WHERE id=p_id FOR UPDATE;
 IF item.id IS NULL OR item.version<>p_version OR item.kind<>'E' OR item.status NOT IN ('issued','linked') THEN RAISE EXCEPTION 'Voucher changed or cannot be edited; refresh the register';END IF;
 IF p_date IS NULL THEN RAISE EXCEPTION 'Voucher date is required';END IF;
 IF coalesce(p_data->>'total','') !~ '^[0-9]+([.][0-9]{1,2})?$' OR coalesce(p_data->>'currency','') NOT IN ('LAK','USD','THB') THEN RAISE EXCEPTION 'Valid voucher amount and currency required';END IF;
 IF item.journal_entry_id IS NOT NULL AND ((p_data->>'total') IS DISTINCT FROM (item.data->>'total') OR (p_data->>'currency') IS DISTINCT FROM (item.data->>'currency')) THEN RAISE EXCEPTION 'Linked voucher amount and currency must agree with the journal';END IF;
 IF item.data->>'documentType'='receipt' AND (p_data->>'documentType' IS DISTINCT FROM 'receipt' OR to_char(p_date,'YYMM')<>to_char(item.voucher_date,'YYMM')) THEN RAISE EXCEPTION 'Keep the receipt type and issue month. Void and reissue to change the month.';END IF;
 UPDATE public.vouchers14299 SET data=(p_data-'pdf245'-'journal'-'id_format')||jsonb_build_object('journal',item.data->'journal','date',p_date,'id_format',item.data->'id_format','sequence245',item.data->'sequence245','photos245',coalesce(item.data->'photos245','[]'::jsonb)),voucher_date=p_date,version=version+1,updated_at=now()
 WHERE id=p_id AND version=p_version AND kind='E' AND status IN ('issued','linked') RETURNING * INTO item;
 IF NOT FOUND THEN RAISE EXCEPTION 'Voucher changed or cannot be edited; refresh the register';END IF;
 INSERT INTO public.voucher_versions14299(voucher_id,version,data,reason,changed_by) VALUES(item.id,item.version,item.data,p_reason,auth.uid());
 RETURN item;
END $function$
;
ALTER TABLE public.voucher_settings14299 ADD COLUMN IF NOT EXISTS receipt_layout245 jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE OR REPLACE FUNCTION public.receipt_layout245(p_settings jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE value jsonb;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required';END IF;
 IF p_settings IS NOT NULL THEN
  IF jsonb_typeof(p_settings)<>'object' OR length(p_settings::text)>12000000 THEN RAISE EXCEPTION 'Invalid receipt layout';END IF;
  UPDATE public.voucher_settings14299 SET receipt_layout245=p_settings WHERE id=1;
 END IF;
 SELECT receipt_layout245 INTO value FROM public.voucher_settings14299 WHERE id=1;RETURN value;
END $$;
REVOKE ALL ON FUNCTION public.receipt_layout245(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receipt_layout245(jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.receipt_photo245(p_id uuid,p_version integer,p_photo text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE item public.vouchers14299;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required';END IF;
 SELECT * INTO item FROM public.vouchers14299 WHERE id=p_id FOR UPDATE;
 IF item.id IS NULL OR item.version<>p_version OR item.data->>'documentType' IS DISTINCT FROM 'receipt' OR item.status='void' THEN RAISE EXCEPTION 'Receipt changed. Reopen it.';END IF;
 IF p_photo IS NULL OR length(p_photo)>12000000 OR p_photo !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=[:space:]]+$' THEN RAISE EXCEPTION 'Choose a JPG, PNG or WebP image under 8 MB';END IF;
 -- Append evidence: never replace the earlier photo or remove its PDF.
 UPDATE public.vouchers14299 SET data=jsonb_set(data,'{photos245}',coalesce(data->'photos245','[]'::jsonb)||jsonb_build_array(jsonb_build_object('image',p_photo,'at',now(),'by',auth.uid()))),updated_at=now() WHERE id=p_id RETURNING * INTO item;
 UPDATE public.voucher_versions14299 SET data=item.data WHERE voucher_id=p_id AND version=p_version;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.receipt_photo245(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receipt_photo245(uuid,integer,text) TO authenticated;
COMMIT;

