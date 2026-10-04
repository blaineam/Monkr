import type { ClientInit } from '@sveltejs/kit';
import { importOnStart } from '$lib/legacy-import';
import { LEGACY_ORIGIN } from '$lib/site';

// Awaited by SvelteKit before the app starts, so anything brought over from
// Monkr's old address is in localStorage before the store reads it.
export const init: ClientInit = async () => {
	if (!LEGACY_ORIGIN) return;
	// wemiller.com/tools/monkr/ sends visitors who have used the app straight
	// back into it; ?about always shows that page.
	try {
		localStorage.setItem('tools.monkr.entered', '1');
	} catch {
		/* private mode */
	}
	await importOnStart();
};
