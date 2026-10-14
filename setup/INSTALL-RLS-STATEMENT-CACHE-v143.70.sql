-- Statement-cache only the reviewed, row-independent permission calls.
-- Exact policy preconditions prevent rewriting an unknown access rule.
-- No business records, grants, roles, or correlated row predicates change.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL search_path = pg_catalog, public;
-- Keep the verified policy definitions stable until all replacements commit.
LOCK TABLE public.accounts,public.journal_entries,public.journal_lines IN SHARE ROW EXCLUSIVE MODE;
DO $migration$
DECLARE expected record; actual record; signature text; helper oid;
BEGIN
 FOREACH signature IN ARRAY ARRAY['public.active_account14228()','public.password_change_required14257()',
  'public.accounting_workspace_allowed123()','public.is_admin()','public.has_user_permission(text)','public.can_action113(text,text)'] LOOP
  helper:=to_regprocedure(signature);
  IF helper IS NULL OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=helper AND provolatile='s') THEN
   RAISE EXCEPTION 'Missing or changed stable permission helper: %',signature;
  END IF;
 END LOOP;
 FOR expected IN SELECT * FROM (VALUES
  ('accounts','active_account14228','RESTRICTIVE','{authenticated}','ALL','active_account14228()','active_account14228()'),
  ('accounts','admin_all_accounts','PERMISSIVE','{authenticated}','ALL','is_admin()','is_admin()'),
  ('accounts','current_accounts14228','RESTRICTIVE','{authenticated}','SELECT','(is_admin() OR can_action113(''sec-chart-accounts''::text, ''view''::text) OR can_action113(''journal''::text, ''view''::text) OR (EXISTS ( SELECT 1
   FROM user_permissions u
  WHERE (can_workspace113(u.user_id) AND ((accounts.id = ANY (u.assigned_fund_account_ids)) OR (accounts.id = ANY (u.allowed_account_ids)) OR (accounts.id = ANY (u.destination_account_ids)) OR (accounts.id = u.money_in_counterpart_account_id))))))',NULL),
  ('accounts','password_gate14257','RESTRICTIVE','{authenticated}','ALL','(NOT password_change_required14257())','(NOT password_change_required14257())'),
  ('accounts','reference_accounts_read','PERMISSIVE','{authenticated}','SELECT','true',NULL),
  ('accounts','workspace_accounting123','RESTRICTIVE','{authenticated}','ALL','accounting_workspace_allowed123()','accounting_workspace_allowed123()'),
  ('journal_entries','active_account14228','RESTRICTIVE','{authenticated}','ALL','active_account14228()','active_account14228()'),
  ('journal_entries','admin_all_journal_entries','PERMISSIVE','{authenticated}','ALL','is_admin()','is_admin()'),
  ('journal_entries','current_ledger14228','RESTRICTIVE','{authenticated}','SELECT','(can_action113(''journal''::text, ''view''::text) OR (EXISTS ( SELECT 1
   FROM (staff_journal_lines l
     JOIN staff_journals j ON ((j.id = l.staff_journal_id)))
  WHERE ((l.journal_entry_id = journal_entries.id) AND can_workspace113(j.owner_id)))))',NULL),
  ('journal_entries','journal_entries_permitted_insert','PERMISSIVE','{authenticated}','INSERT',NULL,'(has_user_permission(''post''::text) AND (posted_by = auth.uid()))'),
  ('journal_entries','journal_entries_permitted_select','PERMISSIVE','{authenticated}','SELECT','(has_user_permission(''post''::text) OR has_user_permission(''approve''::text))',NULL),
  ('journal_entries','password_gate14257','RESTRICTIVE','{authenticated}','ALL','(NOT password_change_required14257())','(NOT password_change_required14257())'),
  ('journal_entries','workspace_accounting123','RESTRICTIVE','{authenticated}','ALL','accounting_workspace_allowed123()','accounting_workspace_allowed123()'),
  ('journal_lines','active_account14228','RESTRICTIVE','{authenticated}','ALL','active_account14228()','active_account14228()'),
  ('journal_lines','admin_all_journal_lines','PERMISSIVE','{authenticated}','ALL','is_admin()','is_admin()'),
  ('journal_lines','current_ledger14228','RESTRICTIVE','{authenticated}','SELECT','(EXISTS ( SELECT 1
   FROM journal_entries e
  WHERE (e.id = journal_lines.journal_entry_id)))',NULL),
  ('journal_lines','journal_lines_permitted_insert','PERMISSIVE','{authenticated}','INSERT',NULL,'(has_user_permission(''post''::text) AND (EXISTS ( SELECT 1
   FROM journal_entries e
  WHERE ((e.id = journal_lines.journal_entry_id) AND (e.posted_by = auth.uid())))))'),
  ('journal_lines','journal_lines_permitted_select','PERMISSIVE','{authenticated}','SELECT','(has_user_permission(''post''::text) OR has_user_permission(''approve''::text))',NULL),
  ('journal_lines','password_gate14257','RESTRICTIVE','{authenticated}','ALL','(NOT password_change_required14257())','(NOT password_change_required14257())'),
  ('journal_lines','workspace_accounting123','RESTRICTIVE','{authenticated}','ALL','accounting_workspace_allowed123()','accounting_workspace_allowed123()')
 ) AS reviewed(tab,policy,mode,role_names,command,qual,check_expr) LOOP
  SELECT * INTO actual FROM pg_policies WHERE schemaname='public' AND tablename=expected.tab AND policyname=expected.policy;
  IF NOT FOUND OR actual.permissive IS DISTINCT FROM expected.mode OR actual.roles::text IS DISTINCT FROM expected.role_names
   OR actual.cmd IS DISTINCT FROM expected.command OR actual.qual IS DISTINCT FROM expected.qual OR actual.with_check IS DISTINCT FROM expected.check_expr THEN
   RAISE EXCEPTION 'Policy changed or migration already applied; review %.% before proceeding',expected.tab,expected.policy;
  END IF;
 END LOOP;
