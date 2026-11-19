-- Use the existing receipt check and its completed folder snapshot. Only the small bell row is published.
alter table public.receipt_drive_preview_files add column alert_target jsonb;
alter table public.receipt_drive_preview_state add column alerts_dirty boolean not null default true;

create table public.receipt_drive_issues (
  issue_key text primary key, title text not null, detail text not null, fix text not null
);
create table public.receipt_drive_notice (
  id boolean primary key default true check (id), revision bigint not null default 1,
  issue_count integer not null, first_issue jsonb, fingerprint text not null
);
alter table public.receipt_drive_issues enable row level security;
alter table public.receipt_drive_notice enable row level security;
revoke all on public.receipt_drive_issues,public.receipt_drive_notice from public,anon,authenticated;
grant select on public.receipt_drive_issues,public.receipt_drive_notice to authenticated;
grant select,insert,update,delete on public.receipt_drive_issues,public.receipt_drive_notice to service_role;
create policy receipt_issues_admin on public.receipt_drive_issues for select to authenticated using (
  (select public.is_admin() and public.active_account14228() and not public.password_change_required14257()
   and public.accounting_workspace_allowed123() and public.can_action113('settings-accounting','view'))
);
create policy receipt_notice_admin on public.receipt_drive_notice for select to authenticated using (
  (select public.is_admin() and public.active_account14228() and not public.password_change_required14257()
   and public.accounting_workspace_allowed123() and public.can_action113('settings-accounting','view'))
);
alter publication supabase_realtime add table public.receipt_drive_notice;

