-- Voucher access depends only on the signed-in account. Evaluate it once per
-- statement when journal and report pages join vouchers to their entries.
do $$
begin
  if (select pg_get_expr(polqual, polrelid)
      from pg_catalog.pg_policy
      where polrelid = 'public.vouchers14299'::regclass and polname = 'vouchers_read14299')
    is distinct from 'voucher_admin14299()' then
    raise exception 'Voucher read policy changed. Review its current predicate before applying.';
  end if;
end $$;

alter policy vouchers_read14299 on public.vouchers14299
  using ((select public.voucher_admin14299()));
