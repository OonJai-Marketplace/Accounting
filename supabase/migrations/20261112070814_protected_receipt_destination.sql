-- Normal settings writes may not replace an approved scanner destination.
create or replace function private.guard_receipt_destination() returns trigger
language plpgsql security invoker set search_path='' as $$
declare previous jsonb := old.data->'googleSheets143129'; proposed jsonb;
begin
 if tg_op='DELETE' then
  if previous#>>'{receiptDrive228,active,connectionKey}' is not null then
   raise exception 'The protected receipt destination cannot be deleted with general settings.';
  end if;
  return old;
 end if;
 proposed:=new.data->'googleSheets143129';
 if (previous#>>'{receiptDrive228,active,connectionKey}' is not null
     or proposed#>>'{receiptDrive228,active,connectionKey}' is not null)
    and current_setting('ojm_scan.receipt_destination_write',true) is distinct from 'verified'
    -- The service-only yearly activation has a separate guard against the verified archive configuration.
    and not (coalesce(auth.role(),'')='service_role' and coalesce(proposed#>>'{receiptDrive228,active,annual231}','')='true'
      and previous->'accountEmail228' is not distinct from proposed->'accountEmail228'
      and previous#>'{receiptDrive228,folderURL}' is not distinct from proposed#>'{receiptDrive228,folderURL}')
    and (previous->'accountEmail228' is distinct from proposed->'accountEmail228'
      or previous#>'{receiptDrive228,folderURL}' is distinct from proposed#>'{receiptDrive228,folderURL}'
      or previous#>'{receiptDrive228,active}' is distinct from proposed#>'{receiptDrive228,active}') then
  raise exception 'The company receipt account and folder are protected. Reopen Settings to change the receipt destination.';
 end if;
 return new;
end $$;
revoke all on function private.guard_receipt_destination() from public,anon,authenticated;
create or replace trigger protect_receipt_destination before update or delete on public.budget_settings14313
 for each row execute function private.guard_receipt_destination();

create or replace function public.save_receipt_destination_settings(p_actor uuid,p_expected jsonb,
 p_email text,p_folder text,p_active jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare cfg jsonb; receipt jsonb; original jsonb; expected jsonb; new_key text; linked jsonb; prior_marker text:=current_setting('ojm_scan.receipt_destination_write',true);
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin' and status='active') then
  raise exception 'Active administrator required.';
 end if;
 select data->'googleSheets143129' into cfg from public.budget_settings14313 where id for update;
 if not found then raise exception 'Company settings are unavailable.'; end if;
 cfg:=coalesce(cfg,'{}'); receipt:=coalesce(cfg->'receiptDrive228','{}'); original:=receipt->'active';
 expected:=jsonb_build_object('email',coalesce(cfg->>'accountEmail228',''),'folder',coalesce(receipt->>'folderURL',''),'key',coalesce(original->>'connectionKey',''));
 if p_expected is distinct from expected then raise exception 'Receipt settings changed on another device. Reopen Settings before continuing.'; end if;
 if p_email is null or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  or p_folder is null or p_folder !~ '^https://drive\.google\.com/drive/folders/[A-Za-z0-9_-]{10,160}$' then
  raise exception 'A Google account and a receipt folder are required.';
 end if;
 if original->>'annual231'='true' then raise exception 'Use the yearly storage controls for this destination.'; end if;
 if p_active is null then
  if cfg->>'accountEmail228' is distinct from p_email or receipt->>'folderURL' is distinct from p_folder then
   receipt:=receipt-'verified230';
  end if;
  cfg:=jsonb_set(cfg,'{accountEmail228}',to_jsonb(p_email));
  receipt:=jsonb_set(receipt,'{folderURL}',to_jsonb(p_folder));
 else
  new_key:=p_active->>'connectionKey';
  if expected->>'email' is distinct from p_email or expected->>'folder' is distinct from p_folder
     or p_active->>'email' is distinct from p_email or p_active->>'folderURL' is distinct from p_folder
     or p_active->>'id' is distinct from split_part(p_folder,'/',6)
     or new_key not like 'documents-company228:'||p_actor::text||':%'
     or not exists(select 1 from public.google_connections143150 where sheet=new_key and owner=p_actor and lower(email)=p_email) then
   raise exception 'The verified account and receipt folder must match the saved details.';
  end if;
  receipt:=jsonb_set(receipt,'{active}',p_active);
  if jsonb_typeof(cfg->'links')='array' then
   select coalesce(jsonb_agg(case when item->>0='Journal receipts' or item->>1=original->>'folderURL'
    then jsonb_set(item,'{1}',to_jsonb(p_folder)) else item end order by n),'[]')
    into linked from jsonb_array_elements(cfg->'links') with ordinality e(item,n);
   cfg:=jsonb_set(cfg,'{links}',linked);
  end if;
 end if;
 cfg:=jsonb_set(cfg,'{receiptDrive228}',receipt);
 perform set_config('ojm_scan.receipt_destination_write','verified',true);
 update public.budget_settings14313 set data=jsonb_set(data,'{googleSheets143129}',cfg),
  version=version+1,updated_at=now(),updated_by=p_actor where id;
 perform set_config('ojm_scan.receipt_destination_write',coalesce(prior_marker,''),true);
 return cfg;
end $$;
revoke all on function public.save_receipt_destination_settings(uuid,jsonb,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_receipt_destination_settings(uuid,jsonb,text,text,jsonb) to service_role;
