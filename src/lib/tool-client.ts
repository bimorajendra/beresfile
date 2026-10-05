import { imageType, decodeImage, compressImage, convertImage, cropImage, cropRect, MAX_FILE_BYTES } from './image';
import type { ImageResult } from './image';
import type { Tool } from './tools';

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
    let sourceUrl = '', resultUrl = '', target = config.target || 0, busy = false, selectionId = 0;
    const emit = (event: string) => window.dispatchEvent(new CustomEvent('beresfile:analytics', { detail: { event, tool: config.slug } }));
    const size = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toLocaleString('id-ID', { maximumFractionDigits: 2 })} MB` : `${(bytes / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })} KB`;
    function state(next: string) {
      empty.hidden = next !== 'empty'; editor.hidden = next !== 'editor'; processing.hidden = next !== 'processing'; result.hidden = next !== 'result';
      root.setAttribute('aria-busy', String(next === 'processing'));
    }
    function announce(message: string) {
      error.textContent = message; error.hidden = false; error.tabIndex = -1; error.focus();
      emit('processing_error');
    }
    function clear() {
      ++selectionId;
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
      try {
        if (file.size > MAX_FILE_BYTES) throw new Error('File terlalu besar untuk diproses di perangkat ini. Pilih foto dengan ukuran maksimal 25 MB.');
        const type = await imageType(file);
        if (id !== selectionId) return;
        if (!config.accept.split(',').includes(type)) throw new Error(`Format file belum didukung. Gunakan ${config.accept === 'image/png' ? 'PNG' : config.accept === 'image/jpeg' ? 'JPG' : 'JPG, PNG, atau WebP'}.`);
        busy = true; pickButton.disabled = true; state('processing');
        image = await decodeImage(file);
        if (id !== selectionId) return;
        selected = file; sourceUrl = URL.createObjectURL(file); preview.src = sourceUrl;
        get('[data-filename]').textContent = file.name;
        get('[data-fileinfo]').textContent = `${size(file.size)} · ${image.naturalWidth} × ${image.naturalHeight} piksel`;
        state('editor'); paintCrop(); emit('file_selected');
        processButton.focus({ preventScroll: true });
      } catch (failure) {
        if (id === selectionId) { state('empty'); announce(failure instanceof Error ? failure.message : 'Foto gagal dibaca. Coba pilih foto lain.'); }
      } finally { busy = false; pickButton.disabled = false; }
    }
    pickButton.addEventListener('click', () => input.click());
    input.addEventListener('change', () => { if (input.files?.[0]) void select(input.files[0]); });
    let dragDepth = 0;
    drop.addEventListener('dragenter', event => { event.preventDefault(); dragDepth++; drop.classList.add('drag-over'); });
    drop.addEventListener('dragover', event => { event.preventDefault(); });
    drop.addEventListener('dragleave', () => { if (--dragDepth <= 0) drop.classList.remove('drag-over'); });
    drop.addEventListener('drop', event => { event.preventDefault(); dragDepth = 0; drop.classList.remove('drag-over'); if (event.dataTransfer?.files[0]) void select(event.dataTransfer.files[0]); });
    // A file dropped outside the dropzone must not navigate away from the tool.
    window.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
    window.addEventListener('drop', event => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
    root.querySelectorAll<HTMLButtonElement>('[data-target]').forEach(button => button.addEventListener('click', () => {
      if (busy) return;
      target = Number(button.dataset.target);
      root.querySelectorAll<HTMLButtonElement>('[data-target]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      get('[data-quality-wrap]').hidden = target !== 0;
      get('[data-target-hint]').textContent = target ? `Hasil maksimal ${target} KB. Kualitas disesuaikan otomatis.` : 'Pilih kualitas untuk menyeimbangkan detail dan ukuran foto.';
      if (selected && !result.hidden) { state('editor'); processButton.focus({ preventScroll: true }); }
    }));
    if (config.kind === 'compress') range('quality').addEventListener('input', () => { get('[data-quality-value]').textContent = `${range('quality').value}%`; });
    if (config.kind === 'crop') {
      ['zoom', 'x', 'y'].forEach(name => range(name).addEventListener('input', paintCrop));
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
      busy = true; error.hidden = true; state('processing');
      root.querySelectorAll<HTMLButtonElement>('[data-target]').forEach(b => b.disabled = true);
      try {
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        let output: ImageResult;
        if (config.kind === 'compress') output = await compressImage(image, target ? target * 1024 : undefined, Number(range('quality').value) / 100);
        else if (config.kind === 'crop') output = await cropImage(image, config.width!, config.height!, Number(range('zoom').value), Number(range('x').value), Number(range('y').value));
        else output = await convertImage(image, config.format!, config.format === 'image/jpeg' ? range('background').value : undefined);
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        resultUrl = URL.createObjectURL(output.blob);
        const extension = output.blob.type === 'image/png' ? 'png' : 'jpg';
        const base = selected.name.replace(/\.[^.]+$/, '') || 'foto';
        download.href = resultUrl; download.download = `${base}-beresfile.${extension}`;
        get<HTMLImageElement>('[data-result-preview]').src = resultUrl;
        get('[data-before]').textContent = size(selected.size); get('[data-after]').textContent = size(output.blob.size);
        const difference = Math.round((1 - output.blob.size / selected.size) * 100);
        get('[data-saving]').textContent = difference > 0 ? `${difference}% lebih kecil` : difference < 0 ? `${Math.abs(difference)}% lebih besar` : 'Ukuran setara';
        get('[data-result-detail]').textContent = `${output.width} × ${output.height} piksel · ${extension.toUpperCase()}${target && config.kind === 'compress' ? ` · Maks. ${target} KB terpenuhi` : ''}`;
        state('result'); emit('processing_success'); download.focus({ preventScroll: true });
      } catch (failure) {
        state('editor'); announce(failure instanceof Error ? failure.message : 'Foto gagal diproses. Coba gunakan foto yang lebih kecil.');
      } finally { busy = false; root.querySelectorAll<HTMLButtonElement>('[data-target]').forEach(b => b.disabled = false); }
    });
    get('[data-reset]').addEventListener('click', () => { if (!busy) { clear(); pickButton.focus(); } });
    get('[data-another]').addEventListener('click', () => { clear(); pickButton.focus(); });
    download.addEventListener('click', () => emit('download_clicked'));
    window.addEventListener('pagehide', event => { if (!event.persisted) { if (sourceUrl) URL.revokeObjectURL(sourceUrl); if (resultUrl) URL.revokeObjectURL(resultUrl); } });
    emit('tool_opened');
  });
}
