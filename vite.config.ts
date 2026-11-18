import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';


// The default build (base '') is what monkr.wemiller.com and the CLI's headless
// renderer use. The wemiller.com build sets MONKR_BASE=/tools/monkr/app and
// MONKR_OUT=build-portfolio; see scripts/build-portfolio.sh.
const base = (process.env.MONKR_BASE ?? '') as '' | `/${string}`;
const out = process.env.MONKR_OUT ?? 'build';

// The version is baked into the bundles; SvelteKit's default (the build time) gave every
// rebuild of the same source new file names, so the portfolio's daily mirror would commit
// a fresh copy of an unchanged app. The source commit makes it reproducible.
function version(): string {
	try {
		// The last commit that touched what goes into the bundle, so a README-only commit
		// doesn't rename every file either.
		const inputs = 'src static vite.config.ts package-lock.json';
		const run = (cmd: string) => execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
		const commit = run(`git log -1 --format=%h --abbrev=12 -- ${inputs}`);
		const dirty = run(`git status --porcelain -- ${inputs}`);
		if (!commit) throw new Error('no history');
		return dirty ? `${commit}-${Date.now()}` : commit;
	} catch {
		return Date.now().toString();
	}
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }: { filename: string }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				pages: out,
				assets: out,
				fallback: 'index.html',
				precompress: false,
				strict: true
			}),
			alias: { $lib: 'src/lib' },
			paths: { base },
			version: { name: version() }
		})
	],
	server: {
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'credentialless'
		}
	},
	optimizeDeps: {
		exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
	}
});
