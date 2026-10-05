import { test, expect } from '@playwright/test';
import worker from '../src/analytics-worker';

const origin = 'https://beresfile.id';
const payload = { event: 'processing_success', tool: 'compress-image', mode: 'custom', target: 175, entry: 'tool', source: 'search' };

test('Analytics collector stores only allowed event dimensions', async () => {
  const points: unknown[] = [];
  const env = { ASSETS: { fetch: async () => new Response('asset') }, ANALYTICS: { writeDataPoint: (value: unknown) => { points.push(value); } } };
  const request = new Request(`${origin}/api/events`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'User-Agent': 'private browser', 'CF-Connecting-IP': '192.0.2.1' }, body: JSON.stringify(payload) });
  expect((await worker.fetch(request, env)).status).toBe(204);
  expect(points).toEqual([{ indexes: ['compress-image'], blobs: ['compress-image', 'processing_success', 'custom', 'tool', 'search'], doubles: [1, 175] }]);
  expect(await (await worker.fetch(new Request(`${origin}/`), env)).text()).toBe('asset');
});

test('Collector rejects file data, malformed events, foreign origins, and large bodies', async () => {
  const points: unknown[] = [];
  const env = { ASSETS: { fetch: async () => new Response('asset') }, ANALYTICS: { writeDataPoint: (value: unknown) => { points.push(value); } } };
  for (const value of [{ ...payload, filename: 'passport.png' }, { ...payload, data: 'data:image/png;base64,secret' }, { ...payload, tool: 'private-filename' }, { ...payload, event: 'arbitrary-text' }, { ...payload, mode: 'crop' }, { ...payload, target: -1 }, { ...payload, source: 'https://private.example' }, { ...payload, source: ['search'] }, { ...payload, entry: ['tool'] }, { ...payload, mode: ['custom'] }]) {
    const request = new Request(`${origin}/api/events`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    expect((await worker.fetch(request, env)).status).toBe(400);
  }
  expect((await worker.fetch(new Request(`${origin}/api/events`, { method: 'POST', headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }), env)).status).toBe(403);
  expect((await worker.fetch(new Request(`${origin}/api/events`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'multipart/form-data' }, body: 'file' }), env)).status).toBe(415);
  expect((await worker.fetch(new Request(`${origin}/api/events`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: 'x'.repeat(1025) }), env)).status).toBe(413);
  expect((await worker.fetch(new Request(`${origin}/api/events`), env)).status).toBe(405);
  expect(points).toEqual([]);
});

test('Collector honors privacy opt-outs', async () => {
  const points: unknown[] = [];
  const env = { ASSETS: { fetch: async () => new Response('asset') }, ANALYTICS: { writeDataPoint: (value: unknown) => { points.push(value); } } };
  for (const header of ['DNT', 'Sec-GPC']) {
    const request = new Request(`${origin}/api/events`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', [header]: '1' }, body: JSON.stringify(payload) });
    expect((await worker.fetch(request, env)).status).toBe(204);
  }
  expect(points).toEqual([]);
});
