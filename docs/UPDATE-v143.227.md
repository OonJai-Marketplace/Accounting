# 143.227

Journal refreshes could leave Edit and Void in the Entry ID cell: the menu decorator reused the previous actions when it encountered the entry heading, then skipped the new action host. It now processes fresh action hosts before reusing an existing menu. Edit and Void stay in the established double-click menu and use the current record after redraws.

Saved line memos and references now remain in their own cells, even when their text matches another line or the entry heading. The previous display-only suppression is removed; the heading contains only its general description, without the General description prefix. No journal records or financial values are rewritten.

The small receipt link remains immediately beside documented entry IDs, with no icon for entries without supporting documents. The receipt viewer, scheduled approval workflow and phone UI are unchanged.

Validation: the new browser regression failed on the prior implementation, reproducing the misplaced action hosts after a redraw. It passes on desktop and tablet with the correction, checking repeated memo text, clickable reference links, current Edit/Void handlers, repeated decoration, receipt presence and unchanged input records. Existing personal-journal, receipt-viewer, icon and History/ledger checks also pass. Generated modules, phase-zero integrity and release/cache checks pass.
