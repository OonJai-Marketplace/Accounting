-- Run against a test/staging database or in this rollback-only transaction.
begin;
do $$
declare actor uuid; journal uuid; row1 jsonb; row2 jsonb; row3 jsonb; saved1 uuid; saved2 uuid; group1 uuid:=gen_random_uuid();group2 uuid:=gen_random_uuid();group3 uuid:=gen_random_uuid();label text; blocked boolean:=false;
begin
 select id into actor from public.profiles where role='admin' and status='active' limit 1;
 select id,entry_no into journal,label from public.journal_entries where status::text='posted' order by entry_no limit 1;
 if actor is null or journal is null then raise exception 'Fixture requires an active admin and posted journal';end if;
 row1:=jsonb_build_object('owner_id',actor,'scan_id',gen_random_uuid(),'group_id',group1,'revision',1,'title','ROLLBACK ONLY receipt test','entry_label',label,'journal_ids',jsonb_build_array(journal),'staff_line_ids','[]'::jsonb,'pages','[{"page":1}]'::jsonb,'pdf_provider','supabase','pdf_path','rollback-fixture.pdf','pdf_sha256',repeat('a',64));
 -- Requires a journal with no existing document fixture.
 if exists(select 1 from public.scanner_documents208 where journal=any(journal_ids)) then raise exception 'Choose a journal without existing receipts for this fixture';end if;
 perform public.scanner_register218(jsonb_build_array(row1),jsonb_build_array(jsonb_build_object('group_id',group1,'mode','new','expected','[]'::jsonb)));
 select id into saved1 from public.scanner_documents208 where group_id=group1;
 row2:=row1||jsonb_build_object('scan_id',gen_random_uuid(),'group_id',group2);
 begin
  perform public.scanner_register218(jsonb_build_array(row2),jsonb_build_array(jsonb_build_object('group_id',group2,'mode','new','expected','[]'::jsonb)));
 exception when others then if sqlerrm like 'Receipts changed%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'FAIL: unconfirmed duplicate was accepted';end if;
 perform public.scanner_register218(jsonb_build_array(row2),jsonb_build_array(jsonb_build_object('group_id',group2,'mode','add','expected',jsonb_build_array(saved1))));
 select id into saved2 from public.scanner_documents208 where group_id=group2;
 if (select count(*) from public.scanner_documents208 where group_id in(group1,group2) and superseded_by218 is null)<>2 then raise exception 'FAIL: Add removed previous receipt';end if;
 row3:=row1||jsonb_build_object('scan_id',gen_random_uuid(),'group_id',group3);
 blocked:=false;
 begin
  perform public.scanner_register218(jsonb_build_array(row3),jsonb_build_array(jsonb_build_object('group_id',group3,'mode','replace','expected',jsonb_build_array(saved1))));
 exception when others then if sqlerrm like 'Receipts changed%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'FAIL: stale replacement choice was accepted';end if;
 perform public.scanner_register218(jsonb_build_array(row3),jsonb_build_array(jsonb_build_object('group_id',group3,'mode','replace','expected',jsonb_build_array(saved1,saved2))));
 if (select count(*) from public.scanner_documents208 where group_id in(group1,group2,group3))<>3 then raise exception 'FAIL: replacement destroyed history';end if;
 if (select count(*) from public.scanner_documents208 where group_id in(group1,group2,group3) and superseded_by218 is null)<>1 then raise exception 'FAIL: old receipts still active';end if;
 perform public.scanner_register218(jsonb_build_array(row3),jsonb_build_array(jsonb_build_object('group_id',group3,'mode','replace','expected',jsonb_build_array(saved1,saved2))));
 blocked:=false;
 begin
  perform public.scanner_register218(jsonb_build_array(row1||'{"revision":2}'::jsonb),jsonb_build_array(jsonb_build_object('group_id',group1,'mode','new','expected','[]'::jsonb)));
 exception when others then if sqlerrm like 'These receipts were replaced%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'FAIL: superseded draft was revived';end if;
end $$;
select 'PASS: new/add/replace, unconfirmed duplicate blocked, stale replacement blocked, history retained, idempotent retry, superseded draft blocked' as tests;
rollback;
