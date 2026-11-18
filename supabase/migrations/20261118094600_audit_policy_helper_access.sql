-- These compatibility helpers are used only by owner-executed audit triggers.
-- They do not need to be callable as public RPCs.
REVOKE ALL ON FUNCTION public.audit_code143324(text,text,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.audit_group313(text,text,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
