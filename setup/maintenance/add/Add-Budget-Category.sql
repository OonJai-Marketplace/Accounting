-- Adds a future Budget Request suggestion. No Chart of Accounts link.
BEGIN;
DO $$ DECLARE
-- EDIT VALUES START
 category_name text:='EDIT_CATEGORY_NAME';
-- EDIT VALUES END
 s public.budget_settings14313;categories jsonb;
BEGIN
 category_name:=btrim(category_name);
 IF category_name LIKE 'EDIT_%' OR length(category_name) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Enter the category name first';END IF;
 INSERT INTO public.budget_settings14313(id) VALUES(true) ON CONFLICT DO NOTHING;
 SELECT * INTO s FROM public.budget_settings14313 WHERE id FOR UPDATE;
 categories:=coalesce(s.data->'categories','[]');
 IF jsonb_typeof(categories)<>'array' THEN RAISE EXCEPTION 'Existing categories need review';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(categories) c WHERE lower(c)=lower(category_name)) THEN RAISE EXCEPTION 'Category already exists';END IF;
 UPDATE public.budget_settings14313 SET data=jsonb_set(s.data,'{categories}',categories||jsonb_build_array(category_name)),version=version+1,updated_at=now() WHERE id;
END $$;
COMMIT;
SELECT data->'categories' AS budget_categories FROM public.budget_settings14313 WHERE id;
