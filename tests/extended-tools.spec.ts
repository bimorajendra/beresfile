import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { tools } from '../src/lib/tools';
import { isAnalyticsPayload } from '../src/lib/analytics-schema';

async function photo(page: Page, format = 'image/png') {
  const data = await page.evaluate(format => {
    const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 600;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#448866'; ctx.fillRect(100, 100, 500, 300);
    return canvas.toDataURL(format).split(',')[1];
  }, format);
  return { name: 'foto.png', mimeType: format, buffer: Buffer.from(data, 'base64') };
}

async function result(page: Page) {
  await expect(page.locator('[data-result]')).toBeVisible();
  return page.locator('[data-result-preview]').evaluate(async (img: HTMLImageElement) => {
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight, type: (await (await fetch(img.src)).blob()).type };
  });
}

for (const fallback of [false, true]) test(`Resize dimensions, percentage and ratio lock (fallback=${fallback})`, async ({ page }) => {
  if (fallback) await page.addInitScript(() => Object.defineProperty(window, 'Worker', { value: undefined }));
  await page.goto('/resize-image/');
  await page.locator('[data-file]').setInputFiles(await photo(page));
  await expect(page.locator('[data-editor]')).toBeVisible();
  await page.locator('[data-resize-width]').fill('400');
  await expect(page.locator('[data-resize-height]')).toHaveValue('300');
  await page.locator('[data-process]').click();
  expect(await result(page)).toEqual({ width: 400, height: 300, type: 'image/jpeg' });
  await page.locator('[data-format]').selectOption('image/png');
  await expect(page.locator('[data-editor]')).toBeVisible();
  await expect(page.locator('[data-download]')).not.toHaveAttribute('href');
  await page.locator('[data-resize-mode]').selectOption('percent');
  await page.locator('[data-resize-percent]').fill('25');
  await page.locator('[data-process]').click();
  expect(await result(page)).toEqual({ width: 200, height: 150, type: 'image/png' });
  await page.locator('[data-format]').selectOption('image/jpeg');
  await page.locator('[data-resize-mode]').selectOption('pixels');
  await page.locator('[data-lock]').uncheck();
  await page.locator('[data-resize-width]').fill('123');
  await page.locator('[data-resize-height]').fill('77');
  await page.locator('[data-process]').click();
  expect(await result(page)).toEqual({ width: 123, height: 77, type: 'image/jpeg' });
});

test('WebP download has actual WebP bytes and matching extension', async ({ page }, info) => {
  await page.goto('/png-to-webp/');
  await page.locator('[data-file]').setInputFiles(await photo(page));
  await page.locator('[data-process]').click();
  expect((await result(page)).type).toBe('image/webp');
  const pending = page.waitForEvent('download'); await page.locator('[data-download]').click();
  const download = await pending; expect(download.suggestedFilename()).toBe('foto-beresfile.webp');
  const path = info.outputPath('photo.webp'); await download.saveAs(path);
  const bytes = await readFile(path); expect(bytes.toString('ascii', 0, 4)).toBe('RIFF'); expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
});

test('Crop selector and KB limit preserve chosen dimensions', async ({ page }) => {
  await page.goto('/resize-foto-3x4/');
  await page.locator('[data-file]').setInputFiles(await photo(page));
  await page.locator('[data-photo-size]').selectOption('236x354');
  await page.locator('[data-photo-target]').fill('50');
  await page.locator('[data-process]').click();
  expect(await result(page)).toEqual({ width: 236, height: 354, type: 'image/jpeg' });
  expect(await page.locator('[data-result-preview]').evaluate(async (img: HTMLImageElement) => (await (await fetch(img.src)).blob()).size)).toBeLessThanOrEqual(50 * 1024);
});

test('Batch ZIP contains both valid files with unique names and skips invalid input', async ({ page }, info) => {
  await page.goto('/compress-image-100kb/');
  const file = await photo(page);
  await page.locator('[data-file]').setInputFiles([file, file, { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('invalid') }]);
  await page.locator('[data-format]').selectOption('image/webp');
  await page.locator('[data-batch-process]').click();
  await expect(page.locator('[data-batch-status]')).toContainText('2 berhasil, 1 gagal');
  const pending = page.waitForEvent('download'); await page.locator('[data-batch-zip]').click();
  const download = await pending; const path = info.outputPath('batch.zip'); await download.saveAs(path);
  const bytes = await readFile(path), names: string[] = [];
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const length = bytes.readUInt32LE(offset + 18), nameLength = bytes.readUInt16LE(offset + 26), extra = bytes.readUInt16LE(offset + 28);
    names.push(bytes.toString('utf8', offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extra;
    expect(bytes.toString('ascii', start, start + 4)).toBe('RIFF');
    expect(length).toBeLessThanOrEqual(100 * 1024);
    offset = start + length;
  }
  expect(names).toEqual(['foto-beresfile.webp', 'foto-beresfile-2.webp']);
  await page.locator('[data-target="200"]').click();
  await expect(page.locator('[data-batch-zip]')).toBeHidden();
  await page.locator('[data-batch-reset]').click();
  await page.locator('[data-file]').setInputFiles(Array.from({ length: 21 }, () => file));
  await expect(page.locator('[data-error]')).toContainText('maksimal 20');
});

test('Analytics accepts every advertised tool and rejects private data', () => {
  for (const tool of tools) {
    const payload = { event: 'processing_success', tool: tool.slug, mode: tool.kind === 'compress' ? 'preset' : tool.kind, target: tool.target || 0, entry: 'tool', source: 'direct' };
    expect(isAnalyticsPayload(payload), tool.slug).toBe(true);
    expect(isAnalyticsPayload({ ...payload, filename: 'private.png' })).toBe(false);
  }
});
