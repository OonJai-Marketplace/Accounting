import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.8';
import { readSelfie } from './clock-image.ts';

const bucket = 'hr-attendance-selfies';
export const validId = (x: unknown): x is string => typeof x === 'string' &&
  /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(x);
export class ClockError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
export async function clockRpc(db: SupabaseClient, digest: string, action: string, data: Record<string, unknown>) {
  const result = await db.rpc('employee_hr_clock', {p_digest: digest, p_action: action, p_data: data});
  if (result.error) {
    const {message, code} = result.error;
    if (code === 'P0001' && /^(Capture expired|Evidence changed|Attendance status changed|Too many open captures|Invalid attendance)/.test(message)) {
      throw new ClockError(409, message);
    }
    throw new ClockError(503, 'Attendance registration is unavailable. Retry to check your registration.');
  }
  if (result.data === null) throw new ClockError(401, 'Your HR session expired or access was suspended or ended. Sign in again or contact HR.');
  return result.data;
}
export async function submitClock(db: SupabaseClient, req: Request, digest: string) {
  let data;
  try { data = JSON.parse(req.headers.get('x-attendance') || 'null'); } catch { /* validated below */ }
  if (!data || !validId(data.submission) || !validId(data.eventId) ||
    Object.keys(data).some(k => !['submission','eventId','lat','lon','accuracy','acquired'].includes(k)) ||
    !Number.isFinite(data.lat) || Math.abs(data.lat) > 90 || !Number.isFinite(data.lon) || Math.abs(data.lon) > 180 ||
    !Number.isFinite(data.accuracy) || data.accuracy < 0 || typeof data.acquired !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(data.acquired) || !Number.isFinite(Date.parse(data.acquired))) {
    throw new ClockError(400, 'GPS or capture information is missing. Start a new capture.');
  }
  const {submission,eventId,lat,lon,accuracy,acquired} = data;
  const receipt = () => clockRpc(db, digest, 'clockReceipt', {submission});
  const existing = await receipt();
  if (existing.registered) return existing;
  const format = req.headers.get('content-type')?.split(';')[0].trim() || '';
  let bytes;
  try { bytes = await readSelfie(req, format); }
  catch { throw new ClockError(422, 'The selfie could not be read. Retake the photograph and try again.'); }
  const fingerprint = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const sha256 = Array.from(fingerprint, b => b.toString(16).padStart(2,'0')).join('');
  const prepared = await clockRpc(db, digest, 'clockPrepare', {submission,eventId,
    evidence: {lat,lon,accuracy,acquired,format,bytes:bytes.length,sha256}});
  if (prepared.registered) return prepared;
  let failed = false;
  try {
    const upload = await db.storage.from(bucket).upload(prepared.path, bytes, {contentType:format, upsert:false, cacheControl:'0'});
    failed = Boolean(upload.error);
  } catch { failed = true; }
  // A lost upload response can follow a successful Storage/attendance commit.
  const result = await receipt();
  if (result.registered) return result;
  throw new ClockError(503, failed ? 'The photo upload or attendance registration failed. Retry to check your registration.'
    : 'Attendance could not be confirmed. Retry to check your registration.');
}
export async function signedClockPhoto(db: SupabaseClient, actor: string, sid: string, event: unknown) {
  if (!validId(event)) throw new ClockError(400, 'Choose a valid attendance event.');
  const path = await db.rpc('hr_clock_photo_path', {p_actor:actor, p_sid:sid, p_event:event});
  if (path.error?.code === '42501') throw new ClockError(403, 'Active Accounting administrator required.');
  if (path.error) throw new ClockError(503, 'The photograph could not be retrieved.');
  if (!path.data) throw new ClockError(404, 'Photograph unavailable.');
  const signed = await db.storage.from(bucket).createSignedUrl(path.data, 60);
  if (signed.error) throw new ClockError(503, 'The photograph could not be opened. Retry.');
  return {url:signed.data.signedUrl, expiresIn:60};
}
