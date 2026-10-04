#!/usr/bin/env node
// Turns the default build (build/) into what monkr.wemiller.com now publishes:
// every page becomes legacy/redirect.html (forwarding to wemiller.com/tools/monkr/),
// legacy/migrate.html is added for handing saved work to the new address, and the
// device frames, backgrounds and _app/ bundle stay exactly where they were.
//
//   node scripts/legacy-site.mjs [buildDir]
//
// MONKR_NEW_BASE and MONKR_ALLOWED_ORIGINS (comma-separated) override the
// production addresses, for testing the hand-over locally.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] ?? join(root, 'build');
const newBase = process.env.MONKR_NEW_BASE ?? 'https://wemiller.com/tools/monkr/';
const allowed = (process.env.MONKR_ALLOWED_ORIGINS ?? 'https://wemiller.com,https://www.wemiller.com')
	.split(',').map((s) => s.trim()).filter(Boolean);

if (!existsSync(join(out, 'index.html'))) throw new Error(`${out}: no index.html — build first`);

const redirect = readFileSync(join(root, 'legacy/redirect.html'), 'utf8').replaceAll('__NEW_BASE__', newBase);
const migrate = readFileSync(join(root, 'legacy/migrate.html'), 'utf8').replace('__ALLOWED_ORIGINS__', JSON.stringify(allowed));

// Top-level pages only: index.html (also the SPA fallback), calibrate.html, headless.html.
const pages = readdirSync(out).filter((f) => f.endsWith('.html'));
for (const page of pages) writeFileSync(join(out, page), redirect);
writeFileSync(join(out, '404.html'), redirect);
writeFileSync(join(out, 'migrate.html'), migrate);
console.log(`legacy site: ${[...pages, '404.html'].join(', ')} → ${newBase}; migrate.html for ${allowed.join(', ')}`);
