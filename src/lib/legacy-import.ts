// Bringing saved work over from Monkr's old address.
//
// Monkr keeps everything in localStorage (the autosaved canvas, saved projects,
// the Unsplash key), and localStorage belongs to one origin. When Monkr moved
// from monkr.wemiller.com to wemiller.com/tools/monkr/app/, that data stayed
// behind, so this build asks the old origin for it. Nothing is ever uploaded:
// the data goes browser → browser, in one of two ways.
//
//   1. The old address's redirect page (static/legacy/redirect.html) carries
//      small saves in the URL fragment, which never reaches a server:
//      #monkr-import=<base64url JSON>|<original hash>.
//   2. Anything bigger, and visitors who come straight to the new address,
//      are served by a hidden iframe of <old origin>/migrate.html, which hands
//      the data over with postMessage. wemiller.com and monkr.wemiller.com are
//      the same site, so browsers give that iframe the old origin's own
//      (unpartitioned) storage. Both ends check the other's origin.
//
// Runs from hooks.client.ts before the app (and its store, which reads
// localStorage once) starts, so imported work is simply there on first paint.

import { LEGACY_ORIGIN } from './site';

/** The keys Monkr writes. */
const KEY = /^(monkr_|unsplash_key$)/;
/** Set once the old origin has answered, so later visits skip the iframe. */
export const DONE_KEY = 'monkr_legacy_import_done';
const TIMEOUT_MS = 4000;
/** migrate.html answers as soon as it has loaded; this long after load means it won't. */
const AFTER_LOAD_MS = 1500;
/** Unanswered first-visit attempts before giving up (the Project panel can still import). */
const ATTEMPTS_KEY = 'monkr_legacy_import_attempts';
const MAX_ATTEMPTS = 3;

type Saved = Record<string, string>;
type Project = { name: string; date: string };

function parse<T>(raw: string | null, fallback: T): T {
	try {
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
}

export interface ImportResult {
	/** Keys written (or merged into). */
	written: number;
	/** Saved projects that were added. */
	projects: number;
	/** Keys that didn't fit in this origin's storage quota. */
	failed: string[];
}

/**
 * Merge what the old origin had into this origin's localStorage. Never drops
 * anything already here: saved projects are merged by name (this origin's copy
 * wins), and the autosaved canvas and other keys are only filled in when
 * missing — unless `replaceCanvas` is set (the manual import, after asking).
 */
export function mergeSaved(saved: Saved, replaceCanvas = false): ImportResult {
	const result: ImportResult = { written: 0, projects: 0, failed: [] };
	const put = (key: string, value: string) => {
		try {
			localStorage.setItem(key, value);
			result.written++;
		} catch {
			result.failed.push(key);
		}
	};

	const oldList = parse<Project[]>(saved.monkr_projects ?? null, []);
	const oldData = parse<Record<string, string>>(saved.monkr_project_data ?? null, {});
	const list = parse<Project[]>(localStorage.getItem('monkr_projects'), []);
	const data = parse<Record<string, string>>(localStorage.getItem('monkr_project_data'), {});
	const added = oldList.filter((p) => p && typeof p.name === 'string' && !list.some((q) => q.name === p.name) && p.name in oldData);
	if (added.length) {
		for (const p of added) data[p.name] = oldData[p.name];
		put('monkr_project_data', JSON.stringify(data));
		if (!result.failed.length) {
			put('monkr_projects', JSON.stringify([...list, ...added]));
			result.projects = added.length;
		}
	}

	for (const [key, value] of Object.entries(saved)) {
		if (!KEY.test(key) || typeof value !== 'string') continue;
		if (key === 'monkr_projects' || key === 'monkr_project_data' || key === DONE_KEY || key === ATTEMPTS_KEY) continue;
		if (key === 'monkr_autosave' && replaceCanvas) put(key, value);
		else if (localStorage.getItem(key) === null) put(key, value);
	}
	return result;
}

/** Saves the old address put in the fragment (way 1). Restores the original hash. */
export function takeFragment(): Saved | null {
	const match = /^#monkr-import=([A-Za-z0-9_-]+)(?:\|(.*))?$/.exec(location.hash);
	if (!match) return null;
	history.replaceState(history.state, '', location.pathname + location.search + (match[2] ? '#' + match[2] : ''));
	try {
		let packed = match[1].replace(/-/g, '+').replace(/_/g, '/');
		while (packed.length % 4) packed += '=';
		const bytes = Uint8Array.from(atob(packed), (c) => c.charCodeAt(0));
		const saved = JSON.parse(new TextDecoder().decode(bytes));
		return saved && typeof saved === 'object' ? (saved as Saved) : null;
	} catch {
		return null;
	}
}

/** Ask the old origin for its saves through a hidden iframe (way 2). null = no answer. */
export function pullFromOldSite(timeoutMs = TIMEOUT_MS): Promise<Saved | null> {
	if (!LEGACY_ORIGIN) return Promise.resolve(null);
	return new Promise((resolve) => {
		const frame = document.createElement('iframe');
		frame.hidden = true;
		frame.setAttribute('aria-hidden', 'true');
		frame.tabIndex = -1;
		frame.src = `${LEGACY_ORIGIN}/migrate.html`;
		let timer: ReturnType<typeof setTimeout>;
		const finish = (saved: Saved | null) => {
			clearTimeout(timer);
			window.removeEventListener('message', onMessage);
			frame.remove();
			resolve(saved);
		};
		const onMessage = (event: MessageEvent) => {
			if (event.origin !== LEGACY_ORIGIN || event.source !== frame.contentWindow) return;
			const msg = event.data;
			if (!msg || msg.type !== 'monkr-legacy-data' || typeof msg.data !== 'object' || !msg.data) return;
			finish(msg.data as Saved);
		};
		window.addEventListener('message', onMessage);
		frame.addEventListener('load', () => {
			frame.contentWindow?.postMessage({ type: 'monkr-legacy-request' }, LEGACY_ORIGIN);
			clearTimeout(timer);
			timer = setTimeout(() => finish(null), Math.min(AFTER_LOAD_MS, timeoutMs));
		});
		timer = setTimeout(() => finish(null), timeoutMs);
		document.documentElement.appendChild(frame);
	});
}

/** First-visit import, before the app starts. Never throws. */
export async function importOnStart(): Promise<void> {
	if (!LEGACY_ORIGIN) return;
	try {
		const fromFragment = takeFragment();
		if (fromFragment) {
			mergeSaved(fromFragment);
			localStorage.setItem(DONE_KEY, '1');
			return;
		}
		if (localStorage.getItem(DONE_KEY)) return;
		const saved = await pullFromOldSite();
		if (!saved) {
			// No answer (offline, blocked): try again on the next few visits, then stop
			// delaying startup for it.
			const attempts = Number(localStorage.getItem(ATTEMPTS_KEY) ?? 0) + 1;
			if (attempts >= MAX_ATTEMPTS) {
				localStorage.setItem(DONE_KEY, '1');
				localStorage.removeItem(ATTEMPTS_KEY);
			} else {
				localStorage.setItem(ATTEMPTS_KEY, String(attempts));
			}
			return;
		}
		mergeSaved(saved);
		localStorage.setItem(DONE_KEY, '1');
		localStorage.removeItem(ATTEMPTS_KEY);
	} catch {
		/* storage blocked or full: the app starts as it would have anyway */
	}
}
