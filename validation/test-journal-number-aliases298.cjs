/* PostgreSQL regression for original receipts and corrected, searchable journal IDs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {PGlite} = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');

(async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE SCHEMA private;
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE public.journal_entries (id uuid PRIMARY KEY, entry_no text UNIQUE);
      CREATE TABLE public.operation_receipts14228(payload jsonb,result jsonb,actor_id uuid);
    `);
    // Existing receipt functions return the durable, as-issued JSON shape.
    for (const [signature, variable, result] of [
      ['drive_journal_receipt143128(text,text)', 'r', "jsonb_build_object('payload',r.payload,'result',r.result,'approved_by',r.actor_id)"],
      ['journal_receipt14228(text)', 'r', "jsonb_build_object('payload',r.payload,'result',r.result)"],
      ['journal_change_receipt14385(text)', 'r', "jsonb_build_object('payload',r.payload,'result',r.result)"],
      ['post_journal_batch14228(text,jsonb)', 'receipt', 'receipt.result'],
      ['change_journal14385(text,uuid,text,text,jsonb,jsonb)', 'prior', 'prior.result'],
    ]) {
      await db.exec(`CREATE FUNCTION public.${signature} RETURNS jsonb LANGUAGE plpgsql AS $$
        DECLARE ${variable} public.operation_receipts14228; BEGIN
        SELECT * INTO ${variable} FROM public.operation_receipts14228 LIMIT 1;
        RETURN ${result}; END $$`);
    }
    const migration = path.join(__dirname, '../supabase/migrations/20261105112600_journal_number_alias_receipts.sql');
    await db.exec(fs.readFileSync(migration, 'utf8'));
    const entry = '10000000-0000-4000-8000-000000000001';
    const actor = '20000000-0000-4000-8000-000000000002';
    const other = '30000000-0000-4000-8000-000000000003';
    const old = {entry_id:entry, entry_no:'OJM260001', date:'2026-10-31'};
    const current = {...old, entry_no:'AMO26-000001', issued_entry_no:old.entry_no};
    const different = {...old, entry_id:other};
    await db.query('INSERT INTO journal_entries VALUES ($1,$2)', [entry, current.entry_no]);
    await db.query('INSERT INTO private.journal_number_aliases298(former_no,entry_id,replacement_no,changed_by) VALUES ($1,$2,$3,$4)',
      [old.entry_no,entry,current.entry_no,actor]);
    const original = [different,old];
    await db.query('INSERT INTO operation_receipts14228 VALUES ($1,$2,$3)', ['[]',JSON.stringify(original),actor]);
    for (const query of [
      "SELECT public.drive_journal_receipt143128('s','draft')->'result' AS seen",
      "SELECT public.journal_receipt14228('request')->'result' AS seen",
      "SELECT public.post_journal_batch14228('request','[]') AS seen",
    ]) assert.deepEqual((await db.query(query)).rows[0].seen,[different,current]);
    assert.deepEqual((await db.query('SELECT result FROM operation_receipts14228')).rows[0].result,original);
    await db.query('UPDATE operation_receipts14228 SET result=$1', [JSON.stringify(old)]);
    for (const query of [
      "SELECT public.journal_change_receipt14385('request')->'result' AS seen",
      "SELECT public.change_journal14385('request',NULL,'','','{}','{}') AS seen",
    ]) assert.deepEqual((await db.query(query)).rows[0].seen,current);
    await assert.rejects(db.query('INSERT INTO journal_entries VALUES ($1,$2)',[other,old.entry_no]),/reserved/);
    await db.query('INSERT INTO journal_entries VALUES ($1,$2)',[other,'OJM260002']);
    assert.equal((await db.query('SELECT count(*) AS n FROM journal_entries')).rows[0].n,2);
    console.log('PASS historical receipt storage, journal and revision retries, UUID matching and former-number reservation.');
  } finally { await db.close(); }
})().catch(error => {console.error(error);process.exitCode = 1;});
