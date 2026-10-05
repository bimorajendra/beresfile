import { test, expect } from '@playwright/test';

test('Visible text meets WCAG AA contrast and tool buttons have 44px touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  for (const path of ['/', '/compress-image/', '/resize-foto-3x4/', '/png-to-jpg/', '/privasi/']) {
    await page.goto(path);
    const failures = await page.evaluate(() => {
      const rgb = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
      const luminance = (values: number[]) => values.slice(0, 3).map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
      const bad: string[] = [];
      document.querySelectorAll<HTMLElement>('body *').forEach(element => {
        if (!element.getClientRects().length || ['SCRIPT', 'STYLE', 'SVG', 'PATH', 'INPUT'].includes(element.tagName)) return;
        const text = [...element.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent?.trim()).filter(Boolean).join(' ');
        if (!text) return;
        const style = getComputedStyle(element);
        let parent: HTMLElement | null = element, background = [255, 255, 255];
        while (parent) {
          const color = rgb(getComputedStyle(parent).backgroundColor);
          if (color.length === 3 || color[3] === 1) { background = color; break; }
          parent = parent.parentElement;
        }
        const foreground = luminance(rgb(style.color)), behind = luminance(background);
        const contrast = (Math.max(foreground, behind) + .05) / (Math.min(foreground, behind) + .05);
        const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
        if (contrast < (large ? 3 : 4.5)) bad.push(`${text}: ${contrast.toFixed(2)} (${style.color})`);
      });
      return bad;
    });
    expect(failures, path).toEqual([]);
    const buttons = page.locator('button:visible');
    for (const button of await buttons.all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});
