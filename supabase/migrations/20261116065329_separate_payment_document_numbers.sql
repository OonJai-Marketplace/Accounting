-- Payment document numbers are independent by document type and issue month.
-- A reservation belongs to one account and its random, device-held key.
create table private.payment_numbers401 (
  doc_type text not null check (doc_type in ('voucher','receipt')),
  month_start date not null,
  serial integer not null check (serial between 1 and 2574),
  number text not null unique,
  reservation uuid not null,
  owner_id uuid not null,
  issued_by uuid,
  primary key(doc_type,month_start,serial)
);
create index payment_numbers401_reservation on private.payment_numbers401(reservation);
alter table private.payment_numbers401 enable row level security;
revoke all on private.payment_numbers401 from public,anon,authenticated;

create function private.payment_label401(t text,d date,n integer) returns text
language sql stable strict set search_path='' as $$
 select 'OJM'||to_char(d,'YY')||'-'||case t when 'receipt' then 'R' else 'V' end||
 chr(65+(n-1)/99)||to_char(d,'MM')||lpad((((n-1)%99)+1)::text,2,'0')
$$;
revoke all on function private.payment_label401(text,date,integer) from public,anon,authenticated;

create function public.payment_preview401(p_date date,p_count integer,p_type text) returns text[]
language plpgsql security definer set search_path='' as $$
declare first_no integer; m date:=date_trunc('month',p_date)::date;
begin
 if not public.voucher_admin14299() then raise exception 'Accounting administrator required'; end if;
 if p_date is null or p_type is null or p_type not in ('voucher','receipt') or p_count is null or p_count not between 1 and 50 then raise exception 'Choose a type, date and 1 to 50 documents';end if;
 select coalesce(max(serial),0)+1 into first_no from private.payment_numbers401 where doc_type=p_type and month_start=m;
 if first_no+p_count-1>2574 then raise exception 'No more numbers are available for this document type and month';end if;
 return array(select private.payment_label401(p_type,p_date,n) from generate_series(first_no,first_no+p_count-1) as n);
end $$;
create or replace function public.receipt_preview245(p_date date,p_count integer default 1) returns text[]
language sql security invoker set search_path='' as $$select public.payment_preview401(p_date,p_count,'receipt')$$;

create function public.payment_reserve401(p_date date,p_count integer,p_type text,p_key uuid) returns text[]
language plpgsql security definer set search_path='' as $$
declare m date:=date_trunc('month',p_date)::date; numbers text[]; first_no integer;
begin
 if not public.voucher_admin14299() or auth.uid() is null then raise exception 'Accounting administrator required';end if;
 if p_key is null or p_date is null or p_type is null or p_type not in ('voucher','receipt') or p_count is null or p_count not between 1 and 50 then raise exception 'Invalid number reservation';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_key::text,401));
 if exists(select from private.payment_numbers401 where reservation=p_key) then
  select array_agg(number order by serial) into numbers from private.payment_numbers401 where reservation=p_key and owner_id=auth.uid() and month_start=m and doc_type=p_type;
  if cardinality(numbers) is distinct from p_count then raise exception 'Reservation key already used';end if;
  return numbers;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_type||m::text,402));
 numbers:=public.payment_preview401(p_date,p_count,p_type);
 select coalesce(max(serial),0)+1 into first_no from private.payment_numbers401 where doc_type=p_type and month_start=m;
 insert into private.payment_numbers401(doc_type,month_start,serial,number,reservation,owner_id)
 select p_type,m,first_no+i-1,numbers[i],p_key,auth.uid() from generate_series(1,p_count) i;
 return numbers;
end $$;

create or replace function public.voucher_issue14299(p_kind text,p_count integer,p_date date,p_data jsonb,p_request_key uuid)
returns setof public.vouchers14299 language plpgsql security definer set search_path='' as $$
declare item public.vouchers14299; yr integer:=extract(year from p_date)::integer; ord integer; i integer; nums text[]; payload jsonb; doc jsonb;
 t text:=coalesce(p_data->>'documentType','voucher'); m date:=date_trunc('month',p_date)::date; h private.payment_numbers401;
