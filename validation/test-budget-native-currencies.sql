-- Synthetic data only. Execute after the native-currency migration.
do $test$
declare d jsonb := '{"lines":[{"key117":"salary","currency":"USD","amount":400}],
 "fundingByItem":{"item:salary":{"status":"unconfirmed"}},
 "movements":[{"type290":"receipt","currency":"USD","inflow":500},
 {"type290":"spend","currency":"USD","outflow":400,"cashDistributed":388},
 {"type290":"spend","currency":"LAK","outflow":200000,"ownerCurrency":"USD","ownerAmount":10,"budgetKey117":"salary","cashDistributed":0,"cashUnconfirmed":true},
 {"type290":"receipt","currency":"LAK","inflow":100,"account":"Restaurant funds","description290":"Restaurant covered the shortage"},
 {"type290":"refund","currency":"USD","outflow":5}],
 "conversions":[{"currency":"USD","target":"LAK","amount":100,"rate":22000,"targetAmount290":2200001},
 {"currency":"LAK","target":"USD","amount":50000,"targetAmount290":2.34}]}';
 u record; k record;
begin
 select * into u from public.budget_native_currency_totals(d) where currency='USD';
 select * into k from public.budget_native_currency_totals(d) where currency='LAK';
 assert u.approved is null, 'Unconfirmed approval must remain explicit';
 assert u.used=400 and k.used=200000, 'Keep expenses native despite request/owner equivalents';
 assert u.remaining=2.34, 'Deduct USD exchanged out, include reverse proceeds, exclude handover';
 assert k.remaining=1950101, 'Use exact LAK exchange proceeds and coverage';
 assert u.cash_remaining=14.34, 'Gross cost and actual cash payment remain distinct';
 assert k.cash_remaining is null and k.payment_pending, 'Unconfirmed payment is never verified zero';
 assert k.receipt=0 and k.coverage=100, 'Preserve legacy restaurant coverage classification';
end;
$test$;
