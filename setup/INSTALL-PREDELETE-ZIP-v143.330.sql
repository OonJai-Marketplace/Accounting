-- Reject earlier clients that supply only a preview count/digest. Recompute the
-- exported signature under the existing transaction locks immediately before delete.
do $patch$
declare body text:=pg_get_functiondef('public.portable_backup328(text,date,date,text[],jsonb,text)'::regprocedure);
 old_guard text:=$old$if p_action='delete' and changes_digest is distinct from p_expected then raise exception 'The selected records changed. Review the updated count and confirm again.'; end if;$old$;
 new_guard text:=$new$if p_action='delete' and (p_expected is null or signature is distinct from p_expected) then raise exception 'A current backup ZIP is required. Prepare the selection again before deleting.'; end if;$new$;
begin
 if position(new_guard in body)>0 then return; end if;
 if position(old_guard in body)=0 then raise exception 'Unexpected version of the portable backup function'; end if;
 execute replace(body,old_guard,new_guard);
end $patch$;
