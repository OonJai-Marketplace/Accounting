-- PERMANENT REMOVAL. Run Preview, then Export and SAVE the matching JSON backup.
-- EDIT ONLY the same two dates and change NOT_CONFIRMED to I_SAVED_THE_BACKUP.
-- If records changed or protected links exist, this rolls back without deletion.
-- Keeps accounting identifiers, numbering sequences, users, settings and audit history.
BEGIN;
SELECT private.remove_backed_up_records14322('journals',DATE '2026-01-01',DATE '2026-12-31','NOT_CONFIRMED') AS removal_result;
COMMIT;
