/// <reference lib="webworker" />
import { imageType, MAX_FILE_BYTES, MAX_PIXELS, processImage, type ImageJob } from './image';
import { createZip, type ZipEntry } from './zip';
self.onmessage = async (event: MessageEvent<{ id: number; file?: File; job?: ImageJob; entries?: ZipEntry[] }>) => {
  const { id, file, job, entries } = event.data;
  let bitmap: ImageBitmap | undefined;
  try {
    if (entries) { self.postMessage({ id, result: await createZip(entries) }); return; }
    if (!file || !job || file.size > MAX_FILE_BYTES || !await imageType(file)) throw new Error('Pilih foto JPG, PNG, atau WebP yang valid, maksimal 25 MB.');
    try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { throw new Error('Foto tidak dapat dibaca. Coba pilih foto lain yang tidak rusak.'); }
    if (bitmap.width * bitmap.height > MAX_PIXELS) throw new Error('Resolusi foto terlalu besar. Gunakan foto dengan resolusi maksimal 32 megapiksel.');
    self.postMessage({ id, result: await processImage(bitmap, job) });
  } catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : 'Foto gagal diproses.' }); }
  finally { bitmap?.close(); }
};