END $migration$;
ALTER POLICY "active_account14228" ON public."accounts" USING ((SELECT public.active_account14228())) WITH CHECK ((SELECT public.active_account14228()));
ALTER POLICY "admin_all_accounts" ON public."accounts" USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
ALTER POLICY "current_accounts14228" ON public."accounts" USING (((SELECT public.is_admin()) OR (SELECT public.can_action113('sec-chart-accounts'::text, 'view'::text)) OR (SELECT public.can_action113('journal'::text, 'view'::text)) OR (EXISTS ( SELECT 1
   FROM user_permissions u
  WHERE (can_workspace113(u.user_id) AND ((accounts.id = ANY (u.assigned_fund_account_ids)) OR (accounts.id = ANY (u.allowed_account_ids)) OR (accounts.id = ANY (u.destination_account_ids)) OR (accounts.id = u.money_in_counterpart_account_id)))))));
ALTER POLICY "password_gate14257" ON public."accounts" USING ((NOT (SELECT public.password_change_required14257()))) WITH CHECK ((NOT (SELECT public.password_change_required14257())));
ALTER POLICY "workspace_accounting123" ON public."accounts" USING ((SELECT public.accounting_workspace_allowed123())) WITH CHECK ((SELECT public.accounting_workspace_allowed123()));
ALTER POLICY "active_account14228" ON public."journal_entries" USING ((SELECT public.active_account14228())) WITH CHECK ((SELECT public.active_account14228()));
ALTER POLICY "admin_all_journal_entries" ON public."journal_entries" USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
ALTER POLICY "current_ledger14228" ON public."journal_entries" USING (((SELECT public.can_action113('journal'::text, 'view'::text)) OR (EXISTS ( SELECT 1
   FROM (staff_journal_lines l
     JOIN staff_journals j ON ((j.id = l.staff_journal_id)))
  WHERE ((l.journal_entry_id = journal_entries.id) AND can_workspace113(j.owner_id))))));
ALTER POLICY "journal_entries_permitted_insert" ON public."journal_entries" WITH CHECK (((SELECT public.has_user_permission('post'::text)) AND (posted_by = auth.uid())));
ALTER POLICY "journal_entries_permitted_select" ON public."journal_entries" USING (((SELECT public.has_user_permission('post'::text)) OR (SELECT public.has_user_permission('approve'::text))));
ALTER POLICY "password_gate14257" ON public."journal_entries" USING ((NOT (SELECT public.password_change_required14257()))) WITH CHECK ((NOT (SELECT public.password_change_required14257())));
ALTER POLICY "workspace_accounting123" ON public."journal_entries" USING ((SELECT public.accounting_workspace_allowed123())) WITH CHECK ((SELECT public.accounting_workspace_allowed123()));
ALTER POLICY "active_account14228" ON public."journal_lines" USING ((SELECT public.active_account14228())) WITH CHECK ((SELECT public.active_account14228()));
ALTER POLICY "admin_all_journal_lines" ON public."journal_lines" USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
ALTER POLICY "journal_lines_permitted_insert" ON public."journal_lines" WITH CHECK (((SELECT public.has_user_permission('post'::text)) AND (EXISTS ( SELECT 1
   FROM journal_entries e
  WHERE ((e.id = journal_lines.journal_entry_id) AND (e.posted_by = auth.uid()))))));
ALTER POLICY "journal_lines_permitted_select" ON public."journal_lines" USING (((SELECT public.has_user_permission('post'::text)) OR (SELECT public.has_user_permission('approve'::text))));
ALTER POLICY "password_gate14257" ON public."journal_lines" USING ((NOT (SELECT public.password_change_required14257()))) WITH CHECK ((NOT (SELECT public.password_change_required14257())));
ALTER POLICY "workspace_accounting123" ON public."journal_lines" USING ((SELECT public.accounting_workspace_allowed123())) WITH CHECK ((SELECT public.accounting_workspace_allowed123()));
COMMIT;