begin
 if not public.voucher_admin14299() or auth.uid() is null then raise exception 'Accounting administrator required';end if;
 if p_kind is null or p_kind not in ('H','E') or p_count is null or p_count not between 1 and 50 or p_date is null or p_request_key is null or jsonb_typeof(p_data) is distinct from 'object' or t not in ('voucher','receipt') then raise exception 'Invalid document request';end if;
 if p_kind='E' and (p_count<>1 or length(coalesce(p_data->>'tentative_number',''))<8 or length(coalesce(p_data->>'html',''))<30 or coalesce(p_data->>'total','') !~ '^[0-9]+([.][0-9]{1,2})?$' or coalesce(p_data->>'currency','') not in ('LAK','USD','THB')) then raise exception 'Valid document content, amount and currency required';end if;
 payload:=jsonb_build_object('kind',p_kind,'count',p_count,'date',p_date,'data',p_data);
 perform pg_advisory_xact_lock(hashtextextended(p_request_key::text,245));
 if exists(select from public.vouchers14299 where batch_key=p_request_key) then
  if exists(select from public.vouchers14299 where batch_key=p_request_key and request_payload is distinct from payload) then raise exception 'Document request already used for different data';end if;
  return query select * from public.vouchers14299 where batch_key=p_request_key order by ordinal;return;
 end if;
 if p_data ? 'holds401' then
  if jsonb_typeof(p_data->'holds401') is distinct from 'array' or jsonb_array_length(p_data->'holds401')<>p_count then raise exception 'Invalid offline number list';end if;
  for i in 0..p_count-1 loop
   select * into h from private.payment_numbers401 where owner_id=auth.uid() and doc_type=t and month_start=m and reservation=(p_data->'holds401'->i->>'key')::uuid and number=p_data->'holds401'->i->>'number' for update;
   if h.number is null or h.issued_by is not null then raise exception 'Offline number unavailable for this account, type or month';end if;
   update private.payment_numbers401 set issued_by=p_request_key where number=h.number;
   nums:=array_append(nums,h.number);
  end loop;
 else
  nums:=public.payment_reserve401(p_date,p_count,t,p_request_key);
  if exists(select from private.payment_numbers401 where reservation=p_request_key and issued_by is not null) then raise exception 'Number reservation was already issued';end if;
  if p_data ? 'expected401' and to_jsonb(nums) is distinct from p_data->'expected401' then
   raise exception using errcode='P0401',message='A pending document number is no longer available. Review the next available numbers before assigning them.';
  end if;
  update private.payment_numbers401 set issued_by=p_request_key where reservation=p_request_key;
 end if;
 insert into public.voucher_sequences14299(year_no,kind,next_no) values(yr,p_kind,1) on conflict do nothing;
 select greatest(next_no,coalesce((select max(v.ordinal)+1 from public.vouchers14299 v where v.year_no=yr and v.kind=p_kind),1)) into ord from public.voucher_sequences14299 where year_no=yr and kind=p_kind for update;
 for i in 1..p_count loop
  doc:=p_data-'holds401'-'expected401'-'pdf245'-'tentative_number';
  if p_kind='E' then doc:=jsonb_set(doc,'{html}',to_jsonb(regexp_replace(doc->>'html','(<span[^>]*data-voucher-number14299[^>]*>)[^<]*(</span>)','\1'||nums[i]||'\2','i')));end if;
  doc:=doc||jsonb_build_object('date',p_date,'id_format',jsonb_build_object('scheme','separate401','prefix','OJM','label',case when t='receipt' then 'Receipt' else 'Voucher' end,'code',case when t='receipt' then 'R' else 'V' end));
  insert into public.vouchers14299(request_key,batch_key,request_payload,number,year_no,ordinal,kind,status,voucher_date,data,created_by)
   values(case when i=1 then p_request_key else gen_random_uuid() end,p_request_key,payload,nums[i],yr,ord+i-1,p_kind,case when p_kind='H' then 'reserved' else 'issued' end,p_date,doc,auth.uid()) returning * into item;
  insert into public.voucher_versions14299(voucher_id,version,data,reason,changed_by) values(item.id,1,item.data,'Issued',auth.uid());
  return next item;
 end loop;
 update public.voucher_sequences14299 set next_no=ord+p_count where year_no=yr and kind=p_kind;
end $$;
-- Both immutable sheet-number formats retain their printed number after linking.
do $$declare def text:=pg_get_functiondef('public.voucher_link14299(uuid,uuid)'::regprocedure);
begin
 if strpos(def,$s$item.data->'id_format'->>'scheme'='shared245'$s$)=0 then raise exception 'Unexpected document link function';end if;
 execute replace(def,$s$item.data->'id_format'->>'scheme'='shared245'$s$,$s$(item.data->'id_format'->>'scheme') in ('shared245','separate401')$s$);
end $$;
revoke all on function public.payment_preview401(date,integer,text),public.payment_reserve401(date,integer,text,uuid) from public,anon;
grant execute on function public.payment_preview401(date,integer,text),public.payment_reserve401(date,integer,text,uuid) to authenticated;
do $$declare def text:=pg_get_functiondef('public.voucher_update14299(uuid,integer,date,jsonb,text)'::regprocedure);
 needle text:='IF item.data->>''documentType''=''receipt'' AND';begin
 if strpos(def,needle)=0 then raise exception 'Unexpected document edit function';end if;
 execute replace(def,needle,$guard$IF item.data#>>'{id_format,scheme}'='separate401' AND
 (coalesce(item.data->>'documentType','voucher')<>coalesce(p_data->>'documentType','voucher')
 OR date_trunc('month',item.voucher_date)<>date_trunc('month',p_date)) THEN
 RAISE EXCEPTION 'Keep the document type and issue month of this printed ID.'; END IF;
 $guard$||needle);
end $$;
