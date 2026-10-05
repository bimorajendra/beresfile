import { defineConfig } from 'astro/config';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  site: process.env.SITE_URL || 'https://beresfile.id',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
