BEGIN;
-- Private task data only. No upcoming transactions or accounting entries are changed.
CREATE TABLE IF NOT EXISTS public.workspace_todos136 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES public.profiles(id),
 title text NOT NULL CHECK(length(trim(title))>0),due_date date,sequential boolean NOT NULL DEFAULT false,
 steps jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(steps)='array'),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_todos136 ADD COLUMN IF NOT EXISTS todo_config1438 jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.workspace_todos136 ADD COLUMN IF NOT EXISTS is_template1438 boolean NOT NULL DEFAULT false;
ALTER TABLE public.workspace_todos136 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workspace_todos136 FROM PUBLIC,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.workspace_todos136 TO authenticated;
DROP POLICY IF EXISTS own_todos136 ON public.workspace_todos136;
CREATE POLICY own_todos136 ON public.workspace_todos136 TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
NOTIFY pgrst,'reload schema';
COMMIT;
