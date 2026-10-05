# BeresFile

Eight Indonesian image utilities built with Astro, native CSS, and browser APIs. Every file is processed locally; there are no accounts, upload endpoints, databases, or storage services.

## Development

Use Node.js 22.19+ and npm. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

```sh
npm install
npm run dev
```

Open http://localhost:4321. The homepage includes a working 200 KB compressor. Each of the eight tools also has a separate static URL.

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
- `src/pages/[tool].astro`: all eight statically generated tool pages.

Compression exports JPG, flattens transparency against white, searches JPEG quality, and reduces dimensions when required to meet a target. KB limits are measured as 1,024 bytes per KB. Custom quality preserves dimensions. Crop outputs are 354×472 or 472×708 pixels; exact print size must be set by the user at printing time. PNG→JPG lets the user choose a background color. JPG→PNG preserves dimensions.

Files are limited to 25 MB and decoded images to 32 megapixels to limit browser memory use. Formats are verified from their signatures. Animated input produces a still image. Processing can remove metadata; EXIF-aware display orientation is handled by the browser. Always inspect the result before administrative use.

There are no active ads or third-party analytics. A local `beresfile:analytics` CustomEvent contains only `{ event, tool }` for `tool_opened`, `file_selected`, `processing_success`, `processing_error`, and `download_clicked`. It never includes filenames, image data, or file content. To connect a real provider, update the privacy page and the restrictive `public/_headers` policy. Reserve any ad placement in supporting content, away from file and download controls, before loading an ad script.

Production contains one small shared tool script; the privacy page sends no processing JavaScript. No processing dependencies or external fonts are used.
