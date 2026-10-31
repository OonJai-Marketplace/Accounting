export const APPLICATION_ID = 'org.oonjai.accounting.preview';
export const SIGNER_SHA256 = '58124eaeb0ff570eeb67d3cbe2121db02369d82fb47a4b3bc1889b233b1bfa8c';

export function updateRelease(manifest, installed) {
  if (installed.id !== APPLICATION_ID || !/^\d+$/.test(String(installed.build))) throw Error('This installation cannot use this update channel.');
  if (!manifest || manifest.schema !== 1 || manifest.applicationId !== installed.id || manifest.signerSha256 !== SIGNER_SHA256) throw Error('The update does not match this app.');
  if (!Number.isSafeInteger(manifest.versionCode) || manifest.versionCode < 1 || !/^\d+\.\d+(?:-[a-z0-9.]+)?$/i.test(manifest.version) || !/^[a-f0-9]{64}$/.test(manifest.sha256)) throw Error('The update information is incomplete.');
  const url = new URL(manifest.url);
  const drive = url.hostname === 'drive.google.com' && /^\/file\/d\/[\w-]{10,160}\/view$/.test(url.pathname);
  const github = url.hostname === 'github.com' && /^\/OonJai-Marketplace\/Accounting\/releases\/download\/[^/]+\/[^/]+\.apk$/.test(url.pathname);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || (!drive && !github)) throw Error('The update download address is invalid.');
  if (!Array.isArray(manifest.notes) || manifest.notes.length > 8 || manifest.notes.some(note => typeof note !== 'string' || note.length > 300)) throw Error('The update notes are invalid.');
  return {available: manifest.versionCode > Number(installed.build), version: manifest.version, versionCode: manifest.versionCode, sha256:manifest.sha256, url: url.href, notes: [...manifest.notes], provider: drive ? 'drive' : 'github'};
}
