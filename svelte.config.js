import adapter from '@sveltejs/adapter-static';

// The default build (base '') is what monkr.wemiller.com and the CLI's headless
// renderer use. The wemiller.com build sets MONKR_BASE=/tools/monkr/app and
// MONKR_OUT=build-portfolio; see scripts/build-portfolio.sh.
const base = process.env.MONKR_BASE ?? '';
const out = process.env.MONKR_OUT ?? 'build';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({
			pages: out,
			assets: out,
			fallback: 'index.html',
			precompress: false,
			strict: true
		}),
		paths: {
			base
		}
	}
};

export default config;
