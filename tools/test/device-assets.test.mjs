// Every registered device colour must have frame art on disk.
//
// A missing frame PNG fails *silently*: getFrameUrl() builds
// /devices/{slug}/{colorSlug}.png, the <img> 404s, and the device renders as a
// bare screenshot with no bezel at all — which reads as "the mockup disappeared"
// rather than "an asset is missing". iPhone 16 Pro Max shipped that way, because
// its Desert Titanium entry used slug 'desert-titanium' while the art on disk is
// gold-titanium.png. Nothing caught it.
//
// The check runs against the real registry (via the /headless automation route)
// rather than parsing devices.svelte.ts, so it can't drift from what the app
// actually resolves at runtime.
//
//   npm test   (node --test "tools/test/*.test.mjs")
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT, ensureBuild, startServer } from '../../cli/render.mjs';

const TIMEOUT = 10 * 60 * 1000; // cold `vite build` + browser launch

async function chromiumAvailable() {
	try {
		const { chromium } = await import('playwright');
		return existsSync(chromium.executablePath());
	} catch {
		return false;
	}
}

test('every device colour has frame art and a screen mask', { timeout: TIMEOUT }, async (t) => {
	if (!(await chromiumAvailable())) {
		t.skip('playwright chromium not installed — run: npx playwright install chromium');
		return;
	}

	// Not forced: ensureBuild rebuilds when src/ is newer than the bundle, so the
	// first e2e file to run pays for the build and the rest reuse it. (npm test
	// sets --test-concurrency=1 — two vite builds writing the same build/ race and
	// fail the prerender.)
	const buildDir = join(REPO_ROOT, 'build');
	ensureBuild(buildDir, false);
	const server = await startServer(buildDir);
	const { port } = server.address();
	const { chromium } = await import('playwright');
	const browser = await chromium.launch();

	let result;
	try {
		const page = await browser.newPage();
		await page.goto(`http://127.0.0.1:${port}/headless`, { waitUntil: 'networkidle' });
		await page.waitForFunction('!!window.__monkr?.devices', null, { timeout: 30000 });

		result = await page.evaluate(async () => {
			const broken = [];
			let checked = 0;
			for (const d of window.__monkr.devices) {
				// '_css' devices (TV, browser chrome) are drawn in CSS, no art to load.
				if (d.slug === '_css') continue;
				const urls = [
					...d.colors.map((c) => `/devices/${d.slug}/${c.slug}.png`),
					`/devices/${d.slug}/display.svg`
				];
				for (const url of urls) {
					checked++;
					const r = await fetch(url, { method: 'HEAD' });
					const ct = r.headers.get('content-type') || '';
					// The static server falls back to index.html for unknown paths, so a
					// missing asset comes back 200 text/html rather than 404 — assert on
					// the content type, not just r.ok.
					if (!r.ok || !/^(image|text\/xml|image\/svg)/.test(ct)) {
						broken.push(`${d.id}: ${url} → ${r.status} ${ct}`);
					}
				}
			}
			return { checked, broken, devices: window.__monkr.devices.length };
		});
	} finally {
		await browser.close();
		server.close();
	}

	assert.ok(result.checked > 0, 'no device assets were checked — registry looks empty');
	assert.deepEqual(
		result.broken,
		[],
		`${result.broken.length} device asset(s) missing or not an image:\n  ${result.broken.join('\n  ')}`
	);
});
