-- Historical installer. Preserved for reference only after v142.28.
DO $$ BEGIN RAISE EXCEPTION 'Superseded installer: use INSTALL-SECURITY-v142.28.sql and START-HERE-v142.28.txt';END $$;
-- Run after the v142.21 permissions and v142.18 to-do installers.
-- Adds immutable approved reports and completion history. Does not post entries.
BEGIN;
CREATE TABLE IF NOT EXISTS public.approved_reports1443 (
 journal_id uuid PRIMARY KEY REFERENCES public.staff_journals(id),
 owner_id uuid NOT NULL REFERENCES public.profiles(id),
 approved_by uuid NOT NULL REFERENCES public.profiles(id),
 approved_at timestamptz NOT NULL DEFAULT now(),
 snapshot jsonb NOT NULL
);
ALTER TABLE public.approved_reports1443 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.approved_reports1443 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.approved_reports1443 TO authenticated;
CREATE OR REPLACE FUNCTION public.report_access1443(p_owner uuid,p_approve boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active') AND
 (public.is_admin() OR (NOT p_approve AND p_owner=auth.uid()) OR EXISTS(
 SELECT 1 FROM user_permissions mine JOIN user_permissions owner ON owner.user_id=p_owner
 WHERE mine.user_id=auth.uid() AND owner.manager_id=auth.uid()
 AND coalesce(mine.module_actions113->'user-entry-review','[]'::jsonb) @>
 CASE WHEN p_approve THEN '["view","approve"]'::jsonb ELSE '["view","export"]'::jsonb END))
$$;
REVOKE ALL ON FUNCTION public.report_access1443(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_access1443(uuid,boolean) TO authenticated;
DROP POLICY IF EXISTS assigned_reports1443 ON public.approved_reports1443;
CREATE POLICY assigned_reports1443 ON public.approved_reports1443 FOR SELECT TO authenticated USING(public.report_access1443(owner_id));
CREATE OR REPLACE FUNCTION public.approve_report1443(p_journal uuid,p_expected jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE j public.staff_journals%rowtype; source_lines jsonb; account_rows jsonb; pack jsonb;
BEGIN
 SELECT * INTO j FROM staff_journals WHERE id=p_journal FOR UPDATE;
 IF NOT FOUND OR NOT public.report_access1443(j.owner_id,true) THEN RAISE EXCEPTION 'Approval permission required for this user'; END IF;
 SELECT snapshot INTO pack FROM approved_reports1443 WHERE journal_id=p_journal;
 IF FOUND THEN RETURN pack; END IF;
 IF j.status::text<>'submitted' THEN RAISE EXCEPTION 'Only a submitted report can be approved'; END IF;
 PERFORM 1 FROM staff_journal_lines WHERE staff_journal_id=p_journal FOR UPDATE;
 SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.id),'[]'::jsonb) INTO source_lines FROM staff_journal_lines l WHERE staff_journal_id=p_journal;
 IF jsonb_array_length(source_lines)=0 THEN RAISE EXCEPTION 'Cannot approve an empty report'; END IF;
 -- Exact source comparison prevents approval of changes not seen by the reviewer.
 IF (SELECT jsonb_agg(x ORDER BY x->>'id') FROM jsonb_array_elements(coalesce(p_expected,'[]'::jsonb)) x) IS DISTINCT FROM source_lines THEN RAISE EXCEPTION 'The report changed. Reload and inspect it before approving'; END IF;
 WITH RECURSIVE ids(id) AS (
 SELECT a.id FROM accounts a WHERE a.id IN(SELECT account_id FROM staff_journal_lines WHERE staff_journal_id=p_journal UNION SELECT fund_account_id FROM staff_journal_lines WHERE staff_journal_id=p_journal)
 UNION SELECT parent.id FROM accounts parent JOIN accounts child ON parent.code=to_jsonb(child)->>'parent_code' JOIN ids selected ON selected.id=child.id
 ) SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'code',a.code,'name',a.name,'currency_code',a.currency_code,'account_type',a.account_type,'parent_code',to_jsonb(a)->>'parent_code')),'[]'::jsonb) INTO account_rows FROM accounts a JOIN ids ON ids.id=a.id;
 pack=jsonb_build_object('snapshot1443',true,'approved_at',now(),'journal',to_jsonb(j)||jsonb_build_object('status','approved','lines',source_lines),'accounts',account_rows,'posted','[]'::jsonb,
 'user',(SELECT jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,'role',p.role) FROM profiles p WHERE p.id=j.owner_id),
 'approver',(SELECT jsonb_build_object('id',p.id,'full_name',p.full_name) FROM profiles p WHERE p.id=auth.uid()));
 INSERT INTO approved_reports1443(journal_id,owner_id,approved_by,snapshot) VALUES(p_journal,j.owner_id,auth.uid(),pack);
 RETURN pack;
