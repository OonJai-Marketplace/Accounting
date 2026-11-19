-- Receipt jobs own only attachment metadata. Drive discovery and journal posting remain independent.
create table public.receipt_drive_link_jobs (
 scope text not null, file_id text not null, name text not null, folder text not null,
 content_key text not null, pages integer not null, modified timestamptz not null,
 scan_id uuid not null default gen_random_uuid() unique, primary key(scope,file_id),
 state text not null default 'queued' check(state in ('queued','working','linked','review','waiting')),
 note text, first_label text, last_label text, part integer not null default 1,
 next_page integer not null default 1, lease uuid, available timestamptz not null default now(), attempts integer not null default 0
);
create index receipt_drive_link_pending on public.receipt_drive_link_jobs(scope,modified,file_id)
 where state in ('working','queued');
alter table public.receipt_drive_link_jobs enable row level security;
revoke all on public.receipt_drive_link_jobs from public,anon,authenticated;
grant select,update on public.receipt_drive_link_jobs to service_role;

create function private.queue_receipt_drive_file() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and (old.name,old.folder,old.pages,old.content_key,old.issue) is not distinct from
 (new.name,new.folder,new.pages,new.content_key,new.issue) then return new; end if;
 if new.pages is null or new.issue is not null then return new; end if;
 insert into public.receipt_drive_link_jobs as j(scope,file_id,name,folder,content_key,pages,modified)
 values(new.scope,new.file_id,new.name,new.folder,new.content_key,new.pages,new.modified)
 on conflict(scope,file_id) do update set
 name=excluded.name,folder=excluded.folder,content_key=excluded.content_key,pages=excluded.pages,modified=excluded.modified,
 state=case when exists(select 1 from public.scanner_documents208 d where d.scan_id=j.scan_id) then 'review' else 'queued' end,
 note=case when exists(select 1 from public.scanner_documents208 d where d.scan_id=j.scan_id) then 'This file changed after linking. Review the change. The earlier receipt is still saved.' end,
 scan_id=case when exists(select 1 from public.scanner_documents208 d where d.scan_id=j.scan_id) then j.scan_id else gen_random_uuid() end,
 lease=null,available=now(),next_page=1,attempts=0
 where (j.name,j.folder,j.content_key,j.pages) is distinct from (excluded.name,excluded.folder,excluded.content_key,excluded.pages);
 return new;
end $$;
create trigger receipt_drive_file_changed after insert or update of name,folder,content_key,pages,issue
 on public.receipt_drive_preview_files for each row execute function private.queue_receipt_drive_file();

create function private.dispatch_receipt_links(p_scope text) returns void language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.receipt_drive_link_jobs j join public.receipt_drive_preview_files f using(scope,file_id)
  where j.scope=p_scope and j.state in ('queued','working') and j.available<=now() and f.issue is null and f.pages is not null) then
  perform net.http_post(url:='https://nhjsesfhapnjtwlxvirm.supabase.co/functions/v1/receipt-drive-link',
   headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||s.decrypted_secret),
   body:=jsonb_build_object('scope',p_scope),timeout_milliseconds:=110000)
   from vault.decrypted_secrets s where s.name='receipt_drive_preview_job';
 end if;
end $$;
create function private.receipt_links_after_scan() returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.dispatch_receipt_links(new.scope);return new;end $$;
create trigger receipt_links_after_scan after update of last_complete on public.receipt_drive_preview_state
 for each row when (new.last_complete is distinct from old.last_complete) execute function private.receipt_links_after_scan();

create function public.claim_receipt_drive_link(p_scope text,p_lease uuid) returns jsonb language plpgsql set search_path='' as $$
declare j public.receipt_drive_link_jobs;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_scope,494));
 select q.* into j from public.receipt_drive_link_jobs q join public.receipt_drive_preview_files f using(scope,file_id)
 where q.scope=p_scope and q.state in ('queued','working') and f.issue is null and f.pages=q.pages and f.content_key=q.content_key
 order by q.modified,q.file_id limit 1 for update of q;
 if j.scan_id is null or j.available>now() then return null;end if;
 update public.receipt_drive_link_jobs set state='working',lease=p_lease,available=now()+interval '2 minutes' where scan_id=j.scan_id;
 return to_jsonb(j);
end $$;

create function public.plan_receipt_drive_link(p_scan uuid,p_lease uuid,p_first text,p_last text,p_part integer,p_finish boolean,p_owner uuid,p_hash text)
returns text language plpgsql set search_path='' as $$
declare j public.receipt_drive_link_jobs; e public.journal_entries; label text; existing record; ordinal integer;
 total integer; first_page integer; last_page integer; reason text; outcome text:='review'; paths jsonb; targets uuid[]; peer_count integer;
