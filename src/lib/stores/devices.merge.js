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
 * @template {{ id: string }} T
 * @param {T[]} handTuned entries that win on collision
 * @param {T[]} generated entries from devices.generated.json
 * @returns {T[]} handTuned first, then non-colliding generated entries
 */
export function mergeDevices(handTuned, generated) {
	const taken = new Set(handTuned.map((d) => d.id));
	return [...handTuned, ...generated.filter((d) => !taken.has(d.id))];
}
