-- Personal to-dos only: editable completed steps, Delete instead of Archive,
-- and four starter checklists created once per account when the list is opened.
-- Installation does not delete or modify any existing tasks or accounting records.
BEGIN;
CREATE OR REPLACE FUNCTION public.protect_todo1443()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE i int; before_step jsonb; after_step jsonb; next_steps jsonb; reset_cycle boolean; all_done boolean; blocked boolean=false;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active') THEN RAISE EXCEPTION 'Active sign-in required'; END IF;
 IF TG_OP='DELETE' THEN
  IF OLD.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Private checklist access required'; END IF;
  DELETE FROM public.todo_completions1443 WHERE todo_id=OLD.id AND owner_id=OLD.owner_id;
  RETURN OLD;
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

 FOR i IN 0..jsonb_array_length(next_steps)-1 LOOP
  after_step=next_steps->i;
  IF NEW.sequential AND blocked AND after_step->>'done'='true' THEN RAISE EXCEPTION 'Complete checklist steps in order'; END IF;
  IF coalesce(after_step->>'done','false')<>'true' THEN blocked=true; END IF;
 END LOOP;
 all_done=jsonb_array_length(next_steps)>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(next_steps) x WHERE x->>'done' IS DISTINCT FROM 'true');
 IF reset_cycle THEN
  IF NOT all_done OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.steps) WITH ORDINALITY AS x(step,n) WHERE step->>'done' IS DISTINCT FROM 'false' OR (step-'done') IS DISTINCT FROM ((next_steps->(n::int-1))-'done')) THEN RAISE EXCEPTION 'Only a fully completed cycle can restart'; END IF;
 END IF;
 IF all_done AND (reset_cycle OR EXISTS(SELECT 1 FROM jsonb_array_elements(OLD.steps) x WHERE x->>'done' IS DISTINCT FROM 'true')) THEN INSERT INTO todo_completions1443(todo_id,owner_id,title,steps) VALUES(OLD.id,OLD.owner_id,NEW.title,next_steps); END IF;
 RETURN NEW;
END $function$
;
REVOKE ALL ON FUNCTION public.protect_todo1443() FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS public.todo_starter_installs14335 (
 owner_id uuid PRIMARY KEY REFERENCES public.profiles(id), installed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.todo_starter_installs14335 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.todo_starter_installs14335 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.todo_starter_installs14335 TO authenticated;
DROP POLICY IF EXISTS own_starters14335 ON public.todo_starter_installs14335;
CREATE POLICY own_starters14335 ON public.todo_starter_installs14335 TO authenticated
 USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid() AND public.active_account14228() AND NOT public.password_change_required14257() AND public.accounting_workspace_allowed123() AND public.can_action113('transactions-recurring','edit'));
CREATE OR REPLACE FUNCTION public.prepare_todo_starters14335()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE owner uuid:=auth.uid(); inserted uuid; starter jsonb; step_rows jsonb; added integer:=0;
BEGIN
 IF owner IS NULL OR NOT public.active_account14228() OR public.password_change_required14257() OR NOT public.accounting_workspace_allowed123() OR NOT public.can_action113('transactions-recurring','edit') THEN
  RAISE EXCEPTION 'Active checklist editing access required' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.todo_starter_installs14335(owner_id) VALUES(owner) ON CONFLICT DO NOTHING RETURNING owner_id INTO inserted;
 IF inserted IS NULL THEN RETURN jsonb_build_object('added',0); END IF;
 FOR starter IN SELECT value FROM jsonb_array_elements($starters$[{"title": "Journal / Period Closing", "aliases": ["Journal / period closing"], "steps": ["Review journal dates, accounts, descriptions and supporting documents.", "Resolve submitted and returned entries.", "Check debit and credit balances for each currency.", "Reconcile cash and bank accounts.", "Review payroll, statutory payments and outstanding payables.", "Run Data Check and resolve findings.", "Review and save period reports.", "Close the period only after approval."]}, {"title": "Payable Processing", "aliases": [], "steps": ["Gather invoices and supporting documents.", "Check the payee, amount, currency and due date.", "Confirm the expense or payable account and check for duplicate invoices.", "Obtain payment approval.", "Prepare the payment voucher and verify the receiver.", "Record the authorized payment.", "Reconcile the payable balance and retain payment evidence."]}, {"title": "Bank & Cash Reconciliation", "aliases": ["Bank / cash reconciliation"], "steps": ["Choose the period and bank or cash account.", "Collect statements, receipts and cash counts.", "Match journal entries to supporting records.", "Identify outstanding payments, deposits and missing entries.", "Investigate differences and record approved corrections.", "Confirm the reconciled closing balance.", "Save the reviewed reconciliation report."]}, {"title": "PIT & SSO Preparation", "aliases": ["PIT / SSO preparation"], "steps": ["Choose the filing period and review company settings and deadlines.", "Review approved payroll and employee information.", "Reconcile PIT and SSO expense, bridge and payable accounts.", "Verify employee and employer shares against approved payroll.", "Prepare filing schedules and supporting documents.", "Obtain filing and payment approval.", "Record the authorized payment and retain submission receipts."]}]$starters$::jsonb) LOOP
  IF NOT EXISTS(SELECT 1 FROM public.workspace_todos136 t WHERE t.owner_id=owner AND NOT t.is_template1438 AND (lower(trim(t.title))=lower(starter->>'title') OR lower(trim(t.title)) IN (SELECT lower(value) FROM jsonb_array_elements_text(starter->'aliases')))) THEN
   SELECT jsonb_agg(jsonb_build_object('text',value,'done',false) ORDER BY ordinality) INTO step_rows FROM jsonb_array_elements_text(starter->'steps') WITH ORDINALITY;
   INSERT INTO public.workspace_todos136(owner_id,title,steps,sequential,is_template1438,todo_config1438)
   VALUES(owner,starter->>'title',step_rows,true,false,jsonb_build_object('type','sequential','starter14335',true));
   added:=added+1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('added',added);
END $$;
REVOKE ALL ON FUNCTION public.prepare_todo_starters14335() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.prepare_todo_starters14335() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
