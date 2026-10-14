const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/tmp/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent('<p>Encrypted download regression</p>');
    await page.addScriptTag({ content: fs.readFileSync('assets/vendor/document14285/zip-full.min.js', 'utf8') });
    for (const native of [false, true]) for (const length of [0, 1, 15, 16, 17, 524305]) {
      const input = Buffer.alloc(length);
      for (let i = 0; i < length; i++) input[i] = (i * 71 + (i >>> 8)) & 255;
      const result = await page.evaluate(async ({ input, native }) => {
        zip.configure({ useWebWorkers: false, useCompressionStream: native });
        const writer = new zip.ZipWriter(new zip.BlobWriter('application/zip'));
        await writer.add('รายงาน.txt', new zip.BlobReader(new Blob([Uint8Array.from(input)])), { password: 'test-รหัส-123', encryptionStrength: 3 });
        return Array.from(new Uint8Array(await (await writer.close()).arrayBuffer()));
      }, { input: Array.from(input), native });
      const bytes = Buffer.from(result);
      const end = bytes.length - 22;
      assert.equal(bytes.readUInt32LE(end), 0x06054b50);
      const central = bytes.readUInt32LE(end + 16);
      assert.equal(bytes.readUInt32LE(central), 0x02014b50);
      assert.equal(bytes.readUInt16LE(central + 10), 99);
      const size = bytes.readUInt32LE(central + 20);
      const offset = bytes.readUInt32LE(central + 42);
      const dataStart = offset + 30 + bytes.readUInt16LE(offset + 26) + bytes.readUInt16LE(offset + 28);
      const data = bytes.subarray(dataStart, dataStart + size);
      const keys = crypto.pbkdf2Sync('test-รหัส-123', data.subarray(0, 16), 1000, 66, 'sha1');
      assert.deepEqual(data.subarray(16, 18), keys.subarray(64));
      const ciphertext = data.subarray(18, -10);
      assert.deepEqual(crypto.createHmac('sha1', keys.subarray(32, 64)).update(ciphertext).digest().subarray(0, 10), data.subarray(-10));
      const plaintext = Buffer.alloc(ciphertext.length);
      for (let i = 0; i < ciphertext.length; i += 16) {
        const counter = Buffer.alloc(16); counter.writeUInt32LE(1 + i / 16);
        const cipher = crypto.createCipheriv('aes-256-ecb', keys.subarray(0, 32), null); cipher.setAutoPadding(false);
        const mask = Buffer.concat([cipher.update(counter), cipher.final()]);
        for (let j = 0; j < 16 && i + j < ciphertext.length; j++) plaintext[i + j] = ciphertext[i + j] ^ mask[j];
      }
      assert.deepEqual(zlib.inflateRawSync(plaintext), input);
    }
    console.log('PASS 12 browser AES-256 ZIP downloads independently authenticated/decrypted with Node/OpenSSL and inflated with zlib, including empty and multichunk files');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
