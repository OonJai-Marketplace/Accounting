// Validate dimensions before allocation. Accept a single opaque canvas frame,
// including an optional color profile, with no animation or camera EXIF.
const side = 480;
export const maxBytes = 96 * 1024;
function expect(valid: unknown) {
  if (!valid) throw Error('Invalid selfie');
}

async function checkWebp(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at: number) => String.fromCharCode(...bytes.subarray(at, at + 4));
  expect(tag(0) === 'RIFF' && tag(8) === 'WEBP' && view.getUint32(4, true) + 8 === bytes.length);
  let frames = 0;
  for (let offset = 12; offset < bytes.length;) {
    const name = tag(offset), size = view.getUint32(offset + 4, true), start = offset + 8;
    offset = start + size + (size & 1);
    expect(offset <= bytes.length);
    if (name === 'VP8 ') {
      expect(size >= 10 && !(bytes[start] & 1) && bytes[start + 3] === 0x9d &&
        bytes[start + 4] === 1 && bytes[start + 5] === 0x2a &&
        (view.getUint16(start + 6, true) & 0x3fff) === side &&
        (view.getUint16(start + 8, true) & 0x3fff) === side);
      frames++;
    } else if (name === 'VP8L') {
      const bits = view.getUint32(start + 1, true);
      expect(size >= 5 && bytes[start] === 0x2f && (bits & 0x3fff) + 1 === side &&
        ((bits >>> 14) & 0x3fff) + 1 === side);
      frames++;
    } else if (name === 'VP8X') {
      expect(size === 10 && (bytes[start] & ~0x20) === 0 &&
        view.getUint16(start + 4, true) === side - 1 && bytes[start + 6] === 0 &&
        view.getUint16(start + 7, true) === side - 1 && bytes[start + 9] === 0);
    } else expect(name === 'ICCP');
  }
  expect(frames === 1);
  const { decode } = await import('npm:@stacksjs/ts-webp@0.1.7');
  const img = decode(bytes);
  expect(img.width === side && img.height === side && img.data.length === side * side * 4);
}

async function checkJpeg(bytes: Uint8Array) {
  expect(bytes[0] === 0xff && bytes[1] === 0xd8 &&
    bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9);
  const { default: jpeg } = await import('npm:jpeg-js@0.4.4');
  const img = jpeg.decode(bytes, { useTArray: true, tolerantDecoding: false,
    maxResolutionInMP: 0.24, maxMemoryUsageInMB: 16 });
  expect(img.width === side && img.height === side && !('exifBuffer' in img && img.exifBuffer) &&
    !img.comments?.length);
}

export async function readSelfie(req: Request, format: string) {
  expect(req.body && ['image/webp','image/jpeg'].includes(format) &&
    Number(req.headers.get('content-length') || 0) <= maxBytes);
  const reader = req.body!.getReader(), buffer = new Uint8Array(maxBytes);
  let length = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      if (length + part.value.length > maxBytes) {
        await reader.cancel();
        throw Error('Image too large');
      }
      buffer.set(part.value, length);
      length += part.value.length;
    }
  } finally { reader.releaseLock(); }
  const bytes = buffer.subarray(0, length);
  if (format === 'image/webp') await checkWebp(bytes);
  else await checkJpeg(bytes);
  return bytes;
}