END $$;
REVOKE ALL ON FUNCTION public.approve_report1443(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_report1443(uuid,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.approved_report1443(p_journal uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.approved_reports1443%rowtype;
BEGIN
 SELECT * INTO r FROM approved_reports1443 WHERE journal_id=p_journal;
 IF NOT FOUND OR NOT public.report_access1443(r.owner_id) THEN RAISE EXCEPTION 'Approved report unavailable or access denied'; END IF;
 RETURN r.snapshot;
END $$;
REVOKE ALL ON FUNCTION public.approved_report1443(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approved_report1443(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.protect_approved_source1443()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE jid uuid;
BEGIN
 IF TG_TABLE_NAME='staff_journals' THEN jid=OLD.id; ELSE jid=CASE WHEN TG_OP='INSERT' THEN NEW.staff_journal_id ELSE OLD.staff_journal_id END; END IF;
 -- Parent row locking serializes approval against concurrent source edits.
 PERFORM 1 FROM staff_journals WHERE id=jid FOR UPDATE;
 IF EXISTS(SELECT 1 FROM approved_reports1443 WHERE journal_id=jid) THEN
  IF TG_TABLE_NAME='staff_journals' THEN
   IF TG_OP='DELETE' OR NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.period_start IS DISTINCT FROM OLD.period_start OR NEW.status::text IN('draft','returned','rejected') THEN RAISE EXCEPTION 'Approved reports cannot be returned or removed'; END IF;
  ELSIF TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'Approved source entries are immutable';
  ELSIF (to_jsonb(NEW)-'journal_entry_id'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'journal_entry_id'-'updated_at') THEN RAISE EXCEPTION 'Approved source entries are immutable'; END IF;
 END IF;
 IF TG_TABLE_NAME='staff_journal_lines' AND TG_OP='UPDATE' THEN
 IF NEW.staff_journal_id IS DISTINCT FROM OLD.staff_journal_id THEN
  PERFORM 1 FROM staff_journals WHERE id=NEW.staff_journal_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM approved_reports1443 WHERE journal_id=NEW.staff_journal_id) THEN RAISE EXCEPTION 'Cannot move entries into an approved report'; END IF;
 END IF; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS approved_source1443 ON public.staff_journal_lines;
CREATE TRIGGER approved_source1443 BEFORE INSERT OR UPDATE OR DELETE ON public.staff_journal_lines FOR EACH ROW EXECUTE FUNCTION public.protect_approved_source1443();
DROP TRIGGER IF EXISTS approved_journal1443 ON public.staff_journals;
CREATE TRIGGER approved_journal1443 BEFORE UPDATE OR DELETE ON public.staff_journals FOR EACH ROW EXECUTE FUNCTION public.protect_approved_source1443();
-- Permanent completion records. Only the database trigger writes these rows.
CREATE TABLE IF NOT EXISTS public.todo_completions1443 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,todo_id uuid NOT NULL REFERENCES public.workspace_todos136(id),owner_id uuid NOT NULL REFERENCES public.profiles(id),title text NOT NULL,steps jsonb NOT NULL,completed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.todo_completions1443 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.todo_completions1443 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.todo_completions1443 TO authenticated;
DROP POLICY IF EXISTS own_completions1443 ON public.todo_completions1443;
CREATE POLICY own_completions1443 ON public.todo_completions1443 FOR SELECT TO authenticated USING(owner_id=auth.uid() AND public.report_access1443(owner_id));
CREATE OR REPLACE FUNCTION public.protect_todo1443()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i int; before_step jsonb; after_step jsonb; next_steps jsonb; reset_cycle boolean; all_done boolean; blocked boolean=false;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active') THEN RAISE EXCEPTION 'Active sign-in required'; END IF;
 IF TG_OP='DELETE' THEN
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(OLD.steps) x WHERE x->>'done'='true') OR EXISTS(SELECT 1 FROM todo_completions1443 WHERE todo_id=OLD.id) THEN RAISE EXCEPTION 'Archive completed checklists instead of deleting them'; END IF; RETURN OLD;
 END IF;
 IF NEW.owner_id<>auth.uid() OR (TG_OP='UPDATE' AND NEW.owner_id<>OLD.owner_id) THEN RAISE EXCEPTION 'Private checklist access required'; END IF;
 IF TG_OP='INSERT' THEN RETURN NEW; END IF;
 IF OLD.is_template1438 THEN RETURN NEW; END IF;
 IF NEW.is_template1438 AND (EXISTS(SELECT 1 FROM jsonb_array_elements(OLD.steps) x WHERE x->>'done'='true') OR EXISTS(SELECT 1 FROM todo_completions1443 WHERE todo_id=OLD.id)) THEN RAISE EXCEPTION 'Copy a completed checklist to create a template'; END IF;
 reset_cycle=coalesce((NEW.todo_config1438->>'completedCycles')::int,0)=coalesce((OLD.todo_config1438->>'completedCycles')::int,0)+1;
 IF coalesce((NEW.todo_config1438->>'completedCycles')::int,0)<>coalesce((OLD.todo_config1438->>'completedCycles')::int,0) AND NOT reset_cycle THEN RAISE EXCEPTION 'Completed cycle count cannot be changed'; END IF;
 next_steps=CASE WHEN reset_cycle THEN NEW.todo_config1438->'lastCompletedSteps' ELSE NEW.steps END;
 IF reset_cycle AND (OLD.todo_config1438->>'type'<>'recurring' OR jsonb_array_length(NEW.steps)<>jsonb_array_length(OLD.steps) OR (NEW.todo_config1438->>'dueAt')::timestamptz<=(OLD.todo_config1438->>'dueAt')::timestamptz) THEN RAISE EXCEPTION 'Invalid recurring checklist reset'; END IF;
 IF next_steps IS NULL OR jsonb_typeof(next_steps)<>'array' THEN RAISE EXCEPTION 'Invalid checklist'; END IF;
 FOR i IN 0..jsonb_array_length(OLD.steps)-1 LOOP
  before_step=OLD.steps->i;after_step=next_steps->i;
  IF before_step->>'done'='true' AND (after_step IS NULL OR after_step->>'done' IS DISTINCT FROM 'true' OR (before_step-'done') IS DISTINCT FROM (after_step-'done')) THEN RAISE EXCEPTION 'Completed steps cannot be undone, removed, moved or edited'; END IF;
 END LOOP;
 FOR i IN 0..jsonb_array_length(next_steps)-1 LOOP
  after_step=next_steps->i;
  IF OLD.sequential AND blocked AND after_step->>'done'='true' THEN RAISE EXCEPTION 'Complete checklist steps in order'; END IF;
  IF coalesce(after_step->>'done','false')<>'true' THEN blocked=true; END IF;
 END LOOP;
 all_done=jsonb_array_length(next_steps)>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(next_steps) x WHERE x->>'done' IS DISTINCT FROM 'true');
 IF reset_cycle THEN
  IF NOT all_done OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.steps) WITH ORDINALITY AS x(step,n) WHERE step->>'done' IS DISTINCT FROM 'false' OR (step-'done') IS DISTINCT FROM ((next_steps->(n::int-1))-'done')) THEN RAISE EXCEPTION 'Only a fully completed cycle can restart'; END IF;
 END IF;
 IF all_done AND (reset_cycle OR EXISTS(SELECT 1 FROM jsonb_array_elements(OLD.steps) x WHERE x->>'done' IS DISTINCT FROM 'true')) THEN INSERT INTO todo_completions1443(todo_id,owner_id,title,steps) VALUES(OLD.id,OLD.owner_id,NEW.title,next_steps); END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS permanent_steps1443 ON public.workspace_todos136;
