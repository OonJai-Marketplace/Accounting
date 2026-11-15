-- The existing validator already checks account eligibility, positive recorded
-- rates, balance in each currency and the LAK value of every line.
do $migration$
declare
    fn text:=pg_get_functiondef('private.validate_plan_lines280(jsonb,text)'::regprocedure);
    original text:=$old$ IF asset_a.currency_code='LAK' THEN$old$;
    revised text:=$new$ IF asset_a.currency_code<>'LAK' AND NOT expense_a.is_technical THEN
  IF jsonb_array_length(p_lines)<>2 OR expense_a.account_type IS DISTINCT FROM 'EXPENSE'
    OR asset_a.is_technical OR (asset->>'book_rate_lak')::numeric IS DISTINCT FROM (expense->>'book_rate_lak')::numeric
    THEN RAISE EXCEPTION 'Use one regular expense and prepaid asset at the same historical rate'; END IF;
 ELSIF asset_a.currency_code='LAK' THEN$new$;
begin
    if position(original in fn)=0 then raise exception 'Unrecognized prepaid validation function'; end if;
    execute replace(fn,original,revised);
end $migration$;

-- Update only the representation of these seven pending installments. The
-- posted November releases supply their reviewed accounts and original lots.
-- Check each old carrying value and the independent cumulative allocation.
do $schedules$
declare
    spec record; plan private.journal_plans280; item private.journal_plan_occurrences280;
    release public.journal_entries; expense public.journal_lines; prepaid public.journal_lines;
    revised_definition jsonb; layout jsonb; expected record; original_cents numeric;
    amount numeric; rate numeric; line_memo text; prepaid_memo text; general_memo text;
    installment numeric; occurrence_hash text; count_pending integer;
begin
    for spec in select * from (values
      ('20437701-82ad-40fc-ad26-11fdc16dfc15'::uuid,'Company house rent','OJM260332','AMO26-000004','5424','1314','USD',500::numeric,3,4,'5bd80cc557db4cddd17113027cd49cde','de714dc83accfad143f08383395f49a7'),
      ('4744b616-b07d-47a2-a550-58b256cbafa1'::uuid,'Restaurant rent','OJM260143','AMO26-000006','5123','1312','THB',20000::numeric,4,5,'6690cfd7651f5e37fd4ff3edfbb506e6','3b517576d6244a5a3687c308bd6ad4b2')
    ) as s(id,title,lot,journal,expense_code,prepaid_code,ccy,quantity,pending,version,definition_hash,occurrence_hash)
    loop
        select * into plan from private.journal_plans280 where id=spec.id for update;
        if not found then continue; end if;
        perform 1 from private.journal_plan_occurrences280 where plan_id=plan.id order by occurrence_no for update;
        select md5(jsonb_agg(jsonb_build_array(occurrence_no,due_date,coverage_month,status,journal_entry_id,lines) order by occurrence_no)::text)
          into occurrence_hash from private.journal_plan_occurrences280 where plan_id=plan.id;
        if plan.version<>spec.version or plan.status<>'active' or plan.auto_post or md5(plan.definition::text)<>spec.definition_hash
          or occurrence_hash is distinct from spec.occurrence_hash then raise exception 'Rent schedule has changed: %',plan.id; end if;
        select e.* into strict release from public.journal_entries e join private.journal_plan_occurrences280 o
          on o.journal_entry_id=e.id where o.plan_id=plan.id and o.occurrence_no=1 and o.status='posted'
          and e.status='posted' and e.entry_no=spec.journal for share of e;
        select l.* into strict expense from public.journal_lines l join public.accounts a on a.id=l.account_id
          where l.journal_entry_id=release.id and a.code=spec.expense_code and l.currency_code=spec.ccy and l.debit=spec.quantity;
        select l.* into strict prepaid from public.journal_lines l join public.accounts a on a.id=l.account_id
          where l.journal_entry_id=release.id and a.code=spec.prepaid_code and l.currency_code=spec.ccy and l.credit=spec.quantity;
        rate:=prepaid.book_rate_lak;
        if rate is null or rate<>expense.book_rate_lak or prepaid.base_credit<>expense.base_debit then raise exception 'Posted rent evidence differs'; end if;
        line_memo:=spec.title||' expense';
        prepaid_memo:='Monthly release of prepaid '||lower(spec.title);
        general_memo:='Monthly '||lower(spec.title)||' amortization from prepayment '||spec.lot||'.';
        amount:=case when plan.definition->>'amount_basis'='total' then spec.quantity*(spec.pending+1) else spec.quantity end;
        if spec.ccy='THB' then rate:=(plan.definition->'lines'->0->>'book_rate_lak')::numeric; end if;
        layout:=jsonb_build_array(
          jsonb_build_object('account_id',expense.account_id,'currency_code',spec.ccy,'description',line_memo,'debit',amount,'credit',0,'fx_rate_lak',rate,'book_rate_lak',rate),
          jsonb_build_object('account_id',prepaid.account_id,'currency_code',spec.ccy,'description',prepaid_memo,'debit',0,'credit',amount,'fx_rate_lak',rate,'book_rate_lak',rate));
        revised_definition:=plan.definition||jsonb_build_object('lines',layout,'title',spec.title,'memo',general_memo);
        perform private.validate_plan_lines280(layout,'amortization');
        count_pending:=0;
        for expected in select * from private.expected_amortization281(revised_definition) order by occurrence_no loop
            select * into strict item from private.journal_plan_occurrences280 where plan_id=plan.id and occurrence_no=expected.occurrence_no;
            installment:=(expected.lines->0->>4)::numeric;
            select sum(round((l->>'credit')::numeric*(l->>'book_rate_lak')::numeric,2)) into original_cents
              from jsonb_array_elements(item.lines) l where l->>'currency_code'=case when spec.ccy='USD' then 'LAK' else 'THB' end;
            if item.due_date<>expected.due_date or installment is distinct from original_cents
              or (expected.lines->0->>2)::numeric<>spec.quantity or (expected.lines->1->>3)::numeric<>spec.quantity then
                raise exception 'Rent quantity, carrying value or date changed for % occurrence %',plan.id,item.occurrence_no;
            end if;
            if item.journal_entry_id is not null then
                if installment<>prepaid.base_credit then raise exception 'November carrying value changed'; end if;
                continue;
            end if;
            if item.status<>'pending' then raise exception 'Unexpected rent installment state'; end if;
            rate:=(revised_definition->'lines'->0->>'book_rate_lak')::numeric;
            if round(spec.quantity*rate,2)<>installment then rate:=round(installment/spec.quantity,10); end if;
            if round(spec.quantity*rate,2)<>installment then raise exception 'Rent carrying precision lost'; end if;
            layout:=jsonb_build_array((revised_definition->'lines'->0)||jsonb_build_object('debit',spec.quantity,'fx_rate_lak',rate,'book_rate_lak',rate),
                        (revised_definition->'lines'->1)||jsonb_build_object('credit',spec.quantity,'fx_rate_lak',rate,'book_rate_lak',rate));
            perform private.validate_plan_lines280(layout,'amortization');
            update private.journal_plan_occurrences280 set lines=layout where plan_id=plan.id and occurrence_no=item.occurrence_no;
            count_pending:=count_pending+1;
        end loop;
        if count_pending<>spec.pending then raise exception 'Rent occurrence count changed'; end if;
        update private.journal_plans280 set title=spec.title,memo=general_memo,definition=revised_definition,version=version+1,updated_at=now() where id=plan.id;
    end loop;
end $schedules$;
