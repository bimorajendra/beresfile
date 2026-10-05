import { isAnalyticsPayload } from './analytics-schema';
import type { AnalyticsPayload } from './analytics-schema';
export type { AnalyticsEvent } from './analytics-schema';

function source(): AnalyticsPayload['source'] {
  if (!document.referrer) return 'direct';
  try {
    const hostname = new URL(document.referrer).hostname;
    return /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com)$/.test(hostname) ? 'search' : 'other';
  } catch { return 'other'; }
}

export function trackEvent(event: Omit<AnalyticsPayload, 'entry' | 'source'>, enabled = false): void {
  const payload: AnalyticsPayload = { ...event, entry: location.pathname === '/' ? 'home' : 'tool', source: source() };
  if (!isAnalyticsPayload(payload)) return;
  window.dispatchEvent(new CustomEvent('beresfile:analytics', { detail: payload }));
  const privacy = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (!enabled || navigator.doNotTrack === '1' || privacy.globalPrivacyControl) return;
  // Only the fixed, validated schema is serialized. Cookies and referrer are omitted.
  void fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
    keepalive: true,
  }).catch(() => {});
}
