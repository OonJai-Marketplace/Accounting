-- Recognise the general USD operating-expense mapping in the existing read-only
-- checker. Preserve all checks, access restrictions and period guards.
DO $mapping$
DECLARE body text;
BEGIN
 body:=pg_get_functiondef('private.extended_check281(date)'::regprocedure);
 IF position('"9251":["5120","9290"]' in body)>0 THEN RETURN;END IF;
 IF position('"9242":["5414","9290"],' in body)=0 THEN
  RAISE EXCEPTION 'The installed mapping checker changed; review before updating';
 END IF;
 EXECUTE replace(body,'"9242":["5414","9290"],','"9242":["5414","9290"],"9251":["5120","9290"],');
END $mapping$;
