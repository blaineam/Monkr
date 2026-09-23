#!/usr/bin/env node
// monkr — command-line interface for the Monkr mockup studio.
//
//   monkr render  <project.monkr> --out <dir> [options]
//   monkr animate <project.monkr> --out <clip.mp4> [options]
//
// Renders a .monkr project to framed image files via Monkr's own renderer
// (headless Chromium + the built /headless route) — pixel-identical to the
// editor's Export button. Optionally swaps in fresh screenshots first.
import { render } from '../cli/render.mjs';
import { animate } from '../cli/animate.mjs';

const HELP = `monkr — render .monkr projects from the command line

Usage:
  monkr render  <project.monkr> --out <dir> [options]
  monkr animate <project.monkr> --out <clip.mp4> [options]

Render options:
  --out <dir>            output directory for framed images (required)
  --screenshots <paths> screenshots to swap in (files and/or directories);
                        one framed image is produced per screenshot, in order.
                        Omit to render the project's own embedded screenshots.
  --save                write the updated .monkr back to disk (with new shots)
  --format <png|jpg>    override the project's export format
  --scale <1|2|3>       override the project's export scale
  --build               force-rebuild the Monkr static site first
  --device <id>         device id for a synthesized default (no .monkr yet)
  --color <id>          device color id for a synthesized default
  --canvas <WxH>        canvas size for a synthesized default (e.g. 1320x2868)
  -h, --help            show this help

Animate options:
  --out <file>          output video (.mp4 or .mov) (required)
  --sequence <spec>     presets to play, chained: "rise@0:1400,float@1400:7000"
                        (ms). A bare name runs the whole clip. Presets: rise,
                        slide-in, float, tilt-showcase, zoom-in-out, rock,
                        spin-360. Defaults to the project's animation preset.
                        A step longer than its preset repeats whole cycles.
  --duration <ms>       clip length (default: project, else 3000)
  --fps <n>             frames per second (default: project, else 30)
  --relative            apply presets as offsets from each device's own pose
                        instead of the editor's absolute values
  --silent-audio        add a silent AAC track (some platforms expect audio)
  --music <style[:#tag]>  score the clip with Tom (github.com/blaineam/Tom), e.g.
                        "synthwave" or "chip:#road-trip"; needs \`tom\` on PATH
                        or TOM_BIN pointing at tom.mjs
  --music-hit <ms>      when Tom's final hit lands (default: 74% of the clip)
  --build               force-rebuild the Monkr static site first

Examples:
  monkr render shot.monkr --out out/
  monkr render App-iphone.monkr --out out/ --save \\
    --screenshots raw/iphone/   # render every PNG in the folder, framed
  monkr animate post.monkr --out post.mp4 --duration 7000 --relative \\
    --sequence "rise@0:1400,float@1400:7000"
`;

function parseAnimate(argv) {
	const a = {};
	for (let i = 0; i < argv.length; i++) {
		const t = argv[i];
		switch (t) {
			case '--out': a.out = argv[++i]; break;
			case '--sequence': a.sequence = argv[++i]; break;
			case '--duration': a.duration = Number(argv[++i]); break;
			case '--fps': a.fps = Number(argv[++i]); break;
			case '--relative': a.relative = true; break;
			case '--silent-audio': a.silentAudio = true; break;
			case '--music': a.music = argv[++i]; break;
			case '--music-hit': a.musicHit = Number(argv[++i]); break;
			case '--build': a.build = true; break;
			default:
				if (t.startsWith('--')) { console.error(`Unknown option: ${t}`); process.exit(2); }
				else a.monkr = t;
		}
	}
	return a;
}

function parseRender(argv) {
	const a = { shots: [], save: false };
	for (let i = 0; i < argv.length; i++) {
		const t = argv[i];
		switch (t) {
			case '--out': a.out = argv[++i]; break;
			case '--save': a.save = true; break;
			case '--format': a.format = argv[++i]; break;
			case '--scale': a.scale = Number(argv[++i]); break;
			case '--build': a.build = true; break;
			case '--device': a.device = argv[++i]; break;
			case '--color': a.color = argv[++i]; break;
			case '--canvas': a.canvas = argv[++i]; break;
			case '--screenshots':
			case '--shots':
				while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) a.shots.push(argv[++i]);
				break;
			default:
				if (t.startsWith('--')) { console.error(`Unknown option: ${t}`); process.exit(2); }
				else if (!a.monkr) a.monkr = t; // positional project path
				else a.shots.push(t);
		}
	}
	return a;
}

async function main() {
	const [cmd, ...rest] = process.argv.slice(2);
	if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'help') {
		process.stdout.write(HELP);
		process.exit(cmd ? 0 : 1);
	}
	if (cmd === 'animate') {
		if (rest.includes('-h') || rest.includes('--help')) { process.stdout.write(HELP); process.exit(0); }
		const out = await animate(parseAnimate(rest));
		console.error(`✓ Wrote ${out}`);
		return;
	}
	if (cmd !== 'render') {
		console.error(`Unknown command: ${cmd}\n`);
		process.stdout.write(HELP);
		process.exit(2);
	}
	if (rest.includes('-h') || rest.includes('--help')) { process.stdout.write(HELP); process.exit(0); }

	const opts = parseRender(rest);
	const written = await render(opts);
	console.error(`✓ Wrote ${written.length} framed image(s) → ${opts.out}`);
	written.forEach((p) => console.error(`    ${p}`));
}

main().catch((e) => { console.error(`✗ ${e.stack || e}`); process.exit(1); });
