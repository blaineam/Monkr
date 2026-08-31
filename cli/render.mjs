// monkr render — headless engine.
//
// Renders a .monkr project to framed image files using Monkr's OWN renderer
// (the built static site + the /headless route) driven by Playwright, so the
// output is pixel-identical to the editor's Export button. Optionally swaps in
// fresh screenshots first (and saves the updated .monkr).
//
// Exposed as the `monkr render` subcommand via ../bin/monkr.mjs.
import { createServer } from 'node:http';
import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, join, resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
	'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
	'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
	'.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon'
};
const IMG_MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

function log(msg) { process.stderr.write(`${msg}\n`); }

async function fileToDataUrl(path) {
	const ext = extname(path).toLowerCase();
	const mime = IMG_MIME[ext];
	if (!mime) throw new Error(`Unsupported screenshot type: ${path}`);
	return `data:${mime};base64,${(await readFile(path)).toString('base64')}`;
}

/** Expand files and/or directories of images into a sorted, flat list. */
async function resolveShots(inputs) {
	const out = [];
	for (const s of inputs) {
		const st = existsSync(s) ? await stat(s) : null;
		if (st?.isDirectory()) {
			const e = (await readdir(s)).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
			out.push(...e.map((f) => join(s, f)));
		} else if (st?.isFile()) out.push(s);
		else throw new Error(`Screenshot not found: ${s}`);
	}
	return out;
}

/** Minimal default project for a project file that doesn't exist yet. */
function defaultProject({ device, color, canvas }) {
	const [w, h] = (canvas || '1320x2868').split('x').map(Number);
	return {
		version: 3,
		background: {
			type: 'gradient', solidColor: '#1e1b4b',
			gradientCss: 'linear-gradient(160deg, #1a0a2e 0%, #16213e 50%, #0a1628 100%)',
			gradientName: 'Cosmic Hero', imageUrl: null
		},
		canvasSize: { width: w, height: h, presetName: 'Custom' },
		padding: 60,
		exportConfig: { scale: 1, format: 'png' },
		textOverlay: {}, textBlocks: [],
		sceneObjects: [{
			id: 'obj-1', deviceId: device || 'iphone-17-pro-max', deviceColorId: color || 'cosmic-orange',
			screenshotUrl: null, screenshotFile: null, extraScreenshots: [],
			x: 50, y: 50, scale: 1, rotation: 0, tiltX: 0, tiltY: 0,
			shadow: { enabled: true, color: 'rgba(0,0,0,0.4)', blur: 60, spread: 0, offsetX: 0, offsetY: 0 },
			frameStyle: 'default', borderRadius: 16,
			glow: { enabled: false, color: 'rgba(255,255,255,0.6)', blur: 20, spread: 2 }
		}]
	};
}

/** Static server for build/ with SvelteKit-style route resolution + SPA fallback. */
export function startServer(buildDir) {
	return new Promise((resolveServer) => {
		const server = createServer(async (req, res) => {
			try {
				const p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
				const candidates = [join(buildDir, p), join(buildDir, `${p}.html`), join(buildDir, p, 'index.html')];
				let filePath = null;
				for (const c of candidates) if (existsSync(c) && (await stat(c)).isFile()) { filePath = c; break; }
				if (!filePath) filePath = join(buildDir, 'index.html');
				res.writeHead(200, { 'content-type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream' });
				res.end(await readFile(filePath));
			} catch { res.writeHead(500); res.end('error'); }
		});
		server.listen(0, '127.0.0.1', () => resolveServer(server));
	});
}

/** Newest mtime under a directory, or 0 if it doesn't exist. */
function newestMtime(dir) {
	let newest = 0;
	const walk = (d) => {
		for (const e of readdirSync(d, { withFileTypes: true })) {
			const p = join(d, e.name);
			if (e.isDirectory()) walk(p);
			else newest = Math.max(newest, statSync(p).mtimeMs);
		}
	};
	if (existsSync(dir)) walk(dir);
	return newest;
}

