"""Build the additive Money In installer from the last approved function bodies.

Keep the prior SQL untouched. A failed replacement stops generation so a later
installer edit cannot silently remove a posting or access guard.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
SECURITY = (ROOT / "setup/INSTALL-SECURITY-v142.28.sql").read_text()
WORKFLOW = (ROOT / "setup/INSTALL-WORKFLOW-v142.53.sql").read_text()


def extract(sql: str, name: str) -> str:
    pattern = rf"CREATE OR REPLACE FUNCTION public\.{name}\([^;]*?\bAS (\$function\$|\$\$).*?\1;"
    result = re.search(pattern, sql, re.I | re.S)
    if not result:
        raise ValueError(f"Function {name} is missing or has an unknown delimiter")
    return result.group(0)


def replace(sql: str, old: str, new: str, count: int = 1) -> str:
    found = sql.count(old)
    if found != count:
        raise ValueError(f"Expected {count} copy/copies of {old!r}; found {found}")
    return sql.replace(old, new)


legacy = "entry_kind='collection' AND account_id=fund_account_id"
posting = f"NOT ({legacy})"
functions = []

trigger = extract(SECURITY, "staff_rules14228")
trigger = replace(trigger,
    "IF NEW.direction='in' AND NEW.account_id IS DISTINCT FROM NEW.fund_account_id THEN RAISE EXCEPTION 'Collections must use the assigned fund';END IF;",
    "IF NEW.direction='in' AND NEW.account_id IS DISTINCT FROM NEW.fund_account_id AND NOT coalesce(NEW.account_id=ANY(p.allowed_account_ids) OR NEW.account_id=ANY(p.destination_account_ids),false) THEN RAISE EXCEPTION 'Unassigned Money In category';END IF;")
functions.append(trigger)

save = extract(SECURITY, "save_staff_workspace_entry_v3")
save = replace(save,
    "if p_direction='in' and p_account_id<>p_fund_account_id then raise exception 'Select the assigned main account for collections'; end if;",
    "if p_direction='in' and p_account_id<>p_fund_account_id and not coalesce(p_account_id=any(permission.destination_account_ids) or p_account_id=any(permission.allowed_account_ids),false) then raise exception 'Money In category not assigned'; end if;")
save = replace(save,
    "if p_direction='out' and (select currency_code from public.accounts where id=p_account_id) is distinct from fund_currency then raise exception 'Main and entry accounts must use the same currency'; end if;",
    "if (select currency_code from public.accounts where id=p_account_id) is distinct from fund_currency then raise exception 'Main and entry accounts must use the same currency'; end if;")
functions.append(save)

submit = extract(SECURITY, "submit_staff_journal")
submit = replace(submit,
    "if line_row.entry_kind='collection' and line_row.account_id<>line_row.fund_account_id then raise exception 'Invalid collection account'; end if;",
    "if line_row.entry_kind='collection' and line_row.account_id<>line_row.fund_account_id and not(line_row.account_id=any(permission.destination_account_ids) or line_row.account_id=any(permission.allowed_account_ids)) then raise exception 'Unassigned Money In category'; end if;")
functions.append(submit)

review = extract(SECURITY, "review_collection_report")
review = replace(review, "entry_kind<>'collection' and journal_entry_id is null",
    f"{posting} and journal_entry_id is null")
functions.append(review)

post = extract(SECURITY, "post_workspace_review_v3")
post = replace(post, "entry_kind<>'collection' and journal_entry_id is null",
    f"{posting} and journal_entry_id is null", 2)
post = replace(post, "l.entry_kind<>'collection' and l.journal_entry_id is null",
    f"NOT (l.entry_kind='collection' AND l.account_id=l.fund_account_id) and l.journal_entry_id is null")
post = replace(post,
    "'Reviewed workspace posted atomically; report-only collections excluded'",
    "'Reviewed workspace posted atomically; legacy report-only collections excluded'")
functions.append(post)

summary = extract(WORKFLOW, "post_summary14253")
summary = replace(summary, "l.entry_kind<>'collection' AND l.journal_entry_id IS NULL",
    "NOT (l.entry_kind='collection' AND l.account_id=l.fund_account_id) AND l.journal_entry_id IS NULL", 2)
summary = replace(summary, "entry_kind<>'collection' AND journal_entry_id IS NULL",
    f"{posting} AND journal_entry_id IS NULL")
functions.append(summary)

header = """-- v142.78: Assigned Money In category, preserving earlier report-only collections.
-- Install after INSTALL-SECURITY-v142.28.sql and INSTALL-WORKFLOW-v142.53.sql.
-- An old collection with the same fund and account remains report-only; a new
-- collection with an assigned different account becomes a balanced journal pair.
-- Never rerun the older installers after this without rerunning this migration.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='save_staff_workspace_entry_v3'
   AND position('Select the assigned main account for collections' in pg_get_functiondef(p.oid))>0)
 OR NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='post_summary14253'
   AND position('entry_kind' in pg_get_functiondef(p.oid))>0)
 THEN RAISE EXCEPTION 'Install the matching security and workflow versions first; no change made';END IF;
END $$;
"""
footer = """
-- Verify that the account/fund distinction survived the function replacements.
DO $$ BEGIN
 IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname IN
       ('staff_rules14228','save_staff_workspace_entry_v3','submit_staff_journal',
        'review_collection_report','post_workspace_review_v3','post_summary14253'))<>6
 THEN RAISE EXCEPTION 'Money In functions were not installed as expected';END IF;
END $$;
COMMIT;
"""
(ROOT / "setup/INSTALL-MONEY-IN-v142.78.sql").write_text(header + "\n\n".join(functions) + "\n" + footer)
