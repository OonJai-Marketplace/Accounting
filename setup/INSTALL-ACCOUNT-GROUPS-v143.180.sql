-- Display groups share the existing chart. They never grant posting access.
BEGIN;
CREATE TABLE IF NOT EXISTS public.account_groups143180 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
 kind text NOT NULL CHECK (kind IN ('company','branch','department')),
 parent_id uuid REFERENCES public.account_groups143180(id),
 account_ids uuid[] NOT NULL DEFAULT '{}',
 revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid REFERENCES public.profiles(id),
 CHECK (parent_id IS NULL OR (kind IN ('branch','department') AND parent_id<>id))
);
CREATE UNIQUE INDEX IF NOT EXISTS account_groups143180_name ON public.account_groups143180(lower(btrim(name)));
CREATE INDEX IF NOT EXISTS account_groups143180_parent ON public.account_groups143180(parent_id);
CREATE INDEX IF NOT EXISTS account_groups143180_updater ON public.account_groups143180(updated_by);
ALTER TABLE public.account_groups143180 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_groups143180 FROM anon,authenticated;
GRANT SELECT ON public.account_groups143180 TO authenticated;
GRANT INSERT,UPDATE ON public.account_groups143180 TO authenticated;
DROP POLICY IF EXISTS group_read143180 ON public.account_groups143180;
CREATE POLICY group_read143180 ON public.account_groups143180 FOR SELECT TO authenticated
 USING ((select active_account14228()) AND (select accounting_workspace_allowed123()) AND NOT (select password_change_required14257()) AND ((select is_admin()) OR (select can_action113('sec-chart-accounts','view')) OR (select can_action113('settings-users','view'))));
DROP POLICY IF EXISTS group_write143180 ON public.account_groups143180;
CREATE POLICY group_write143180 ON public.account_groups143180 FOR ALL TO authenticated
 USING ((select is_admin()) AND (select active_account14228()) AND (select accounting_workspace_allowed123()) AND NOT (select password_change_required14257()))
 WITH CHECK ((select is_admin()) AND (select active_account14228()) AND (select accounting_workspace_allowed123()) AND NOT (select password_change_required14257()));

