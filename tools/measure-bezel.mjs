#!/usr/bin/env node
// measure-bezel.mjs — measures a device-frame PNG (e.g. Apple's official
// product bezels): prints the image dimensions and locates the transparent
// screen cutout by scanning the alpha channel.
//
// The cutout is assumed to be a (rounded) rect of fully-transparent pixels
// surrounded by opaque bezel. We report:
//   • png dims
//   • cutout bounding box (x, y, w, h)
//   • corner-radius estimate (from the inset of the transparent run on the
//     top row of the cutout vs. the row at the vertical midpoint)
//
// Zero dependencies: minimal PNG decoder (8-bit RGB/RGBA/gray+alpha,
// non-interlaced) using node:zlib.
//
// Usage: node tools/measure-bezel.mjs <file.png> [more.png ...] [--json]
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

// Exported so tests can assert on a PNG's alpha channel directly (see
// tools/test/transparent-export.test.mjs) without pulling in an image library.
export function decodePNG(buf) {
	if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
	let pos = 8;
	let ihdr = null;
	const idat = [];
	while (pos < buf.length) {
		const len = buf.readUInt32BE(pos);
		const type = buf.toString('ascii', pos + 4, pos + 8);
		const data = buf.subarray(pos + 8, pos + 8 + len);
		if (type === 'IHDR') {
			ihdr = {
				width: data.readUInt32BE(0), height: data.readUInt32BE(4),
				bitDepth: data[8], colorType: data[9], interlace: data[12]
			};
		} else if (type === 'IDAT') idat.push(data);
		else if (type === 'IEND') break;
		pos += 12 + len;
	}
	if (!ihdr) throw new Error('no IHDR');
	if (ihdr.interlace) throw new Error('interlaced PNG not supported');
	if (ihdr.bitDepth !== 8) throw new Error(`bit depth ${ihdr.bitDepth} not supported`);
	const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[ihdr.colorType];
	if (!channels) throw new Error(`color type ${ihdr.colorType} not supported`);
	const raw = inflateSync(Buffer.concat(idat));
	const { width, height } = ihdr;
	const bpp = channels;
	const stride = width * bpp;
	const out = Buffer.alloc(height * stride);
	for (let y = 0; y < height; y++) {
		const filter = raw[y * (stride + 1)];
		const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
		const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
		const cur = out.subarray(y * stride, (y + 1) * stride);
		for (let x = 0; x < stride; x++) {
			const a = x >= bpp ? cur[x - bpp] : 0;
			const b = prev ? prev[x] : 0;
			const c = x >= bpp && prev ? prev[x - bpp] : 0;
			let v = line[x];
			switch (filter) {
				case 0: break;
				case 1: v = (v + a) & 0xff; break;
				case 2: v = (v + b) & 0xff; break;
				case 3: v = (v + ((a + b) >> 1)) & 0xff; break;
				case 4: {
					const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
					v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
					break;
				}
				default: throw new Error(`bad filter ${filter}`);
			}
			cur[x] = v;
		}
	}
	const alphaAt =
		ihdr.colorType === 6 ? (x, y) => out[y * stride + x * 4 + 3]
		: ihdr.colorType === 4 ? (x, y) => out[y * stride + x * 2 + 1]
		: () => 255; // no alpha channel → fully opaque
	return { width, height, alphaAt };
}

