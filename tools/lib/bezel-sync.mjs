// bezel-sync.mjs — pure helpers for tools/sync-bezels.mjs (no network, no fs).
// Everything here is unit-tested in tools/test/bezel-sync.test.mjs.

/** Direct-download CDN host used by the Apple Design Resources page. */
export const RESOURCES_URL = 'https://developer.apple.com/design/resources/';

/**
 * Device classes that rocket's DISPLAY_FOR table already maps to App Store
 * Connect display types (see _shared/rocket/rocket.mjs):
 *   /iphone/→APP_IPHONE_65, /ipad/→APP_IPAD_PRO_3GEN_129,
 *   /(mac|desktop)/→APP_DESKTOP, /tv/→APP_APPLE_TV,
 *   /ultra/→APP_WATCH_ULTRA, /watch/→APP_WATCH_SERIES_10.
 * Any source classified outside this set gets a TODO in the sync summary —
 * a human confirms the ASC enum before rocket learns the new class.
 */
export const ROCKET_COVERED_CLASSES = new Set(['iphone', 'ipad', 'mac', 'tv', 'watch']);

/**
 * Generated slug → hand-tuned slug for devices that are physically the same
 * but named differently by Apple vs. Monkr's existing third-party art.
 * Used only for collision (overlap) detection.
 */
export const SLUG_ALIASES = {
	'iphone-air': 'iphone-17-air' // Apple says "iPhone Air"; Monkr shipped it as iPhone 17 Air
};

/** Decode the handful of HTML entities Apple's page uses in headings. */
export function decodeEntities(s) {
	return s
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#x?([0-9a-f]+);/gi, (_, n) =>
			String.fromCodePoint(parseInt(n, _.startsWith('&#x') ? 16 : 10)))
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Parse the Apple Design Resources page HTML for product-bezel downloads.
 * Bezel DMGs are anchors whose href filename starts with "Bezel-"; the
 * human-readable name is the closest preceding <h5> heading.
 * @returns {Array<{file: string, name: string, url: string}>} sorted by file
 */
