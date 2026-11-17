-- Issued documents keep their values and an immutable reference to their print layout.
-- The settings row travels with company-wide backups. Range exports expand the forms.
alter table public.voucher_settings14299 add column form_parts jsonb not null default '{}';

create function private.voucher_part(value jsonb) returns text
language plpgsql set search_path='' as $$
declare key text := encode(sha256(convert_to(value::text,'UTF8')),'hex');
begin
 if not exists(select from public.voucher_settings14299 where id=1 and form_parts ? key) then
  update public.voucher_settings14299 set form_parts=jsonb_set(form_parts,array[key],value)
    where id=1 and not form_parts ? key;
  if not exists(select from public.voucher_settings14299 where id=1) then raise exception 'Missing voucher settings'; end if;
 end if;
 return key;
end $$;

-- A restored settings row can add template parts without breaking references in
-- other years or documents already present in the company.
create function private.voucher_keep_parts() returns trigger language plpgsql set search_path='' as $$
begin
 new.form_parts:=new.form_parts||old.form_parts;
 return new;
end $$;
revoke all on function private.voucher_keep_parts() from public,anon,authenticated;
create trigger keep_voucher_print_parts before update of form_parts on public.voucher_settings14299
 for each row execute function private.voucher_keep_parts();

create function private.voucher_layout(settings jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare name text; assets jsonb := '{}';
begin
 foreach name in array array['headerImage','footerImage'] loop
  if settings ? name then
   assets:=assets||jsonb_build_object(name,private.voucher_part(settings->name));
   settings:=settings-name;
  end if;
 end loop;
 return to_jsonb(private.voucher_part(jsonb_build_object('settings',settings,'assets',assets)));
end $$;

create function private.voucher_layout_read(key text, parts jsonb) returns jsonb
language plpgsql immutable strict set search_path='' as $$
declare layout jsonb:=parts->key; settings jsonb:=layout->'settings'; item record;
begin
 if layout is null then raise exception 'Missing saved voucher layout'; end if;
 for item in select * from jsonb_each_text(layout->'assets') loop
  if not parts ? item.value then raise exception 'Missing saved voucher artwork'; end if;
  settings:=settings||jsonb_build_object(item.key,parts->item.value);
 end loop;
 return settings;
end $$;

-- Keep literal markup and static labels in the shared template. Variable text is
-- kept separately, in order, including exact whitespace and escaped characters.
create function private.voucher_fields(html text) returns jsonb
language plpgsql set search_path='' as $$
declare token text; chunk text:=''; template text[]:='{}'; fields text[]:='{}';
begin
 for token in select m[1] from regexp_matches(html,'(<[^>]*>|[^<]+|<)','g') m loop
  if left(token,1)='<' or btrim(token) in ('','&nbsp;','PAYMENT RECEIPT','PAYMENT VOUCHER','Payer','Payee','Contact number','Receipt No.','Voucher No.','Date','Description / Purpose','Quantity','Amount','TOTAL RECEIVED','TOTAL','Amount in words','Currency','Reference','Payment type','Received by (name and signature)','LAK','USD','THB','Cash','Bank','Prepared by','Released by','Received by') then
   chunk:=chunk||token;
  else
   template:=array_append(template,chunk); fields:=array_append(fields,token); chunk:='';
  end if;
 end loop;
 template:=array_append(template,chunk);
 return jsonb_build_object('template',private.voucher_part(to_jsonb(template)),'fields',to_jsonb(fields));
end $$;

create function private.voucher_pack(doc jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare form jsonb:=coalesce(doc->'printForm','{}');
begin
 if doc is null then return null; end if;
 if jsonb_typeof(doc->'html')='string' then
  form:=form||private.voucher_fields(doc->>'html'); doc:=doc-'html';
 end if;
 if jsonb_typeof(doc->'settings')='object' then
  form:=form||jsonb_build_object('layout',private.voucher_layout(doc->'settings')); doc:=doc-'settings';
 end if;
 if jsonb_typeof(doc#>'{typedFields245,settings}')='object' then
  form:=form||jsonb_build_object('typedLayout',private.voucher_layout(doc#>'{typedFields245,settings}')); doc:=doc#-'{typedFields245,settings}';
 end if;
 doc:=doc-'pdf245';
 if form<>'{}' then doc:=doc||jsonb_build_object('printForm',form); end if;
 return doc;
end $$;

create function private.voucher_expand(doc jsonb,parts jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare form jsonb:=doc->'printForm'; pattern jsonb; html text;
begin
 if form is null then return doc; end if;
 if form ? 'template' then
  pattern:=parts->(form->>'template');
  if pattern is null or jsonb_array_length(pattern)<>jsonb_array_length(form->'fields')+1 then raise exception 'Incomplete saved voucher template'; end if;
  select string_agg(s.markup||coalesce(form->'fields'->>(s.n::int-1),''),'' order by s.n)
   into html from jsonb_array_elements_text(pattern) with ordinality s(markup,n);
  doc:=doc||jsonb_build_object('html',html);
 end if;
 if form ? 'layout' then doc:=doc||jsonb_build_object('settings',private.voucher_layout_read(form->>'layout',parts)); end if;
 if form ? 'typedLayout' then doc:=jsonb_set(doc,'{typedFields245,settings}',private.voucher_layout_read(form->>'typedLayout',parts)); end if;
 return doc-'printForm';
end $$;

create function private.voucher_request_digest(payload jsonb) returns jsonb
language sql immutable strict set search_path='' as $$
 select case when jsonb_typeof(payload)='object' and payload ? 'request_sha256' and
   (payload-'request_sha256')='{}'::jsonb and payload->>'request_sha256' ~ '^[a-f0-9]{64}$'
   then payload else jsonb_build_object('request_sha256',encode(sha256(convert_to(payload::text,'UTF8')),'hex')) end
$$;

create function private.voucher_store_form() returns trigger language plpgsql set search_path='' as $$
begin
 new.data:=private.voucher_pack(new.data);
 if tg_table_name='vouchers14299' then new.request_payload:=private.voucher_request_digest(new.request_payload); end if;
 return new;
end $$;

revoke all on function private.voucher_part(jsonb), private.voucher_layout(jsonb),private.voucher_fields(text),private.voucher_pack(jsonb),private.voucher_request_digest(jsonb),private.voucher_store_form(),private.voucher_expand(jsonb,jsonb),private.voucher_layout_read(text,jsonb) from public,anon,authenticated;
grant execute on function private.voucher_part(jsonb),private.voucher_layout(jsonb),private.voucher_fields(text),private.voucher_pack(jsonb),private.voucher_request_digest(jsonb) to service_role;
grant execute on function private.voucher_expand(jsonb,jsonb),private.voucher_layout_read(text,jsonb) to authenticated,service_role;

create view public.voucher_documents_read with (security_invoker=true) as
 select v.id,v.request_key,v.batch_key,v.request_payload,v.number,v.journal_number,v.year_no,v.ordinal,v.kind,v.status,v.voucher_date,
 private.voucher_expand(v.data,s.form_parts) data,v.journal_entry_id,v.version,v.created_by,v.created_at,v.updated_at
 from public.vouchers14299 v cross join public.voucher_settings14299 s where s.id=1;
create view public.voucher_versions_read with (security_invoker=true) as
 select v.id,v.voucher_id,v.version,private.voucher_expand(v.data,s.form_parts) data,v.reason,v.changed_by,v.changed_at
 from public.voucher_versions14299 v cross join public.voucher_settings14299 s where s.id=1;
revoke all on public.voucher_documents_read,public.voucher_versions_read from public,anon,authenticated;
grant select on public.voucher_documents_read,public.voucher_versions_read to authenticated,service_role;

-- Save the same immutable retry fingerprint for the first issue and all replays.
do $$
declare def text:=pg_get_functiondef('public.voucher_issue14299(text,integer,date,jsonb,uuid)'::regprocedure);
begin
 if position('request_payload is distinct from payload' in def)=0 then raise exception 'Unknown voucher issue implementation'; end if;
 if position('for i in 1..p_count loop' in def)=0 or position('perform pg_advisory_xact_lock' in def)=0 then raise exception 'Unexpected batch issue implementation'; end if;
 def:=replace(def,'perform pg_advisory_xact_lock','payload:=private.voucher_request_digest(payload); perform pg_advisory_xact_lock');
 def:=replace(def,'request_payload is distinct from payload','private.voucher_request_digest(request_payload) is distinct from payload');
 -- A blank batch shares the same form. Compute its template once for all numbers.
 execute replace(def,'for i in 1..p_count loop','if p_kind=''H'' then p_data:=private.voucher_pack(p_data); end if; for i in 1..p_count loop');
end $$;

-- Older open clients may submit a generated PDF. Check their document/version
-- and return their output without ever writing that generated file to storage.
create or replace function public.receipt_pdf245(p_id uuid,p_version integer,p_pdf text default null)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.vouchers14299;
begin
 if public.voucher_admin14299() is not true then raise exception 'Accounting administrator required'; end if;
 select * into item from public.vouchers14299 where id=p_id;
 if item.id is null or item.version is distinct from p_version or item.status='void' then raise exception 'Document changed or unavailable. Reopen it.'; end if;
 if p_pdf is null then return null; end if;
 if length(p_pdf) not between 12 and 20000000 or substring(decode(p_pdf,'base64'),1,5)<>convert_to('%PDF-','UTF8') then raise exception 'Invalid PDF'; end if;
 return jsonb_build_object('base64',p_pdf,'filename',item.number||'.pdf','version',item.version);
end $$;

-- A selection containing only vouchers can restore itself without a separate
-- settings export. On import, normalize both an old full row and the new format.
do $$
declare source text:=pg_get_functiondef('private.portable_rows328(date,date,text[])'::regprocedure);
 restore text:=pg_get_functiondef('public.portable_backup328(text,date,date,text[],jsonb,text)'::regprocedure);
 marker text:='-- Refuse a same-key collision';
begin
 if position('from public.vouchers14299 x' in source)=0 or position('from public.voucher_versions14299 x' in source)=0 or position(marker in restore)=0 then raise exception 'Unknown portable backup implementation'; end if;
 execute replace(replace(source,'from public.vouchers14299 x','from public.voucher_documents_read x'),'from public.voucher_versions14299 x','from public.voucher_versions_read x');
 execute replace(restore,marker,$insert$
   if c.tbl in ('vouchers14299','voucher_versions14299') then
    select jsonb_agg((case when c.tbl='vouchers14299' then
       jsonb_set(doc,'{request_payload}',coalesce(private.voucher_request_digest(doc->'request_payload'),'null'))
      else doc end || jsonb_build_object('data',private.voucher_pack(doc->'data')))::text order by n)
    into rows from (select value::jsonb doc,n from jsonb_array_elements_text(rows) with ordinality s(value,n)) x;
   end if;
   $insert$||marker);
end $$;

-- The conversion only commits if all original business fields, custom print
-- content, timestamps, attachments and journal links round trip exactly.
lock table public.vouchers14299,public.voucher_versions14299 in share row exclusive mode;
create temporary table voucher_roundtrip on commit drop as
 select false history,id,sha256(convert_to(((to_jsonb(v)-'request_payload')||jsonb_build_object('data',v.data-'pdf245','request_payload',private.voucher_request_digest(v.request_payload)))::text,'UTF8')) fingerprint from public.vouchers14299 v
 union all select true,id,sha256(convert_to((to_jsonb(v)||jsonb_build_object('data',v.data-'pdf245'))::text,'UTF8')) from public.voucher_versions14299 v;

create trigger voucher_compact before insert or update of data,request_payload on public.vouchers14299
 for each row execute function private.voucher_store_form();
create trigger voucher_compact before insert or update of data on public.voucher_versions14299
 for each row execute function private.voucher_store_form();
update public.vouchers14299 set data=data;
update public.voucher_versions14299 set data=data;
do $$
begin
 if exists(with derived as (
  select false history,id,sha256(convert_to(to_jsonb(v)::text,'UTF8')) fingerprint from public.voucher_documents_read v
  union all select true,id,sha256(convert_to(to_jsonb(v)::text,'UTF8')) from public.voucher_versions_read v
 ) select 1 from voucher_roundtrip b full join derived d using(history,id) where b.fingerprint is distinct from d.fingerprint)
 then raise exception 'Voucher conversion verification failed; rolling back'; end if;
end $$;
notify pgrst, 'reload schema';
