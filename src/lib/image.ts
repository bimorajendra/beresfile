export const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_PIXELS = 32_000_000;

export async function imageType(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)) return 'image/png';
  const text = String.fromCharCode(...bytes);
  if (text.slice(0, 4) === 'RIFF' && text.slice(8, 12) === 'WEBP') return 'image/webp';
  return '';
}

export async function decodeImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Foto tidak dapat dibaca. Pilih foto JPG, PNG, atau WebP yang valid.');
    if (image.naturalWidth * image.naturalHeight > MAX_PIXELS) throw new Error('Resolusi foto terlalu besar untuk diproses di perangkat ini. Gunakan foto dengan resolusi maksimal 32 megapiksel.');
    return image;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Resolusi')) throw error;
    throw new Error('Foto tidak dapat dibaca. Coba pilih foto lain yang tidak rusak.');
  } finally { URL.revokeObjectURL(url); }
}

function canvas(width: number, height: number) {
  const element = document.createElement('canvas');
  element.width = Math.max(1, Math.round(width));
  element.height = Math.max(1, Math.round(height));
  const context = element.getContext('2d');
  if (!context) throw new Error('Browser ini belum mendukung pemrosesan foto. Gunakan browser versi terbaru.');
  return { element, context };
}

export function encodeCanvas(element: HTMLCanvasElement, format: string, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    element.toBlob(blob => blob ? resolve(blob) : reject(new Error('Foto gagal diproses. Coba gunakan file yang lebih kecil.')), format, quality);
  });
}

export type ImageResult = { blob: Blob; width: number; height: number };

export async function compressImage(image: HTMLImageElement, targetBytes?: number, quality = 0.8): Promise<ImageResult> {
  const { element, context } = canvas(image.naturalWidth, image.naturalHeight);
  try {
    // Search the greatest JPEG quality that fits; then reduce dimensions only if necessary.
    for (let attempt = 0; attempt < 16; attempt++) {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, element.width, element.height);
      context.drawImage(image, 0, 0, element.width, element.height);
      if (!targetBytes) return { blob: await encodeCanvas(element, 'image/jpeg', quality), width: element.width, height: element.height };
      const best = await encodeCanvas(element, 'image/jpeg', 0.95);
      if (best.size <= targetBytes) return { blob: best, width: element.width, height: element.height };
      let fitting = await encodeCanvas(element, 'image/jpeg', 0.12);
      if (fitting.size <= targetBytes) {
        let low = 0.12, high = 0.95;
        for (let pass = 0; pass < 9; pass++) {
          const middle = (low + high) / 2;
          const candidate = await encodeCanvas(element, 'image/jpeg', middle);
          if (candidate.size <= targetBytes) { fitting = candidate; low = middle; }
          else high = middle;
        }
        return { blob: fitting, width: element.width, height: element.height };
      }
      const scale = Math.min(0.85, Math.sqrt(targetBytes / fitting.size) * 0.9);
      element.width = Math.max(1, Math.floor(element.width * scale));
      element.height = Math.max(1, Math.floor(element.height * scale));
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
    throw new Error('Target ukuran belum dapat dicapai. Coba target yang lebih besar atau foto dengan resolusi lebih kecil.');
  } finally { element.width = 0; element.height = 0; }
}

export function cropRect(image: HTMLImageElement, ratio: number, zoom: number, x: number, y: number) {
  const width = Math.min(image.naturalWidth, image.naturalHeight * ratio) / zoom;
  const height = width / ratio;
  return { x: (image.naturalWidth - width) * x / 100, y: (image.naturalHeight - height) * y / 100, width, height };
}

export async function cropImage(image: HTMLImageElement, width: number, height: number, zoom: number, x: number, y: number): Promise<ImageResult> {
  const { element, context } = canvas(width, height);
  try {
    const rect = cropRect(image, width / height, zoom, x, y);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, width, height);
    return { blob: await encodeCanvas(element, 'image/jpeg', 0.95), width, height };
  } finally { element.width = 0; element.height = 0; }
}

export async function convertImage(image: HTMLImageElement, format: string, background = '#ffffff'): Promise<ImageResult> {
  const { element, context } = canvas(image.naturalWidth, image.naturalHeight);
  try {
    if (format === 'image/jpeg') {
      context.fillStyle = background;
      context.fillRect(0, 0, element.width, element.height);
    }
    context.drawImage(image, 0, 0);
    return { blob: await encodeCanvas(element, format), width: element.width, height: element.height };
  } finally { element.width = 0; element.height = 0; }
}
