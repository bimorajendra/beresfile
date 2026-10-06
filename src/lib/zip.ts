export type ZipEntry = { name: string; blob: Blob };
const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1; table[n] = c >>> 0; }
function crc32(bytes: Uint8Array) { let c = 0xffffffff; for (const byte of bytes) c = table[(c ^ byte) & 255] ^ c >>> 8; return (c ^ 0xffffffff) >>> 0; }
function record(length: number) { const bytes = new Uint8Array(length); return { bytes, view: new DataView(bytes.buffer) }; }
export function uniqueFilename(name: string, used: Set<string>) {
  const safe = name.replace(/[\\/\u0000-\u001f:*?"<>|]/g, '-').replace(/^\.+/, '').slice(0, 180) || 'foto.jpg';
  const dot = safe.lastIndexOf('.'), base = dot > 0 ? safe.slice(0, dot) : safe, extension = dot > 0 ? safe.slice(dot) : '';
  let result = safe, count = 1;
  while (used.has(result.toLowerCase())) result = `${base}-${++count}${extension}`;
  used.add(result.toLowerCase()); return result;
}
// STORE avoids wasting CPU recompressing encoded images.
export async function createZip(entries: ZipEntry[]): Promise<Blob> {
  if (!entries.length || entries.length > 20) throw new Error('ZIP membutuhkan 1–20 hasil foto.');
  const parts: BlobPart[] = [], central: Uint8Array[] = [], used = new Set<string>(); let offset = 0;
  for (const entry of entries) {
    const name = new TextEncoder().encode(uniqueFilename(entry.name, used));
    const bytes = new Uint8Array(await entry.blob.arrayBuffer()), crc = crc32(bytes);
    const local = record(30 + name.length), v = local.view;
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x800, true);
    v.setUint16(12, 33, true); v.setUint32(14, crc, true); v.setUint32(18, bytes.length, true); v.setUint32(22, bytes.length, true); v.setUint16(26, name.length, true); local.bytes.set(name, 30);
    const header = record(46 + name.length), d = header.view;
    d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true); d.setUint16(8, 0x800, true); d.setUint16(14, 33, true); d.setUint32(16, crc, true); d.setUint32(20, bytes.length, true); d.setUint32(24, bytes.length, true); d.setUint16(28, name.length, true); d.setUint32(42, offset, true); header.bytes.set(name, 46);
    parts.push(local.bytes, bytes); central.push(header.bytes); offset += local.bytes.length + bytes.length;
  }
  const end = record(22), v = end.view, centralSize = central.reduce((sum, item) => sum + item.length, 0);
  v.setUint32(0, 0x06054b50, true); v.setUint16(8, entries.length, true); v.setUint16(10, entries.length, true); v.setUint32(12, centralSize, true); v.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.bytes], { type: 'application/zip' });
}