CREATE TRIGGER permanent_steps1443 BEFORE INSERT OR UPDATE OR DELETE ON public.workspace_todos136 FOR EACH ROW EXECUTE FUNCTION public.protect_todo1443();
-- A restrictive policy applies even if an older permissive document policy exists.
DO $$ BEGIN
 IF to_regclass('public.company_documents105') IS NOT NULL THEN
  EXECUTE 'ALTER TABLE public.company_documents105 ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS admin_documents1443 ON public.company_documents105';
  EXECUTE 'CREATE POLICY admin_documents1443 ON public.company_documents105 AS RESTRICTIVE TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin())';
 END IF;
END $$;
create or replace function public.staff_report1434(p_journal uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.staff_journals%rowtype; actor_permissions jsonb; owner_permissions jsonb;
 source_lines jsonb; posted_entries jsonb; account_rows jsonb; user_data jsonb;
 linked uuid[]; permitted boolean; reviewer boolean;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Active sign-in required'; end if;
 select * into j from public.staff_journals where id=p_journal;
 if not found then raise exception 'Saved report not found'; end if;
 if exists(select 1 from public.approved_reports1443 where journal_id=p_journal) then return public.approved_report1443(p_journal); end if;
 select to_jsonb(p) into actor_permissions from public.user_permissions p where user_id=auth.uid();
 select to_jsonb(p) into owner_permissions from public.user_permissions p where user_id=j.owner_id;
 permitted:=true;
 reviewer:=coalesce(actor_permissions->'module_actions113'->'user-entry-review','[]'::jsonb) @> '["view","export"]'::jsonb
  and owner_permissions->>'manager_id'=auth.uid()::text;
 if not public.is_admin() then
  if not coalesce(permitted,false) or not ((j.owner_id=auth.uid() and coalesce(actor_permissions->'module_actions113'->'sub-users-workspace','[]'::jsonb) @> '["view"]'::jsonb) or coalesce(reviewer,false)) then raise exception 'Report print permission required'; end if;
  if j.status::text not in ('approved','posted','reviewed','approved_posted') then raise exception 'Only approved reports can be printed'; end if;
 end if;
 select coalesce(jsonb_agg(to_jsonb(l) order by l.transaction_date,l.line_no),'[]'::jsonb),
  coalesce(array_agg(distinct l.journal_entry_id) filter(where l.journal_entry_id is not null),array[]::uuid[])
 into source_lines,linked from public.staff_journal_lines l where staff_journal_id=j.id;
 select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('lines',
  (select coalesce(jsonb_agg(to_jsonb(l) order by l.id),'[]'::jsonb) from public.journal_lines l where l.journal_entry_id=e.id))),'[]'::jsonb)
 into posted_entries from public.journal_entries e where e.id=any(linked) and e.status::text='posted';
 if jsonb_array_length(posted_entries)<>cardinality(linked) then raise exception 'A linked journal is missing or no longer posted. Review this report before printing'; end if;
 with recursive report_account_ids(id) as (
  select a.id from public.accounts a where a.id in (
   select account_id from public.staff_journal_lines where staff_journal_id=j.id
   union select fund_account_id from public.staff_journal_lines where staff_journal_id=j.id
   union select account_id from public.journal_lines where journal_entry_id=any(linked)
  )
  union
  select parent.id from public.accounts parent join public.accounts child
   on parent.code=to_jsonb(child)->>'parent_code'
  join report_account_ids selected on selected.id=child.id
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'code',a.code,'name',a.name,
  'currency_code',a.currency_code,'account_type',a.account_type,'parent_code',to_jsonb(a)->>'parent_code')),'[]'::jsonb)
 into account_rows from public.accounts a join report_account_ids selected on selected.id=a.id;
 select jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,'role',p.role,'job_title',owner_permissions->>'job_title') into user_data
 from public.profiles p where p.id=j.owner_id;
 return jsonb_build_object('journal',to_jsonb(j)||jsonb_build_object('lines',source_lines),
  'user',user_data,'accounts',account_rows,'posted',posted_entries);
