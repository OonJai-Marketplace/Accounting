-- Private shared inbox. Only the Edge Function's service role can reach it.
create table public.hope_messages183 (
 id uuid primary key,created_at timestamptz not null default now(),
 display_name text not null check(length(display_name) between 1 and 80),
 message text not null check(length(message) between 10 and 1500),consent boolean not null default false,
 payload_hash text not null,device_hash text not null,ip_hash text not null,
 revision integer not null default 1,synced_at timestamptz,
 accounting_opened_at timestamptz,restaurant_opened_at timestamptz
);
create index hope_created183 on public.hope_messages183(created_at desc,id desc);
create index hope_device183 on public.hope_messages183(device_hash,created_at);
create index hope_ip183 on public.hope_messages183(ip_hash,created_at);
create table public.hope_reads183(message_id uuid references public.hope_messages183(id) on delete cascade,app text check(app in ('accounting','restaurant')),actor uuid,opened_at timestamptz not null default now(),primary key(message_id,app,actor));
create table public.hope_sync183(id boolean primary key default true check(id),lease_token uuid,lease_until timestamptz not null default '-infinity');
insert into public.hope_sync183(id) values(true);
alter table public.hope_messages183 enable row level security;
alter table public.hope_reads183 enable row level security;
alter table public.hope_sync183 enable row level security;
revoke all on public.hope_messages183,public.hope_reads183,public.hope_sync183 from public,anon,authenticated;
grant all on public.hope_messages183,public.hope_reads183,public.hope_sync183 to service_role;

create function public.hope_submit183(p_id uuid,p_message text,p_name text,p_consent boolean,p_payload_hash text,p_device text,p_ip text) returns jsonb language plpgsql set search_path='' as $$
declare prior public.hope_messages183;
begin
 perform pg_advisory_xact_lock(hashtextextended('hope-submit',0));
 select * into prior from public.hope_messages183 where id=p_id;
 if found then
  if prior.payload_hash<>p_payload_hash then raise exception 'This saved request changed. Submit the edited message as a new request.';end if;
  return jsonb_build_object('id',prior.id);
 end if;
 if (select count(*) from public.hope_messages183 where device_hash=p_device and created_at>now()-interval '1 hour')>=5
 or (select count(*) from public.hope_messages183 where ip_hash=p_ip and created_at>now()-interval '1 hour')>=100 then
  raise exception 'Too many messages. Please try again later.';
 end if;
 insert into public.hope_messages183(id,message,display_name,consent,payload_hash,device_hash,ip_hash) values(p_id,p_message,p_name,p_consent,p_payload_hash,p_device,p_ip);
 return jsonb_build_object('id',p_id);
end $$;
create function public.hope_lock183(p_token uuid) returns boolean language plpgsql set search_path='' as $$
begin
 update public.hope_sync183 set lease_token=p_token,lease_until=now()+interval '2 minutes' where id and lease_until<now();return found;
end $$;
create function public.hope_inbox183(p_app text,p_actor uuid,p_before uuid default null,p_summary boolean default false) returns jsonb language plpgsql set search_path='' as $$
declare rows jsonb;unread bigint;pending bigint;latest uuid;
begin
 if p_app not in ('accounting','restaurant') or p_actor is null then raise exception 'Invalid actor';end if;
 select count(*) into unread from public.hope_messages183 m where not exists(select 1 from public.hope_reads183 r where r.message_id=m.id and r.app=p_app and r.actor=p_actor);
 select count(*) into pending from public.hope_messages183 where synced_at is null;
 select id into latest from public.hope_messages183 order by created_at desc,id desc limit 1;
 if not p_summary then
  select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into rows from (
   select m.id,m.created_at,m.display_name,left(m.message,100) preview,m.consent,m.synced_at,
    not exists(select 1 from public.hope_reads183 r where r.message_id=m.id and r.app=p_app and r.actor=p_actor) unread
   from public.hope_messages183 m where p_before is null or (m.created_at,m.id)<(select created_at,id from public.hope_messages183 where id=p_before)
   order by m.created_at desc,m.id desc limit 50
  )t;
 end if;
 return jsonb_build_object('unread',unread,'pending',pending,'latest',latest,'rows',coalesce(rows,'[]'::jsonb));
end $$;
create function public.hope_open183(p_id uuid,p_app text,p_actor uuid) returns void language plpgsql set search_path='' as $$
begin
 if p_app not in ('accounting','restaurant') or p_actor is null then raise exception 'Invalid actor';end if;
 insert into public.hope_reads183(message_id,app,actor) values(p_id,p_app,p_actor) on conflict do nothing;
 update public.hope_messages183 set
 accounting_opened_at=case when p_app='accounting' then coalesce(accounting_opened_at,now()) else accounting_opened_at end,
 restaurant_opened_at=case when p_app='restaurant' then coalesce(restaurant_opened_at,now()) else restaurant_opened_at end,
 revision=revision+1,synced_at=null
 where id=p_id and ((p_app='accounting' and accounting_opened_at is null) or (p_app='restaurant' and restaurant_opened_at is null));
end $$;
revoke all on function public.hope_submit183(uuid,text,text,boolean,text,text,text),public.hope_lock183(uuid),public.hope_inbox183(text,uuid,uuid,boolean),public.hope_open183(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.hope_submit183(uuid,text,text,boolean,text,text,text),public.hope_lock183(uuid),public.hope_inbox183(text,uuid,uuid,boolean),public.hope_open183(uuid,text,uuid) to service_role;
select cron.schedule('word-of-hope183','* * * * *',$cron$
 select net.http_post(url:='https://nhjsesfhapnjtwlxvirm.supabase.co/functions/v1/word-of-hope',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||public.google_poll_key143150()),body:='{"action":"sync"}'::jsonb,timeout_milliseconds:=60000);
$cron$);
