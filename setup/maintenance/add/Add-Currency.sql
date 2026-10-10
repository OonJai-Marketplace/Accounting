-- EDIT ONLY the values between EDIT VALUES START/END.
-- Adds a currency without changing the base currency or historical transactions.
BEGIN;
DO $$ DECLARE
-- EDIT VALUES START
 currency_code text:='EDIT_CODE';
 currency_name text:='EDIT_NAME';
 currency_symbol text:='EDIT_SYMBOL';
-- EDIT VALUES END
BEGIN
 IF currency_code LIKE 'EDIT_%' OR currency_name LIKE 'EDIT_%' OR currency_symbol LIKE 'EDIT_%' THEN RAISE EXCEPTION 'Replace the three EDIT values first';END IF;
 currency_code:=upper(btrim(currency_code));
 IF currency_code!~ '^[A-Z]{3,8}$' OR length(btrim(currency_name)) NOT BETWEEN 1 AND 80 OR length(currency_symbol)>12 THEN RAISE EXCEPTION 'Use a 3–8 letter code, a name and a short symbol';END IF;
 INSERT INTO public.currencies(code,name,symbol,is_base,is_active) VALUES(currency_code,btrim(currency_name),currency_symbol,false,true);
END $$;
COMMIT;
SELECT code,name,symbol,is_base,is_active FROM public.currencies ORDER BY code;