end $$;
revoke all on function public.staff_report1434(uuid) from public;
grant execute on function public.staff_report1434(uuid) to authenticated;



-- The requested initial setting is one hour of inactivity, shared across devices.
CREATE TABLE IF NOT EXISTS public.session_policy1443 (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 timeout_minutes integer NOT NULL CHECK(timeout_minutes BETWEEN 5 AND 480),
 warning_minutes integer NOT NULL CHECK(warning_minutes BETWEEN 1 AND 30),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.session_policy1443(id,timeout_minutes,warning_minutes) VALUES(true,60,1) ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.session_policy1443 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.session_policy1443 FROM PUBLIC,anon;
GRANT SELECT,INSERT,UPDATE ON public.session_policy1443 TO authenticated;
DROP POLICY IF EXISTS read_session1443 ON public.session_policy1443;
CREATE POLICY read_session1443 ON public.session_policy1443 FOR SELECT TO authenticated USING(public.report_access1443(auth.uid()));
DROP POLICY IF EXISTS insert_session1443 ON public.session_policy1443;
CREATE POLICY insert_session1443 ON public.session_policy1443 FOR INSERT TO authenticated WITH CHECK(public.is_admin());
DROP POLICY IF EXISTS update_session1443 ON public.session_policy1443;
CREATE POLICY update_session1443 ON public.session_policy1443 FOR UPDATE TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());

NOTIFY pgrst,'reload schema';
COMMIT;