export function ensureBuild(buildDir, force) {
	const headless = join(buildDir, 'headless.html');
	// Rebuild when src/ is newer than the bundle. Without this a months-old
	// build/ is reused silently, so source fixes look like they did nothing.
	const stale = existsSync(headless) && newestMtime(join(REPO_ROOT, 'src')) > statSync(headless).mtimeMs;
	if (!force && !stale && existsSync(headless)) return;
	if (stale) log('• build/ is older than src/ — rebuilding');
	log(`• Building Monkr static site (${REPO_ROOT})`);
	execFileSync('npm', ['run', 'build'], { cwd: REPO_ROOT, stdio: 'inherit' });
	if (!existsSync(join(buildDir, 'headless.html'))) {
		throw new Error('Build did not produce build/headless.html');
	}
}

/**
 * Render a project to framed image files.
 * @returns {Promise<string[]>} written file paths.
 */
export async function render(opts) {
	const { out } = opts;
	if (!out) throw new Error('--out <dir> is required');
	const buildDir = join(REPO_ROOT, 'build');
	ensureBuild(buildDir, opts.build);

	// Load or synthesize the project.
	let project;
	if (opts.monkr && existsSync(opts.monkr)) {
		project = JSON.parse(await readFile(opts.monkr, 'utf8'));
	} else {
		log(`• No .monkr at ${opts.monkr ?? '(unset)'} — synthesizing a default frame`);
		project = defaultProject(opts);
	}
	if (!Array.isArray(project.sceneObjects) || project.sceneObjects.length === 0) {
		throw new Error('Project has no sceneObjects');
	}

	// Optionally swap in fresh screenshots (primary + extras).
	const shotPaths = await resolveShots(opts.shots ?? []);
	if (shotPaths.length) {
		log(`• Embedding ${shotPaths.length} screenshot(s)`);
		const dataUrls = [];
		for (const p of shotPaths) dataUrls.push(await fileToDataUrl(p));
		const obj = project.sceneObjects[0];
		obj.screenshotUrl = dataUrls[0];
		obj.screenshotFile = null;
		obj.extraScreenshots = dataUrls.slice(1).map((url) => ({ url, file: null }));
		if (opts.save && opts.monkr) {
			await writeFile(opts.monkr, JSON.stringify(project, null, 2));
			log(`• Saved updated .monkr → ${opts.monkr}`);
		}
	}

	// Drive the headless renderer.
	const { chromium } = await import('playwright');
	const server = await startServer(buildDir);
	const port = server.address().port;
	const browser = await chromium.launch();
	let results = [];
	try {
		const page = await browser.newPage({ deviceScaleFactor: 1 });
		page.on('console', (m) => { if (m.type() === 'error') log(`  [page] ${m.text()}`); });
		page.on('pageerror', (e) => log(`  [pageerror] ${e.message}`));
		await page.goto(`http://127.0.0.1:${port}/headless`, { waitUntil: 'networkidle' });
		await page.waitForFunction('!!window.__monkr', null, { timeout: 30000 });
		log('• Rendering frames…');
		results = await page.evaluate(
			async ({ project, format, scale }) =>
				window.__monkr.render({ projectJson: project, screenshots: [], format, scale }),
			{ project, format: opts.format, scale: opts.scale }
		);
	} finally {
		await browser.close();
		server.close();
	}

	// Write outputs, named after the source screenshots when available.
	await mkdir(out, { recursive: true });
	const written = [];
	for (let i = 0; i < results.length; i++) {
		const m = /^data:image\/(png|jpeg);base64,(.+)$/s.exec(results[i]);
		if (!m) throw new Error(`Unexpected renderer output at index ${i}`);
		const ext = m[1] === 'jpeg' ? 'jpg' : 'png';
		const base = shotPaths[i] ? basename(shotPaths[i]).replace(/\.(png|jpe?g)$/i, '') : `${i + 1}`;
		const outPath = join(out, `${base}.${ext}`);
		await writeFile(outPath, Buffer.from(m[2], 'base64'));
		written.push(outPath);
	}
	return written;
}
