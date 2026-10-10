-- Renames a future category suggestion; saved requests/templates retain their original text.
BEGIN;
DO $$ DECLARE
-- EDIT VALUES START
 old_name text:='EDIT_OLD_NAME';
 new_name text:='EDIT_NEW_NAME';
-- EDIT VALUES END
 s public.budget_settings14313;categories jsonb;
BEGIN
 old_name:=btrim(old_name);new_name:=btrim(new_name);
 IF old_name LIKE 'EDIT_%' OR new_name LIKE 'EDIT_%' OR length(new_name) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Replace both names first';END IF;
 SELECT * INTO s FROM public.budget_settings14313 WHERE id FOR UPDATE;
 IF s.id IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(s.data->'categories','[]')) c WHERE c=old_name) THEN RAISE EXCEPTION 'Old category name was not found';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(s.data->'categories') c WHERE lower(c)=lower(new_name) AND c<>old_name) THEN RAISE EXCEPTION 'New category already exists';END IF;
 SELECT jsonb_agg(CASE WHEN c.value=old_name THEN new_name ELSE c.value END ORDER BY c.ordinality) INTO categories FROM jsonb_array_elements_text(s.data->'categories') WITH ORDINALITY c(value,ordinality);
 UPDATE public.budget_settings14313 SET data=jsonb_set(s.data,'{categories}',categories),version=version+1,updated_at=now() WHERE id;
END $$;
COMMIT;
SELECT data->'categories' AS budget_categories FROM public.budget_settings14313 WHERE id;
