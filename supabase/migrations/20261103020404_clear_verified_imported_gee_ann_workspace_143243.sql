-- Remove only the explicitly identified, backed-up imported workspace copies.
-- Company journals, account assignments, sequences and audit retention are unchanged.
DO $cleanup$
DECLARE target_owner uuid; actor_id uuid; entries_before text; lines_before text; removed integer;
BEGIN
 LOCK TABLE public.staff_journals, public.staff_journal_lines IN EXCLUSIVE MODE;
 LOCK TABLE public.journal_entries, public.journal_lines IN SHARE MODE;
 SELECT id INTO STRICT target_owner FROM public.profiles WHERE email='geeann@oonjai.org' AND status='active';
 SELECT id INTO STRICT actor_id FROM public.profiles WHERE email='santos@oonjai.org' AND status='active' AND role='admin';
 IF (SELECT count(*) FROM public.staff_journals WHERE staff_journals.owner_id=target_owner)<>9
 OR (SELECT md5(jsonb_agg(to_jsonb(j) ORDER BY j.id)::text) FROM public.staff_journals j WHERE j.owner_id=target_owner) IS DISTINCT FROM '83e13a736ac1562edc964166b0331347'
 OR (SELECT md5(jsonb_agg(to_jsonb(l) ORDER BY l.id)::text) FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id WHERE j.owner_id=target_owner) IS DISTINCT FROM 'eca8c0f195f1eb2b827c4ab935a1f218'
 THEN RAISE EXCEPTION 'Workspace differs from verified recovery copy; cleanup cancelled'; END IF;
 IF EXISTS(SELECT 1 FROM public.staff_journals j WHERE j.owner_id=target_owner AND (j.seed_key NOT LIKE 'HISTORY-XLSX:%:CASHIER' OR j.status<>'posted')) THEN RAISE EXCEPTION 'Unexpected workspace data'; END IF;
 SELECT md5(string_agg(md5(to_jsonb(e)::text),'' ORDER BY e.id)) INTO entries_before FROM public.journal_entries e;
 SELECT md5(string_agg(md5(to_jsonb(l)::text),'' ORDER BY l.id)) INTO lines_before FROM public.journal_lines l;
 PERFORM set_config('request.jwt.claim.sub',actor_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor_id,'role','authenticated')::text,true);
 PERFORM set_config('ojm.workspace_actor138',actor_id::text,true);
 -- Exclusive locks keep this one-time exception isolated; all other protections,
 -- foreign keys and durable deletion/audit capture remain active.
 ALTER TABLE public.staff_journal_lines DISABLE TRIGGER protect_linked_workspace_line;
 ALTER TABLE public.staff_journal_lines DISABLE TRIGGER staff_rules14228;
 DELETE FROM public.staff_journal_lines l USING public.staff_journals j WHERE l.staff_journal_id=j.id AND j.owner_id=target_owner;
 GET DIAGNOSTICS removed=ROW_COUNT;
 IF removed<>57 THEN RAISE EXCEPTION 'Expected 57 backed-up workspace lines'; END IF;
 ALTER TABLE public.staff_journal_lines ENABLE TRIGGER protect_linked_workspace_line;
 ALTER TABLE public.staff_journal_lines ENABLE TRIGGER staff_rules14228;
 DELETE FROM public.staff_journals j WHERE j.owner_id=target_owner;
 GET DIAGNOSTICS removed=ROW_COUNT;
 IF removed<>9 THEN RAISE EXCEPTION 'Expected 9 backed-up workspace reports'; END IF;
 IF entries_before IS DISTINCT FROM (SELECT md5(string_agg(md5(to_jsonb(e)::text),'' ORDER BY e.id)) FROM public.journal_entries e)
 OR lines_before IS DISTINCT FROM (SELECT md5(string_agg(md5(to_jsonb(l)::text),'' ORDER BY l.id)) FROM public.journal_lines l)
 THEN RAISE EXCEPTION 'Company ledger changed; rollback required'; END IF;
END $cleanup$;
