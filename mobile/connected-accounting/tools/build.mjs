import { build } from 'esbuild';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(app, '../..'), out = path.join(app, 'www');
await rm(out, { recursive: true, force: true }); await mkdir(out, { recursive: true });
// Explicit runtime allowlist excludes source, backups, credentials and development artifacts.
for (const dir of ['scripts', 'styles', 'assets', 'data']) await cp(path.join(repo, dir), path.join(out, dir), { recursive: true });
for (const item of await readdir(repo)) {
  if (/\.(html|js|webmanifest|json)$/.test(item) && !['package.json', 'package-lock.json'].includes(item)) await cp(path.join(repo, item), path.join(out, item));
}
await build({ entryPoints: [path.join(app, 'src/native.mjs')], outfile: path.join(out, 'native-accounting.js'), bundle: true, format: 'iife', platform: 'browser', target: ['chrome110', 'safari15'], minify: true, legalComments: 'eof' });
for (const item of await readdir(out)) {
  if (!item.endsWith('.html')) continue;
  const filename = path.join(out, item), html = await readFile(filename, 'utf8');
  await writeFile(filename, html.replace(/<head(?:\s[^>]*)?>/i, '$&<script src="native-accounting.js"></script>'));
}
await writeFile(path.join(out, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><title>Oon Jai Accounting</title></head><body><script>location.replace("phone.html")</script></body></html>');
console.log('Bundled connected Accounting web assets with native Android/iOS scanner adapter.');
