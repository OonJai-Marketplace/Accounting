-- Updates company contact details only. Use Settings → Handover for account ownership.
-- EDIT all marked values. Leave a value as empty quotes ('') if that detail is blank.
-- A literal apostrophe inside text must be doubled, e.g. 'Owner''s Office'.
BEGIN;
DO $$ DECLARE
-- EDIT VALUES START
 company_email text:='EDIT_EMAIL';
 company_phone text:='EDIT_PHONE';
 company_website text:='EDIT_WEBSITE';
 company_address text:='EDIT_ADDRESS';
-- EDIT VALUES END
BEGIN
 IF company_email LIKE 'EDIT_%' OR company_phone LIKE 'EDIT_%' OR company_website LIKE 'EDIT_%' OR company_address LIKE 'EDIT_%' THEN RAISE EXCEPTION 'Replace all EDIT values first';END IF;
 IF company_email<>'' AND company_email!~ '^[^[:space:]@,;]+@[^[:space:]@,;]+\.[^[:space:]@,;]+$' THEN RAISE EXCEPTION 'Enter a valid company email';END IF;
 UPDATE public.business_settings SET email=company_email,phone=company_phone,website=company_website,address_line=company_address,updated_at=now() WHERE id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Complete the fresh installation first';END IF;
 INSERT INTO public.audit_log(table_name,record_id,action,new_data,reason)
 VALUES('business_settings','true','MAINTENANCE_EDIT',jsonb_build_object('email',company_email,'phone',company_phone,'website',company_website,'address',company_address),'Company contacts updated by SQL Editor owner');
END $$;
COMMIT;
SELECT email,phone,website,address_line FROM public.business_settings WHERE id;
