// Unit tests for the sync-bezels helpers. Fixture-based, no network, no DMGs.
//   npm test   (node --test tools/test/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

import {
	classDefaults, classifyDevice, diffManifest, groupVariants, maskSVG,
	overlapReport, parseBezelLinks, parseVariants, pngPayload, slugify, yearFromFile
} from '../lib/bezel-sync.mjs';
import { measure } from '../measure-bezel.mjs';
import { mergeDevices } from '../../src/lib/stores/devices.merge.js';

const here = dirname(fileURLToPath(import.meta.url));

// ── page parsing ──────────────────────────────────────────────────────────
test('parseBezelLinks finds Bezel-*.dmg with h5 names, ignores other DMGs', () => {
	const html = readFileSync(join(here, 'fixtures/resources-page.html'), 'utf8');
	const links = parseBezelLinks(html);
	assert.deepEqual(links.map((l) => l.file).sort(), [
		'Bezel-Apple-Watch-Series-11-2025.dmg',
		'Bezel-Studio-Displays.dmg',
		'Bezel-iPad-Pro-(M5).dmg',
		'Bezel-iPhone-17.dmg'
	].sort());
	const byFile = Object.fromEntries(links.map((l) => [l.file, l]));
	assert.equal(byFile['Bezel-iPhone-17.dmg'].name, 'iPhone 17');
	assert.equal(byFile['Bezel-iPad-Pro-(M5).dmg'].name, 'iPad Pro (M5)');
	// &nbsp; in Apple's headings must be decoded
	assert.equal(byFile['Bezel-Apple-Watch-Series-11-2025.dmg'].name, 'Apple Watch Series 11');
	assert.equal(
		byFile['Bezel-iPhone-17.dmg'].url,
		'https://devimages-cdn.apple.com/design/resources/download/Bezel-iPhone-17.dmg'
	);
	// SF-Pro.dmg and Keynote-Live-Video-Product-Bezel.dmg must not appear
	assert.ok(!links.some((l) => /SF-Pro|Keynote/.test(l.file)));
});

// ── classification ────────────────────────────────────────────────────────
test('classifyDevice', () => {
	assert.equal(classifyDevice('Bezel-iPhone-17.dmg'), 'iphone');
	assert.equal(classifyDevice('Bezel-iPad-mini-(A17-Pro).dmg'), 'ipad');
	assert.equal(classifyDevice('Bezel-MacBook-Neo.dmg'), 'mac');
	assert.equal(classifyDevice('Bezel-iMac-M4.dmg'), 'mac');
	assert.equal(classifyDevice('Bezel-Studio-Displays.dmg'), 'display');
	assert.equal(classifyDevice('Bezel-Apple-TV.dmg'), 'tv');
	assert.equal(classifyDevice('Bezel-Apple-Watch-Ultra-3-2025.dmg'), 'watch');
	assert.equal(classifyDevice('macbook-pro-16'), 'mac'); // hand-tuned slug form
	assert.equal(classifyDevice('pixel-7-pro'), 'unknown');
});

test('classDefaults maps device classes to registry categories', () => {
	assert.equal(classDefaults('iphone').category, 'phone');
	assert.equal(classDefaults('ipad').category, 'tablet');
	assert.equal(classDefaults('mac').category, 'laptop');
	assert.equal(classDefaults('display').category, 'other'); // Studio Display → "Misc" tab
	assert.equal(classDefaults('tv').category, 'tv');
	assert.equal(classDefaults('watch').category, 'watch');
	assert.equal(classDefaults('unknown').category, 'laptop');
});

// ── slugs ─────────────────────────────────────────────────────────────────
test('slugify follows Monkr conventions', () => {
	assert.equal(slugify('iPad Pro (M5) 13"'), 'ipad-pro-m5-13');
	assert.equal(slugify('iPad Pro (M5) 11"'), 'ipad-pro-m5-11');
	assert.equal(slugify('iMac M4 24-inch'), 'imac-m4-24');
	assert.equal(slugify('iPhone 17 Pro Max'), 'iphone-17-pro-max');
	assert.equal(slugify('Apple Watch S11 46mm'), 'apple-watch-s11-46mm');
	assert.equal(slugify('Space Black'), 'space-black');
	assert.equal(slugify('Aluminum Jet Black + Sport Band Black'), 'aluminum-jet-black-sport-band-black');
});