create function private.active_receipt_alert_scope() returns text language sql stable set search_path='' as $$
  select encode(sha256(convert_to((dest->>'connectionKey')||'/'||substring(dest->>'folderURL' from '/folders/([A-Za-z0-9_-]+)$'),'UTF8')),'hex')
  from (select data#>'{googleSheets143129,receiptDrive228,active}' dest from public.budget_settings14313 where id) d
$$;

create function private.receipt_file_problems(p_scope text)
returns table(issue_key text,title text,detail text,fix text) language sql stable set search_path='' as $$
 with files as materialized (
   select f.file_id, f.name, f.folder, f.pages, f.issue, f.retry, f.alert_target t,
     format('“%s” in “%s”',f.name,f.folder) label
   from public.receipt_drive_preview_files f where f.scope=p_scope
 ), claims as materialized (
   select file_id,label,t->>'first' first_entry, (t ? 'last') is_batch,
     left(t->>'first',5)||lpad(n::text,4,'0') entry_no,
     n-right(t->>'first',4)::int+1 page_no, coalesce((t->>'part')::numeric,1) part
   from files cross join lateral generate_series(right(t->>'first',4)::int,
     right(coalesce(t->>'last',t->>'first'),4)::int) n
   where issue is null and t->>'issue' is null and pages>0
 ), missing as (
   select c.* from claims c where not exists (
     select 1 from public.journal_entries e where e.entry_no=c.entry_no and e.voided_at is null and e.status='posted'
   )
 ), clashes as (
   select entry_no,part,count(*) num,
     string_agg(label||case when is_batch then format(' (page %s)',page_no) else '' end,' and ' order by label,file_id) labels
   from claims group by entry_no,part having count(*)>1
 )
 select 'file:'||file_id,
   case when issue is not null then 'The receipt could not be read'
        when t->>'issue' like 'The name lists %' then 'The page count does not match the filename'
        else 'The entry number in the filename is unclear' end,
   label||'. '||case when issue is not null then
      case when retry then 'Google Drive could not finish reading this file.'
        when issue like '%64 MB%' then 'This PDF is larger than 64 MB.'
        else 'Accounting could not count the pages in this PDF.' end
     when t->>'issue' like 'The name lists %' then t->>'issue'
     else 'Accounting could not tell which journal entry or entries you meant.' end,
   case when issue is not null then
      case when retry then 'The next folder check will try again. If this keeps happening, check that the company Google account can open this file.'
        when issue like '%64 MB%' then 'Save a smaller copy in the receipt folder, or split it into smaller files and name each one for the entries it contains.'
        else 'Open the PDF in Drive. Save a copy that opens without a password and contains all the receipt pages.' end
     when t->>'issue' like 'The name lists %' then 'Check the first and last entry numbers and the page order. If you skipped an entry, split the PDF at the gap and name each file for the entries it contains.'
     else coalesce(t->>'issue','Rename the file with its journal entry number, for example OJM260388.pdf.') end
 from files where issue is not null or t ? 'issue'
 union all
 select 'entry:'||file_id, 'A number in the filename has no posted journal entry',
   label||'. '||string_agg(entry_no,', ' order by entry_no)||' could not be found in the posted journal.',
   'Check the number against the journal and correct the filename in Drive. If the entry is still a draft, finish posting it when it is ready.'
 from missing group by file_id,label
 union all
 select 'overlap:'||entry_no||':'||part::text,
   case when part=1 then 'More than one file names '||entry_no else 'Part '||part||' is repeated for '||entry_no end,
   labels||case when part=1 and num=2 then ' both point to the same entry.' when part=1 then ' all point to the same entry.' else ' use the same part number.' end,
   case when part=1 then 'Compare the files. If one is a copy, move it out of the receipt folder. If it is an extra receipt, give it the next unused part number, for example '||entry_no||'-part02.pdf.'
   else 'Check the page order and give each separate part its own number. Move any spare copy out of the receipt folder.' end
 from clashes
$$;

create function private.publish_receipt_notice() returns void language sql set search_path='' as $$
 insert into public.receipt_drive_notice(id,issue_count,first_issue,fingerprint)
 select true,count(*)::integer,
   (select jsonb_build_object('title',title,'detail',detail,'fix',fix) from public.receipt_drive_issues order by issue_key limit 1),
   md5(coalesce(string_agg(to_jsonb(i)::text,E'\n' order by issue_key),''))
 from public.receipt_drive_issues i
 on conflict(id) do update set issue_count=excluded.issue_count,first_issue=excluded.first_issue,
   fingerprint=excluded.fingerprint,revision=receipt_drive_notice.revision+1
 where receipt_drive_notice.fingerprint is distinct from excluded.fingerprint
$$;

create function public.receipt_preview_step_with_alerts(p_scope text,p_lease uuid,p_files jsonb,p_cursor jsonb,p_done boolean)
returns void language plpgsql set search_path='' as $$
declare changed boolean;
begin
 select exists(
   select 1 from jsonb_to_recordset(p_files) f(file_id text,name text,folder text,pages int,issue text,retry boolean,target jsonb)
   left join public.receipt_drive_preview_files old on old.scope=p_scope and old.file_id=f.file_id
   where (old.name,old.folder,old.pages,old.issue,old.retry,old.alert_target)
     is distinct from (f.name,f.folder,f.pages,f.issue,f.retry,f.target)
 ) or (p_done and exists(select 1 from public.receipt_drive_preview_files f join public.receipt_drive_preview_state s using(scope)
   where f.scope=p_scope and f.seen<>s.generation and not exists(select 1 from jsonb_array_elements(p_files) v where v->>'file_id'=f.file_id)))
 into changed;
 perform public.receipt_preview_step(p_scope,p_lease,p_files,p_cursor,p_done);
 update public.receipt_drive_preview_files old set alert_target=f.target
 from jsonb_to_recordset(p_files) f(file_id text,target jsonb)
 where old.scope=p_scope and old.file_id=f.file_id and old.alert_target is distinct from f.target;
 if changed then update public.receipt_drive_preview_state set alerts_dirty=true where scope=p_scope and not alerts_dirty; end if;
 if not p_done then return; end if;
 perform pg_advisory_xact_lock(84675198325);
 if p_scope is distinct from private.active_receipt_alert_scope() then return; end if;
 if (select alerts_dirty from public.receipt_drive_preview_state where scope=p_scope) or
    not exists(select 1 from public.receipt_drive_notice where id and fingerprint<>'') then
   -- Replace the completed set in one transaction. Readers never see an intermediate empty list.
   delete from public.receipt_drive_issues where issue_key<>'connection';
   insert into public.receipt_drive_issues select * from private.receipt_file_problems(p_scope);
   update public.receipt_drive_preview_state set alerts_dirty=false where scope=p_scope;
   changed:=true;
 end if;
 delete from public.receipt_drive_issues where issue_key='connection';
 if found or changed then perform private.publish_receipt_notice(); end if;
end $$;

create function private.receipt_check_failed() returns trigger language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(84675198325);
 if new.scope is distinct from private.active_receipt_alert_scope() then return null; end if;
 insert into public.receipt_drive_issues values ('connection','The receipt folder check stopped',
  case when new.last_error ~* 'connect|authoriz|administrator|token' then 'Accounting could not use the saved Google account to check the receipt folder.'
   else 'Accounting could not finish checking Google Drive. The most recent receipt changes may still be waiting.' end,
  case when new.last_error ~* 'connect|authoriz|administrator|token' then 'Open Google Drive and Sheets in Accounting Settings. Check the receipt connection and reconnect the company account if asked.'
   else 'The next folder check will try again. If the message stays, open Google Drive and Sheets in Accounting Settings and choose Check connection.' end)
 on conflict(issue_key) do update set detail=excluded.detail,fix=excluded.fix
 where (receipt_drive_issues.detail,receipt_drive_issues.fix) is distinct from (excluded.detail,excluded.fix);
 if found then perform private.publish_receipt_notice(); end if;
 return null;
end $$;
create trigger receipt_check_failed after update of last_error on public.receipt_drive_preview_state
for each row when (new.last_error is not null and old.last_error is distinct from new.last_error)
execute function private.receipt_check_failed();

-- An entry that is later posted, renumbered or voided can resolve or create a missing-entry warning.
create function private.invalidate_receipt_number() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.receipt_drive_preview_state s set alerts_dirty=true where not s.alerts_dirty and exists (
  select 1 from public.receipt_drive_preview_files f where f.scope=s.scope and
   (old.entry_no between (f.alert_target->>'first') and coalesce(f.alert_target->>'last',f.alert_target->>'first')
    or new.entry_no between (f.alert_target->>'first') and coalesce(f.alert_target->>'last',f.alert_target->>'first'))
 );
 return null;
end $$;
create trigger receipt_number_changed after update of entry_no,status,voided_at on public.journal_entries
for each row when ((old.entry_no,old.status,old.voided_at) is distinct from (new.entry_no,new.status,new.voided_at))
execute function private.invalidate_receipt_number();
create trigger receipt_number_created after insert or delete on public.journal_entries for each row execute function private.invalidate_receipt_number();

create function private.receipt_alert_destination_changed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(84675198325);
 delete from public.receipt_drive_issues;
 insert into public.receipt_drive_notice(id,issue_count,first_issue,fingerprint) values(true,0,null,'')
 on conflict(id) do update set issue_count=0,first_issue=null,fingerprint='',revision=receipt_drive_notice.revision+1;
 return null;
end $$;
create trigger receipt_alert_destination_changed after update of data on public.budget_settings14313
for each row when ((old.data#>>'{googleSheets143129,receiptDrive228,active,folderURL}',old.data#>>'{googleSheets143129,receiptDrive228,active,connectionKey}')
 is distinct from (new.data#>>'{googleSheets143129,receiptDrive228,active,folderURL}',new.data#>>'{googleSheets143129,receiptDrive228,active,connectionKey}'))
execute function private.receipt_alert_destination_changed();

revoke all on function private.active_receipt_alert_scope(),private.receipt_file_problems(text),private.publish_receipt_notice(),private.receipt_check_failed(),private.invalidate_receipt_number(),private.receipt_alert_destination_changed(),public.receipt_preview_step_with_alerts(text,uuid,jsonb,jsonb,boolean) from public,anon,authenticated;
grant execute on function private.active_receipt_alert_scope(),private.receipt_file_problems(text),private.publish_receipt_notice(),public.receipt_preview_step_with_alerts(text,uuid,jsonb,jsonb,boolean) to service_role;
notify pgrst,'reload schema';
