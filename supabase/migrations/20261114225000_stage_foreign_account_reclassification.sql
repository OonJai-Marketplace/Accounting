-- Keep the reviewed historic reconstruction private. An accounting write is a
-- separate operation, performed by the signed-in administrator under book rules.
create table private.fx_reclass_chart_2026 (
    code text primary key,
    local_code text not null,
    original_code text,
    parent_code text not null,
    account_name text not null,
    account_type text not null,
    currency_code text not null,
    defer_support boolean not null
);

create table private.fx_reclass_journals_2026 (
    entry_no text primary key,
    entry_id uuid unique not null,
    period_month date not null,
    classification text not null,
    original_header jsonb not null,
    original_lines jsonb not null,
    original_evidence jsonb,
    proposed_lines jsonb not null,
    check (jsonb_typeof(original_lines) = 'array' and jsonb_array_length(original_lines) >= 2),
    check (jsonb_typeof(proposed_lines) = 'array' and jsonb_array_length(proposed_lines) >= 2)
);

revoke all on private.fx_reclass_chart_2026, private.fx_reclass_journals_2026
    from public, anon, authenticated, service_role;
alter table private.fx_reclass_chart_2026 enable row level security;
alter table private.fx_reclass_journals_2026 enable row level security;