test('yearFromFile', () => {
	assert.equal(yearFromFile('Bezel-Apple-Watch-Series-11-2025.dmg'), 2025);
	assert.equal(yearFromFile('Bezel-iPhone-17.dmg'), null);
});

// ── variant parsing (the four DMG layouts Apple ships) ───────────────────
test('parseVariants: iPhone layout (model dir, " - " separated, orientation)', () => {
	const v = parseVariants([
		'iPhone 17/iPhone 17 - Black - Portrait.png',
		'iPhone 17/iPhone 17 - Black - Landscape.png',
		'iPhone 17 Pro/iPhone 17 Pro - Deep Blue - Portrait.png'
	]);
	assert.deepEqual(v[0], {
		rel: 'iPhone 17/iPhone 17 - Black - Portrait.png',
		model: 'iPhone 17', color: 'Black', orientation: 'portrait'
	});
	assert.equal(v[1].orientation, 'landscape');
	assert.equal(v[2].model, 'iPhone 17 Pro');
	assert.equal(v[2].color, 'Deep Blue');
});

test('parseVariants: watch layout (band dirs, size segment)', () => {
	const v = parseVariants([
		'Sport Band/Apple Watch S11 - 46mm - Aluminum Jet Black + Sport Band Black.png',
		'Milanese Loop/Apple Watch S11 - 42mm - Titanium Gold + Milanese Loop.png'
	]);
	assert.equal(v[0].model, 'Apple Watch S11 46mm');
	assert.equal(v[0].color, 'Aluminum Jet Black + Sport Band Black');
	assert.equal(v[0].orientation, null);
	assert.equal(v[1].model, 'Apple Watch S11 42mm');
});

test('parseVariants: iMac layout (no separators → common-prefix split)', () => {
	const v = parseVariants([
		'iMac M4 24-inch Blue.png',
		'iMac M4 24-inch Green.png',
		'iMac M4 24-inch Silver.png'
	]);
	assert.equal(v[0].model, 'iMac M4 24-inch');
	assert.equal(v[0].color, 'Blue');
	assert.equal(slugify(v[0].model), 'imac-m4-24');
	assert.equal(v[2].color, 'Silver');
});

test('parseVariants: single separator-less file → color Standard', () => {
	const v = parseVariants(['Apple TV 4K.png']);
	assert.equal(v[0].model, 'Apple TV 4K');
	assert.equal(v[0].color, 'Standard');
});

test('groupVariants prefers portrait art and groups by model slug', () => {
	const groups = groupVariants(parseVariants([
		'iPad Pro (M5) 11" - Silver - Landscape.png',
		'iPad Pro (M5) 11" - Silver - Portrait.png',
		'iPad Pro (M5) 13" - Space Black - Portrait.png'
	]));
	assert.deepEqual([...groups.keys()].sort(), ['ipad-pro-m5-11', 'ipad-pro-m5-13']);
	const eleven = groups.get('ipad-pro-m5-11');
	assert.equal(eleven.colors.get('silver').rel, 'iPad Pro (M5) 11" - Silver - Portrait.png');
});

// ── PNG payload discovery (hdiutil mount vs. 7-Zip extraction trees) ─────
test('pngPayload: hdiutil-style tree (PNG/ at volume root)', () => {
	const got = pngPayload([
		'PNG',
		'PNG/iPhone 17',
		'PNG/iPhone 17/iPhone 17 - Black - Portrait.png',
		'PNG/iPhone 17 - Lavender - Portrait.png',
		'License.rtf',
		'.background/banner.png'
	]);
	assert.deepEqual(got, [
		{ rel: 'iPhone 17/iPhone 17 - Black - Portrait.png',
			path: 'PNG/iPhone 17/iPhone 17 - Black - Portrait.png' },
		{ rel: 'iPhone 17 - Lavender - Portrait.png',
			path: 'PNG/iPhone 17 - Lavender - Portrait.png' }
	]);
});

