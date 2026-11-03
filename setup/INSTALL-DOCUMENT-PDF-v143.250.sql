-- Preserve a PDF copy for payment vouchers as well as receipts. Same admin, version and immutable-copy checks.
BEGIN;
CREATE OR REPLACE FUNCTION public.receipt_pdf245(p_id uuid,p_version integer,p_pdf text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE item public.vouchers14299; evidence jsonb;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required';END IF;
 SELECT * INTO item FROM public.vouchers14299 WHERE id=p_id FOR UPDATE;
 IF item.id IS NULL OR item.version<>p_version OR item.status='void' OR item.kind NOT IN ('H','E') THEN RAISE EXCEPTION 'Voucher or receipt changed or is unavailable. Reopen it.';END IF;
 evidence=item.data->'pdf245';
 IF p_pdf IS NOT NULL THEN
  IF length(p_pdf)>20000000 OR length(p_pdf)<12 OR substring(decode(p_pdf,'base64'),1,5)<>convert_to('%PDF-','UTF8') THEN RAISE EXCEPTION 'Invalid or oversized PDF';END IF;
  IF evidence IS NOT NULL AND evidence->>'base64' IS DISTINCT FROM p_pdf THEN RAISE EXCEPTION 'A different PDF is already retained for this version. Reopen the saved document.';END IF;
  evidence=jsonb_build_object('base64',p_pdf,'filename',item.number||'.pdf','version',item.version);
  UPDATE public.vouchers14299 SET data=jsonb_set(data,'{pdf245}',evidence),updated_at=now() WHERE id=p_id;
  UPDATE public.voucher_versions14299 SET data=jsonb_set(data,'{pdf245}',evidence) WHERE voucher_id=p_id AND version=p_version;
 END IF;
 RETURN evidence;
END $$;
REVOKE ALL ON FUNCTION public.receipt_pdf245(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receipt_pdf245(uuid,integer,text) TO authenticated;
COMMIT;
