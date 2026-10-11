# v143.44 — Banner above scrolling navigation

The desktop and tablet banner now appears before the main navigation. It scrolls away naturally. Main tabs and secondary tabs remain adjacent and stick at the top of the scrolling workspace after the banner leaves view. Sections without secondary tabs do not reserve an empty row.

The shared layout covers Bookkeeping, Accounts, Payroll, Human Resources, Reports, Settings, Sub-Users and Dashboard. Personal workspace tabs keep their existing actions and selected state. Full-screen workspace mode and browser Fullscreen API mode hide banners; exiting restores them. The phone foundation, records, calculations, permissions and sync behavior are unchanged.

Validation uses isolated fixtures: real page scrolling across workspace families, tablet portrait/landscape, personal and Upcoming tab actions, full-screen entry/exit, release asset/version checks, and the prior workspace regression checks. No financial records are changed by validation.