test('pngPayload: 7-Zip wrapper dirs (volume/partition names) are skipped over', () => {
	const got = pngPayload([
		'iPad Pro (M5)/PNG/iPad Pro (M5) 13" - Silver - Portrait.png',
		'iPad Pro (M5)/License.rtf',
		'iPad Pro (M5)/__MACOSX/PNG/._iPad Pro (M5) 13" - Silver - Portrait.png',
		'iPad Pro (M5)/.DS_Store'
	]);
	assert.deepEqual(got, [{
		rel: 'iPad Pro (M5) 13" - Silver - Portrait.png',
		path: 'iPad Pro (M5)/PNG/iPad Pro (M5) 13" - Silver - Portrait.png'
	}]);
});

test('pngPayload: no PNG folder → every visible .png relative to root', () => {
	const got = pngPayload(['Apple TV 4K.png', 'readme.txt', '.hidden/x.png']);
	assert.deepEqual(got, [{ rel: 'Apple TV 4K.png', path: 'Apple TV 4K.png' }]);
});

// ── manifest diff ─────────────────────────────────────────────────────────
test('diffManifest classifies new / updated / unchanged / removed', () => {
	const manifest = {
		sources: {
			'Bezel-iPhone-17.dmg': { url: 'https://cdn/x/Bezel-iPhone-17.dmg' },
			'Bezel-iMac-M4.dmg': { url: 'https://cdn/OLD/Bezel-iMac-M4.dmg' },
			'Bezel-Apple-Watch-Ultra-2-2024.dmg': { url: 'https://cdn/x/Bezel-Apple-Watch-Ultra-2-2024.dmg' }
		}
	};
	const discovered = [
		{ file: 'Bezel-iPhone-17.dmg', url: 'https://cdn/x/Bezel-iPhone-17.dmg' },
		{ file: 'Bezel-iMac-M4.dmg', url: 'https://cdn/NEW/Bezel-iMac-M4.dmg' },
		{ file: 'Bezel-iPad-(A16).dmg', url: 'https://cdn/x/Bezel-iPad-(A16).dmg' }
	];
	const d = diffManifest(manifest, discovered);
	assert.deepEqual(d.added.map((x) => x.file), ['Bezel-iPad-(A16).dmg']);
	assert.deepEqual(d.updated.map((x) => x.file), ['Bezel-iMac-M4.dmg']);
	assert.deepEqual(d.unchanged.map((x) => x.file), ['Bezel-iPhone-17.dmg']);
	assert.deepEqual(d.removed, ['Bezel-Apple-Watch-Ultra-2-2024.dmg']);
});

test('diffManifest treats everything as added with an empty manifest', () => {
	const d = diffManifest(null, [{ file: 'a.dmg', url: 'u' }]);
	assert.equal(d.added.length, 1);
	assert.equal(d.removed.length, 0);
});

// ── registry merge precedence ─────────────────────────────────────────────
test('mergeDevices: hand-tuned wins on id collision, generated appended', () => {
	const hand = [
		{ id: 'iphone-17', name: 'Hand iPhone 17' },
		{ id: 'imac-24', name: 'Hand iMac' }
	];
	const gen = [
		{ id: 'iphone-17', name: 'Generated iPhone 17' },
		{ id: 'ipad-pro-m5-13', name: 'Generated iPad' }
	];
	const merged = mergeDevices(hand, gen);
	assert.deepEqual(merged.map((d) => d.id), ['iphone-17', 'imac-24', 'ipad-pro-m5-13']);
	assert.equal(merged[0].name, 'Hand iPhone 17'); // precedence
	assert.equal(merged[2].name, 'Generated iPad');
});