export function parseBezelLinks(html) {
	const out = new Map();
	const re = /<a\s+[^>]*href="([^"]+\/(Bezel-[^"/]+\.dmg))"/g;
	let m;
	while ((m = re.exec(html))) {
		const [, url, file] = m;
		// closest preceding <h5> = display name; fall back to the filename
		const before = html.slice(0, m.index);
		const h5 = [...before.matchAll(/<h5[^>]*>([^<]+)<\/h5>/g)].pop();
		const name = h5
			? decodeEntities(h5[1])
			: decodeURIComponent(file)
					.replace(/^Bezel-/, '')
					.replace(/\.dmg$/, '')
					.replace(/-/g, ' ');
		out.set(file, { file: decodeURIComponent(file), name, url });
	}
	return [...out.values()].sort((a, b) => a.file.localeCompare(b.file));
}

/**
 * Classify a bezel source by its DMG filename (or any device-ish name).
 * @returns {'iphone'|'ipad'|'mac'|'display'|'tv'|'watch'|'unknown'}
 */
export function classifyDevice(name) {
	const n = name.toLowerCase();
	if (/watch/.test(n)) return 'watch';
	if (/iphone/.test(n)) return 'iphone';
	if (/ipad/.test(n)) return 'ipad';
	if (/\bmac|imac|macbook/.test(n)) return 'mac';
	if (/display/.test(n)) return 'display';
	if (/\btv\b|apple-tv|appletv/.test(n)) return 'tv';
	return 'unknown';
}

/** Registry defaults per device class (DeviceMeta category / notch). */
export function classDefaults(deviceClass) {
	switch (deviceClass) {
		case 'iphone': return { category: 'phone', notch: 'dynamic-island' };
		case 'ipad': return { category: 'tablet', notch: 'none' };
		case 'mac': return { category: 'laptop', notch: 'none' };
		case 'display': return { category: 'laptop', notch: 'none' };
		case 'tv': return { category: 'tv', notch: 'none' };
		case 'watch': return { category: 'watch', notch: 'none' };
		default: return { category: 'laptop', notch: 'none' };
	}
}

/**
 * Slugify a model or color name following Monkr's existing conventions:
 *   iPad Pro (M5) 13"  → ipad-pro-m5-13
 *   iMac M4 24-inch    → imac-m4-24
 *   Apple Watch S11 46mm → apple-watch-s11-46mm
 *   Space Black        → space-black
 */
export function slugify(s) {
	return s
		.toLowerCase()
		.replace(/(\d+)-inch\b/g, '$1')
		.replace(/["″”']/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Parse PNG variant names from one bezel DMG into {model, color, orientation}.
 * Handles the layouts Apple has shipped so far:
 *   iPhone: PNG/<Model>/<Model> - <Color> - <Portrait|Landscape>.png
 *   iPad:   PNG/<Model> - <Color> - <Portrait|Landscape>.png
 *   Watch:  PNG/<Band>/<Model> - <size>mm - <Case + Band variant>.png
 *   iMac:   PNG/<Model> <Color>.png      (no " - " separators)
 * Rules, in order:
 *   • stem = filename minus .png; pop a trailing Portrait/Landscape segment
 *   • ≥2 " - " segments → color = last segment, model = the rest joined
 *   • 1 segment → model = longest common prefix across the group's stems,
 *     color = remainder (single-file groups → color "Standard")
 * @param {string[]} relPaths paths relative to the DMG's PNG/ folder
 * @returns {Array<{rel: string, model: string, color: string, orientation: 'portrait'|'landscape'|null}>}
 */
export function parseVariants(relPaths) {
	const entries = relPaths
		.filter((p) => p.toLowerCase().endsWith('.png'))
		.map((rel) => {
			const stem = rel.split('/').pop().replace(/\.png$/i, '');
			const segs = stem.split(' - ').map((s) => s.trim());
			let orientation = null;
			const last = segs[segs.length - 1]?.toLowerCase();
			if (last === 'portrait' || last === 'landscape') {
				orientation = segs.pop().toLowerCase();
			}
			return { rel, stem, segs, orientation };
		});
	// longest common prefix of single-segment stems (per parent dir group)
	const singles = entries.filter((e) => e.segs.length === 1);
	let lcp = '';
	if (singles.length > 1) {
		lcp = singles[0].segs[0];
		for (const e of singles.slice(1)) {
			const s = e.segs[0];
			let i = 0;
			while (i < lcp.length && i < s.length && lcp[i] === s[i]) i++;
			lcp = lcp.slice(0, i);
		}
		lcp = lcp.replace(/\S*$/, ''); // cut back to a word boundary
	}
	return entries.map(({ rel, segs, orientation }) => {
		let model, color;
		if (segs.length >= 2) {
			color = segs[segs.length - 1];
			model = segs.slice(0, -1).join(' ');
		} else if (lcp && segs[0].startsWith(lcp) && segs[0].length > lcp.length) {
			model = lcp.trim();
			color = segs[0].slice(lcp.length).trim();
		} else {
			model = segs[0];
			color = 'Standard';
		}
		return { rel, model, color, orientation };
	});
}

/**
 * Group parsed variants by model slug, preferring portrait art when a
 * model+color exists in both orientations.
 * @returns {Map<string, {model: string, colors: Map<string, {color: string, rel: string}>}>}
 */
export function groupVariants(variants) {
	const models = new Map();
	for (const v of variants) {
		const mSlug = slugify(v.model);
		const cSlug = slugify(v.color);
		if (!models.has(mSlug)) models.set(mSlug, { model: v.model, colors: new Map() });
		const g = models.get(mSlug).colors;
		const prev = g.get(cSlug);
		// portrait wins; otherwise first occurrence wins
		if (!prev || (v.orientation === 'portrait' && prev.orientation !== 'portrait')) {
			g.set(cSlug, { color: v.color, rel: v.rel, orientation: v.orientation });
		}
	}
	return models;
}

/**
 * Diff the manifest against the freshly discovered source list.
 * Sources are keyed by DMG filename; Apple revs assets by renaming the file
 * (the year / chip suffix in the name is the version marker), so a rename
 * shows up as one `added` + one `removed`. `updated` covers a URL change for
 * the same filename (e.g. CDN path move).
 */
export function diffManifest(manifest, discovered) {
	const sources = manifest?.sources ?? {};
	const added = [], updated = [], unchanged = [];
	const seen = new Set();
	for (const d of discovered) {
		seen.add(d.file);
		const known = sources[d.file];
		if (!known) added.push(d);
		else if (known.url !== d.url) updated.push(d);
		else unchanged.push(d);
	}
	const removed = Object.keys(sources).filter((f) => !seen.has(f));
	return { added, updated, unchanged, removed };
}

/**
 * Build the display.svg mask for a measured cutout: a rounded rect honouring
 * per-corner radii (square corners emit straight joins). `fallbackRect` is
 * used when the cutout was flagged non-rect.
 */
export function maskSVG(w, h, corners = { tl: 0, tr: 0, bl: 0, br: 0 }) {
	const { tl, tr, bl, br } = corners;
	const p = [`M ${tl},0`, `H ${w - tr}`];
	if (tr) p.push(`A ${tr},${tr} 0 0 1 ${w},${tr}`);
	p.push(`V ${h - br}`);
	if (br) p.push(`A ${br},${br} 0 0 1 ${w - br},${h}`);
	p.push(`H ${bl}`);
	if (bl) p.push(`A ${bl},${bl} 0 0 1 0,${h - bl}`);
	p.push(`V ${tl}`);
	if (tl) p.push(`A ${tl},${tl} 0 0 1 ${tl},0`);
	p.push('Z');
	return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="${p.join(' ')}" fill="white"/>\n</svg>\n`;
}

/** Extract a year ("…-2025.dmg") from a DMG filename, else null. */
export function yearFromFile(file) {
	const m = file.match(/-(20\d\d)\.dmg$/i);
	return m ? Number(m[1]) : null;
}

/**
 * Build a DeviceMeta registry entry from a measured model group.
 * screenTop/screenLeft are exact cutout-origin percentages (Apple does not
 * center every screen — iMac/MacBook stands sit below it).
 */
export function buildEntry({ modelSlug, modelName, deviceClass, year, measurement, colors }) {
	const { category, notch } = classDefaults(deviceClass);
	const m = measurement;
	const pct = (v, total) => Math.round((v / total) * 100000) / 1000;
	return {
		id: modelSlug,
		name: modelName,
		category,
		brand: 'Apple',
		slug: modelSlug,
		pngW: m.pngW,
		pngH: m.pngH,
		svgW: m.cutout.w,
		svgH: m.cutout.h,
		year,
		screenTop: pct(m.cutout.y, m.pngH),
		screenLeft: pct(m.cutout.x, m.pngW),
		notch,
		colors: colors.map(({ slug, name }) => ({ id: slug, name, slug }))
	};
}

/** Tokenize a slug/filename for the overlap report's fuzzy matching. */
function tokens(s) {
	return new Set(
		slugify(s.replace(/\.dmg$/i, '').replace(/^bezel-/i, ''))
			.split('-')
			.filter((t) => t && !/^20\d\d$/.test(t))
	);
}

/**
 * Overlap report: which existing hand-tuned Monkr devices have an official
 * Apple bezel source available? Class must match; score = shared name tokens.
 */
export function overlapReport(handTunedSlugs, discovered) {
	const rows = [];
	for (const slug of handTunedSlugs) {
		if (slug === '_css') continue;
		const cls = classifyDevice(slug);
		if (cls === 'unknown') continue;
		const st = tokens(slug);
		const candidates = discovered
			.filter((d) => classifyDevice(d.file) === cls)
			.map((d) => {
				const dt = tokens(d.file);
				let score = 0;
				for (const t of st) if (dt.has(t)) score++;
				return { file: d.file, score };
			})
			.filter((c) => c.score > 0)
			.sort((a, b) => b.score - a.score);
		if (candidates.length) rows.push({ slug, sources: candidates.map((c) => c.file) });
	}
	return rows;
}
