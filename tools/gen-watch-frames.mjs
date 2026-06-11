#!/usr/bin/env node
// gen-watch-frames.mjs — generates the Apple Watch device-frame assets.
//
// Unlike the phone/tablet/laptop frames (sourced bitmap art), the watch
// frames are drawn programmatically as SVG (case, black glass bezel, band
// stubs, digital crown + side button — and crown guard / orange action
// button for the Ultra) and rasterized to RGBA PNGs with a transparent
// screen cutout, matching the static/devices/<slug>/{color}.png +
// display.svg layout the device registry expects.
//
// Geometry MUST stay in sync with the entries in
// src/lib/stores/devices.svelte.ts (pngW/pngH/svgW/svgH; screen centered).
// Screen px are 2× the App Store Connect screenshot size:
//   Series 10/11 46mm → ASC 416×496 → screen 832×992
//   Ultra 49mm        → ASC 410×502 → screen 820×1004
//
// Usage: node tools/gen-watch-frames.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Rounded-rect path (clockwise) — same shape style as the existing display.svg masks. */
function rr(x, y, w, h, r) {
	r = Math.min(r, w / 2, h / 2);
	return `M ${x + r},${y} H ${x + w - r} Q ${x + w},${y} ${x + w},${y + r} V ${y + h - r} Q ${x + w},${y + h} ${x + w - r},${y + h} H ${x + r} Q ${x},${y + h} ${x},${y + h - r} V ${y + r} Q ${x},${y} ${x + r},${y} Z`;
}

const DEVICES = [
	{
		slug: 'apple-watch-series-10-46mm',
		pngW: 1052, pngH: 1572,
		screen: { x: 110, y: 290, w: 832, h: 992, r: 200 },
		case: { x: 50, y: 230, w: 952, h: 1112, r: 330 },
		glass: { x: 76, y: 256, w: 900, h: 1060, r: 300 },
		band: { x: 326, w: 400, topY: 10, topH: 240, botY: 1322, botH: 240, r: 28 },
		crown: { x: 996, y: 560, w: 48, h: 170, r: 16 },
		sideButton: { x: 1000, y: 790, w: 40, h: 230, r: 12 },
		colors: {
			'jet-black': { hi: '#3a3a3e', base: '#1f1f21', lo: '#0c0c0e' },
			'rose-gold': { hi: '#f6d7c9', base: '#e6b9a8', lo: '#c9937f' },
			'silver': { hi: '#f2f3f5', base: '#d7d8da', lo: '#aeb0b4' }
		}
	},
	{
		slug: 'apple-watch-ultra-49mm',
		pngW: 1080, pngH: 1608,
		screen: { x: 130, y: 302, w: 820, h: 1004, r: 150 },
		case: { x: 58, y: 230, w: 964, h: 1148, r: 250 },
		glass: { x: 88, y: 260, w: 904, h: 1088, r: 210 },
		band: { x: 310, w: 460, topY: 10, topH: 240, botY: 1358, botH: 240, r: 28 },
		crownGuard: { x: 1008, y: 600, w: 64, h: 420, r: 22 },
		crown: { x: 1018, y: 660, w: 54, h: 170, r: 16 },
		sideButton: { x: 1022, y: 890, w: 46, h: 160, r: 14 },
		actionButton: { x: 12, y: 690, w: 46, h: 240, r: 14 },
		colors: {
			'natural-titanium': { hi: '#d9d5cc', base: '#b8b3aa', lo: '#8e897f' },
			'black-titanium': { hi: '#6a6a70', base: '#46464a', lo: '#2a2a2e' }
		}
	}
];

const BAND = { hi: '#3c3c3f', base: '#2e2e30', lo: '#1c1c1e' };
const ORANGE = { hi: '#ff8a3d', base: '#ff5c00', lo: '#cc4400' };

function crownRidges(c) {
	// subtle horizontal ridge lines on the digital crown
	let out = '';
	for (let y = c.y + 18; y < c.y + c.h - 14; y += 14) {
		out += `<line x1="${c.x + 6}" y1="${y}" x2="${c.x + c.w - 6}" y2="${y}" stroke="rgba(0,0,0,0.25)" stroke-width="3"/>`;
	}
	return out;
}

