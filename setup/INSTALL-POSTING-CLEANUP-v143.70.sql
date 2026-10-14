-- Preserve posting checks, permissions, and sequence continuity.
-- Remove duplicate validation and pad numbers without truncating longer IDs.
-- Historical ledger rows and the sequence value are not modified.
BEGIN;
SET LOCAL lock_timeout = '3s';
DO $migration$
DECLARE signature text; source text; old_text text; new_text text; validation text;
BEGIN
 FOREACH signature IN ARRAY ARRAY[
  'public.post_manual_worker14228(date,text,jsonb,text,integer)',
  'public.post_report_worker14349(date,text,jsonb,text,integer)'
 ] LOOP
  source:=pg_get_functiondef(signature::regprocedure);
  old_text:='lpad(nextval(''public.journal_entry_number_seq'')::text,v_digits,''0'')';
  new_text:='(SELECT lpad(n.value,greatest(v_digits,length(n.value)),''0'') FROM (SELECT nextval(''public.journal_entry_number_seq'')::text AS value) n)';
  IF position(old_text in source)=0 THEN RAISE EXCEPTION 'Posting number allocator changed or already patched: %',signature; END IF;
  source:=replace(source,old_text,new_text);
  validation:=CASE WHEN signature LIKE '%post_manual_worker%' THEN 'PERFORM public.validate_journal14228(p_transaction_date,p_memo,p_lines);'
   ELSE 'PERFORM public.validate_journal14228(p_transaction_date,p_memo,(SELECT jsonb_agg(x-''line_date'') FROM jsonb_array_elements(p_lines) x));' END;
  IF (length(source)-length(replace(source,validation,'')))/length(validation)<>2 THEN
   RAISE EXCEPTION 'Expected exactly two identical validation calls: %',signature;
  END IF;
  -- Keep the first validation before prefix processing, remove only the second.
  source:=overlay(source placing '' from strpos(source,validation)+length(validation)+strpos(substr(source,strpos(source,validation)+length(validation)),validation)-1 for length(validation));
  EXECUTE source;
 END LOOP;
 signature:='public.approve_entry_submission(uuid)';source:=pg_get_functiondef(signature::regprocedure);
 old_text:='lpad(nextval(''public.journal_entry_number_seq'')::text,6,''0'')';
 new_text:='(SELECT lpad(n.value,greatest(6,length(n.value)),''0'') FROM (SELECT nextval(''public.journal_entry_number_seq'')::text AS value) n)';
 IF position(old_text in source)=0 THEN RAISE EXCEPTION 'Submission allocator changed or already patched'; END IF;
 EXECUTE replace(source,old_text,new_text);
 signature:='public.preview_journal_number14257(text,integer)';source:=pg_get_functiondef(signature::regprocedure);
 old_text:='lpad(next_number::text,digits,''0'')';new_text:='lpad(next_number::text,greatest(digits,length(next_number::text)),''0'')';
 IF position(old_text in source)=0 THEN RAISE EXCEPTION 'Journal number preview changed or already patched'; END IF;
 EXECUTE replace(source,old_text,new_text);
 signature:='public.post_review_adjustment136(uuid,jsonb)';source:=pg_get_functiondef(signature::regprocedure);
 old_text:='SELECT array_agg(id) INTO old_ids FROM journal_entries;';
 IF position(old_text in source)=0 THEN RAISE EXCEPTION 'Review adjustment implementation changed or already patched'; END IF;
 source:=replace(source,'old_ids uuid[];','');
 source:=replace(source,old_text,'');
 old_text:='PERFORM public.post_manual_worker14228(';
 IF position(old_text in source)=0 THEN RAISE EXCEPTION 'Review posting call changed'; END IF;
 source:=replace(source,old_text,'SELECT posted.entry_id INTO entry FROM public.post_manual_worker14228(');
 old_text:='p_digits=>(p_payload->>''p_digits'')::integer);';
 IF position(old_text in source)=0 THEN RAISE EXCEPTION 'Review posting arguments changed'; END IF;
 source:=replace(source,old_text,'p_digits=>(p_payload->>''p_digits'')::integer) AS posted;');
 old_text:='SELECT id INTO entry FROM journal_entries WHERE NOT(id=ANY(coalesce(old_ids,''{}''::uuid[]))) AND posted_by=actor LIMIT 1;';
 IF position(old_text in source)=0 THEN RAISE EXCEPTION 'Review receipt lookup changed'; END IF;
 source:=replace(source,old_text,'');
 -- Preserve transaction locks and authorization; remove only the full-table receipt search.
 EXECUTE source;
 signature:='public.close_year136(integer,text,text)';source:=pg_get_functiondef(signature::regprocedure);
 old_text:='SELECT coalesce(max(nullif(substring(entry_no FROM ''([0-9]+)$''),'''')::integer),0)+1 INTO numbering FROM journal_entries WHERE entry_no LIKE prefix||''-%'';';
 IF position(old_text in source)=0 OR position('numbering integer;' in source)=0 THEN RAISE EXCEPTION 'Year-close number allocator changed'; END IF;
 source:=replace(source,'numbering integer;','numbering bigint;number_attempts integer;');
 new_text:='number_attempts:=0;
  LOOP
   number_attempts:=number_attempts+1;
   IF number_attempts>1000 THEN RAISE EXCEPTION ''Unable to allocate a unique journal number''; END IF;
   numbering:=nextval(''public.journal_entry_number_seq'');
   EXIT WHEN NOT EXISTS(SELECT 1 FROM journal_entries WHERE entry_no=prefix||''-''||lpad(numbering::text,greatest(digits,length(numbering::text)),''0''));
  END LOOP;';
 source:=replace(source,old_text,new_text);
 old_text:='lpad(numbering::text,digits,''0'')';
 IF position(old_text in source)=0 THEN RAISE EXCEPTION 'Year-close number formatting changed'; END IF;
 EXECUTE replace(source,old_text,'lpad(numbering::text,greatest(digits,length(numbering::text)),''0'')');
END $migration$;
-- Ordinary positive-amount checks alone accept PostgreSQL numeric NaN.
-- Validate existing records without updating them; abort the entire migration on failure.
ALTER TABLE public.journal_lines ADD CONSTRAINT journal_lines_finite14370
 CHECK (debit::text NOT IN ('NaN','Infinity','-Infinity') AND credit::text NOT IN ('NaN','Infinity','-Infinity')) NOT VALID;
ALTER TABLE public.staff_journal_lines ADD CONSTRAINT staff_journal_lines_finite14370
 CHECK (amount::text NOT IN ('NaN','Infinity','-Infinity')) NOT VALID;
ALTER TABLE public.journal_lines VALIDATE CONSTRAINT journal_lines_finite14370;
ALTER TABLE public.staff_journal_lines VALIDATE CONSTRAINT staff_journal_lines_finite14370;
NOTIFY pgrst,'reload schema';
COMMIT;
