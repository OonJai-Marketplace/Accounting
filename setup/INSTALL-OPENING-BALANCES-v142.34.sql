-- Install after SECURITY v142.28 and DATA TOOLS v142.32. No existing ledger data is changed.
BEGIN;
CREATE TABLE IF NOT EXISTS public.opening_state14234(id boolean PRIMARY KEY DEFAULT true CHECK(id),generation uuid NOT NULL DEFAULT gen_random_uuid(),closed boolean NOT NULL DEFAULT false,request_key text,payload jsonb,result jsonb);
ALTER TABLE public.opening_state14234 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.opening_state14234 FROM anon,authenticated;
INSERT INTO public.opening_state14234(id,closed) VALUES(true,
 EXISTS(SELECT 1 FROM public.journal_entries) OR EXISTS(SELECT 1 FROM public.operation_receipts14228 WHERE operation='journal') OR EXISTS(SELECT 1 FROM public.year_closings136) OR EXISTS(SELECT 1 FROM public.accounting_periods WHERE status::text IN ('closed','locked','archived'))) ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.opening_status14234() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s opening_state14234;BEGIN
 PERFORM public.require_admin136();SELECT * INTO s FROM opening_state14234 WHERE id;
 RETURN jsonb_build_object('available',NOT s.closed AND NOT EXISTS(SELECT 1 FROM journal_entries),'generation',s.generation);
END $$;
CREATE OR REPLACE FUNCTION public.close_opening_setup14234() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN UPDATE opening_state14234 SET closed=true WHERE id AND NOT closed;RETURN NEW;END $$;
DROP TRIGGER IF EXISTS close_opening_setup14234 ON public.journal_entries;
CREATE TRIGGER close_opening_setup14234 AFTER INSERT ON public.journal_entries FOR EACH STATEMENT EXECUTE FUNCTION public.close_opening_setup14234();
CREATE OR REPLACE FUNCTION public.post_opening_balances14234(p_generation uuid,p_request_key text,p_entries jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s opening_state14234;r jsonb;BEGIN
 PERFORM public.require_admin136();
 -- Same lock order as the supported full transaction reset.
 LOCK TABLE journal_entries IN SHARE ROW EXCLUSIVE MODE;
 SELECT * INTO s FROM opening_state14234 WHERE id FOR UPDATE;
 IF s.generation IS DISTINCT FROM p_generation THEN RAISE EXCEPTION 'This setup belongs to an earlier reset. Reopen Opening Balances.';END IF;
 IF s.request_key=p_request_key THEN
  IF s.payload IS DISTINCT FROM p_entries THEN RAISE EXCEPTION 'Opening reference already used with different amounts';END IF;
  RETURN s.result;
 END IF;
 IF s.closed OR EXISTS(SELECT 1 FROM journal_entries) THEN RAISE EXCEPTION 'Opening balances are closed. Use a normal correcting journal for later changes.';END IF;
 IF jsonb_typeof(p_entries) IS DISTINCT FROM 'array' OR jsonb_array_length(p_entries)<>1 OR p_entries->0->>'p_memo' IS DISTINCT FROM 'Opening Balances' THEN RAISE EXCEPTION 'Provide one dated Opening Balances journal';END IF;
 r=public.post_journal_batch14228(p_request_key,p_entries);
 UPDATE opening_state14234 SET closed=true,request_key=p_request_key,payload=p_entries,result=r WHERE id;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.opening_status14234(),public.post_opening_balances14234(uuid,text,jsonb),public.close_opening_setup14234() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.opening_status14234(),public.post_opening_balances14234(uuid,text,jsonb) TO authenticated;

-- Reopen only after the explicit reset of journal, periods, staff and submissions.
CREATE OR REPLACE FUNCTION public.scoped_reset14232(p_backup jsonb,p_apply boolean DEFAULT false,p_confirmation text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE scopes text[];names text[];name text;current_pack jsonb;missing text[];total bigint;BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required'; END IF;
 IF p_backup->>'format' IS DISTINCT FROM 'oonjai-reset-14232' OR p_backup->>'owner' IS DISTINCT FROM auth.uid()::text OR p_backup->>'instance' IS DISTINCT FROM (SELECT instance::text FROM public.data_tools_state14232 WHERE id=1) THEN RAISE EXCEPTION 'Select the backup prepared for this administrator and database';END IF;
 SELECT array_agg(v) INTO scopes FROM jsonb_array_elements_text(p_backup->'scopes') v;names=public.reset_scope_tables14232(scopes);
 FOREACH name IN ARRAY names LOOP EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE',name);END LOOP;
 current_pack=public.scoped_reset_backup14232(scopes);
 IF p_backup->'tables' IS DISTINCT FROM current_pack->'tables' THEN RAISE EXCEPTION 'Selected data changed after backup; prepare a new backup'; END IF;
 SELECT array_agg(DISTINCT child.relname ORDER BY child.relname) INTO missing FROM pg_constraint c JOIN pg_class parent ON parent.oid=c.confrelid JOIN pg_namespace pn ON pn.oid=parent.relnamespace JOIN pg_class child ON child.oid=c.conrelid JOIN pg_namespace cn ON cn.oid=child.relnamespace WHERE c.contype='f' AND pn.nspname='public' AND parent.relname=ANY(names) AND (cn.nspname<>'public' OR NOT child.relname=ANY(names));
 IF EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY(names) AND NOT t.tgisinternal AND (t.tgtype::integer & 32)>0) THEN RAISE EXCEPTION 'A selected table has a custom reset trigger; its side effects must be reviewed before resetting';END IF;
 SELECT coalesce(sum(v::bigint),0) INTO total FROM jsonb_each_text(current_pack->'counts') x(k,v);
 IF NOT coalesce(p_apply,false) THEN RETURN jsonb_build_object('mode','preview','counts',current_pack->'counts','total',total,'requiredTables',coalesce(to_jsonb(missing),'[]'::jsonb),'fingerprint',current_pack->>'fingerprint','preserved','Accounts, settings, users, access rules and generated number continuity');END IF;
 IF p_confirmation IS DISTINCT FROM 'RESET SELECTED DATA' THEN RAISE EXCEPTION 'Type RESET SELECTED DATA'; END IF;
 IF cardinality(missing)>0 THEN RAISE EXCEPTION 'Selected tables are linked to unselected tables: %. Include their modules; nothing was deleted.',array_to_string(missing,', ');END IF;
 -- No CASCADE and no RESTART IDENTITY. Foreign-key restrictions remain authoritative.
 EXECUTE 'TRUNCATE TABLE '||(SELECT string_agg(format('public.%I',n),', ' ORDER BY n) FROM unnest(names) n)||' RESTRICT';
 IF ARRAY['journal','periods','staff','submissions']::text[] <@ scopes THEN UPDATE public.opening_state14234 SET generation=gen_random_uuid(),closed=false,request_key=NULL,payload=NULL,result=NULL WHERE id;END IF;
 RETURN jsonb_build_object('mode','cleared','counts',current_pack->'counts','total',total,'scopes',scopes);END $$;
REVOKE ALL ON FUNCTION public.scoped_reset14232(jsonb,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.scoped_reset14232(jsonb,boolean,text) TO authenticated;
COMMIT;
