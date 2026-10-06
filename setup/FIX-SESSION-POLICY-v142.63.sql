-- OON JAI ACCOUNTING — SESSION POLICY READ FIX v142.63
-- Safe, idempotent repair for active users who cannot read the shared inactivity policy.
-- Does not change passwords, journal entries, payroll, or user permissions.

BEGIN;

CREATE TABLE IF NOT EXISTS public.session_policy1443 (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  timeout_minutes integer NOT NULL CHECK(timeout_minutes BETWEEN 5 AND 480),
  warning_minutes integer NOT NULL CHECK(warning_minutes BETWEEN 1 AND 30),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.session_policy1443(id,timeout_minutes,warning_minutes)
VALUES(true,60,1)
ON CONFLICT(id) DO NOTHING;

ALTER TABLE public.session_policy1443 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.session_policy1443 FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.session_policy1443 TO authenticated;

DROP POLICY IF EXISTS read_session1443 ON public.session_policy1443;
CREATE POLICY read_session1443
ON public.session_policy1443
FOR SELECT
TO authenticated
USING (public.active_account14228());

DROP POLICY IF EXISTS insert_session1443 ON public.session_policy1443;
CREATE POLICY insert_session1443
ON public.session_policy1443
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS update_session1443 ON public.session_policy1443;
CREATE POLICY update_session1443
ON public.session_policy1443
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

NOTIFY pgrst,'reload schema';

COMMIT;

SELECT id, timeout_minutes, warning_minutes
FROM public.session_policy1443
WHERE id=true;
