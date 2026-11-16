-- Source rows and individual close-review notes are loaded privately after external verification.
create table private.bcel_pilot_quotes (
  entry_no text not null references private.fx_reclass_journals_2026(entry_no), line_no integer not null,
  txn_date date not null, quote_date date not null, usd numeric not null check (usd>0),
  rate numeric not null check(rate>0), url text not null, sha256 text not null,
  primary key(entry_no,line_no), check(quote_date<=txn_date and txn_date-quote_date<=3),
  check(url='https://www.bcel.com.la/bcel/exchange-rate.html?exDate='||to_char(quote_date,'YYYY-MM-DD')||'&lang=en&round=1'),
  check(sha256 ~ '^[a-f0-9]{64}$')
);
create table private.bcel_pilot_reviews (
  period_month date not null, title text not null, detail text not null, reason text not null,
  primary key(period_month,title,detail)
);
create table private.bcel_pilot_sessions (
  session_id uuid primary key references public.book_sessions136(id), period_month date not null,
  expected jsonb not null, fingerprints jsonb not null, receipt jsonb
);
alter table private.bcel_pilot_quotes enable row level security;
alter table private.bcel_pilot_reviews enable row level security;
alter table private.bcel_pilot_sessions enable row level security;
revoke all on private.bcel_pilot_quotes,private.bcel_pilot_reviews,private.bcel_pilot_sessions from public,anon,authenticated,service_role;

create function private.bcel_pilot_lines_2026(j private.fx_reclass_journals_2026) returns jsonb
language plpgsql stable set search_path=pg_catalog as $$
declare original jsonb; v jsonb; planned jsonb='[]'; is_fee boolean; q private.bcel_pilot_quotes; charge jsonb;
begin
  select exists(select from jsonb_array_elements(j.original_lines) o where o->>'code'='9241') into is_fee;
  for v in select value from jsonb_array_elements(j.proposed_lines) loop
    if is_fee and v->>'code'='5422' then
      for charge in select value from jsonb_array_elements(j.original_lines) where value->>'code'='1041' loop
        select * into strict q from private.bcel_pilot_quotes where entry_no=j.entry_no and line_no=(charge->>'line_no')::int;
        if q.txn_date<>(charge->>'line_date')::date or q.usd<>(charge->>'credit')::numeric
           or q.rate<>(charge->>'fx_rate_lak')::numeric or position(q.url in coalesce(j.original_evidence->>'display_memo',''))=0 then
            raise exception 'Source date, fee or cited valuation changed for %.',j.entry_no; end if;
        planned:=planned||jsonb_build_array(v||jsonb_build_object('id',null,'code','5422',
          'line_date',q.txn_date,'debit',q.usd,'credit',0,'fx_rate_lak',q.rate,'book_rate_lak',q.rate,
          'base_debit',round(q.usd*q.rate,2),'base_credit',0,'evidence_kind','valuation',
          'description',(charge->>'description')||' · USD fee · BCEL EFT buying rate '
           ||to_char(q.rate,'FM999,999,990')||' LAK/USD · published '||q.quote_date||
           case when q.quote_date<>q.txn_date then ' (last published before the charge)' else '' end||
           ' · [BCEL rate]('||q.url||')'));
      end loop;
    else
      select o into original from jsonb_array_elements(j.original_lines) o where o->>'id'=v->>'id';
      if original is not null and private.fx_reclass_values_2026(jsonb_build_array(original),j.period_month)
        is distinct from private.fx_reclass_values_2026(jsonb_build_array(v||jsonb_build_object('code',original->>'code')),j.period_month)
        then raise exception 'A retained source line differs in %.',j.entry_no; end if;
      if original is null and not (is_fee and v->>'code'='9011') then raise exception 'Unexpected new line in %.',j.entry_no; end if;
      planned:=planned||jsonb_build_array(v||jsonb_build_object('evidence_kind',coalesce(j.original_evidence->'line_kinds'->>(original->>'line_no'),
        case when is_fee and v->>'code'='9011' then 'book' end)));
    end if;
  end loop;
  if exists(with m as (
     select a.account_type,z.s*((o->>'base_debit')::numeric-(o->>'base_credit')::numeric) b
     from (values(-1,j.original_lines),(1,planned)) z(s,ls) cross join jsonb_array_elements(z.ls) o
     join public.accounts a on a.code=o->>'code' where not a.is_technical)
     select from m group by account_type having sum(b)<>0)
     or exists(select from jsonb_array_elements(planned) l group by l->>'currency_code'
       having sum((l->>'debit')::numeric-(l->>'credit')::numeric)<>0)
     or (select sum((l->>'base_debit')::numeric-(l->>'base_credit')::numeric) from jsonb_array_elements(planned) l)<>0 then
     raise exception 'Statement, base or native balance differs for %.',j.entry_no; end if;
  return planned;
