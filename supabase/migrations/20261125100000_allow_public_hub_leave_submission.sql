CREATE OR REPLACE FUNCTION public.account_request_gate14258()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- Public Hub forms submit unverified requests. Staff review still requires an active account.
  if current_user = 'anon'
     and auth.uid() is null
     and current_setting('request.path', true) in (
       '/rpc/keepalive_ping', '/rpc/hub_leave_days',
       '/rpc/hub_submit_leave', '/rpc/hub_submit_leave_form'
     )
     and current_setting('request.method', true) = 'POST'
  then
    return;
  end if;
  perform public.password_gate14257();
  perform public.workspace_pre_request138();
  perform public.password_gate14257();
end
$function$
;
