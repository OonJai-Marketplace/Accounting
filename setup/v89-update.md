# Version 89 — ID settings and journal badges

Settings → Accounting contains shared number digits, amount decimals, source-prefix examples, and a growing list of sub-users. Each user row saves to the same user_permissions record used by the user access editor. User digits now follow the accounting setting. Similar identifiers prompt a warning; duplicate identifiers are rejected.

Run setup/89-prefix-registry.sql in the existing Supabase project to activate the new prefix columns, shared digits, prefix reservations, and shorter configurable fund-adjustment request IDs. The script preserves existing journal IDs and amounts. Conflicting existing user prefix/initial assignments stop the transaction rather than silently rename anyone. A historical reservation remains owned by its original source/user after a prefix changes.

Adjusted badges match the Edit/Void button height and font. Auto badges use that same sizing and open Upcoming Transactions, scrolling to and highlighting the linked source rather than opening a duplicate detail popup. The link uses explicit schedule metadata, never guesses from a prefix. Missing source records show an explanation.

Scope: the automated/schedule prefixes and badge navigation are prepared. The time-driven posting engine, prepared-journal editor, strict automated-entry verification before archive, and broader transaction-date restrictions discussed earlier remain pending. This update does not start automatic posting or claim that recurring payment reminders post journals.

Validation: isolated SQL tests cover reruns, digit propagation, duplicate rejection, retained old prefixes, and adjustment-number overflow; browser checks cover registry ordering, badge height/font parity, and linked-source navigation. No live database records were modified during testing.
