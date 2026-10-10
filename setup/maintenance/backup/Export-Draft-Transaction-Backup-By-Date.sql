-- EDIT ONLY the dates. Use the exact dates from Preview.
-- Export the COMPLETE JSON result and save it outside Supabase before deletion.
-- This also retains a private database copy. It does not delete records.
SELECT private.export_removal_backup14322('draft-transactions',DATE '2026-01-01',DATE '2026-12-31') AS backup_to_save;
