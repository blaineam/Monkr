// Where this build is served from, and where its heavy static media lives.
//
// The default build serves everything from one origin (monkr.wemiller.com, and
// the CLI's local server). The wemiller.com build (scripts/build-portfolio.sh)
// is only the small app shell under /tools/monkr/app; the ~150 MB of device
// frames and background photos stay on monkr.wemiller.com and are fetched
// cross-origin. GitHub Pages answers those with `Access-Control-Allow-Origin: *`,
// so they load in CORS mode and never taint an export.
import { base } from '$app/paths';

const env = import.meta.env;

/** Origin (no trailing slash) serving /devices and /backgrounds; '' = this site. */
export const MEDIA_ORIGIN: string = (env.VITE_MONKR_MEDIA_ORIGIN ?? '').replace(/\/+$/, '');

/** URL of a file under static/devices or static/backgrounds, e.g. media('/devices/x/y.png'). */
export function media(path: string): string {
	return (MEDIA_ORIGIN || base) + path;
}

/** The address Monkr used to live at, whose saved projects this build can bring over; '' = none. */
export const LEGACY_ORIGIN: string = (env.VITE_MONKR_LEGACY_ORIGIN ?? '').replace(/\/+$/, '');
