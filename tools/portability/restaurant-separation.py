"""Keep the portable Accounting backend independent of Restaurant.

The object list matches the reviewed live separation. This transforms a fresh
installer only; it never connects to or deletes records from a live database.
"""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
TABLES = '''menu_items pos_cash118 pos_stock118 menu_items104 menu_sales108
pos_config118 pos_orders118 pos_shifts118 inventory_items inventory_items104
menu_categories104 inventory_movements menu_ingredients105 menu_item_ingredients
restaurant_members121 inventory_movements104 catalog_installations106
restaurant_presentation121'''.split()
FUNCTIONS = '''pos_recipe118 pos_inventory_guard118 restaurant_stamp_workspace105_121
restaurant_signed_in121 guard_sales108 stamp_inventory_menu104 install_catalog106
recipe_view113 pos_allowed118 pos_snapshot118 pos_order118
restaurant_stamp_inventory_menu104_121 restaurant_guard_sales108_121
restaurant_password_changed121 restaurant_table_can121 restaurant_delete121
restaurant_guard_delete108_121 pos_manage118 guard_separate_members123 restaurant_can121
check_workspace_request123'''.split()
FORBIDDEN = re.compile(r'\b(?:' + '|'.join(TABLES + FUNCTIONS) + r')\b')
TOKENS = re.compile(r'''--[^\n]*|/\*.*?\*/|'(?:''|[^'])*'|"(?:""|[^"])*"|(?P<d>\$(?:[A-Za-z_]\w*)?\$).*?(?P=d)|;''', re.S)

def statements(sql):
    """Split outer statements, retaining quoted function bodies and comments."""
    start = 0
    for match in TOKENS.finditer(sql):
        if match[0] == ';':
            yield sql[start:match.end()]
            start = match.end()
    yield sql[start:]

def separate(sql):
    reviewed = json.loads((ROOT/'validation/restaurant-separation143101-routines.json').read_text())['routines']
    replacements = {item['signature'].split('(')[0]: item['after'].strip().rstrip(';')+';' for item in reviewed}
    result = []
    found = set()
    for statement in statements(sql):
        # Only remove leading comments, never comments or text inside a body.
        code = re.sub(r'\A(?:\s|--[^\n]*(?:\n|$)|/\*.*?\*/)*', '', statement, flags=re.S)
        function = re.match(r'CREATE OR REPLACE FUNCTION public\.(\w+)\(', code, re.I)
        if function and function[1] in replacements:
            name = function[1]
            found.add(name)
            result.append(statement[:len(statement)-len(code)] + replacements[name])
        elif FORBIDDEN.search(code):
            if not re.match(r'CREATE (?:OR REPLACE FUNCTION|TABLE|(?:UNIQUE )?INDEX|POLICY|TRIGGER)|ALTER TABLE|REVOKE|GRANT|INSERT INTO public\.backup_registry113', code):
                raise RuntimeError('Unreviewed Restaurant reference in installer: '+code[:100])
            if function and function[1] not in FUNCTIONS:
                raise RuntimeError('Unreviewed shared function: '+function[1])
        else:
            result.append(statement)
    if found != set(replacements):
        raise RuntimeError('Missing reviewed shared routines: '+', '.join(sorted(set(replacements)-found)))
    output = ''.join(result)
    if FORBIDDEN.search(output):
        raise RuntimeError('Restaurant dependency survived installer separation')
    return output
