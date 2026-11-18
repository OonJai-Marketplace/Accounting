# Event-driven activity - 143.478

The approved full startup preparation and server jobs remain unchanged. This
release removes recurring browser checks from the dashboard/avatar, receipt
viewers, backup access guard, settings summaries, to-do reminders, HR calendar
date rollover and Word of Hope daily inbox check.

Dashboard updates are batched after data changes and deferred while inactive or
hidden. The existing startup screen build remains intact. Account/permission and
vault changes notify protected receipt views and backup state immediately; the
existing security checks at each operation remain in place.

A shared deadline scheduler holds one timer for the earliest actual deadline,
pauses timers while hidden, and catches up on resume. To-dos retain their saved
times, repeat intervals and device-timezone windows. Simultaneous reminders share
one alert, and missed slots consolidate instead of replaying. The calendar uses
midnight in Asia/Vientiane. The inbox uses its existing 06:00 Laos daily slot;
the approved weekly news deadline and server schedules are untouched.

User funds normally subscribe before taking one opening snapshot, avoiding an
unnecessary second read while retaining the event boundary. A single 400 ms
fallback starts the REST read if the live socket is slow. A later subscription
then performs a necessary catch-up. Changes received during a read coalesce into
one follow-up snapshot. Closing cancels pending opening work and the channel.

Validation: deterministic deadline/time-window tests, missed and simultaneous
reminder tests, daily Laos rollover, immediate receipt account/lock/device-mode
cleanup, balance subscription/read race tests, existing working-balance and
negative-alert tests, calendar model tests, generated asset and cache checks.
The managed preview started, but the browser route returned ERR_BLOCKED_BY_CLIENT;
visual browser QA and physical-device speed measurements are unverified.
