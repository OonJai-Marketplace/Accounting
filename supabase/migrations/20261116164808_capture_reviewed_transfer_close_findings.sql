create or replace function public.post_category_transfers26(p_month date) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare prefix constant text := 'Review these close findings: '; findings jsonb; item jsonb; result jsonb;
begin
 -- The inner transaction rolls back the entire posting before storing a review item.
 begin
   result:=private.post_category_transfers26(p_month);
   return result;
 exception when raise_exception then
   if p_month < date '2026-05-01' or left(sqlerrm,length(prefix))<>prefix then raise; end if;
   findings:=substring(sqlerrm from length(prefix)+1)::jsonb;
 end;
 for item in select value from jsonb_array_elements(findings) loop
   insert into private.category_transfer_notes26(period_month,title,detail,reason_text)
    values(p_month,item->>'title',item->>'detail','') on conflict do nothing;
 end loop;
 return jsonb_build_object('requiresReview',jsonb_array_length(findings),'posted','[]'::jsonb);
end $$;
