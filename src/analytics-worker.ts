import { isAnalyticsPayload } from './lib/analytics-schema';

type Environment = {
  ASSETS: { fetch(request: Request): Promise<Response> };
  ANALYTICS?: { writeDataPoint(point: { blobs: string[]; doubles: number[]; indexes: string[] }): void };
};

function response(status: number): Response {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/api/events') return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return response(405);
    if (!env.ANALYTICS) return response(503);
    if (request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') return response(403);
    if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') return response(415);
    if (request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1') return response(204);
    const length = Number(request.headers.get('Content-Length'));
    if (length > 1024) return response(413);
    // Read a bounded body rather than buffering an arbitrary upload.
    const reader = request.body?.getReader();
    if (!reader) return response(400);
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 1024) { await reader.cancel(); return response(413); }
        chunks.push(chunk.value);
      }
      const body = new Uint8Array(bytes);
      let offset = 0;
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
      const payload: unknown = JSON.parse(new TextDecoder().decode(body));
      if (!isAnalyticsPayload(payload)) return response(400);
      env.ANALYTICS.writeDataPoint({
        indexes: [payload.tool],
        blobs: [payload.tool, payload.event, payload.mode, payload.entry, payload.source],
        doubles: [1, payload.target],
      });
      return response(204);
    } catch { return response(400); }
  },
};
