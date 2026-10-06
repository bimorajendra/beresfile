# BeresFile

Fourteen Indonesian image utilities built with Astro, native CSS, and browser APIs. Every file is processed locally; there are no accounts, upload endpoints, databases, or storage services.

## Development

Use Node.js 22.19+ and npm. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

```sh
npm install
npm run dev
```

Open http://localhost:4321. The homepage includes a working 200 KB compressor. Each tool also has a separate static URL.

## Verification

```sh
npm run check
npm run build
npm test
```

Browser tests use installed Google Chrome. They cover all tools, real downloaded file signatures and sizes, crop dimensions, transparent PNG backgrounds, drag and drop, errors, privacy, metadata, and page overflow at 320/375/414/768/1440 px. Screenshots are saved under `test-results/`.

## Cloudflare Workers Static Assets

Copy `.env.example` to `.env` and set `SITE_URL` to the production origin before building. You can also set it in the shell environment. The default `https://beresfile.id` is a configurable placeholder, not a registered or deployed domain. This value generates canonical URLs, sitemap, and robots.txt.

```sh
npx wrangler login
npm run deploy
```

`wrangler.jsonc` serves `dist/`, enforces trailing slashes, and uses the static 404 page. No server Worker code is required. Configure a custom domain in your Cloudflare account and rebuild using its origin. Deployment requires your Cloudflare account and has not been performed by this implementation.

See [Cloudflare's static-assets documentation](https://developers.cloudflare.com/workers/static-assets/) for account and deployment details.

## Implementation

- `src/lib/tools.ts`: page presets and relevant Indonesian copy.
- `src/lib/image.ts`: shared compression, crop, and conversion engines.
- `src/lib/tool-client.ts`: file selection, preview, processing, validation, download, URL cleanup, and local events.
- `src/components/ImageTool.astro`: accessible shared tool interface.
- `src/pages/[tool].astro`: all fourteen statically generated tool pages.

Compression exports the selected JPG, PNG, or WebP format and reduces dimensions when required to meet a target. JPG flattens transparency against white; PNG and WebP preserve transparency. Presets are 50/100/200/300/500 KB and 1 MB (1,024 KB), with an integer custom target from 1 to 25,600 KB. KB limits are measured as 1,024 bytes per KB. Custom quality preserves dimensions. Changing settings invalidates a previously generated result. Crop outputs are 236×354, 354×472, or 472×708 pixels; exact print size must be set by the user at printing time. PNG→JPG lets the user choose a background color. JPG→PNG preserves dimensions.

Files are limited to 25 MB and decoded images to 32 megapixels to limit browser memory use. Formats are verified from their signatures. Animated input produces a still image. Processing can remove metadata; EXIF-aware display orientation is handled by the browser. Always inspect the result before administrative use.

There are no active ads. Analytics is disabled by default; the site stays static with the original Wrangler configuration. Optional Cloudflare Analytics Engine collection is implemented with a small same-origin Worker endpoint, a strict event schema, and no file uploads. Follow [docs/analytics.md](docs/analytics.md) to enable it through Cloudflare Workers Builds or the CLI. The privacy page reflects the build setting. Local `beresfile:analytics` events carry `{ event, tool, mode, target, entry, source }`; neither filenames nor file content are included. Do Not Track and Global Privacy Control opt out of network analytics. Analytics failures never block tool use.

Each tool page includes intent-specific guidance, a practical checklist, usage instructions, and troubleshooting FAQs. Additional KB presets reuse the existing engine; no extra keyword-only landing pages are generated.

Production contains a shared tool script and a local image Worker; the privacy page sends no processing JavaScript. Supported browsers process images and create ZIP archives in the Worker, with main-thread processing available when Worker APIs are unavailable. No processing dependencies or external fonts are used.

Compression supports JPG, PNG, and WebP output. Batch compression accepts up to 20 files and 128 MB of total input, processes files sequentially, and exports successful results in a ZIP with unique filenames. Total retained output is capped at 128 MB. Changing settings invalidates the ZIP. Resize supports pixel dimensions, percentages, and an aspect-ratio lock. The crop selector supports 2×3, 3×4, and 4×6 with an optional KB limit that preserves output dimensions.
