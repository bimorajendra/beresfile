export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_PIXELS = 32_000_000;
export const MAX_SIDE = 16_384;
export type ImageSource = HTMLImageElement | ImageBitmap | HTMLCanvasElement | OffscreenCanvas;
export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';
export type ImageResult = { blob: Blob; width: number; height: number };
export type ImageJob = { kind: 'compress' | 'crop' | 'convert' | 'resize'; format: ImageFormat; targetBytes?: number; quality?: number; width?: number; height?: number; zoom?: number; x?: number; y?: number; background?: string };
export const dimensions = (image: ImageSource) => 'naturalWidth' in image ? { width: image.naturalWidth, height: image.naturalHeight } : { width: image.width, height: image.height };
export function validateDimensions(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) throw new Error('Gunakan dimensi 1–16.384 piksel per sisi, dengan total maksimal 32 megapiksel.');
}
export async function imageType(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)) return 'image/png';
  const text = String.fromCharCode(...bytes);
  return text.slice(0, 4) === 'RIFF' && text.slice(8, 12) === 'WEBP' ? 'image/webp' : '';
}
export async function decodeImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error();
    if (image.naturalWidth * image.naturalHeight > MAX_PIXELS) throw new Error('Resolusi foto terlalu besar. Gunakan foto dengan resolusi maksimal 32 megapiksel.');
    return image;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Resolusi')) throw error;
    throw new Error('Foto tidak dapat dibaca. Coba pilih foto lain yang tidak rusak.');
  } finally { URL.revokeObjectURL(url); }
}
function canvas(width: number, height: number) {
  validateDimensions(width, height);
  const element = typeof document === 'undefined' ? new OffscreenCanvas(width, height) : document.createElement('canvas');
  element.width = width; element.height = height;
  const context = element.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!context) throw new Error('Browser ini belum mendukung pemrosesan foto. Gunakan browser versi terbaru.');
  return { element, context };
}
export async function encodeCanvas(element: HTMLCanvasElement | OffscreenCanvas, format: string, quality = .92): Promise<Blob> {
  const blob = 'convertToBlob' in element ? await element.convertToBlob({ type: format, quality }) : await new Promise<Blob>((resolve, reject) => element.toBlob(b => b ? resolve(b) : reject(new Error('Foto gagal diproses. Coba gunakan file yang lebih kecil.')), format, quality));
  if (blob.type !== format) throw new Error('Browser ini belum mendukung format hasil yang dipilih. Coba JPG atau PNG.');
  return blob;
}
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 0));
async function fitCanvas(element: HTMLCanvasElement | OffscreenCanvas, format: ImageFormat, targetBytes?: number, quality = .8): Promise<Blob | undefined> {
  if (!targetBytes) return encodeCanvas(element, format, quality);
  const best = await encodeCanvas(element, format, .95);
  if (best.size <= targetBytes) return best;
  if (format === 'image/png') return undefined;
  let fitting = await encodeCanvas(element, format, .02);
  if (fitting.size > targetBytes) return undefined;
  let low = .02, high = .95;
  for (let pass = 0; pass < 9; pass++) {
    const middle = (low + high) / 2, candidate = await encodeCanvas(element, format, middle);
    if (candidate.size <= targetBytes) { fitting = candidate; low = middle; } else high = middle;
  }
  return fitting;
}
export async function compressImage(image: ImageSource, targetBytes?: number, quality = .8, format: ImageFormat = 'image/jpeg'): Promise<ImageResult> {
  const original = dimensions(image);
  const { element, context } = canvas(original.width, original.height);
  try {
    for (let attempt = 0; attempt < 20; attempt++) {
      context.clearRect(0, 0, element.width, element.height);
      if (format === 'image/jpeg') { context.fillStyle = '#fff'; context.fillRect(0, 0, element.width, element.height); }
      context.drawImage(image, 0, 0, element.width, element.height);
      const blob = await fitCanvas(element, format, targetBytes, quality);
      if (blob) return { blob, width: element.width, height: element.height };
      const smallest = await encodeCanvas(element, format, .02);
      const scale = Math.min(.85, Math.sqrt(targetBytes! / smallest.size) * .9);
      if (element.width === 1 && element.height === 1) break;
      element.width = Math.max(1, Math.floor(element.width * scale)); element.height = Math.max(1, Math.floor(element.height * scale));
      await pause();
    }
    throw new Error('Target ukuran belum dapat dicapai. Coba target yang lebih besar atau format JPG/WebP.');
  } finally { element.width = 0; element.height = 0; }
}
export function cropRect(image: ImageSource, ratio: number, zoom: number, x: number, y: number) {
  const size = dimensions(image), width = Math.min(size.width, size.height * ratio) / zoom, height = width / ratio;
  return { x: (size.width - width) * x / 100, y: (size.height - height) * y / 100, width, height };
}
export async function cropImage(image: ImageSource, width: number, height: number, zoom: number, x: number, y: number, targetBytes?: number, background = '#ffffff'): Promise<ImageResult> {
  const { element, context } = canvas(width, height);
  try {
    const rect = cropRect(image, width / height, zoom, x, y);
    context.fillStyle = background; context.fillRect(0, 0, width, height);
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, width, height);
    const blob = await fitCanvas(element, 'image/jpeg', targetBytes, .95);
    if (!blob) throw new Error('Batas KB terlalu kecil untuk dimensi pas foto ini. Naikkan batas KB; dimensi pas foto tidak diperkecil.');
    return { blob, width, height };
  } finally { element.width = 0; element.height = 0; }
}
export async function convertImage(image: ImageSource, format: ImageFormat, background = '#ffffff', width = dimensions(image).width, height = dimensions(image).height): Promise<ImageResult> {
  const { element, context } = canvas(width, height);
  try {
    if (format === 'image/jpeg') { context.fillStyle = background; context.fillRect(0, 0, width, height); }
    context.drawImage(image, 0, 0, width, height);
    return { blob: await encodeCanvas(element, format), width, height };
  } finally { element.width = 0; element.height = 0; }
}
export async function processImage(image: ImageSource, job: ImageJob): Promise<ImageResult> {
  if (job.kind === 'compress') return compressImage(image, job.targetBytes, job.quality, job.format);
  if (job.kind === 'crop') return cropImage(image, job.width!, job.height!, job.zoom!, job.x!, job.y!, job.targetBytes, job.background);
  return convertImage(image, job.format, job.background, job.width, job.height);
}
