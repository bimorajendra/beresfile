import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function fixture(page: Page, format = 'image/png', noise = false) {
  const base64 = await page.evaluate(({ format, noise }) => {
    const c = document.createElement('canvas'); c.width = 1100; c.height = 850;
    const ctx = c.getContext('2d')!;
    if (noise) {
      const pixels = ctx.createImageData(c.width, c.height);
      let seed = 123456;
      for (let i = 0; i < pixels.data.length; i += 4) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        pixels.data[i] = seed & 255; pixels.data[i + 1] = seed >>> 8 & 255; pixels.data[i + 2] = seed >>> 16 & 255; pixels.data[i + 3] = 255;
      }
      ctx.putImageData(pixels, 0, 0);
    } else {
      ctx.fillStyle = '#286149'; ctx.fillRect(100, 100, 900, 650);
      ctx.fillStyle = '#be8650'; ctx.fillRect(400, 100, 300, 650);
    }
    return c.toDataURL(format, .95).split(',')[1];
  }, { format, noise });
  return { name: format === 'image/jpeg' ? 'test-foto.jpg' : format === 'image/webp' ? 'test-foto.webp' : 'test-foto.png', mimeType: format, buffer: Buffer.from(base64, 'base64') };
}

async function downloadResult(page: Page, path: string) {
  const waiting = page.waitForEvent('download');
  await page.locator('[data-download]').click();
  const download = await waiting;
  await download.saveAs(path);
  return { bytes: await readFile(path), name: download.suggestedFilename() };
}

for (const kb of [100, 200, 500]) test(`Compression meets the ${kb} KB byte limit and downloads locally`, async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`/compress-image-${kb}kb/`);
  const photo = await fixture(page, 'image/png', true);
  const requests: string[] = []; page.on('request', request => { if (!request.url().startsWith('blob:')) requests.push(request.url()); });
  await page.locator('[data-file]').setInputFiles(photo);
  await expect(page.locator('[data-editor]')).toBeVisible();
  await page.locator('[data-process]').click();
  await expect(page.locator('[data-result]')).toBeVisible();
  const output = await downloadResult(page, info.outputPath('result.jpg'));
  expect(output.bytes.length).toBeLessThanOrEqual(kb * 1024);
  expect(output.bytes[0]).toBe(255); expect(output.bytes[1]).toBe(216);
  expect(output.name).toBe('test-foto-beresfile.jpg');
  expect(requests).toEqual([]); expect(errors).toEqual([]);
  await page.locator('[data-another]').click();
  await expect(page.locator('[data-empty]')).toBeVisible();
  await expect(page.locator('[data-pick]')).toBeFocused();
});

test('Custom compression preserves dimensions and reacts to target changes', async ({ page }) => {
  await page.goto('/compress-image/');
  await expect(page.locator('[data-quality-wrap]')).toBeVisible();
  await page.locator('[data-quality]').fill('65');
  await expect(page.locator('[data-quality-value]')).toHaveText('65%');
  await page.locator('[data-file]').setInputFiles(await fixture(page, 'image/webp'));
  await page.locator('[data-process]').click();
  await expect(page.locator('[data-result-detail]')).toContainText('1100 × 850 piksel');
  await page.locator('[data-target="100"]').click();
  await expect(page.locator('[data-editor]')).toBeVisible();
  await page.locator('[data-process]').click();
  await expect(page.locator('[data-result-detail]')).toContainText('Maks. 100 KB terpenuhi');
});

