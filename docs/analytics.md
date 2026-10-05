# Privacy-friendly tool analytics

The default deployment remains static and sends no analytics requests. To collect aggregate tool events on Cloudflare, use the optional collector configuration below. File decoding, preview, compression, cropping, conversion, and download remain entirely in the browser.

## Enable in Cloudflare Workers Builds

1. Enable Workers Analytics Engine for your Cloudflare account if required.
2. Set the build variable `PUBLIC_ANALYTICS_PROVIDER=cloudflare` alongside your production `SITE_URL`.
3. Keep the build command `npm run build`.
4. Change the deploy command to `npx wrangler deploy --config wrangler.analytics.jsonc`.
5. Redeploy and process a test image, then click Download foto.

The dataset `beresfile_events` is created after the first accepted event. The Worker handles `/api/events`; other paths continue to use Static Assets. This feature has been implemented and tested locally but has not been deployed or enabled on your Cloudflare account.

For a local CLI deployment, set `PUBLIC_ANALYTICS_PROVIDER=cloudflare` in `.env`, then run:

```sh
npm run build
npx wrangler deploy --config wrangler.analytics.jsonc
```

To disable it again, set the build variable to `off` and redeploy using the original `wrangler.jsonc` configuration.

## Data collected

Each request contains exactly these fields:

| Field | Allowed values |
| --- | --- |
| `event` | `tool_opened`, `file_selected`, `processing_success`, `processing_error`, `download_clicked` |
| `tool` | One of the actual eight tool slugs |
| `mode` | `preset`, `custom`, `quality`, `crop`, `convert` |
| `target` | Target KB between 0 and 25,600; 0 for quality, crop, or conversion |
| `entry` | `home` or `tool` |
| `source` | `search`, `direct`, or `other` |

No filenames, file sizes, dimensions, image data, error text, page query strings, full referrers, IP addresses, user agents, cookies, user IDs, session IDs, or fingerprints are written to Analytics Engine. The timestamp is assigned by Cloudflare. `source` is a coarse classification of the browser referrer; the referrer itself is never sent. Referrer restrictions can cause search traffic to appear as direct.

The browser request omits credentials and referrer. Do Not Track and Global Privacy Control opt out of network analytics. Failed analytics requests never prevent processing or download.

The endpoint accepts same-origin JSON requests up to 1,024 bytes, rejects extra fields and unknown values, and writes only the validated schema. It does not log the request body or incoming headers. Cloudflare still processes network connection data to serve requests, as described on the privacy page.

## Read the funnel

Use the Analytics Engine SQL API with your account ID and an API token with Account Analytics Read permission. Keep that token outside the browser and repository. Query:

```sql
SELECT
  blob1 AS tool,
  blob2 AS event,
  SUM(_sample_interval) AS event_count
FROM beresfile_events
WHERE timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY blob1, blob2
ORDER BY tool, event
```

Group additionally by `blob3` for preset/custom/quality usage, by `blob4` for homepage/tool entry, and by `blob5` for coarse traffic source. `double2` holds the target KB. `_sample_interval` weights sampled events.

These are aggregate event counts, not matched user sessions. Ratios such as success/file-selected and download/success are directional product indicators, not a unique-person conversion funnel. Repeated processing and repeated clicks count as multiple events. A download event means the user clicked the download link; it does not confirm that the OS saved the file.

Cloudflare Web Analytics can separately measure page views and performance, but it does not currently support these custom events. No Web Analytics beacon is included here.

References: [Analytics Engine setup](https://developers.cloudflare.com/analytics/analytics-engine/get-started/), [SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/), [Static Assets bindings](https://developers.cloudflare.com/workers/static-assets/binding/), [Web Analytics custom events](https://developers.cloudflare.com/web-analytics/faq/).
