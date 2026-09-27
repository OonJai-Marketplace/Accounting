# Version 83 — payroll repair and examples

The original `payroll_runs` table has required `period_start`/`period_end` columns but no `updated_at` or JSON payroll snapshot fields. Version 82's CREATE TABLE IF NOT EXISTS did not upgrade that existing table. This repair explicitly adds the columns and keeps the original records and payroll_lines relationships intact.

## Apply the repair

1. Open the existing accounting project's Supabase SQL Editor.
2. Open `83-payroll-repair-and-samples.sql`, copy its **entire contents**, paste into a new query, and click **Run**.
3. The final result should say **Payroll repair complete**, with **2 sample_months** and **4 required_columns**. There should be 7 sample employees unless an existing matching employee code was reused.
4. Return to the accounting site, refresh, then click **Payroll → History → Reload Records**. Both examples also appear under **Reports → Payroll Report**.

If SQL Editor shows an error, the transaction rolls back; send the exact error. Merely downloading or pasting the file does not execute it. This script may be run again without duplicating or overwriting the examples.

## Samples

The full employee names match the Mandatory Contribution / Final Payroll sections of the supplied PDF:

| Employee | Contract | Currency |
|---|---:|---|
| Maria Jade Saavedra | 300 | USD |
| Romel Ryan Pablo | 320 | USD |
| Santos Cabbigat | 400 | USD |
| Gee Ann Cabbigat | 320 | USD |
| Chansuk Butsasa | 3,500,000 | LAK |
| Boutda Xaiysiva | 3,500,000 | LAK |
| Somhak Suksavanh | 3,500,000 | LAK |

- August 2026: sample input copied from the PDF's August report, although its filename is September - Payroll.pdf.
- September 2026: illustrative second month reusing August inputs and rate, not actual September pay.
- Rate: 22,240 LAK/USD, dated August 31, 2026, BCEL i-Bank as printed in the PDF.
- Internal deductions and advance recoveries are copied from the summary. Deductions are entered as one documented total to avoid double-counting the attendance detail.
- PIT/SSO calculations use current Settings. The PDF's tax figures are not forced into the calculation and Settings are not replaced.
- Sample employee positions and entitlements are not inferred. Zero allowances are placeholders for review, not assertions of eligibility.
- Samples are labeled and cannot be finalized as actual payroll. Sample employees are excluded from normal new payroll until you edit the employee and clear the Sample employee checkbox.
- Unsaved sample previews are available in Payroll Overview, History, and Reports before database setup. They are not silently treated as saved records.

## Other change

All table headers are now left aligned, including desktop, phone, tablet, and printed tables. Other mobile layouts are unchanged.

## Verification

The repair was tested in isolated PostgreSQL against both the original schema plus version 82 and a fresh schema. Re-running, sample counts, preservation of original payroll lines, required period dates, revision-conflict protection, and staff-access restrictions passed. This session does not have permission to execute SQL against your live Supabase project.
