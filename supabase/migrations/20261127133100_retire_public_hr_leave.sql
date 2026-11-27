-- Retire the legacy anonymous forms only when the authenticated release is ready.
revoke execute on function public.hub_submit_leave(uuid,text,text,text,date,date,text),
 public.hub_submit_leave_form(uuid,text,text,text,date,date,text,jsonb) from public,anon,authenticated;
