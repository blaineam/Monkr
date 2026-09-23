// monkr animate — headless animation engine.
//
// Plays Monkr's animation presets over a .monkr project with Monkr's OWN
// renderer (the built static site + the /headless route, driven by
// Playwright), captures every frame, and encodes a video with the system
// ffmpeg. Presets can be chained ("rise@0:1400,float@1400:7000") and applied
// relative to each device's resting pose, which is what social clips need:
// the device keeps its composed position and the preset adds the motion.
//
// Exposed as the `monkr animate` subcommand via ../bin/monkr.mjs.
import { readFile, mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { REPO_ROOT, ensureBuild, startServer } from './render.mjs';

function log(msg) { process.stderr.write(`${msg}\n`); }

/**
 * Parse "rise@0:1400,float@1400:7000" into steps. A bare preset name
 * ("float") runs for the whole duration.
 */
export function parseSequence(spec, duration) {
	return spec.split(',').map((part) => {
		const m = /^\s*([a-z0-9-]+)(?:@(\d+):(\d+))?\s*$/i.exec(part);
		if (!m) throw new Error(`Bad sequence step "${part}" — expected preset or preset@start:end (ms)`);
		return { preset: m[1], start: m[2] ? Number(m[2]) : 0, end: m[3] ? Number(m[3]) : duration };
	});
}

/**
 * Tom (https://github.com/blaineam/Tom) is an optional companion: a seeded
 * music machine. Found via $TOM_BIN, or `tom` on PATH.
 */
function findTom() {
	if (process.env.TOM_BIN) return process.env.TOM_BIN;
	try { execFileSync('tom', ['--version'], { stdio: 'ignore' }); return 'tom'; } catch { return null; }
}

/** Render a Tom jingle whose final hit lands at hitMs, lasting the whole clip. */
function scoreWithTom(spec, durationMs, hitMs, outWav) {
	const tom = findTom();
	if (!tom) throw new Error('--music needs Tom (https://github.com/blaineam/Tom): install it so `tom` is on PATH, or set TOM_BIN to tom.mjs');
	const [style, seed] = String(spec).split(':');
	const args = ['jingle', '--style', style, '--length', String(durationMs / 1000), '--hit', String(hitMs / 1000), '--out', outWav];
	if (seed) args.push('--seed', seed);
	const cmd = tom.endsWith('.mjs') ? process.execPath : tom;
	execFileSync(cmd, tom.endsWith('.mjs') ? [tom, ...args] : args, { stdio: ['ignore', 'ignore', 'inherit'] });
	log(`• Scored with Tom: ${style}${seed ? ` ${seed}` : ''}, final hit at ${(hitMs / 1000).toFixed(2)}s`);
}

function ffmpegAvailable() {
	try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; }
}

/**
 * Render an animated clip.
 * @param {object} opts
 * @param {string} opts.monkr     project path
 * @param {string} opts.out       output .mp4/.mov path
 * @param {string} [opts.sequence] chained presets; defaults to the project's animation.presetId
 * @param {number} [opts.duration] ms (default: project animation.duration, else 3000)
 * @param {number} [opts.fps]      default: project animation.fps, else 30
 * @param {boolean} [opts.relative]
 * @param {boolean} [opts.silentAudio] add a silent AAC track (some platforms want one)
 * @param {string} [opts.music]    score the clip with Tom: "style" or "style:#tag" (needs `tom`)
 * @param {number} [opts.musicHit] ms at which Tom's final hit lands (default: 74% of the clip)
 * @param {boolean} [opts.build]   force-rebuild the static site
 * @returns {Promise<string>} the written video path
 */
export async function animate(opts) {
	if (!opts.out) throw new Error('--out <file.mp4> is required');
	if (!opts.monkr || !existsSync(opts.monkr)) throw new Error(`Project not found: ${opts.monkr}`);
	if (!ffmpegAvailable()) throw new Error('ffmpeg not found on PATH (brew install ffmpeg)');

	const project = JSON.parse(await readFile(opts.monkr, 'utf8'));
	const duration = Number(opts.duration ?? project.animation?.duration ?? 3000);
	const fps = Number(opts.fps ?? project.animation?.fps ?? 30);
	const spec = opts.sequence ?? project.animation?.presetId;
	if (!spec) throw new Error('No animation: pass --sequence or set animation.presetId in the project');
	const sequence = parseSequence(spec, duration);
	const frames = Math.round((duration / 1000) * fps);

	const buildDir = join(REPO_ROOT, 'build');
	ensureBuild(buildDir, opts.build);

	const work = await mkdtemp(join(tmpdir(), 'monkr-anim-'));
	const { chromium } = await import('playwright');
	const server = await startServer(buildDir);
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({ deviceScaleFactor: 1 });
		page.on('pageerror', (e) => log(`  [pageerror] ${e.message}`));
		await page.goto(`http://127.0.0.1:${server.address().port}/headless`, { waitUntil: 'networkidle' });
		await page.waitForFunction('!!window.__monkr?.animStart', null, { timeout: 30000 });
		const info = await page.evaluate(
			(args) => window.__monkr.animStart(args),
			{ projectJson: project, sequence, relative: !!opts.relative, format: 'jpg', scale: 1 }
		);
		log(`• Animating ${info.objects} object(s), ${info.tracks} track(s): ${frames} frames @ ${fps}fps`);
		for (let i = 0; i < frames; i++) {
			const url = await page.evaluate((t) => window.__monkr.animFrame(t), (i * 1000) / fps);
			const b64 = url.slice(url.indexOf(',') + 1);
			await writeFile(join(work, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(b64, 'base64'));
			if ((i + 1) % fps === 0) log(`  ${i + 1}/${frames}`);
		}
		await page.evaluate(() => window.__monkr.animEnd());
	} finally {
		await browser.close();
		server.close();
	}

	const out = resolve(opts.out);
	await mkdir(dirname(out), { recursive: true });
	const args = ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(work, 'f%05d.jpg')];
	if (opts.music) {
		const bed = join(work, 'music.wav');
		scoreWithTom(opts.music, duration, opts.musicHit ?? Math.round(duration * 0.74), bed);
		args.push('-i', bed, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest');
	} else if (opts.silentAudio) args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000', '-shortest', '-c:a', 'aac');
	args.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
		'-preset', 'slow', '-crf', '18', '-movflags', '+faststart', out);
	log('• Encoding');
	execFileSync('ffmpeg', args, { stdio: 'inherit' });
	await rm(work, { recursive: true, force: true });
	return out;
}
