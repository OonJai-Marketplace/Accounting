-- Review annotations stay separate from signed and closed journal records.
create table public.journal_fx_evidence288 (
 entry_id uuid primary key references public.journal_entries(id) on delete cascade,
 entry_updated_at timestamptz not null,
 display_memo text not null check (length(trim(display_memo))>0),
 line_kinds jsonb not null default '{}' check (jsonb_typeof(line_kinds)='object'),
 proposed_revision jsonb,
 revision uuid not null default gen_random_uuid()
);
alter table public.journal_fx_evidence288 enable row level security;
revoke all on public.journal_fx_evidence288 from public, anon, authenticated;
grant select on public.journal_fx_evidence288 to authenticated;
create policy read_visible_entry_fx_evidence on public.journal_fx_evidence288 for select to authenticated
using (exists (select 1 from public.journal_entries e where e.id=entry_id));

CREATE OR REPLACE FUNCTION public.journal_window14333(p_from date, p_to date, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE result jsonb; opening jsonb:='[]'; revision text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_from>p_to OR p_offset<0 THEN RAISE EXCEPTION 'Invalid journal period'; END IF;
 SELECT coalesce(jsonb_agg(row_to_json(r)),'[]') INTO result FROM (
 SELECT e.created_at,e.source,e.id AS "dbEntryId",coalesce(e.entry_no,e.id::text) AS id,
 e.transaction_date AS "postingDate",coalesce(l.line_date,e.transaction_date) AS date,a.name AS account,a.id AS "accountId",a.code AS "accountCode",
 l.currency_code AS currency,coalesce(nullif(l.description,''),e.memo,'') AS memo,e.memo AS "generalMemo", n.display_memo AS "fxEvidenceMemo288",
 (n.proposed_revision is not null and (select public.has_user_permission('post')) and exists(select 1 from public.accounting_periods p where p.period_month=date_trunc('month',e.transaction_date)::date and p.status='open')) AS "fxCorrection288", n.line_kinds ->> l.line_no::text AS "fxRateKind288",
 (e.reference LIKE 'ANNUAL-OPENING-%' OR e.memo='Opening Balances') AS "annualOpening",l.debit,l.credit,l.fx_rate_lak,l.book_rate_lak,l.base_debit,l.base_credit,false AS archived
 FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id
 LEFT JOIN public.journal_fx_evidence288 n ON n.entry_id=e.id AND n.entry_updated_at=e.updated_at
 LEFT JOIN public.accounts a ON a.id=l.account_id
 WHERE e.status='posted' AND coalesce(l.line_date,e.transaction_date) BETWEEN p_from AND p_to
 ORDER BY e.transaction_date DESC,e.id,l.line_no LIMIT 500 OFFSET p_offset
 ) r;
 IF p_offset=0 THEN
 SELECT coalesce(jsonb_agg(row_to_json(b)),'[]') INTO opening FROM (
 SELECT l.account_id AS "accountId",l.currency_code AS currency,sum(l.debit-l.credit) AS balance,CASE WHEN bool_or(l.base_debit IS NULL OR l.base_credit IS NULL) THEN NULL ELSE sum(l.base_debit-l.base_credit) END AS base_balance
 FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id
 WHERE e.status='posted' AND coalesce(l.line_date,e.transaction_date)>=date_trunc('year',p_from)::date AND coalesce(l.line_date,e.transaction_date)<p_from
 GROUP BY l.account_id,l.currency_code HAVING sum(l.debit-l.credit)<>0 OR sum(l.base_debit-l.base_credit)<>0 OR bool_or(l.base_debit IS NULL OR l.base_credit IS NULL)
 ) b;
 END IF;
 SELECT md5(coalesce(sum(hashtextextended(concat_ws('|',e.id,e.entry_no,e.transaction_date,e.memo,e.status,e.updated_at,l.id,l.account_id,l.currency_code,l.debit,l.credit,l.line_date,l.description,l.fx_rate_lak,l.book_rate_lak),0)::numeric)::text,'0')) INTO revision
 FROM public.journal_entries e JOIN public.journal_lines l ON l.journal_entry_id=e.id WHERE e.status='posted' AND coalesce(l.line_date,e.transaction_date)<=p_to;
 RETURN jsonb_build_object('rows',result,'opening',opening,'revision','fx-evidence288:'||revision||':'||coalesce((SELECT md5(string_agg(n.revision::text,',' ORDER BY n.entry_id)) FROM public.journal_fx_evidence288 n JOIN public.journal_entries e ON e.id=n.entry_id WHERE e.transaction_date<=p_to AND e.updated_at=n.entry_updated_at),''));
END $function$
;

-- An operator may prepare supporting evidence; only a signed-in journal poster
-- can apply a financial correction to an open period through the normal RPC.
create function public.apply_journal_fx_evidence288(p_entry_id uuid)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare
 e public.journal_entries;
 review public.journal_fx_evidence288;
 saved jsonb;
 payload jsonb;
begin
 if auth.uid() is null or not public.has_user_permission('post') then
  raise exception 'Sign in with journal posting permission.' using errcode='42501';
 end if;
 select * into strict e from public.journal_entries where id=p_entry_id for update;
 select * into strict review from public.journal_fx_evidence288 where entry_id=e.id;
 if review.proposed_revision is null then raise exception 'No reviewed financial correction is available.'; end if;
 if e.updated_at<>review.entry_updated_at then
  if e.memo=review.proposed_revision->>'memo' then return; end if;
  raise exception 'The journal changed after the review. Refresh before posting.';
 end if;
 perform 1 from public.journal_lines where journal_entry_id=e.id order by line_no for update;
 select jsonb_agg(to_jsonb(l) order by l.line_no) into saved from public.journal_lines l where l.journal_entry_id=e.id;
 if saved is distinct from review.proposed_revision->'original_lines' then
  raise exception 'The journal lines changed after the review.';
 end if;
 -- The existing revision operation rebuilds line rows. Preserve any linked
 -- receipt or sub-account by rejecting entries that need a line-preserving edit.
 if exists(select 1 from public.journal_lines l where l.journal_entry_id=e.id and
  (l.sub_account_id is not null or exists(select 1 from public.journal_sources14253 j where j.journal_line_id=l.id))) then
  raise exception 'This entry has linked detail. Use the journal correction workflow.';
 end if;
 select jsonb_agg(to_jsonb(l)||coalesce(review.proposed_revision->'patches'->l.line_no::text,'{}'::jsonb) order by l.line_no)
 into payload from public.journal_lines l where l.journal_entry_id=e.id;
 perform public.revise_open_journal_entry(e.id,review.proposed_revision->>'reason',e.transaction_date,review.proposed_revision->>'memo',payload);
end $$;
revoke all on function public.apply_journal_fx_evidence288(uuid) from public, anon;
grant execute on function public.apply_journal_fx_evidence288(uuid) to authenticated;