for (const [slug, width, height] of [['3x4', 354, 472], ['4x6', 472, 708]] as const) test(`Crop ${slug} responds to keyboard and exports the exact dimensions`, async ({ page }, info) => {
  await page.goto(`/resize-foto-${slug}/`);
  await page.locator('[data-file]').setInputFiles(await fixture(page));
  await expect(page.locator('[data-crop]')).toBeVisible();
  const before = await page.locator('[data-crop]').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.locator('[data-zoom]').focus();
  await page.keyboard.press('ArrowRight');
  await page.locator('[data-x]').fill('10');
  const after = await page.locator('[data-crop]').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  expect(after).not.toBe(before);
  const bounds = (await page.locator('[data-crop]').boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 - 30, bounds.y + bounds.height / 2);
  await page.mouse.up();
  expect(await page.locator('[data-crop]').evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(after);
  await page.locator('[data-process]').click();
  await expect(page.locator('[data-result-detail]')).toContainText(`${width} × ${height}`);
  const output = await downloadResult(page, info.outputPath('crop.jpg'));
  const dimensions = await page.evaluate(async base64 => { const img = new Image(); img.src = `data:image/jpeg;base64,${base64}`; await img.decode(); return [img.naturalWidth, img.naturalHeight]; }, output.bytes.toString('base64'));
  expect(dimensions).toEqual([width, height]);
});

for (const slug of ['png-to-jpg', 'jpg-to-png']) test(`Conversion ${slug} exports the correct format and background`, async ({ page }, info) => {
  await page.goto(`/${slug}/`);
  const toJpg = slug === 'png-to-jpg';
  await page.locator('[data-file]').setInputFiles(await fixture(page, toJpg ? 'image/png' : 'image/jpeg'));
  if (toJpg) await page.locator('[data-background]').fill('#e8b45a');
  await page.locator('[data-process]').click();
  await expect(page.locator('[data-result]')).toBeVisible();
  const output = await downloadResult(page, info.outputPath(toJpg ? 'convert.jpg' : 'convert.png'));
  expect(output.name.endsWith(toJpg ? '.jpg' : '.png')).toBe(true);
  expect([...output.bytes.subarray(0, toJpg ? 2 : 8)]).toEqual(toJpg ? [255, 216] : [137, 80, 78, 71, 13, 10, 26, 10]);
  if (toJpg) {
    const pixel = await page.evaluate(async base64 => { const img = new Image(); img.src = `data:image/jpeg;base64,${base64}`; await img.decode(); const c = document.createElement('canvas'); c.width = 1; c.height = 1; const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0); return [...ctx.getImageData(0, 0, 1, 1).data]; }, output.bytes.toString('base64'));
    expect(pixel[0]).toBeGreaterThan(220); expect(pixel[1]).toBeGreaterThan(165); expect(pixel[2]).toBeLessThan(110);
  }
});

test('Invalid, oversized, damaged, and wrong-format files give actionable errors', async ({ page }) => {
  await page.goto('/compress-image-200kb/');
  await page.locator('[data-file]').setInputFiles({ name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('invalid') });
  await expect(page.locator('[data-error]')).toContainText('Format file belum');
  await page.locator('[data-file]').setInputFiles({ name: 'damaged.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([255, 216, 255, 0, 0]) });
  await expect(page.locator('[data-error]')).toContainText('Foto tidak dapat dibaca');
  await page.locator('[data-file]').setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(26 * 1024 * 1024) });
  await expect(page.locator('[data-error]')).toContainText('maksimal 25 MB');
  await page.goto('/png-to-jpg/');
  await page.locator('[data-file]').setInputFiles(await fixture(page, 'image/jpeg'));
  await expect(page.locator('[data-error]')).toContainText('Gunakan PNG');
});

test('Drag and drop accepts a photo and the primary action can be reached by keyboard', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-pick]').focus(); await expect(page.locator('[data-pick]')).toBeFocused();
  const photo = await fixture(page);
  await page.evaluate(({ base64, name }) => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const data = new DataTransfer(); data.items.add(new File([bytes], name, { type: 'image/png' }));
    document.querySelector('[data-dropzone]')!.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }));
  }, { base64: photo.buffer.toString('base64'), name: photo.name });
  await expect(page.locator('[data-editor]')).toBeVisible();
  await expect(page.locator('[data-process]')).toBeFocused();
});

test('All pages have metadata, local tool links, and no overflow at required widths', async ({ page }, info) => {
  const paths = ['/', '/compress-image/', '/compress-image-100kb/', '/compress-image-200kb/', '/compress-image-500kb/', '/resize-foto-3x4/', '/resize-foto-4x6/', '/png-to-jpg/', '/jpg-to-png/', '/privasi/'];
  for (const width of [320, 375, 414, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of paths) {
      await page.goto(path);
      expect(await page.locator('h1').count()).toBe(1);
      await expect(page.locator('meta[name=description]')).toHaveAttribute('content', /.+/);
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://beresfile.id${path}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.goto('/');
    await page.screenshot({ path: info.outputPath(`home-${width}.png`), fullPage: true });
  }
  await page.goto('/privasi/'); expect(await page.locator('script[src]').count()).toBe(0);
  const sitemap = await page.request.get('/sitemap.xml'); expect((await sitemap.text()).match(/<loc>/g)?.length).toBe(10);
  const robots = await page.request.get('/robots.txt'); expect(await robots.text()).toContain('https://beresfile.id/sitemap.xml');
});
