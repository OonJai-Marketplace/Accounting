# Calendar and local news — v143.09

The user requested a daily information watch for Lao holiday/date changes and restaurant opportunities, including food fairs, vegetarian/vegan events, traditional festivals and major local gatherings. ALL titles, summaries, location descriptions, uncertainty notes and suggestions must be in English. Translate Lao announcements faithfully and retain their original source URL and language. Label uncertain translations, dates and conflicting reports. Never invent an event or infer a Lao event from a Thai festival.

## Public feed contract

The public GitHub Pages site reads `data/calendar-news.json` on calendar load, returning to the tab after a day, going online, or Refresh News. The notification bell and Calendar's Local News & Events banner show dated, unreviewed proposals. Browser refresh retrieves published news; it does not scrape publications. A separately scheduled ChatGPT task performs publication research and updates only this feed. It runs daily in Asia/Vientiane. Do not claim a run succeeded until its publication is verified.

Top-level fields: `schema: 1`, `language: "en"`, `checkedAt: "YYYY-MM-DD"`, `items: []` (maximum 500). Update checkedAt only after actually checking current sources. Keep prior items/revisions unless facts materially change. Limit rolling history to the previous/current/next calendar year.

Each item:
- `id`: stable lowercase letters/digits/hyphens, 3–120 characters. Use `la-YEAR-event-region` for dated events. For changes to an existing fixed holiday, use the exact model event ID. Reuse IDs for changed dates/cancellations of that occurrence; a new annual occurrence needs a new year ID.
- `revision`: ISO timestamp, changed only for substantive date, status, location, source/confidence or English-summary corrections. New revisions require new approval, including previously dismissed items.
- `title`, `summary`, `location`: concise English facts; not article reproductions.
- `start`, `end`: ISO civil dates in Laos, both null if unknown. Never copy a prior-year lunar date. Confirm the year in the actual announcement; website navigation/category labels are not evidence.
- `category`: holiday, festival, food, vegetarian, vegan or community.
- `confidence`: confirmed, tentative, conflicting, awaiting-date. Confirmed needs verified dates. For conflicting dates keep the best-supported candidate and describe all alternatives in uncertainty, with both sources. Do not conceal uncertainty.
- `eventStatus`: optional scheduled or cancelled. Cancellation is a proposal for the same ID and new revision, never deletion or automatic calendar mutation.
- `sources`: one or more `{name, url, language}` entries, HTTPS original publications, language en/lo/other. Prefer Tourism Laos/Ministry, provincial tourism/organizer notices, KPL, Vientiane Times and LNCCI. JICA's Lao-designated holiday rows may corroborate national dates; its Japanese holidays are not Lao holidays. Verify organizer identity before using social posts. Do not treat scraped/AI-generated travel estimates as confirmed.
- `uncertainty`: English date/translation ambiguity, or empty.
- `restaurantIdea`: optional English planning suggestion, explicitly displayed separately from sourced facts. Suggest lead time/menu/staffing/partnership checks, never claim demand is guaranteed.

Coverage includes national holidays; provincial boat races; Ork/Khao Phansa; That Luang; Lai Heua Fai; Padabdin/Salak; Vat Phou; Sikhottabong; Phabath; Elephant; Rocket; Visakhaboucha/Makhaboucha; harvest/Phavet; That Inghang; Hmong New Year; food fairs; vegan/vegetarian gatherings and other major local occasions relevant to restaurant promotion. Follow year-specific and district-specific dates. This is a source-backed watch, not a claim to cover every village ceremony. Undated entries stay in 'Watching for confirmed dates' and cannot be added until dates are known.

## Approval and payroll

No fetched proposal is automatically inserted into Calendar or Attendance. An active administrator verifies an item, chooses dates, company attendance effect (default unchanged), and reminder lead time (default 14 days), then explicitly selects Approve & Add. Approval and decision are one version-checked save to the existing HR calendar settings JSON. Changed proposals display the existing calendar date for comparison; approved revisions update the same ID, avoiding duplicate events. Dismiss has no scheduling effect. Stale edits fail without overwriting a concurrent save. Data remains in the company's existing settings/backup/snapshot flow, not the public feed. No new database tables or SQL are required beyond the existing HR Calendar setup.

Future attendance cells are gray before their Lao date and excluded from attendance day counts/late minutes; saved attendance inputs and payroll deduction calculations remain intact. Finalized payroll uses its existing snapshots. Calendar refinements are scoped to HR; navigation, profile cards and the frozen phone design stay unchanged.

## Verification

42 browser checks passed across desktop and tablet sizes, covering the HR workflows, aligned attendance dates, future-date rollover, finalized history, English news, explicit approval, duplicate avoidance and stale-edit rejection. Calendar model checks and 14 offline/sync checks passed. Screenshots were reviewed for Attendance, Calendar and the English news dialog.
