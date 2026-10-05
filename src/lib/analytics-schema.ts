export const ANALYTICS_EVENTS = ['tool_opened', 'file_selected', 'processing_success', 'processing_error', 'download_clicked'] as const;
export type AnalyticsEvent = typeof ANALYTICS_EVENTS[number];
export type AnalyticsPayload = {
  event: AnalyticsEvent;
  tool: string;
  mode: 'preset' | 'custom' | 'quality' | 'crop' | 'convert';
  target: number;
  entry: 'home' | 'tool';
  source: 'search' | 'direct' | 'other';
};

const keys = ['event', 'tool', 'mode', 'target', 'entry', 'source'];
export function isAnalyticsPayload(input: unknown): input is AnalyticsPayload {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))) return false;
  if (typeof value.tool !== 'string') return false;
  const kind = /^compress-image(?:-(100|200|500)kb)?$/.test(value.tool) ? 'compress'
    : /^resize-foto-(3x4|4x6)$/.test(value.tool) ? 'crop'
    : ['png-to-jpg', 'jpg-to-png'].includes(value.tool) ? 'convert' : undefined;
  if (!kind || !ANALYTICS_EVENTS.includes(value.event as AnalyticsEvent)) return false;
  if (typeof value.entry !== 'string' || !['home', 'tool'].includes(value.entry)) return false;
  if (typeof value.source !== 'string' || !['search', 'direct', 'other'].includes(value.source)) return false;
  if (typeof value.mode !== 'string' || typeof value.target !== 'number' || !Number.isInteger(value.target) || value.target < 0 || value.target > 25 * 1024) return false;
  if (kind === 'compress') return ['preset', 'custom', 'quality'].includes(value.mode) && (value.mode !== 'quality' || value.target === 0);
  return value.mode === kind && value.target === 0;
}
