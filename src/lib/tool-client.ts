import { imageType, decodeImage, cropRect, MAX_FILE_BYTES, validateDimensions } from './image';
import type { ImageJob, ImageFormat } from './image';
import { ImageProcessor } from './image-processor';
import type { ZipEntry } from './zip';
import type { Tool } from './tools';
import { parseTargetKB, targetLabel } from './compression-options';
import { trackEvent, type AnalyticsEvent } from './analytics';

export function initImageTools() {
  document.querySelectorAll<HTMLElement>('[data-image-tool]').forEach(root => {
    const config: Tool = JSON.parse(root.dataset.config!);
    const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
    const input = get<HTMLInputElement>('[data-file]');
    const empty = get('[data-empty]'), editor = get('[data-editor]'), processing = get('[data-processing]'), result = get('[data-result]');
    const error = get('[data-error]'), drop = get('[data-dropzone]');
    const preview = get<HTMLImageElement>('[data-preview]');
    const cropCanvas = get<HTMLCanvasElement>('[data-crop]');
    const processButton = get<HTMLButtonElement>('[data-process]');
    const pickButton = get<HTMLButtonElement>('[data-pick]');
    const download = get<HTMLAnchorElement>('[data-download]');
    const range = (name: string) => get<HTMLInputElement>(`[data-${name}]`);
    let selected: File | undefined, image: HTMLImageElement | undefined;
    const processor = new ImageProcessor();
    const batch = root.querySelector<HTMLElement>('[data-batch]');
    let batchFiles: File[] = [], batchEntries: ZipEntry[] = [], zipUrl = '';
    const extensionFor = (type: string) => type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    const outputName = (file: File, type: string) => `${file.name.replace(/\.[^.]+$/, '') || 'foto'}-beresfile.${extensionFor(type)}`;
    function clearBatchResult() {
      batchEntries = [];
      if (zipUrl) URL.revokeObjectURL(zipUrl);
      zipUrl = '';
      if (batch) get('[data-batch-zip]').hidden = true;
    }
    function lockSettings(locked: boolean) {
      root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input, select, button').forEach(control => control.disabled = locked);
    }
    let sourceUrl = '', resultUrl = '', target = config.target || 0, busy = false, selectionId = 0;
    let targetMode: 'preset' | 'custom' | 'quality' = config.target ? 'preset' : 'quality';
    let processedMode: 'preset' | 'custom' | 'quality' = targetMode;
    let processedTarget = target;
    const emit = (event: AnalyticsEvent) => trackEvent({ event, tool: config.slug, mode: config.kind === 'compress' ? (event === 'download_clicked' ? processedMode : targetMode) : config.kind, target: config.kind === 'compress' ? (event === 'download_clicked' ? processedTarget : target) : 0 }, root.dataset.analytics === 'cloudflare');
    const size = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toLocaleString('id-ID', { maximumFractionDigits: 2 })} MB` : `${(bytes / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })} KB`;
    function state(next: string) {
      empty.hidden = next !== 'empty'; editor.hidden = next !== 'editor'; processing.hidden = next !== 'processing'; result.hidden = next !== 'result';
      root.setAttribute('aria-busy', String(next === 'processing'));
    }
    function announce(message: string) {
      error.textContent = message; error.hidden = false; error.tabIndex = -1; error.focus();
      emit('processing_error');
    }
    function invalidateResult() {
      clearBatchResult();
      if (batchFiles.length) {
        get('[data-batch-status]').textContent = 'Pengaturan berubah. Proses ulang semua foto.';
        get<HTMLProgressElement>('[data-batch-progress]').hidden = true;
      }
      if (selected && !result.hidden) {
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        resultUrl = ''; download.removeAttribute('href');
        get<HTMLImageElement>('[data-result-preview]').removeAttribute('src');
        state('editor');
      }
    }
    function validateTarget(): boolean {
      if (targetMode !== 'custom') return true;
      const field = range('custom-target');
      const parsed = parseTargetKB(field.value);
      const message = get('[data-target-error]');
      field.setAttribute('aria-invalid', String(parsed === undefined));
      message.hidden = parsed !== undefined;
      message.textContent = parsed === undefined ? 'Masukkan angka bulat antara 1 dan 25.600 KB.' : '';
      if (parsed === undefined) return false;
      target = parsed;
      return true;
    }
    function clear() {
      ++selectionId;
      clearBatchResult(); batchFiles = [];
      if (batch) { batch.hidden = true; get('[data-batch-list]').replaceChildren(); }
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      sourceUrl = ''; resultUrl = ''; selected = undefined; image = undefined;
      input.value = ''; preview.removeAttribute('src'); get<HTMLImageElement>('[data-result-preview]').removeAttribute('src');
      download.removeAttribute('href'); error.hidden = true; state('empty');
      if (config.kind === 'crop') { range('zoom').value = '1'; range('x').value = '50'; range('y').value = '50'; }
    }
    function paintCrop() {
      if (!image || config.kind !== 'crop') return;
      const zoom = Number(range('zoom').value);
      const rect = cropRect(image, config.ratio!, zoom, Number(range('x').value), Number(range('y').value));
      cropCanvas.width = config.width!; cropCanvas.height = config.height!;
      const ctx = cropCanvas.getContext('2d')!;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
      ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, cropCanvas.width, cropCanvas.height);
      get('[data-zoom-value]').textContent = `${zoom.toLocaleString('id-ID', { maximumFractionDigits: 2 })}×`;
    }
    async function select(file: File) {
      if (busy) return;
      clear();
      const id = selectionId;
      busy = true; pickButton.disabled = true;
      try {
        if (file.size > MAX_FILE_BYTES) throw new Error('File terlalu besar untuk diproses di perangkat ini. Pilih foto dengan ukuran maksimal 25 MB.');
        const type = await imageType(file);
        if (id !== selectionId) return;
        if (!config.accept.split(',').includes(type)) throw new Error(`Format file belum didukung. Gunakan ${config.accept === 'image/png' ? 'PNG' : config.accept === 'image/jpeg' ? 'JPG' : 'JPG, PNG, atau WebP'}.`);
        busy = true; pickButton.disabled = true; state('processing');
        image = await decodeImage(file);
        if (id !== selectionId) return;
        selected = file; sourceUrl = URL.createObjectURL(file); preview.src = sourceUrl;
        if (config.kind === 'resize') {
          range('resize-width').value = String(image.naturalWidth);
          range('resize-height').value = String(image.naturalHeight);
          updateResize();
        }
        get('[data-filename]').textContent = file.name;
        get('[data-fileinfo]').textContent = `${size(file.size)} · ${image.naturalWidth} × ${image.naturalHeight} piksel`;
        state('editor'); paintCrop(); emit('file_selected');
        processButton.focus({ preventScroll: true });
      } catch (failure) {
        if (id === selectionId) { state('empty'); announce(failure instanceof Error ? failure.message : 'Foto gagal dibaca. Coba pilih foto lain.'); }
      } finally { busy = false; pickButton.disabled = false; }
    }
    pickButton.addEventListener('click', () => input.click());
    function selectFiles(files: File[]) {
      if (busy || !files.length) return;
      if (config.kind !== 'compress' || files.length === 1) { void select(files[0]); return; }
      clear();
      if (files.length > 20 || files.reduce((sum, file) => sum + file.size, 0) > 128 * 1024 * 1024) {
        announce('Pilih maksimal 20 foto dengan total ukuran maksimal 128 MB.'); return;
      }
      batchFiles = files;
      state('batch'); batch!.hidden = false;
      const list = get('[data-batch-list]');
      files.forEach(file => { const row = document.createElement('p'); row.textContent = `${file.name} — Menunggu`; list.append(row); emit('file_selected'); });
      get('[data-batch-status]').textContent = `${files.length} foto siap diproses.`;
      get<HTMLProgressElement>('[data-batch-progress]').hidden = true;
      get('[data-batch-process]').focus();
    }
    input.addEventListener('change', () => selectFiles(Array.from(input.files || [])));
    let dragDepth = 0;
    drop.addEventListener('dragenter', event => { event.preventDefault(); dragDepth++; drop.classList.add('drag-over'); });
    drop.addEventListener('dragover', event => { event.preventDefault(); });
    drop.addEventListener('dragleave', () => { if (--dragDepth <= 0) drop.classList.remove('drag-over'); });
    drop.addEventListener('drop', event => { event.preventDefault(); dragDepth = 0; drop.classList.remove('drag-over'); selectFiles(Array.from(event.dataTransfer?.files || [])); });
    // A file dropped outside the dropzone must not navigate away from the tool.
    window.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
    window.addEventListener('drop', event => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
    root.querySelectorAll<HTMLButtonElement>('[data-target]').forEach(button => button.addEventListener('click', () => {
      if (busy) return;
      const chosen = Number(button.dataset.target);
      targetMode = chosen < 0 ? 'custom' : chosen === 0 ? 'quality' : 'preset';
      target = chosen < 0 ? parseTargetKB(range('custom-target').value) || 0 : chosen;
      root.querySelectorAll<HTMLButtonElement>('[data-target]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      get('[data-quality-wrap]').hidden = targetMode !== 'quality';
      get('[data-custom-wrap]').hidden = targetMode !== 'custom';
      get('[data-target-hint]').textContent = targetMode === 'quality' ? 'Pilih kualitas untuk menyeimbangkan detail dan ukuran foto.' : target ? `Hasil maksimal ${targetLabel(target)}. Kualitas disesuaikan otomatis.` : 'Isi target ukuran sebelum memproses foto.';
      invalidateResult();
      if (targetMode === 'custom') { validateTarget(); range('custom-target').focus({ preventScroll: true }); }
    }));
    if (config.kind === 'compress') {
      range('quality').addEventListener('input', () => { get('[data-quality-value]').textContent = `${range('quality').value}%`; invalidateResult(); });
      range('custom-target').addEventListener('input', () => {
        invalidateResult();
        const valid = validateTarget();
        get('[data-target-hint]').textContent = valid ? `Hasil maksimal ${targetLabel(target)}. Kualitas disesuaikan otomatis.` : 'Isi target ukuran sebelum memproses foto.';
      });
    }
    function resizeDimensions() {
      let width = Number(range('resize-width').value), height = Number(range('resize-height').value);
      if (get<HTMLSelectElement>('[data-resize-mode]').value === 'percent') {
        const percent = Number(range('resize-percent').value);
        if (!Number.isInteger(percent) || percent < 1 || percent > 1000) throw new Error('Gunakan persen bulat antara 1 dan 1.000.');
        width = Math.max(1, Math.round(image!.naturalWidth * percent / 100));
        height = Math.max(1, Math.round(image!.naturalHeight * percent / 100));
      }
      validateDimensions(width, height);
      return { width, height };
    }
    function updateResize(changed?: string) {
      if (!image) return;
      if (range('lock').checked && changed) {
        if (changed === 'width') range('resize-height').value = String(Math.max(1, Math.round(Number(range('resize-width').value) * image.naturalHeight / image.naturalWidth)));
        else range('resize-width').value = String(Math.max(1, Math.round(Number(range('resize-height').value) * image.naturalWidth / image.naturalHeight)));
      }
      const percent = get<HTMLSelectElement>('[data-resize-mode]').value === 'percent';
      get('[data-pixel-fields]').hidden = percent; get('[data-lock-wrap]').hidden = percent; get('[data-percent-fields]').hidden = !percent;
      try { const { width, height } = resizeDimensions(); get('[data-resize-summary]').textContent = `Hasil: ${width} × ${height} piksel`; }
      catch (error) { get('[data-resize-summary]').textContent = (error as Error).message; }
    }
    root.querySelector('[data-format]')?.addEventListener('change', invalidateResult);
    root.querySelector('[data-background]')?.addEventListener('input', invalidateResult);
    if (config.kind === 'resize') {
      ['width', 'height', 'percent'].forEach(name => range(`resize-${name}`).addEventListener('input', () => { updateResize(name === 'percent' ? undefined : name); invalidateResult(); }));
      get('[data-resize-mode]').addEventListener('change', () => { updateResize(); invalidateResult(); });
      range('lock').addEventListener('change', () => { updateResize('width'); invalidateResult(); });
    }
    function job(): ImageJob {
      const format = (root.querySelector<HTMLSelectElement>('[data-format]')?.value || config.format || 'image/jpeg') as ImageFormat;
      if (config.kind === 'compress') return { kind: 'compress', format, targetBytes: target ? target * 1024 : undefined, quality: Number(range('quality').value) / 100 };
      if (config.kind === 'crop') {
        const field = range('photo-target').value;
        const kb = field === '' ? undefined : parseTargetKB(field);
        if (field !== '' && kb === undefined) throw new Error('Masukkan batas ukuran bulat antara 1 dan 25.600 KB, atau kosongkan.');
        return { kind: 'crop', format: 'image/jpeg', width: config.width, height: config.height, zoom: Number(range('zoom').value), x: Number(range('x').value), y: Number(range('y').value), targetBytes: kb ? kb * 1024 : undefined };
      }
      return { kind: config.kind, format, background: root.querySelector<HTMLInputElement>('[data-background]')?.value, ...(config.kind === 'resize' ? resizeDimensions() : {}) };
    }
    if (config.kind === 'crop') {
      ['zoom', 'x', 'y'].forEach(name => range(name).addEventListener('input', () => { paintCrop(); invalidateResult(); }));
      get<HTMLSelectElement>('[data-photo-size]').addEventListener('change', event => {
        const [width, height] = (event.target as HTMLSelectElement).value.split('x').map(Number);
        config.width = width; config.height = height; config.ratio = width / height;
        get('[data-photo-dimensions]').textContent = `Hasil: ${width} × ${height} piksel · JPG`;
        paintCrop(); invalidateResult();
      });
      range('photo-target').addEventListener('input', invalidateResult);
      let pointer: { id: number; x: number; y: number } | undefined;
      cropCanvas.addEventListener('pointerdown', event => { pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; cropCanvas.setPointerCapture(event.pointerId); });
      cropCanvas.addEventListener('pointermove', event => {
        if (!pointer || !image || pointer.id !== event.pointerId) return;
        const rect = cropRect(image, config.ratio!, Number(range('zoom').value), Number(range('x').value), Number(range('y').value));
        const bounds = cropCanvas.getBoundingClientRect();
        const dx = (event.clientX - pointer.x) * rect.width / bounds.width;
        const dy = (event.clientY - pointer.y) * rect.height / bounds.height;
        range('x').value = String(Math.min(100, Math.max(0, Number(range('x').value) - dx / Math.max(1, image.naturalWidth - rect.width) * 100)));
        range('y').value = String(Math.min(100, Math.max(0, Number(range('y').value) - dy / Math.max(1, image.naturalHeight - rect.height) * 100)));
        pointer.x = event.clientX; pointer.y = event.clientY; paintCrop();
      });
      cropCanvas.addEventListener('pointerup', () => { pointer = undefined; });
      cropCanvas.addEventListener('pointercancel', () => { pointer = undefined; });
    }
    processButton.addEventListener('click', async () => {
      if (!selected || !image || busy) return;
      if (!validateTarget()) { range('custom-target').focus(); return; }
      let settings: ImageJob;
      try { settings = job(); } catch (failure) { announce((failure as Error).message); return; }
      busy = true; error.hidden = true; state('processing');
      lockSettings(true);
      try {
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        const output = await processor.process(selected, settings, image);
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        resultUrl = URL.createObjectURL(output.blob);
        const extension = extensionFor(output.blob.type);
        download.href = resultUrl; download.download = outputName(selected, output.blob.type);
        get<HTMLImageElement>('[data-result-preview]').src = resultUrl;
        get('[data-before]').textContent = size(selected.size); get('[data-after]').textContent = size(output.blob.size);
        const difference = Math.round((1 - output.blob.size / selected.size) * 100);
        get('[data-saving]').textContent = difference > 0 ? `${difference}% lebih kecil` : difference < 0 ? `${Math.abs(difference)}% lebih besar` : 'Ukuran setara';
        get('[data-result-detail]').textContent = `${output.width} × ${output.height} piksel · ${extension.toUpperCase()}${target && config.kind === 'compress' ? ` · Maks. ${targetLabel(target)} terpenuhi` : ''}`;
        processedMode = targetMode; processedTarget = target;
        state('result'); emit('processing_success'); download.focus({ preventScroll: true });
      } catch (failure) {
        state('editor'); announce(failure instanceof Error ? failure.message : 'Foto gagal diproses. Coba gunakan foto yang lebih kecil.');
      } finally { busy = false; lockSettings(false); }
    });
    if (batch) {
      get('[data-batch-reset]').addEventListener('click', () => { if (!busy) { clear(); pickButton.focus(); } });
      get('[data-batch-process]').addEventListener('click', async () => {
        if (busy || !batchFiles.length || !validateTarget()) return;
        const settings = job();
        clearBatchResult(); error.hidden = true; busy = true; lockSettings(true); root.setAttribute('aria-busy', 'true');
        const progress = get<HTMLProgressElement>('[data-batch-progress]'); progress.hidden = false; progress.max = batchFiles.length; progress.value = 0;
        const rows = get('[data-batch-list]').children;
        let outputBytes = 0;
        try {
          for (const [index, file] of batchFiles.entries()) {
            rows[index].textContent = `${file.name} — Memproses…`;
            try {
              if (file.size > MAX_FILE_BYTES || !config.accept.split(',').includes(await imageType(file))) throw new Error('Gunakan JPG, PNG, atau WebP yang valid, maksimal 25 MB per foto.');
              const output = await processor.process(file, settings);
              if (outputBytes + output.blob.size > 128 * 1024 * 1024) throw new Error('Total hasil melebihi 128 MB. Proses dalam kelompok lebih kecil.');
              outputBytes += output.blob.size;
              batchEntries.push({ name: outputName(file, output.blob.type), blob: output.blob });
              rows[index].textContent = `${file.name} — Selesai (${size(output.blob.size)})`; emit('processing_success');
            } catch (failure) { rows[index].textContent = `${file.name} — ${(failure as Error).message}`; emit('processing_error'); }
            progress.value = index + 1;
            get('[data-batch-status]').textContent = `${index + 1} dari ${batchFiles.length} foto diproses; ${batchEntries.length} berhasil.`;
          }
          if (batchEntries.length) {
            processedMode = targetMode; processedTarget = target;
            get('[data-batch-status]').textContent += ' Menyiapkan ZIP…';
            zipUrl = URL.createObjectURL(await processor.zip(batchEntries));
            get('[data-batch-zip]').hidden = false;
            get('[data-batch-status]').textContent = `${batchEntries.length} berhasil, ${batchFiles.length - batchEntries.length} gagal. ZIP siap diunduh.`;
          }
        } catch (failure) { announce((failure as Error).message); }
        finally { batchEntries = []; busy = false; lockSettings(false); root.setAttribute('aria-busy', 'false'); }
      });
      get('[data-batch-zip]').addEventListener('click', () => {
        if (!zipUrl || busy) return;
        const link = document.createElement('a'); link.href = zipUrl; link.download = 'beresfile-foto.zip'; link.click(); emit('download_clicked');
      });
    }
    get('[data-reset]').addEventListener('click', () => { if (!busy) { clear(); pickButton.focus(); } });
    get('[data-another]').addEventListener('click', () => { clear(); pickButton.focus(); });
    download.addEventListener('click', () => emit('download_clicked'));
    window.addEventListener('pagehide', event => { if (!event.persisted) { processor.stop(); if (sourceUrl) URL.revokeObjectURL(sourceUrl); if (resultUrl) URL.revokeObjectURL(resultUrl); if (zipUrl) URL.revokeObjectURL(zipUrl); } });
    emit('tool_opened');
  });
}