begin
 select * into strict j from public.receipt_drive_link_jobs where scan_id=p_scan and lease=p_lease for update;
 if not exists(select 1 from public.receipt_drive_preview_files f where f.scope=j.scope and f.file_id=j.file_id and
  (f.name,f.folder,f.content_key,f.pages)=(j.name,j.folder,j.content_key,j.pages) and f.issue is null) then
  raise exception 'The Drive file changed while checking the receipt'; end if;
 if p_first !~ '^OJM[0-9]{6}$' or p_part<1 or (p_last is not null and
 (p_last !~ '^OJM[0-9]{6}$' or left(p_last,5)<>left(p_first,5) or right(p_last,4)::int-right(p_first,4)::int+1<>j.pages)) then
 raise exception 'Invalid entry range';end if;
 total:=case when p_last is null then 1 else j.pages end;
 for ordinal in 1..total loop
  label:=left(p_first,5)||lpad((right(p_first,4)::int+ordinal-1)::text,4,'0');
  perform pg_advisory_xact_lock(hashtextextended(label,215));
  select array_agg(id) into targets from public.journal_entries where entry_no=label and status='posted';
  if coalesce(cardinality(targets),0)<>1 then reason:='Waiting for a unique posted entry named '||label||'.';outcome:='waiting';exit;end if;
  for existing in select d.title,coalesce(q.part,1) as part from public.scanner_documents208 d
   left join public.receipt_drive_link_jobs q on q.scan_id=d.scan_id where d.superseded_by218 is null and
   (d.journal_ids && targets or exists(select 1 from public.staff_journal_lines l where l.journal_entry_id=targets[1] and l.id=any(d.staff_line_ids))) loop
   if existing.part=p_part then reason:=label||' already has a receipt from '||existing.title||'. This file is waiting for review.';exit;end if;
  end loop;
  exit when reason is not null;
 end loop;
 update public.receipt_drive_link_jobs set first_label=p_first,last_label=p_last,part=p_part where scan_id=p_scan;
 if reason is not null then
  update public.receipt_drive_link_jobs set state=outcome,note=reason,lease=null where scan_id=p_scan;
  perform private.dispatch_receipt_links(j.scope);return outcome;
 end if;
 if not p_finish then return 'ready';end if;
 if p_hash !~ '^[a-f0-9]{64}$' or p_hash is null then raise exception 'Missing PDF fingerprint';end if;
 for ordinal in 1..total loop
  label:=left(p_first,5)||lpad((right(p_first,4)::int+ordinal-1)::text,4,'0');
  select * into strict e from public.journal_entries where entry_no=label and status='posted' for share;
  first_page:=case when total=1 then 1 else ordinal end;last_page:=case when total=1 then j.pages else ordinal end;
  select jsonb_agg(jsonb_build_object('page',n,'label',label,'path','drive-linked/'||p_scan::text||'/'||n::text||'.jpg','part',p_part) order by n)
   into paths from generate_series(first_page,last_page) n;
  -- A consolidated journal may contain many people's transactions. Expose an own-workspace link only for one unambiguous source entry.
  select count(distinct (l.staff_journal_id,l.workspace_entry_no)),array_agg(l.id) into peer_count,targets
   from public.staff_journal_lines l where l.journal_entry_id=e.id;
  insert into public.scanner_documents208(owner_id,scan_id,group_id,revision,title,entry_label,journal_ids,staff_line_ids,pages,pdf_provider,pdf_path,pdf_sha256)
   values(p_owner,p_scan,gen_random_uuid(),0,left(j.name,180),label,array[e.id],case when peer_count=1 then targets else '{}'::uuid[] end,
    paths,'drive',j.file_id,p_hash);
 end loop;
 update public.receipt_drive_link_jobs set state='linked',next_page=pages+1,note=null,lease=null where scan_id=p_scan;
 perform private.dispatch_receipt_links(j.scope);return 'linked';
end $$;

create function public.progress_receipt_drive_link(p_scan uuid,p_lease uuid,p_page integer,p_state text,p_note text) returns void
language plpgsql set search_path='' as $$
declare j public.receipt_drive_link_jobs;
begin
 if p_state not in ('queued','retry','review') then raise exception 'Unknown status';end if;
 update public.receipt_drive_link_jobs set state=case when p_state='retry' and attempts>=3 then 'review' when p_state='retry' then 'queued' else p_state end,
 next_page=greatest(next_page,p_page),lease=null,attempts=case when p_state='retry' then attempts+1 else 0 end,
 available=case when p_state='retry' then now()+interval '3 minutes' else now() end,note=left(p_note,400)
 where scan_id=p_scan and lease=p_lease returning * into j;
 if j.scan_id is not null then perform private.dispatch_receipt_links(j.scope);end if;
end $$;
create function private.receipt_link_journal_posted() returns trigger language plpgsql security definer set search_path='' as $$
declare s text;begin
 if new.status='posted' then
  for s in update public.receipt_drive_link_jobs set state='queued',available=now()
   where state='waiting' and new.entry_no between first_label and coalesce(last_label,first_label) returning scope
  loop perform private.dispatch_receipt_links(s);end loop;
 end if;return new;end $$;
create trigger receipt_link_journal_posted after insert or update of status,entry_no on public.journal_entries
 for each row execute function private.receipt_link_journal_posted();
revoke all on function private.queue_receipt_drive_file(),private.dispatch_receipt_links(text),private.receipt_links_after_scan(),
 private.receipt_link_journal_posted(),public.claim_receipt_drive_link(text,uuid),public.plan_receipt_drive_link(uuid,uuid,text,text,integer,boolean,uuid,text),
 public.progress_receipt_drive_link(uuid,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function private.dispatch_receipt_links(text),public.claim_receipt_drive_link(text,uuid),
 public.plan_receipt_drive_link(uuid,uuid,text,text,integer,boolean,uuid,text),public.progress_receipt_drive_link(uuid,uuid,integer,text,text) to service_role;
insert into public.receipt_drive_link_jobs(scope,file_id,name,folder,content_key,pages,modified)
 select scope,file_id,name,folder,content_key,pages,modified from public.receipt_drive_preview_files where issue is null and pages>0;
notify pgrst,'reload schema';
