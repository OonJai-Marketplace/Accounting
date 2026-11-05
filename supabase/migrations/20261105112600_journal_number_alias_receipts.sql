-- A correction of an issued number preserves its UUID and the originally issued
-- receipt. Receipts returned by the application also show the current number.
CREATE TABLE private.journal_number_aliases298 (
 former_no text PRIMARY KEY,
 entry_id uuid NOT NULL,
 replacement_no text NOT NULL UNIQUE,
 changed_at timestamptz NOT NULL DEFAULT now(),
 changed_by uuid NOT NULL,
 CHECK (former_no <> replacement_no)
);
REVOKE ALL ON private.journal_number_aliases298 FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION private.reserve_journal_alias298() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM private.journal_number_aliases298 a
           WHERE a.former_no=NEW.entry_no AND a.entry_id<>NEW.id) THEN
  RAISE unique_violation USING MESSAGE='This journal number is reserved by its original posting history.';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.reserve_journal_alias298() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER reserve_former_journal_numbers298 BEFORE INSERT OR UPDATE OF entry_no
 ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION private.reserve_journal_alias298();

CREATE FUNCTION private.resolve_journal_receipt_numbers298(p_result jsonb) RETURNS jsonb
LANGUAGE sql STABLE STRICT SECURITY INVOKER SET search_path='' AS $$
 WITH items AS (
  SELECT item,idx FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_result)='array'
   THEN p_result ELSE jsonb_build_array(p_result) END) WITH ORDINALITY AS r(item,idx)
 ), resolved AS (
  SELECT coalesce(jsonb_agg(CASE WHEN e.id IS NULL OR e.entry_no=a.former_no THEN i.item
   ELSE i.item || jsonb_build_object('entry_no',e.entry_no,'issued_entry_no',a.former_no) END
   ORDER BY i.idx),'[]'::jsonb) arr
  FROM items i LEFT JOIN private.journal_number_aliases298 a ON a.former_no=i.item->>'entry_no'
   AND a.entry_id::text=i.item->>'entry_id' LEFT JOIN public.journal_entries e ON e.id=a.entry_id
 ) SELECT CASE WHEN jsonb_typeof(p_result)='array' THEN arr ELSE arr->0 END FROM resolved;
$$;
REVOKE ALL ON FUNCTION private.resolve_journal_receipt_numbers298(jsonb) FROM PUBLIC,anon,authenticated,service_role;

-- All installed procedures keep their existing signature, authorization and
-- idempotency checks, with the historical identifier resolved only on read.
DO $upgrade$
DECLARE f record; existing text; updated text;
BEGIN
 FOR f IN SELECT * FROM (VALUES
  ('public.drive_journal_receipt143128(text,text)', '''result'',r.result', '''result'',private.resolve_journal_receipt_numbers298(r.result)'),
  ('public.journal_receipt14228(text)', '''result'',r.result', '''result'',private.resolve_journal_receipt_numbers298(r.result)'),
  ('public.journal_change_receipt14385(text)', '''result'',r.result', '''result'',private.resolve_journal_receipt_numbers298(r.result)'),
  ('public.post_journal_batch14228(text,jsonb)', 'RETURN receipt.result;', 'RETURN private.resolve_journal_receipt_numbers298(receipt.result);'),
  ('public.change_journal14385(text,uuid,text,text,jsonb,jsonb)', 'RETURN prior.result;', 'RETURN private.resolve_journal_receipt_numbers298(prior.result);')
 ) AS rpc(signature,old_sql,new_sql) LOOP
  existing:=pg_get_functiondef(f.signature::regprocedure);
  IF strpos(existing,f.old_sql)=0 OR strpos(existing,f.new_sql)>0 THEN
   RAISE EXCEPTION 'Unexpected receipt implementation for %; stop for review',f.signature;
  END IF;
  updated:=replace(existing,f.old_sql,f.new_sql);
  EXECUTE updated;
 END LOOP;
END $upgrade$;
