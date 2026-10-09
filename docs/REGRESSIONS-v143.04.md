# v143.04 — workspace regression and requested corrections

## Reproduced and fixed

- Opening the administrator's own account returned to Home: the directory excluded the administrator while routing allowed it. Include the signed-in account in the directory; existing permission checks and staff restrictions remain enforced.
- Idle page updates: unconditional title/date writes retriggered the body observer. Only write changed values.
- Period/Audit header growth: report decoration recreated the print button removed by the new header layout; heading decoration wrapped the heading again. Those pages now have one print-control owner.
- Logo/status conflict: the logo renderer removed the status span and the status decorator recreated it. Use a distinct status element.

In the fixture reproduction, Period Closing had 190 child-list mutation records in 800 ms, Audit Logs 210, and Home 28. After correction the same idle checks had zero. Own-account selection now remains active across repeated Home/open navigation. These are local Chromium measurements, not live-network benchmarks.

## Requested presentation and draft behavior

- Opening Handwritten Draft prompts for quantity; cancel records nothing. Each draft page has a distinct proposed number. Permanent IDs still require Save or Record & Continue before output.
- Both voucher types use left-aligned headers and upper details, no supporting-proof row, 22 mm signing space, and Paid by / Received by–Payee / Witness (if applicable) labels.
- Remove the mode badge beside the filename; move Save Voucher to the formatting toolbar's far right.
- Status button uses the neighboring buttons' dark-green background and shape; the icon retains status colors.
- Period Closing uses the same merged general-description cell as Active Journal, spanning Account through Credit. Group the date picker beside Close Year & Carry Forward.

## Validation

Five regression checks, ten voucher/layout checks, eighteen staff/workflow checks, and the offline suite passed. No uncaught browser errors. Generated ten-voucher PDF has ten A5 pages. Inspected Period Closing and voucher PDF screenshots. Source and deployed bundle segments are synchronized. Cache version advanced to 143.04. No SQL or financial-data changes.
