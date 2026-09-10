// devices.merge.js — merge rule for the device registry.
//
// The registry has two sources:
//   1. hand-tuned entries written by humans in devices.svelte.ts
//   2. generated entries emitted by tools/sync-bezels.mjs into
//      devices.generated.json (from Apple's official Product Bezels)
//
// MERGE RULE: hand-tuned entries ALWAYS win on id collision. A generated
// entry only appears when no hand-tuned entry claims its id/slug. This lets
// curated geometry/naming overrides live in devices.svelte.ts while the sync
// tool keeps everything else fresh.
//
// Plain JS (not .ts) so tools/test can unit-test it under `node --test`
// without a TypeScript loader.

/**
 * ORDER: newest first. The picker renders each category in registry order, so
 * without this every generated entry (Apple's official bezels) piled up at the
 * bottom of its tab no matter how new the device was — iPhone 18 and iPhone Duo
 * landed under the iPhone 14s. Sorting by year descending puts the newest
 * hardware at the top of "Phones" and of the full list.
 *
 * The sort is STABLE and only compares the year, so the hand-curated order
 * within a model year is preserved (17 Pro Max before 17 Pro before 17 Air…).
 * Every entry in both registries carries a year; anything that somehow lacks
 * one sorts to the end rather than jumping to the top.
 *
 * @template {{ id: string, year?: number, svgW?: number, svgH?: number }} T
 * @param {T[]} handTuned entries that win on collision
 * @param {T[]} generated entries from devices.generated.json
 * @returns {T[]} merged, newest year first, stable within a year
 */
export function mergeDevices(handTuned, generated) {
	const taken = new Set(handTuned.map((d) => d.id));
	// Generated entries arrive in model-slug order, which reads wrong twice over:
	// it lists "iPhone 18 Pro" above "iPhone 18 Pro Max" (backwards from the
	// hand-tuned convention of biggest first — 17 Pro Max, 17 Pro, 17 Air, 17),
	// and it interleaves the three iPhone Duo screens with the iPhone 18s.
	//
	// So: group by device family first, keep a family's screens together, and
	// order both families and their members by screen area. A folding phone is
	// one device with several panels and should read as one block.
	// Hand-tuned order is left exactly as written; that curation is deliberate.
	/** @param {T} d */
	const area = (d) => (Number(d.svgW) || 0) * (Number(d.svgH) || 0);
	const STATE = new Set(['inner', 'outer', 'open', 'closed', 'folded', 'unfolded',
		'front', 'back', 'cover']);
	/** @param {T} d */
	const familyOf = (d) => {
		const parts = String(d.id || '').split('-');
		while (parts.length > 1 && STATE.has(parts[parts.length - 1])) parts.pop();
		return parts.join('-');
	};
	/** @type {Map<string, T[]>} */
	const families = new Map();
	for (const d of generated.filter((x) => !taken.has(x.id))) {
		const k = familyOf(d);
		const bucket = families.get(k) ?? [];
		bucket.push(d);
		families.set(k, bucket);
	}
	const fresh = [...families.values()]
		.map((members) => members.slice().sort((/** @type {T} */ a, /** @type {T} */ b) => area(b) - area(a)))
		.sort((a, b) => area(b[0]) - area(a[0]))
		.flat();
	const all = [...handTuned, ...fresh];
	return all
		.map((d, i) => /** @type {[T, number]} */ ([d, i]))
		.sort(([a, ai], [b, bi]) =>
			(typeof b.year === 'number' ? b.year : -Infinity) -
			(typeof a.year === 'number' ? a.year : -Infinity) || ai - bi)
		.map(([d]) => d);
}
