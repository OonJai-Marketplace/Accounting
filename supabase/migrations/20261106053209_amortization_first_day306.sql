-- Amortization dates are the first day of their coverage month. Keep the
-- existing approval, allocation, historical cost and prior-close checks.
DO $first_day$
DECLARE source text;
BEGIN
 source:=pg_get_functiondef('private.save_journal_plan280(uuid,jsonb)'::regprocedure);
 IF strpos(source, 'posting NOT IN (''first'',''last'')')=0 THEN
  RAISE EXCEPTION 'Unexpected plan validation; inspect before updating';
 END IF;
 source:=replace(source, 'posting NOT IN (''first'',''last'')', 'posting <> ''first''');
 source:=replace(source, 'Choose a valid amortization basis and posting day',
   'Amortization must use the first day of each month and a valid allocation basis');
 EXECUTE source;
END $first_day$;
