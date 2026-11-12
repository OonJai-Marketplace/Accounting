import assert from 'node:assert/strict';
import {getAndroidReleaseManifest, updateRelease, APPLICATION_ID, SIGNER_SHA256} from '../mobile/connected-accounting/src/update-policy.mjs';
const installed = {id: APPLICATION_ID, build: '143215', version: '143.215-test'};
const release = {schema: 1, applicationId: APPLICATION_ID, signerSha256: SIGNER_SHA256, version: '143.216-test', versionCode: 143216, sha256: 'a'.repeat(64), url: 'https://drive.google.com/file/d/123456789012345/view', notes: ['Update inside the same app.']};
assert.equal(updateRelease(release, installed).available, true);
assert.equal(updateRelease(release, {...installed, build: '143216'}).available, false);
assert.equal(updateRelease(release, {...installed, build: '143217'}).available, false);
assert.throws(() => updateRelease(release, {...installed, id: 'org.oonjai.accounting'}));
assert.throws(() => updateRelease({...release, signerSha256: 'b'.repeat(64)}, installed));
for (const url of ['http://drive.google.com/file/d/123456789012345/view', 'https://evil.test/update.apk', 'https://drive.google.com.evil.test/file/d/123456789012345/view', 'https://user@drive.google.com/file/d/123456789012345/view', 'https://github.com/other/Accounting/releases/download/v1/app.apk']) assert.throws(() => updateRelease({...release, url}, installed));
assert.throws(() => updateRelease({...release, versionCode: '143216'}, installed));
assert.throws(() => updateRelease({...release, notes: ['x'.repeat(301)]}, installed));
console.log('PASS newer-version check, no downgrade, stable package/certificate, trusted download addresses and bounded notes');

const official='https://oonjai-marketplace.github.io/Accounting/data/android-release.json?t=123';
globalThis.window={OJM_PUBLIC_APP_URL:''};
let usedFallback=false;
const manifest=await getAndroidReleaseManifest(async options=>{
 assert.equal(options.url,official);return {status:200,data:JSON.stringify(release)};
},async()=>{usedFallback=true;},()=>123);
assert.deepEqual(manifest,release);assert.equal(usedFallback,false);
window.OJM_PUBLIC_APP_URL='https://other.example.invalid';
const fallback=await getAndroidReleaseManifest(async()=>{throw Error('Native connection unavailable');},async url=>{
 assert.equal(url,official);return Response.json(release);
},()=>123);
assert.deepEqual(fallback,release);
await assert.rejects(getAndroidReleaseManifest(async()=>({status:503}),async()=>new Response('',{status:503})),/HTTP 503/);
console.log('PASS empty or changed accounting site, native JSON/text responses, official HTTPS fallback and specific update errors.');
