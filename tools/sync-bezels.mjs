#!/usr/bin/env node
// sync-bezels.mjs — sync Monkr's device-frame library with Apple's official
// Product Bezels from https://developer.apple.com/design/resources/.
//
//   npm run sync-bezels -- [flags]
//
//   (no flags)           refresh: discover sources, re-import any managed
//                        source whose DMG filename/URL changed
//   --dry-run            discover + diff + overlap report only, no downloads
//   --only <pattern>     restrict the run to sources matching <pattern>
//   --import <pattern>   start managing + import matching sources
//   --force <pattern>    re-fetch/re-import matching sources (also allows
//                        overwriting an existing static/devices/<slug>/ dir)
//   --cache-dir <dir>    keep/reuse downloaded DMGs here (default: temp dir)
//
// State lives in static/devices/manifest.json (single source of truth):
// per DMG source → url, sha256, size, fetch date, device class, status, and
// the generated registry entries per model slug. devices.generated.json is
// derived from the manifest on every run and merged into the registry at
// runtime (hand-tuned entries in devices.svelte.ts win on collision — see
// src/lib/stores/devices.svelte.ts).
//
// Existing third-party frame art is never replaced: a generated model slug
// that collides with a hand-tuned slug (or an alias, e.g. Apple's
// "iPhone Air" = Monkr's iphone-17-air) is imported as `shadowed` — recorded
// in the manifest with its measurements, but no assets are copied and no
// registry entry is emitted. The overlap report lists these.
//
// All work is synchronous; DMG license prompts are auto-accepted via
// `yes | hdiutil attach` (see docs/APPLE-BEZELS.md for the license terms).
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync,
	rmSync, statSync, writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	RESOURCES_URL, ROCKET_COVERED_CLASSES, SLUG_ALIASES,
	buildEntry, classifyDevice, diffManifest, groupVariants, maskSVG,
	overlapReport, parseBezelLinks, parseVariants, yearFromFile
} from './lib/bezel-sync.mjs';
import { measure } from './measure-bezel.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = join(ROOT, 'static/devices/manifest.json');
const GENERATED_PATH = join(ROOT, 'src/lib/stores/devices.generated.json');
const STORE_PATH = join(ROOT, 'src/lib/stores/devices.svelte.ts');
const DEVICES_DIR = join(ROOT, 'static/devices');

// ── args ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name) => {
	const i = argv.indexOf(name);
	return i >= 0 ? argv[i + 1] : undefined;
};
const dryRun = flag('--dry-run');
const onlyPat = opt('--only');
const importPat = opt('--import');
const forcePat = opt('--force');
const cacheDir = opt('--cache-dir') ?? mkdtempSync(join(tmpdir(), 'monkr-bezels-'));
mkdirSync(cacheDir, { recursive: true });

// patterns are case-insensitive substrings; comma = OR
const matches = (pat, ...names) =>
	!!pat && pat.split(',').some((p) =>
		p.trim() && names.some((n) => n && n.toLowerCase().includes(p.trim().toLowerCase())));

