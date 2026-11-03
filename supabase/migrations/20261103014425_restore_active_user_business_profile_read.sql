-- Active Accounting users need the shared company identity during workspace preparation.
-- Keep the existing restrictive account/workspace/password gates and admin-only writes.
CREATE POLICY active_users_read_business_settings
ON public.business_settings
AS PERMISSIVE FOR SELECT TO authenticated
USING ((SELECT public.active_account14228()));