function frameSvg(d, col) {
	const { pngW, pngH, screen: s } = d;
	const grad = (id, c) =>
		`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">` +
		`<stop offset="0" stop-color="${c.hi}"/><stop offset="0.5" stop-color="${c.base}"/><stop offset="1" stop-color="${c.lo}"/></linearGradient>`;
	const rect = (b, fill, extra = '') =>
		`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${b.r}" fill="${fill}" ${extra}/>`;

	const parts = [];
	// Band stubs (behind the case)
	parts.push(rect({ x: d.band.x, y: d.band.topY, w: d.band.w, h: d.band.topH, r: d.band.r }, 'url(#band)'));
	parts.push(rect({ x: d.band.x, y: d.band.botY, w: d.band.w, h: d.band.botH, r: d.band.r }, 'url(#band)'));
	// Hardware on the case sides (behind the case so it reads as protruding)
	if (d.crownGuard) parts.push(rect(d.crownGuard, 'url(#case)', 'stroke="rgba(0,0,0,0.35)" stroke-width="2"'));
	parts.push(rect(d.crown, 'url(#case)', 'stroke="rgba(0,0,0,0.4)" stroke-width="2"'));
	parts.push(crownRidges(d.crown));
	parts.push(rect(d.sideButton, 'url(#case)', 'stroke="rgba(0,0,0,0.4)" stroke-width="2"'));
	if (d.actionButton) parts.push(rect(d.actionButton, 'url(#action)', 'stroke="rgba(0,0,0,0.3)" stroke-width="2"'));
	// Case
	parts.push(rect(d.case, 'url(#case)'));
	parts.push(rect(d.case, 'none', 'stroke="rgba(255,255,255,0.18)" stroke-width="2"'));
	// Black glass front
	parts.push(rect(d.glass, '#050505'));
	parts.push(rect(d.glass, 'none', 'stroke="rgba(255,255,255,0.08)" stroke-width="2"'));

	return `<svg width="${pngW}" height="${pngH}" viewBox="0 0 ${pngW} ${pngH}" fill="none" xmlns="http://www.w3.org/2000/svg">
<defs>${grad('case', col)}${grad('band', BAND)}${d.actionButton ? grad('action', ORANGE) : ''}
<mask id="screen-hole"><rect width="${pngW}" height="${pngH}" fill="white"/><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.r}" fill="black"/></mask></defs>
<g mask="url(#screen-hole)">${parts.join('\n')}</g>
</svg>`;
}

function displaySvg(d) {
	const s = d.screen;
	return `<svg width="${s.w}" height="${s.h}" viewBox="0 0 ${s.w} ${s.h}" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="${rr(0, 0, s.w, s.h, s.r)}" fill="white"/>
</svg>
`;
}

async function main() {
	const { chromium } = await import('playwright');
	const browser = await chromium.launch();
	const page = await browser.newPage({ deviceScaleFactor: 1 });
	try {
		for (const d of DEVICES) {
			const dir = join(REPO_ROOT, 'static', 'devices', d.slug);
			await mkdir(dir, { recursive: true });
			await writeFile(join(dir, 'display.svg'), displaySvg(d));
			for (const [slug, col] of Object.entries(d.colors)) {
				const html = `<!doctype html><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style>${frameSvg(d, col)}`;
				await page.setViewportSize({ width: d.pngW, height: d.pngH });
				await page.setContent(html, { waitUntil: 'load' });
				const png = await page.screenshot({
					omitBackground: true,
					clip: { x: 0, y: 0, width: d.pngW, height: d.pngH }
				});
				await writeFile(join(dir, `${slug}.png`), png);
				console.log(`✓ ${d.slug}/${slug}.png (${d.pngW}×${d.pngH})`);
			}
			console.log(`✓ ${d.slug}/display.svg (${d.screen.w}×${d.screen.h})`);
		}
	} finally {
		await browser.close();
	}
}

main().catch((e) => { console.error(e); process.exit(1); });
