# News & Events via Google Sheets — v143.189

The configured AI Journal/AI HR workbook now owns News Drafts, News Calendar History and News Guide. The app no longer fetches data/calendar-news.json. The historical JSON is retained for provenance only. All 42 old topics were copied into News Drafts with unchanged IDs, revisions and checked dates, alongside two accounting proposals reviewed on 28 October.

Accounting Updates are red, first in notifications, and remain actionable even after an effective date passes. Community & Marketing is a separate group/filter. The bell groups news by section and opens the corresponding filter. Undated proposals can notify but require date verification before calendar approval.

The authenticated Google bridge allows only administrators to read the configured workbook. It accepts no draft/history writes from clients. News Calendar History is derived from the caller-authorized database calendar settings, deduplicated by ID and revision. New approvals retain earlier snapshots; retries regenerate the Sheet history without reposting calendar events. Sheet/history failures remain visible and retry on Refresh News. No payroll, tax, journal or attendance data is changed by reading news. Accounting approvals always have no attendance effect.

ChatGPT research writes only News Drafts through Google Drive. The enabled Monday morning automation uses the workbook guide; GitHub publication is removed. Calendar additions remain explicit user approvals. Existing calendar events and dismissed-topic preferences are preserved.
