# Entry choices and tablet editing — v143.243

Every sub-user can choose Single Entry (Cashbook) or Double Entry in Entry options.
The administrator's mode setting supplies a default only; the user's choice is
remembered per signed-in account/workspace on that device. Old simplified defaults
start in Double Entry. Existing unfinished drafts are retained. Cashbook entries
use the existing Money In/Out workflow and the same reviewed posting pipeline.
Account assignments, permitted directions, approvals, currencies and IDs are unchanged.

Tablet inputs now use direct native editing instead of desktop cell-selection
interception. Enter commits in place, delayed navigation cannot override a later
tap, touch-scrolling an account list does not dismiss it on blur, and lists track
visual-viewport changes. Keyboard reveal preserves the unobscured height across
field changes and adds temporary scroll range without changing page scale.
Personal Ledger and History panels have outer padding; record tables keep their
own card boundaries.

Validation:
- `test-entry-choice143243.cjs`: emulated landscape iPad, signed-in sub-user,
  both visible options, preserved amounts/memos, repeated account taps, amount
  caret editing, Enter focus, remembered choice and populated ledger/history.
- `test-phone-entry-browser143243.cjs`: both phone choices and balanced round trip.
- `test-phone-entry-choice143243.cjs`: distinct-memo protection and account isolation.
- `test-tablet-keyboard143243.cjs`: simulated keyboard viewport and focus changes.
- `test-cashbook240.cjs`: saved IDs, transfers, isolated edits, references and existing
  cashbook behavior.
- Generated-source, phase-zero structure, release-manifest and cache-integrity checks.

Browser emulation and simulated keyboard geometry do not establish physical
Safari/iPad behavior; a device check remains necessary for the native keyboard.

The separately applied cleanup migration removed exactly nine verified imported
workspace headers and 57 lines after a durable recovery copy was saved. It retained
66 deletion audit records, restored both line protection triggers, and asserted
that every company journal and journal line remained byte-for-byte unchanged.
The account, permissions and entry sequence were retained. Device-only drafts were
not inspected or cleared remotely.
