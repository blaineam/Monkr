// End-to-end proof that a "transparent" background really exports with alpha.
//
// Drives the same code path as the editor's Download button: cli/render.mjs
// builds the static site, serves it over 127.0.0.1, and calls
// window.__monkr.render() on the /headless route, which calls
// captureToDataUrl() — the exact function behind the Download button. Then we
// decode the PNG and look at real pixels, because "the code looks right" is
// what let this bug ship twice.
//
//   npm test   (node --test "tools/test/*.test.mjs")
//
// The slow test in the suite: it needs a real Vite build and a Chromium. No
// network — Chromium is a pre-downloaded local binary and every asset is served
// from build/. Skips (rather than fails) when the browser isn't installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { render, REPO_ROOT } from '../../cli/render.mjs';
import { decodePNG } from '../measure-bezel.mjs';

const W = 600;
const H = 1000;

// The editor checkerboard is a 20px repeating-conic-gradient whose other half
// is *transparent*, so an individual pixel can read alpha 0 even when the board
// is fully baked in. Corners must be scanned as a block spanning several tiles.
const BLOCK = 64;

const TIMEOUT = 10 * 60 * 1000; // cold `vite build` + browser launch

async function chromiumAvailable() {
	try {
		const { chromium } = await import('playwright');
		return existsSync(chromium.executablePath());
	} catch {
		return false;
	}
}

/**
 * A one-device project on a transparent background, with everything that could
 * bleed translucent pixels toward the edges turned off. `format` is what gets
 * persisted into the .monkr — the point of the second test is that a stale
 * 'jpg' must not defeat transparency.
 */
function transparentProject(format) {
	return {
		version: 3,
		background: {
			type: 'transparent',
			solidColor: '#000000',
			gradientCss: '',
			gradientName: '',
			imageUrl: null
		},
		canvasSize: { width: W, height: H, presetName: 'Custom' },
		padding: 80,
		exportConfig: { scale: 1, format },
		textOverlay: {},
		textBlocks: [],
		sceneObjects: [
			{
				id: 'obj-1',
				deviceId: 'iphone-17-pro-max',
				deviceColorId: 'cosmic-orange',
				screenshotUrl: null,
				screenshotFile: null,
				extraScreenshots: [],
				x: 50,
				y: 50,
				scale: 1,
				rotation: 0,
				tiltX: 0,
				tiltY: 0,
				// shadow and glow are drop-shadow filters — they spray
				// semi-transparent pixels into the corners and would make the
				// alpha assertion meaningless. Off on purpose.
				shadow: { enabled: false, color: 'rgba(0,0,0,0)', blur: 0, spread: 0, offsetX: 0, offsetY: 0 },
				frameStyle: 'default',
				borderRadius: 16,
				glow: { enabled: false, color: 'rgba(255,255,255,0)', blur: 0, spread: 0 }
			}
		]
	};
}

/** Render one project through the real pipeline and decode the single output. */
async function renderOne(project, name) {
	const dir = mkdtempSync(join(tmpdir(), `monkr-${name}-`));
	const projectPath = join(dir, 'project.monkr');
	writeFileSync(projectPath, JSON.stringify(project, null, 2));

	const written = await render({
		monkr: projectPath,
		out: join(dir, 'out'),
		// The headless renderer emits one image per screenshot and the project
		// embeds none, so without this it would render nothing at all.
		shots: [join(REPO_ROOT, 'static', 'favicon-32x32.png')],
		// Not forced: ensureBuild rebuilds whenever src/ is newer than the bundle,
		// so pixels are never asserted against stale output, and repeat runs skip
		// the build. (npm test sets --test-concurrency=1 — two vite builds writing
		// the same build/ race and fail the prerender.)
		build: false
	});
	assert.equal(written.length, 1, 'renderer produced exactly one frame');
	return { path: written[0], img: decodePNG(readFileSync(written[0])) };
}

function assertTransparentCorners(img, path) {
	assert.equal(img.width, W);
	assert.equal(img.height, H);

	for (const [ox, oy, name] of [
		[0, 0, 'top-left'],
		[W - BLOCK, 0, 'top-right'],
		[0, H - BLOCK, 'bottom-left'],
		[W - BLOCK, H - BLOCK, 'bottom-right']
	]) {
		let opaque = 0;
		for (let y = oy; y < oy + BLOCK; y++) {
			for (let x = ox; x < ox + BLOCK; x++) if (img.alphaAt(x, y) !== 0) opaque++;
		}
		assert.equal(
			opaque,
			0,
			`${path}: ${name} corner has ${opaque}/${BLOCK * BLOCK} non-transparent px — ` +
				'something (checkerboard? matte?) was baked into a transparent export'
		);
	}

	// Inverse guard: a blank or failed capture is trivially transparent
	// everywhere and would satisfy the assertions above without proving anything.
	let sampled = 0;
	let opaque = 0;
	for (let y = 0; y < H; y += 4) {
		for (let x = 0; x < W; x += 4) {
			sampled++;
			if (img.alphaAt(x, y) === 255) opaque++;
		}
	}
	assert.ok(
		opaque > sampled * 0.1,
		`${path}: only ${opaque}/${sampled} opaque samples — the capture looks empty, ` +
			'so the transparency assertion above proved nothing'
	);
}

test('transparent background exports a PNG with real alpha', { timeout: TIMEOUT }, async (t) => {
	if (!(await chromiumAvailable())) {
		t.skip('playwright chromium not installed — run: npx playwright install chromium');
		return;
	}
	const { path, img } = await renderOne(transparentProject('png'), 'png');
	assertTransparentCorners(img, path);
});

// A project saved while the format picker was on JPG must not come back opaque
// black: store.exportConfig coerces jpg -> png while the background is
// transparent, and the CLI inherits the project's format when --format is
// omitted. This is the regression that made the Download button look broken.
test('transparent + stale format:jpg still exports transparent PNG', { timeout: TIMEOUT }, async (t) => {
	if (!(await chromiumAvailable())) {
		t.skip('playwright chromium not installed — run: npx playwright install chromium');
		return;
	}
	const { path, img } = await renderOne(transparentProject('jpg'), 'jpg');
	assert.ok(path.endsWith('.png'), `expected a .png, got ${path}`);
	assertTransparentCorners(img, path);
});
