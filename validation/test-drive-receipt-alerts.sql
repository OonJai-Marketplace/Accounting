-- Transaction-only cases. Use existing posted sample numbers without changing their journals.
begin;
do $test$
declare s text:='phase2-fixture-'||gen_random_uuid(); problems text[]; lease uuid:=gen_random_uuid(); entries text[];
begin
 select array_agg(entry_no order by entry_no) into entries from (
   select e.entry_no from public.journal_entries e where e.status='posted' and e.voided_at is null
   and e.entry_no ~ '^OJM[0-9]{6}$' and exists(select 1 from public.journal_entries n where n.status='posted'
     and n.voided_at is null and n.entry_no=left(e.entry_no,5)||lpad((right(e.entry_no,4)::int+1)::text,4,'0'))
   order by e.entry_no limit 1
 ) sample;
 if entries is null then raise exception 'Test needs two consecutive posted journal numbers';end if;
 entries:=entries||array[left(entries[1],5)||lpad((right(entries[1],4)::int+1)::text,4,'0')];
 perform public.receipt_preview_claim(s,lease);
 perform public.receipt_preview_step_with_alerts(s,lease,
 jsonb_build_array(
   jsonb_build_object('file_id','range','name','range.pdf','folder','2026','content_key','a','modified',now(),'pages',2,'retry',false,'target',jsonb_build_object('first',entries[1],'last',entries[2],'expected',2)),
   jsonb_build_object('file_id','single','name','single.pdf','folder','2026','content_key','b','modified',now(),'pages',1,'retry',false,'target',jsonb_build_object('first',entries[1],'part',1)),
   jsonb_build_object('file_id','extra','name','extra-part02.pdf','folder','2026','content_key','c','modified',now(),'pages',4,'retry',false,'target',jsonb_build_object('first',entries[1],'part',2)),
   jsonb_build_object('file_id','mismatch','name','wrong-count.pdf','folder','2026','content_key','d','modified',now(),'pages',1,'retry',false,'target',jsonb_build_object('issue','The name lists 2 entries, but this PDF has 1 page.')),
   jsonb_build_object('file_id','badname','name','typo.pdf','folder','2026','content_key','e','modified',now(),'pages',1,'retry',false,'target',jsonb_build_object('issue','Use an entry number.')),
   jsonb_build_object('file_id','missing','name','missing.pdf','folder','2026','content_key','f','modified',now(),'pages',1,'retry',false,'target',jsonb_build_object('first','OJM999999','part',1))
 ),null,true);
 select array_agg(issue_key order by issue_key) into problems from private.receipt_file_problems(s);
 if problems is distinct from array['entry:missing','file:badname','file:mismatch','overlap:'||entries[1]||':1'] then raise exception 'Unexpected receipt warnings %',problems; end if;
 if not exists(select 1 from private.receipt_file_problems(s) where issue_key like 'overlap:%' and detail like '%range.pdf%page 1%single.pdf%' and fix like '%part02.pdf%') then raise exception 'Missing file, page or fix'; end if;
 update public.receipt_drive_preview_files set alert_target=jsonb_build_object('first',entries[1],'part',2) where scope=s and file_id='single';
 if not exists(select 1 from private.receipt_file_problems(s) where title like 'Part 2 is repeated%') then raise exception 'Repeated part warning missing'; end if;
 delete from public.receipt_drive_preview_files where scope=s and file_id in ('single','badname','missing','mismatch');
 if exists(select 1 from private.receipt_file_problems(s)) then raise exception 'Corrected receipt or skipped number was flagged'; end if;
end $test$;
rollback;