// ── mask SVG ──────────────────────────────────────────────────────────────
test('maskSVG emits rounded corners and square fallbacks', () => {
	const rounded = maskSVG(416, 496, { tl: 112, tr: 112, bl: 112, br: 112 });
	assert.match(rounded, /viewBox="0 0 416 496"/);
	assert.match(rounded, /A 112,112 0 0 1 416,112/);
	const square = maskSVG(4480, 2520, { tl: 0, tr: 0, bl: 0, br: 0 });
	assert.ok(!square.includes('A '), 'square mask must have no arcs');
	assert.match(square, /M 0,0 H 4480 V 2520 H 0 V 0 Z/);
});

// ── overlap report ────────────────────────────────────────────────────────
test('overlapReport maps hand-tuned slugs to same-class official sources', () => {
	const discovered = [
		{ file: 'Bezel-iPhone-17.dmg' },
		{ file: 'Bezel-iPhone-16.dmg' },
		{ file: 'Bezel-iMac-M4.dmg' },
		{ file: 'Bezel-MacBook-Pro-M5.dmg' },
		{ file: 'Bezel-Apple-TV.dmg' }
	];
	const rows = overlapReport(['iphone-16', 'imac-24', 'macbook-pro-16', 'pixel-7-pro', '_css'], discovered);
	const map = Object.fromEntries(rows.map((r) => [r.slug, r.sources]));
	assert.equal(map['iphone-16'][0], 'Bezel-iPhone-16.dmg'); // best score first
	assert.ok(map['imac-24'].includes('Bezel-iMac-M4.dmg'));
	assert.ok(map['macbook-pro-16'].includes('Bezel-MacBook-Pro-M5.dmg'));
	assert.ok(!map['pixel-7-pro'], 'non-Apple devices have no overlap');
	assert.ok(!map['_css'], 'CSS-rendered pseudo-slugs are skipped');
});

// ── measure() on a synthetic fixture PNG ──────────────────────────────────
// 64×64 RGBA PNG: opaque frame with a fully transparent 24×16 hole at (20,24).
function makeFixturePNG() {
	const W = 64, H = 64;
	const raw = Buffer.alloc(H * (1 + W * 4));
	for (let y = 0; y < H; y++) {
		const row = y * (1 + W * 4);
		raw[row] = 0; // filter: none
		for (let x = 0; x < W; x++) {
			const inHole = x >= 20 && x < 44 && y >= 24 && y < 40;
			const o = row + 1 + x * 4;
			raw[o] = 128; raw[o + 1] = 128; raw[o + 2] = 128;
			raw[o + 3] = inHole ? 0 : 255;
		}
	}
	const crcTable = [];
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		crcTable[n] = c >>> 0;
	}
	const crc32 = (buf) => {
		let c = 0xffffffff;
		for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
		return (c ^ 0xffffffff) >>> 0;
	};
	const chunk = (type, data) => {
		const len = Buffer.alloc(4);
		len.writeUInt32BE(data.length);
		const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
		const crc = Buffer.alloc(4);
		crc.writeUInt32BE(crc32(td));
		return Buffer.concat([len, td, crc]);
	};
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
	ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw)),
		chunk('IEND', Buffer.alloc(0))
	]);
}

test('measure() locates the transparent cutout in a fixture PNG', () => {
	const file = join(mkdtempSync(join(tmpdir(), 'monkr-test-')), 'fixture.png');
	writeFileSync(file, makeFixturePNG());
	const m = measure(file);
	assert.equal(m.pngW, 64);
	assert.equal(m.pngH, 64);
	assert.deepEqual(
		{ x: m.cutout.x, y: m.cutout.y, w: m.cutout.w, h: m.cutout.h },
		{ x: 20, y: 24, w: 24, h: 16 }
	);
	assert.deepEqual(m.corners, { tl: 0, tr: 0, bl: 0, br: 0 });
	assert.equal(m.areaRatio, 1);
});