end $$;

-- Protect both this page and corrections finished from the normal book-session screen.
create function private.verify_bcel_pilot_close_2026() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare b private.bcel_pilot_sessions; j private.fx_reclass_journals_2026; h public.journal_entries;
  lines jsonb; kinds jsonb; fxrow jsonb;
begin
  select * into b from private.bcel_pilot_sessions where session_id=new.id;
  if not found then return new; end if;
  if new.operations is distinct from b.expected->'operations' then raise exception 'Correction operations changed. Cancel and review again.'; end if;
  for j in select * from private.fx_reclass_journals_2026 where b.expected->'journals' ? entry_no loop
    select * into strict h from public.journal_entries where id=j.entry_id;
    lines:=b.expected->'journals'->j.entry_no;
    if (to_jsonb(h)-'updated_at'-'accounting_period_id') is distinct from (j.original_header-'updated_at'-'accounting_period_id') or
       private.fx_reclass_values_2026(private.fx_reclass_live_lines_2026(h.id),h.transaction_date)
          is distinct from private.fx_reclass_values_2026(lines,h.transaction_date) then
       raise exception 'Final source, amount or rate failed verification for %.',j.entry_no; end if;
    if j.original_evidence is not null and (j.original_evidence->>'entry_updated_at')::timestamptz=(j.original_header->>'updated_at')::timestamptz then
      select coalesce(jsonb_object_agg(n::text,v->'evidence_kind'),'{}') into kinds
        from jsonb_array_elements(lines) with ordinality t(v,n) where v->>'evidence_kind' is not null;
      update public.journal_fx_evidence288 f set entry_updated_at=h.updated_at,line_kinds=kinds,revision=gen_random_uuid()
        where f.entry_id=h.id and to_jsonb(f)=j.original_evidence;
      if not found then raise exception 'Existing evidence changed for %.',j.entry_no; end if;
    end if;
  end loop;
  if private.fx_reclass_fingerprints_2026(b.period_month,null) is distinct from b.fingerprints then raise exception 'Verified bank or cash movements changed.'; end if;
  update private.bcel_pilot_sessions set receipt=jsonb_build_object('posted',now(),'journals',
     (select jsonb_agg(k order by k) from jsonb_object_keys(b.expected->'journals') k)) where session_id=b.session_id;
  return new;
end $$;
create trigger bcel_pilot_after_close after update of status on public.book_sessions136 for each row
when (new.status='committed' and old.status is distinct from new.status) execute function private.verify_bcel_pilot_close_2026();

create function public.bcel_pilot_month_2026(p_month date,p_commit boolean default false) returns jsonb
language plpgsql security definer set search_path=pg_catalog set lock_timeout='5s' set statement_timeout='75s' as $$
declare actor uuid:=public.require_admin136(); p public.accounting_periods; sess public.book_sessions136;
  j private.fx_reclass_journals_2026; x jsonb; currentfx jsonb; h public.journal_entries; lines jsonb; parts jsonb;
  expected jsonb='{}'; fp jsonb; b private.bcel_pilot_sessions; chk jsonb; ack jsonb='{}'; why text; unknowns jsonb='[]';
  result jsonb; reason text:='January–April direct foreign accounts and reconstructed USD fees at dated BCEL EFT buying rates';
