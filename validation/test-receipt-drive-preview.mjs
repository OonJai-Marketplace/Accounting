import assert from 'node:assert/strict';
import {previewTarget} from '../supabase/functions/receipt-drive-preview/names.mjs';

const batch = previewTarget('OJM260001-OJM260024.pdf', 24);
assert.deepEqual(batch, {first:'OJM260001', last:'OJM260024', expected:24});
assert.equal(previewTarget('OJM26-0001 – OJM26-0024.PDF', 24).last, batch.last);
assert.deepEqual(previewTarget('OJM260025.pdf', 4), {first:'OJM260025', part:1, total:null});
assert.deepEqual(previewTarget('OJM260040-2of3.pdf', 24), {first:'OJM260040', part:2, total:3});
assert.equal(previewTarget('ojm260040 Part 02.pdf', 1).part, 2);
for (const name of ['OJM260000.pdf','OJM260040-prat02.pdf','wrong OJM260040.pdf','OJM260040-4of3.pdf','OJM260040-0of3.pdf','OJM260040-OJM260039.pdf','OJM260040-OJM270002.pdf','OJM260040.jpg']) {
  assert.ok(previewTarget(name, 1).issue, name);
}
assert.match(previewTarget('OJM260001-OJM260024.pdf', 23).issue, /23 pages/);
console.log('PASS single, range, supplements, page counts and malformed names');
for (const name of ['ojm26-0001.pdf','OJM-26-0001.PDF','Receipt 260001.pdf','26_0001.pdf','0001.pdf','1.pdf']) {
  assert.equal(previewTarget(name,2,'November 2026').first,'OJM260001',name);
}
for (const name of ['1-24.pdf','0001–0024.PDF','260001-260024.pdf','receipt OJM26-0001 to 24.pdf','260001–24.pdf']) {
  assert.deepEqual(previewTarget(name,24,'November 2026'),batch,name);
}
assert.match(previewTarget('1-24.pdf',24,'Journal receipts').issue,/year/);
assert.match(previewTarget('1.pdf',1,'2025 to 2026').issue,/year/);
assert.match(previewTarget('26-0040.pdf',1,'November 2026').issue,/could mean/);
assert.equal(previewTarget('40-part2.pdf',24,'2026-11').part,2);
assert.equal(previewTarget('wrong 260001.pdf',1).first,undefined);
console.log('PASS flexible names, numeric-only entries, folder year and ambiguous input');
