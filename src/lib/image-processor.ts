import { decodeImage, processImage, type ImageJob, type ImageResult } from './image';
import { createZip, type ZipEntry } from './zip';
export class ImageProcessor {
  private worker?: Worker;
  private next = 0;
  private pending = new Map<number, { resolve: (result: any) => void; reject: (error: Error) => void }>();
  constructor() {
    if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./image-worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = ({ data }) => {
          const task = this.pending.get(data.id); if (!task) return;
          this.pending.delete(data.id);
          data.error ? task.reject(new Error(data.error)) : task.resolve(data.result);
        };
        this.worker.onerror = () => { this.stop('Pemrosesan foto terhenti. Coba lagi; browser akan menggunakan pemrosesan biasa.'); };
      } catch { this.worker = undefined; }
    }
  }
  get usesWorker() { return Boolean(this.worker); }
  private send<T>(data: { file?: File; job?: ImageJob; entries?: ZipEntry[] }): Promise<T> {
    return new Promise((resolve, reject) => { const id = ++this.next; this.pending.set(id, { resolve, reject }); this.worker!.postMessage({ ...data, id }); });
  }
  async process(file: File, job: ImageJob, preview?: HTMLImageElement): Promise<ImageResult> {
    if (this.worker) return this.send({ file, job });
    return processImage(preview || await decodeImage(file), job);
  }
  async zip(entries: ZipEntry[]): Promise<Blob> { return this.worker ? this.send({ entries }) : createZip(entries); }
  stop(message = 'Proses dibatalkan.') {
    this.worker?.terminate(); this.worker = undefined;
    for (const task of this.pending.values()) task.reject(new Error(message));
    this.pending.clear();
  }
}
