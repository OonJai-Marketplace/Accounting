# v143.28 — Restore vertical journal actions

Restore the original Active Journal action arrangement: Edit above Void, including the sub-user journal. These buttons alone use 24px height with a 3px gap so the stack fits within the compact entry rows. Other small action buttons retain 32px height. This supersedes the horizontal arrangement introduced in v143.27.

Post Transaction table editing fields and picker wrappers use transparent backgrounds with no inner textbox borders. The table keeps its cell boundaries and existing input, account-selection and calculation behavior. This also applies when the shared editor is opened for a sub-user.

The compact table spacing, 20px currency badges, aligned input heights and fullscreen behavior remain intact. Phone, print and accounting logic are unchanged. No database migration is needed.