export function measure(file, { thresh = 8 } = {}) {
	const img = decodePNG(readFileSync(file));
	const { width, height } = img;
	// Opaque content bbox (the frame may sit on a transparent page).
	let cT = -1, cB = -1, cL = width, cR = -1;
	for (let y = 0; y < height; y++) {
		let any = false;
		for (let x = 0; x < width; x++) {
			if (img.alphaAt(x, y) > thresh) {
				any = true;
				if (x < cL) cL = x;
				if (x > cR) cR = x;
			}
		}
		if (any) { if (cT < 0) cT = y; cB = y; }
	}
	if (cT < 0) throw new Error('image is fully transparent');
	// Label transparent pixels: flood-fill from the image border across the
	// transparent region. Anything transparent NOT reached is an enclosed
	// hole; the screen cutout is the largest such connected component.
	const trans = (x, y) => img.alphaAt(x, y) <= thresh;
	const seen = new Uint8Array(width * height);
	const stack = [];
	const push = (x, y) => {
		const i = y * width + x;
		if (!seen[i] && trans(x, y)) { seen[i] = 1; stack.push(i); }
	};
	for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
	for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }
	while (stack.length) {
		const i = stack.pop();
		const x = i % width, y = (i / width) | 0;
		if (x > 0) push(x - 1, y);
		if (x < width - 1) push(x + 1, y);
		if (y > 0) push(x, y - 1);
		if (y < height - 1) push(x, y + 1);
	}
	// Find connected components of enclosed transparent pixels; keep largest.
	const comp = new Int32Array(width * height).fill(-1);
	let best = null, bestId = -1;
	let compId = 0;
	for (let y0 = 0; y0 < height; y0++) {
		for (let x0 = 0; x0 < width; x0++) {
			const i0 = y0 * width + x0;
			if (comp[i0] !== -1 || seen[i0] || !trans(x0, y0)) continue;
			const id = compId++;
			let n = 0, t = y0, b = y0, l = x0, r = x0;
			const st = [i0];
			comp[i0] = id;
			while (st.length) {
				const i = st.pop();
				const x = i % width, y = (i / width) | 0;
				n++;
				if (y < t) t = y;
				if (y > b) b = y;
				if (x < l) l = x;
				if (x > r) r = x;
				for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
					const nx = x + dx, ny = y + dy;
					if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
					const j = ny * width + nx;
					if (comp[j] === -1 && !seen[j] && trans(nx, ny)) { comp[j] = id; st.push(j); }
				}
			}
			if (!best || n > best.n) { best = { n, t, b, l, r }; bestId = id; }
		}
	}
	if (!best) throw new Error('no enclosed transparent cutout found');
	const { t, b, l, r } = best;
	const w = r - l + 1, h = b - t + 1;
	// Corner radius: circle-fit each corner of the cutout. For each row dy
	// inward from the corner's horizontal edge, the inset i(dy) of the cutout
	// run obeys (R−i)² + (R−dy)² = R²  →  R = i + dy + √(2·i·dy). Take the
	// median over rows still on the curve (i > 0). Scan only pixels that
	// belong to the cutout component so page transparency outside the frame
	// is ignored.
	const isCut = (x, y) => comp[y * width + x] === bestId;
	const fitCorner = (fromTop, fromLeft) => {
		const fits = [];
		for (let dy = 0; dy <= Math.min(Math.floor(h / 2), 600); dy++) {
			const y = fromTop ? t + dy : b - dy;
			let edge = -1;
			if (fromLeft) {
				for (let x = l; x <= r; x++) if (isCut(x, y)) { edge = x; break; }
			} else {
				for (let x = r; x >= l; x--) if (isCut(x, y)) { edge = x; break; }
			}
			if (edge < 0) continue;
			const i = fromLeft ? edge - l : r - edge;
			if (i <= 0) break; // reached the straight section
			fits.push(i + dy + Math.sqrt(2 * i * dy));
		}
		fits.sort((a, b2) => a - b2);
		return {
			radius: fits.length ? Math.round(fits[Math.floor(fits.length / 2)]) : 0,
			rows: fits.length
		};
	};
	const tl = fitCorner(true, true), tr = fitCorner(true, false);
	const bl = fitCorner(false, true), br = fitCorner(false, false);
	const corners = { tl: tl.radius, tr: tr.radius, bl: bl.radius, br: br.radius };
	// Rectness: compare the cutout pixel count with the area of a rounded
	// rect at the fitted corner radii. A big deviation means the cutout is
	// not a (rounded) rect — callers should fall back to a bbox mask.
	const deficit = (corners.tl ** 2 + corners.tr ** 2 + corners.bl ** 2 + corners.br ** 2) * (1 - Math.PI / 4);
	const areaRatio = best.n / (w * h - deficit);
	return {
		file, pngW: width, pngH: height,
		content: { x: cL, y: cT, w: cR - cL + 1, h: cB - cT + 1 },
		cutout: { x: l, y: t, w, h, area: best.n },
		cornerRadius: corners.tl,
		corners,
		areaRatio: Math.round(areaRatio * 10000) / 10000,
		radiusFitRows: tl.rows
	};
}

// CLI entrypoint (skipped when imported as a library, e.g. by sync-bezels.mjs)
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (!isMain) {
	// library use — no CLI
} else {
	main();
}
function main() {
const args = process.argv.slice(2).filter((a) => a !== '--json');
const asJson = process.argv.includes('--json');
if (args.length === 0) {
	console.error('usage: node tools/measure-bezel.mjs <file.png> [...] [--json]');
	process.exit(1);
}
const results = args.map((f) => measure(f));
if (asJson) console.log(JSON.stringify(results, null, 2));
else
	for (const m of results) {
		console.log(`${m.file}
  png:     ${m.pngW}×${m.pngH}
  content: ${m.content.w}×${m.content.h} @ (${m.content.x},${m.content.y})
  cutout:  ${m.cutout.w}×${m.cutout.h} @ (${m.cutout.x},${m.cutout.y})
  corners  tl ${m.corners.tl} / tr ${m.corners.tr} / bl ${m.corners.bl} / br ${m.corners.br}px (area ratio ${m.areaRatio})`);
	}
}