// ── helpers ───────────────────────────────────────────────────────────────
const log = (...a) => console.log(...a);
const sh = (cmd) => {
	const r = spawnSync('/bin/sh', ['-c', cmd], { encoding: 'utf8' });
	if (r.status !== 0) throw new Error(`command failed (${r.status}): ${cmd}\n${r.stderr}`);
	return r.stdout;
};
const q = (s) => `'${s.replace(/'/g, `'\\''`)}'`;

function loadManifest() {
	if (!existsSync(MANIFEST_PATH)) return { version: 1, updatedAt: null, sources: {} };
	return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

/** Hand-tuned slugs + ids parsed straight out of devices.svelte.ts. */
function handTunedSlugs() {
	const src = readFileSync(STORE_PATH, 'utf8');
	const out = new Set();
	for (const re of [/slug:\s*'([^']+)'/g, /\bid:\s*'([^']+)'/g]) {
		for (const m of src.matchAll(re)) if (m[1] !== '_css') out.add(m[1]);
	}
	return out;
}

function sha256(file) {
	const h = createHash('sha256');
	h.update(readFileSync(file));
	return h.digest('hex');
}

function download(url, dest) {
	if (existsSync(dest) && statSync(dest).size > 0) {
		log(`    cached: ${dest}`);
		return;
	}
	log(`    downloading ${url}`);
	execFileSync('curl', ['-fsSL', '-o', dest, url], { stdio: ['ignore', 'inherit', 'inherit'] });
}

function mountDMG(dmgPath) {
	const mnt = mkdtempSync(join(tmpdir(), 'monkr-mnt-'));
	// Apple's bezel DMGs embed a click-through license; `yes` accepts it.
	sh(`yes | hdiutil attach -nobrowse -readonly -mountpoint ${q(mnt)} ${q(dmgPath)} >/dev/null 2>&1`);
	return mnt;
}

function unmountDMG(mnt) {
	try { sh(`hdiutil detach ${q(mnt)} >/dev/null 2>&1`); } catch { /* best effort */ }
	rmSync(mnt, { recursive: true, force: true });
}

function pngFilesUnder(mnt) {
	const pngRoot = join(mnt, 'PNG');
	const base = existsSync(pngRoot) ? pngRoot : mnt;
	return readdirSync(base, { recursive: true })
		.map(String)
		.filter((p) => p.toLowerCase().endsWith('.png') && !p.split('/').some((s) => s.startsWith('.')))
		.map((p) => ({ rel: p, abs: join(base, p) }));
}

// ── import one source ─────────────────────────────────────────────────────
function importSource(src, { handTuned, ownedSlugs, force }) {
	const todos = [];
	const dmgPath = join(cacheDir, src.file);
	download(src.url, dmgPath);
	const hash = sha256(dmgPath);
	const size = statSync(dmgPath).size;
	const mnt = mountDMG(dmgPath);
	const slugs = {};
	try {
		const files = pngFilesUnder(mnt);
		const variants = parseVariants(files.map((f) => f.rel));
		const byRel = new Map(files.map((f) => [f.rel, f.abs]));
		const models = groupVariants(variants);
		const year = yearFromFile(src.file) ?? new Date().getFullYear();
		for (const [modelSlug, group] of models) {
			const colorList = [...group.colors.entries()].map(([slug, v]) => ({
				slug, name: v.color, rel: v.rel
			})).sort((a, b) => a.slug.localeCompare(b.slug));
			// measure EVERY color PNG; the first is canonical, others must agree
			// (exact frame + cutout size; cutout origin may drift a few px —
			// Apple's own art does, e.g. iMac M4 Orange sits 2px right of Blue)
			const measurements = colorList.map((c) => measure(byRel.get(c.rel)));
			const m0 = measurements[0];
			for (let i = 1; i < measurements.length; i++) {
				const mi = measurements[i];
				if (mi.pngW !== m0.pngW || mi.pngH !== m0.pngH ||
					mi.cutout.w !== m0.cutout.w || mi.cutout.h !== m0.cutout.h ||
					Math.abs(mi.cutout.x - m0.cutout.x) > 4 || Math.abs(mi.cutout.y - m0.cutout.y) > 4) {
					todos.push(`${modelSlug}: color PNG geometry mismatch — ${colorList[i].rel} ` +
						`measures ${mi.pngW}×${mi.pngH}, cutout ${mi.cutout.w}×${mi.cutout.h} ` +
						`@ (${mi.cutout.x},${mi.cutout.y}); expected ${m0.pngW}×${m0.pngH}, ` +
						`cutout ${m0.cutout.w}×${m0.cutout.h} @ (${m0.cutout.x},${m0.cutout.y})`);
				}
			}
			const aliased = SLUG_ALIASES[modelSlug];
			const collides = handTuned.has(modelSlug) || (aliased && handTuned.has(aliased));
			const dirExists = existsSync(join(DEVICES_DIR, modelSlug)) && !ownedSlugs.has(modelSlug);
			const shadowed = (collides || dirExists) && !matches(force, modelSlug, src.file, src.name);
			const nonRect = Math.abs(1 - m0.areaRatio) > 0.02;
			if (nonRect) {
				todos.push(`${modelSlug}: cutout is not a rounded rect (area ratio ${m0.areaRatio}) — ` +
					`display.svg falls back to the bounding-box rect; verify the mask manually`);
			}
			if (!shadowed && !dryRun) {
				const dir = join(DEVICES_DIR, modelSlug);
				mkdirSync(dir, { recursive: true });
				for (const c of colorList) copyFileSync(byRel.get(c.rel), join(dir, `${c.slug}.png`));
				const corners = nonRect ? { tl: 0, tr: 0, bl: 0, br: 0 } : m0.corners;
				writeFileSync(join(dir, 'display.svg'), maskSVG(m0.cutout.w, m0.cutout.h, corners));
			}
			const entry = buildEntry({
				modelSlug, modelName: group.model, deviceClass: src.deviceClass, year,
				measurement: m0,
				colors: colorList.map(({ slug, name }) => ({ slug, name }))
			});
			slugs[modelSlug] = {
				colors: colorList.map((c) => c.slug),
				appleFiles: Object.fromEntries(colorList.map((c) => [c.slug, c.rel])),
				shadowed,
				shadowedBy: shadowed ? (handTuned.has(modelSlug) ? modelSlug : aliased ?? modelSlug) : undefined,
				assets: !shadowed,
				measured: {
					pngW: m0.pngW, pngH: m0.pngH,
					cutout: m0.cutout, corners: m0.corners, areaRatio: m0.areaRatio
				},
				// kept even when shadowed (reference for a future replacement run)
				entry
			};
		}
	} finally {
		unmountDMG(mnt);
	}
	return { hash, size, slugs, todos };
}

// ── main ──────────────────────────────────────────────────────────────────
function main() {
	const manifest = loadManifest();
	const handTuned = handTunedSlugs();

	log(`fetching ${RESOURCES_URL}`);
	const html = execFileSync('curl', ['-fsSL', RESOURCES_URL], {
		encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
	});
	let discovered = parseBezelLinks(html).map((d) => ({ ...d, deviceClass: classifyDevice(d.file) }));
	if (onlyPat) discovered = discovered.filter((d) => matches(onlyPat, d.file, d.name));
	if (!discovered.length) {
		console.error('no Bezel-*.dmg links discovered — page layout change?');
		process.exit(1);
	}

	const diff = diffManifest(manifest, discovered);
	const status = new Map();
	for (const d of diff.added) status.set(d.file, 'new');
	for (const d of diff.updated) status.set(d.file, 'updated');
	for (const d of diff.unchanged) status.set(d.file, 'unchanged');

	// plan: managed sources refresh on new/updated; --import adopts; --force re-runs
	const plan = discovered.filter((d) => {
		const entry = manifest.sources[d.file];
		if (matches(forcePat, d.file, d.name)) return true;
		if (matches(importPat, d.file, d.name)) return entry?.status !== 'curated';
		if (entry?.managed && entry.status !== 'curated') return status.get(d.file) !== 'unchanged';
		return false;
	});

	// slugs already owned by the sync tool (assets it previously copied)
	const ownedSlugs = new Set();
	for (const s of Object.values(manifest.sources)) {
		for (const [slug, info] of Object.entries(s.slugs ?? {})) if (info.assets) ownedSlugs.add(slug);
	}

	log(`\ndiscovered ${discovered.length} bezel sources ` +
		`(${diff.added.length} new, ${diff.updated.length} updated, ` +
		`${diff.unchanged.length} unchanged, ${diff.removed.length} removed)`);

	const todos = [];
	const imported = [], shadowed = [], skipped = [];

	for (const d of discovered) {
		const entry = manifest.sources[d.file];
		// curated sources with an update get a TODO, never an auto re-import
		if (entry?.status === 'curated' && status.get(d.file) !== 'unchanged') {
			todos.push(`${d.file}: curated (hand-imported) source changed upstream — re-import manually`);
		}
		if (!ROCKET_COVERED_CLASSES.has(d.deviceClass)) {
			todos.push(`${d.file}: device class '${d.deviceClass}' has no rocket DISPLAY_FOR / ` +
				`ASC display-type mapping — confirm the ASC enum before wiring screenshots`);
		}
	}

	if (!dryRun) {
		for (const d of plan) {
			log(`\nimporting ${d.file} (${d.name}, class ${d.deviceClass})`);
			const res = importSource(d, { handTuned, ownedSlugs, force: forcePat });
			todos.push(...res.todos);
			manifest.sources[d.file] = {
				name: d.name,
				url: d.url,
				sha256: res.hash,
				size: res.size,
				fetchedAt: new Date().toISOString(),
				deviceClass: d.deviceClass,
				status: 'imported',
				managed: true,
				slugs: res.slugs
			};
			for (const [slug, info] of Object.entries(res.slugs)) {
				(info.shadowed ? shadowed : imported).push({ source: d.file, slug, info });
				if (info.assets) ownedSlugs.add(slug);
			}
		}
	}

	// record every discovered source; untouched ones stay/become 'available'
	for (const d of discovered) {
		if (!manifest.sources[d.file]) {
			manifest.sources[d.file] = {
				name: d.name, url: d.url, sha256: null, size: null,
				fetchedAt: null, discoveredAt: new Date().toISOString(),
				deviceClass: d.deviceClass, status: 'available', managed: false, slugs: {}
			};
		} else {
			manifest.sources[d.file].url = d.url;
			manifest.sources[d.file].name = d.name;
		}
		if (!plan.includes(d) && !['imported', 'curated'].includes(manifest.sources[d.file].status)) {
			skipped.push(d);
		}
	}

	// derive devices.generated.json from the manifest (non-shadowed entries)
	const generatedDevices = [];
	for (const file of Object.keys(manifest.sources).sort()) {
		const s = manifest.sources[file];
		for (const slug of Object.keys(s.slugs ?? {}).sort()) {
			const info = s.slugs[slug];
			if (info.entry && !info.shadowed) generatedDevices.push(info.entry);
		}
	}

	if (!dryRun) {
		manifest.updatedAt = new Date().toISOString();
		writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, '\t') + '\n');
		writeFileSync(GENERATED_PATH, JSON.stringify({
			$comment: 'Generated by tools/sync-bezels.mjs — do not edit by hand. ' +
				'Merged into the registry by src/lib/stores/devices.svelte.ts ' +
				'(hand-tuned entries win on id/slug collision).',
			generatedAt: manifest.updatedAt,
			devices: generatedDevices
		}, null, '\t') + '\n');
	}

	// ── summary ─────────────────────────────────────────────────────────
	log('\n══ sync-bezels summary ════════════════════════════════════════');
	log(`sources: ${discovered.length} discovered — ${diff.added.length} new, ` +
		`${diff.updated.length} updated, ${diff.unchanged.length} unchanged, ` +
		`${diff.removed.length} removed${dryRun ? '   (dry run)' : ''}`);
	if (diff.removed.length) log(`  removed upstream (kept in manifest): ${diff.removed.join(', ')}`);
	if (imported.length) {
		log('\nimported (assets + registry entry):');
		for (const { source, slug, info } of imported) {
			const m = info.measured;
			log(`  ${slug.padEnd(22)} ${String(info.colors.length).padStart(2)} colors  ` +
				`frame ${m.pngW}×${m.pngH}  screen ${m.cutout.w}×${m.cutout.h} ` +
				`@ (${m.cutout.x},${m.cutout.y}) r≈${m.corners.tl}  [${source}]`);
		}
	}
	if (shadowed.length) {
		log('\nshadowed (collides with hand-tuned art — measured + recorded, NO assets copied):');
		for (const { source, slug, info } of shadowed) {
			const m = info.measured;
			log(`  ${slug.padEnd(22)} ${String(info.colors.length).padStart(2)} colors  ` +
				`frame ${m.pngW}×${m.pngH}  screen ${m.cutout.w}×${m.cutout.h} ` +
				`@ (${m.cutout.x},${m.cutout.y}) r≈${m.corners.tl}  [${source} → shadowed by ${info.shadowedBy}]`);
		}
	}
	const avail = skipped.filter((d) => !plan.includes(d));
	if (avail.length) {
		log('\navailable (discovered, not imported — adopt with --import <pattern>):');
		for (const d of avail) log(`  ${d.file.padEnd(44)} ${d.name}  [class ${d.deviceClass}]`);
	}
	const curated = discovered.filter((d) => manifest.sources[d.file]?.status === 'curated');
	if (curated.length) {
		log('\ncurated (hand-imported, left untouched):');
		for (const d of curated) {
			const s = manifest.sources[d.file];
			log(`  ${d.file.padEnd(44)} → ${Object.keys(s.slugs ?? {}).join(', ')}  [${status.get(d.file)}]`);
		}
	}
	if (todos.length) {
		log('\nTODOs (human follow-up):');
		for (const t of [...new Set(todos)]) log(`  - ${t}`);
	}
	const overlaps = overlapReport([...handTuned], discovered);
	if (overlaps.length) {
		log('\noverlap report (hand-tuned devices with an official bezel available):');
		for (const o of overlaps) log(`  ${o.slug.padEnd(26)} ← ${o.sources.join(', ')}`);
	}
	log('═══════════════════════════════════════════════════════════════');
}

main();