CREATE OR REPLACE FUNCTION public.save_account_group143180(p_id uuid,p_name text,p_kind text,p_parent uuid,p_accounts uuid[],p_revision integer)
RETURNS public.account_groups143180 LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE current_row public.account_groups143180; saved public.account_groups143180; ids uuid[];
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() OR NOT public.active_account14228() OR NOT public.accounting_workspace_allowed123() OR public.password_change_required14257() THEN RAISE EXCEPTION 'Administrator access is required.'; END IF;
 IF p_id IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 80 OR p_name IS NULL OR p_kind NOT IN ('company','branch','department') OR p_kind IS NULL THEN RAISE EXCEPTION 'Enter a group name and type.'; END IF;
 -- Serialise metadata edits, including a parent changing from branch to department.
 PERFORM pg_advisory_xact_lock(143180);
 SELECT * INTO current_row FROM public.account_groups143180 WHERE id=p_id FOR UPDATE;
 IF (FOUND AND p_revision IS DISTINCT FROM current_row.revision) OR (NOT FOUND AND p_revision IS NOT NULL) THEN RAISE EXCEPTION 'This group changed elsewhere. Reopen it before saving.'; END IF;
 IF p_parent IS NOT NULL AND (p_parent=p_id OR p_kind='company' OR NOT EXISTS(SELECT 1 FROM public.account_groups143180 WHERE id=p_parent AND kind=CASE p_kind WHEN 'branch' THEN 'company' ELSE 'branch' END)) THEN RAISE EXCEPTION 'Choose a company for a branch, or a branch for a department.'; END IF;
 IF current_row.id IS NOT NULL AND p_kind<>current_row.kind AND EXISTS(SELECT 1 FROM public.account_groups143180 WHERE parent_id=p_id) THEN RAISE EXCEPTION 'Move the child groups before changing this group type.'; END IF;
 SELECT coalesce(array_agg(DISTINCT x ORDER BY x),'{}') INTO ids FROM unnest(coalesce(p_accounts,'{}')) x WHERE x IS NOT NULL;
 IF cardinality(ids)>10000 OR EXISTS(SELECT 1 FROM unnest(ids) x WHERE NOT EXISTS(SELECT 1 FROM public.accounts a WHERE a.id=x)) THEN RAISE EXCEPTION 'An account is no longer available. Reload the chart before saving.'; END IF;
 -- Each account has one direct group; parent branch views include departments.
 UPDATE public.account_groups143180 other SET account_ids=ARRAY(SELECT x FROM unnest(other.account_ids) x WHERE NOT x=ANY(ids)),revision=other.revision+1,updated_at=now(),updated_by=auth.uid() WHERE other.id<>p_id AND other.account_ids&&ids;
 IF current_row.id IS NULL THEN
  INSERT INTO public.account_groups143180(id,name,kind,parent_id,account_ids,updated_by) VALUES(p_id,btrim(p_name),p_kind,p_parent,ids,auth.uid()) RETURNING * INTO saved;
 ELSE
  UPDATE public.account_groups143180 SET name=btrim(p_name),kind=p_kind,parent_id=p_parent,account_ids=ids,revision=revision+1,updated_at=now(),updated_by=auth.uid() WHERE id=p_id RETURNING * INTO saved;
 END IF;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.save_account_group143180(uuid,text,text,uuid,uuid[],integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_account_group143180(uuid,text,text,uuid,uuid[],integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_group_account143180(p_group uuid,p_id uuid,p_account jsonb)
RETURNS public.accounts LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE g public.account_groups143180; a public.accounts;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() OR NOT public.active_account14228() OR NOT public.accounting_workspace_allowed123() OR public.password_change_required14257() THEN RAISE EXCEPTION 'Administrator access is required.'; END IF;
 IF p_id IS NULL THEN RAISE EXCEPTION 'Reopen Add Account before saving.'; END IF;
 PERFORM pg_advisory_xact_lock(143180);
 SELECT * INTO g FROM public.account_groups143180 WHERE id=p_group FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'This group is no longer available. Reopen the chart.'; END IF;
 SELECT * INTO a FROM public.accounts WHERE id=p_id;
 IF FOUND THEN
  IF a.id=ANY(g.account_ids) AND a.code=btrim(p_account->>'code') AND a.name=btrim(p_account->>'name') AND a.currency_code=p_account->>'currency_code' AND a.account_type=p_account->>'account_type' AND coalesce(a.description,'')=coalesce(p_account->>'description','') AND a.account_purpose=coalesce(p_account->>'account_purpose','regular') AND a.is_posting=coalesce((p_account->>'is_posting')::boolean,true) THEN RETURN a; END IF;
  RAISE EXCEPTION 'An account was already created from this form. Reopen the chart to edit it.';
 END IF;
 INSERT INTO public.accounts(id,code,name,currency_code,account_type,description,account_purpose,is_posting,currency_label,track_foreign_funds,created_by)
 VALUES(p_id,btrim(p_account->>'code'),btrim(p_account->>'name'),p_account->>'currency_code',p_account->>'account_type',coalesce(p_account->>'description',''),coalesce(p_account->>'account_purpose','regular'),coalesce((p_account->>'is_posting')::boolean,true),p_account->>'currency_label',coalesce((p_account->>'track_foreign_funds')::boolean,false),auth.uid()) RETURNING * INTO a;
 PERFORM public.save_account_group143180(g.id,g.name,g.kind,g.parent_id,array_append(g.account_ids,a.id),g.revision);
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.create_group_account143180(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_group_account143180(uuid,uuid,jsonb) TO authenticated;
-- Initial classification approved 2026-10-25. Existing group assignments are retained on rerun.
WITH catalog AS (
 SELECT id,code,name,is_active,account_type,account_type='EQUITY' OR code IN ('1000','1010','1011','1012','1040','1041','9000','9010','9011','9012','9020','9021','9022','9060','5419') AS shared FROM public.accounts
), seeds AS (
 SELECT 'Company'::text AS name,'company'::text AS kind,coalesce(array_agg(id ORDER BY code) FILTER(WHERE is_active AND shared),'{}') AS account_ids FROM catalog
 UNION ALL SELECT 'Restaurant','branch',coalesce(array_agg(id ORDER BY code) FILTER(WHERE is_active AND NOT shared AND name!~*'wellness'),'{}') FROM catalog
 UNION ALL SELECT 'Wellness','branch',coalesce(array_agg(id ORDER BY code) FILTER(WHERE is_active AND name~*'wellness'),'{}') FROM catalog
 UNION ALL SELECT 'Other','branch','{}'::uuid[]
)
INSERT INTO public.account_groups143180(name,kind,account_ids) SELECT s.name,s.kind,s.account_ids FROM seeds s WHERE NOT EXISTS(SELECT 1 FROM public.account_groups143180 g WHERE lower(g.name)=lower(s.name));
UPDATE public.account_groups143180 SET parent_id=(SELECT id FROM public.account_groups143180 WHERE name='Company') WHERE name IN ('Restaurant','Wellness','Other') AND parent_id IS NULL;
COMMIT;