begin
  if p_month is null or p_month not in (date '2026-01-01','2026-02-01','2026-03-01','2026-04-01') then raise exception 'Outside the approved pilot.'; end if;
  if actor is null or not public.accounting_workspace_allowed123() or public.password_change_required14257() or
    not public.has_user_permission('post') or not public.can_action113('sec-chart-accounts','edit') or not public.can_action113('journal','post') then
    raise exception 'An active chart and journal administrator is required.'; end if;
  perform pg_advisory_xact_lock(hashtext('oonjai-fx-reclass-2026'));
  select * into strict p from public.accounting_periods where period_month=p_month for update;
  select * into b from private.bcel_pilot_sessions where period_month=p_month and receipt is not null;
  if found then return b.receipt; end if;
  if p.status<>'closed' or p.locked_at is not null or exists(select from public.year_closings136 where year=2026) then raise exception 'This book is not closed and unlocked.'; end if;
  select * into sess from public.book_sessions136 where period_id=p.id and status='editing' for update;
  if sess.id is not null then
    select * into b from private.bcel_pilot_sessions where session_id=sess.id;
    if b.session_id is null or sess.owner_id<>actor or sess.operations is distinct from b.expected->'operations' then raise exception 'Another correction uses this book.'; end if;
  else
    fp:=private.fx_reclass_fingerprints_2026(p_month,null);
    if fp is null then raise exception 'Missing reconciliation basis.'; end if;
    select * into strict sess from jsonb_populate_record(null::public.book_sessions136,public.begin_book_session136(p_month,reason));
    for j in select * from private.fx_reclass_journals_2026 where period_month=p_month and classification='direct accounts' and
      exists (select from jsonb_array_elements(original_lines) o where o->>'code' in ('9112','9222','9231','9241')) order by entry_no loop
      select * into strict h from public.journal_entries where id=j.entry_id and status='posted' for update;
      select to_jsonb(f) into currentfx from public.journal_fx_evidence288 f where f.entry_id=h.id for share;
      if to_jsonb(h) is distinct from j.original_header or j.original_lines is distinct from private.fx_reclass_live_lines_2026(h.id)
        or currentfx is distinct from j.original_evidence or (jsonb_typeof(currentfx->'proposed_revision')='object'
        and currentfx->'proposed_revision'->>'applied_entry_updated_at' is null) or exists(select from public.journal_lines l
        where l.journal_entry_id=h.id and (l.sub_account_id is not null or exists(select from public.journal_sources14253 t where t.journal_line_id=l.id)))
        then raise exception 'Journal or evidence requires a fresh comparison for %.',j.entry_no; end if;
      lines:=private.bcel_pilot_lines_2026(j);
      select jsonb_agg((v-'id'-'line_no'-'code'-'base_debit'-'base_credit'-'evidence_kind')||jsonb_build_object('account_id',a.id) order by n)
        into parts from jsonb_array_elements(lines) with ordinality t(v,n) join public.accounts a
        on a.code=v->>'code' and a.currency_code=v->>'currency_code' and a.is_active and a.is_posting;
      if jsonb_array_length(parts) is distinct from jsonb_array_length(lines) then raise exception 'Target account unavailable.'; end if;
      perform public.stage_book_operation136(sess.id,'revise',jsonb_build_object('p_request_key','bcel-pilot-'||h.id,
        'p_entry_id',h.id,'p_reason',reason,'p_transaction_date',h.transaction_date,'p_memo',h.memo,'p_lines',parts));
      expected:=expected||jsonb_build_object(j.entry_no,lines);
    end loop;
    if (select count(*) from jsonb_object_keys(expected))<>(case when p_month=date '2026-03-01' then 4 else 3 end) then raise exception 'Unexpected entry list.'; end if;
    if fp is distinct from private.fx_reclass_fingerprints_2026(p_month,sess.id) then raise exception 'Staged cash or bank movement differs.'; end if;
    select * into strict sess from public.book_sessions136 where id=sess.id;
    insert into private.bcel_pilot_sessions values(sess.id,p_month,jsonb_build_object('operations',sess.operations,'journals',expected),fp,null) returning * into b;
  end if;
  if not coalesce(p_commit,false) then return jsonb_build_object('staged',(select jsonb_agg(k order by k) from jsonb_object_keys(b.expected->'journals') k),'month',p_month); end if;
  chk:=public.maintenance_preflight14324(p_month);
  if chk->'reconciliation305'->>'complete' is distinct from 'true' or exists(select from jsonb_array_elements(chk->'issues') v where v->>'severity'='block') then
    return jsonb_build_object('status','staged','requiresReview',chk->'issues'); end if;
  for x in select value from jsonb_array_elements(chk->'issues') where value->>'severity'='warning' loop
    select r.reason into why from private.bcel_pilot_reviews r where r.period_month=p_month and r.title=x->>'title' and r.detail=x->>'detail';
    why:=coalesce(chk->'decisions319'->(x->>'id')->'saved'->>'reason',why);
    if why is null then unknowns:=unknowns||jsonb_build_array(x); else
      ack:=ack||jsonb_build_object(x->>'id',jsonb_build_object('acknowledged',true,'reason',why)); end if;
  end loop;
  if jsonb_array_length(unknowns)>0 then return jsonb_build_object('status','staged','requiresReview',unknowns); end if;
  result:=public.maintenance_finish14324(p_month,'session',chk->>'fingerprint',
    jsonb_build_object('coverageConfirmed',true,'acknowledgments',ack),'closed',sess.id);
  select receipt into result from private.bcel_pilot_sessions where session_id=sess.id;
  if result is null then raise exception 'The correction was not verified as posted.'; end if;
  return result;
end $$;
revoke all on function private.bcel_pilot_lines_2026(private.fx_reclass_journals_2026),private.verify_bcel_pilot_close_2026(),
 public.bcel_pilot_month_2026(date,boolean) from public,anon,authenticated,service_role;
grant execute on function public.bcel_pilot_month_2026(date,boolean) to authenticated;
notify pgrst,'reload schema';
