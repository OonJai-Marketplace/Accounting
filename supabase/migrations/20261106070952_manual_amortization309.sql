-- Each occurrence is prepared automatically, but only the user's Post action may
-- create a journal. Retain first-day dates, permissions, locks and retry guards.
SELECT pg_advisory_xact_lock(143280,1);
DROP TRIGGER IF EXISTS upcoming_plans280 ON public.accounting_periods;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='approved-amortization280';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION private.process_journal_plans280() RETURNS integer
LANGUAGE sql SET search_path='' AS $$ SELECT 0 $$;
REVOKE ALL ON FUNCTION private.process_journal_plans280() FROM PUBLIC,anon,authenticated,service_role;

WITH changed AS (
 UPDATE private.journal_plans280
 SET auto_post=false,definition=jsonb_set(definition,'{auto_post}','false'),
     last_error=NULL,version=version+1,updated_at=now()
 WHERE auto_post OR definition->>'auto_post'='true'
 RETURNING id
)
INSERT INTO public.audit_log(table_name,record_id,action,new_data,reason)
 SELECT 'journal_plans280',id::text,'MANUAL_POSTING',jsonb_build_object('auto_post',false),
 'User clarification 6 November 2026: notify when due and wait for an explicit Post action.' FROM changed;
ALTER TABLE private.journal_plans280 ADD CONSTRAINT manual_posting309 CHECK(NOT auto_post);

DO $manual$
DECLARE source text;
BEGIN
 source=pg_get_functiondef('private.save_journal_plan280(uuid,jsonb)'::regprocedure);
 IF strpos(source,'mode boolean=coalesce((p_definition->>''auto_post'')::boolean,false)')=0 THEN RAISE EXCEPTION 'Inspect changed plan save function';END IF;
 source=replace(source,'mode boolean=coalesce((p_definition->>''auto_post'')::boolean,false)','mode boolean=false');
 source=replace(source,'PERFORM private.require_plan280(''edit'');','PERFORM private.require_plan280(''edit''); p_definition=jsonb_set(p_definition,''{auto_post}'',''false'');');
 EXECUTE source;
END $manual$;
-- Read-only eligibility accompanies the plan list, so users see the reason before
-- clicking Post. Authoritative posting checks remain in post_journal_plan280.
CREATE OR REPLACE FUNCTION private.list_journal_plans280() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.require_plan280();
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(p)||jsonb_build_object(
 'blocking_reason',CASE WHEN p.kind='amortization' AND p.status='active' AND n.due_date IS NOT NULL
   AND NOT EXISTS(SELECT 1 FROM public.accounting_periods ap WHERE ap.period_month=(date_trunc('month',n.due_date)-interval '1 month')::date AND ap.status IN ('closed','locked'))
   THEN 'Waiting for '||to_char(n.due_date-interval '1 month','FMMonth YYYY')||' to close. Then review and post this release.' ELSE NULL END,
 'occurrences',coalesce((SELECT jsonb_agg(to_jsonb(o)||jsonb_build_object('entry_no',e.entry_no,'entry_status',e.status) ORDER BY o.occurrence_no)
 FROM private.journal_plan_occurrences280 o LEFT JOIN public.journal_entries e ON e.id=o.journal_entry_id WHERE o.plan_id=p.id),'[]'::jsonb)) ORDER BY p.created_at DESC)
 FROM private.journal_plans280 p LEFT JOIN LATERAL(SELECT due_date FROM private.journal_plan_occurrences280 WHERE plan_id=p.id AND status='pending' ORDER BY occurrence_no LIMIT 1)n ON true),'[]'::jsonb);
END $$;
