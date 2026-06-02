#!/usr/bin/env node
// monkr — command-line interface for the Monkr mockup studio.
//
//   monkr render <project.monkr> --out <dir> [options]
//
// Renders a .monkr project to framed image files via Monkr's own renderer
// (headless Chromium + the built /headless route) — pixel-identical to the
// editor's Export button. Optionally swaps in fresh screenshots first.
import { render } from '../cli/render.mjs';

const HELP = `monkr — render .monkr projects from the command line

Usage:
  monkr render <project.monkr> --out <dir> [options]

Options:
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

Examples:
  monkr render shot.monkr --out out/
  monkr render App-iphone.monkr --out out/ --save \\
    --screenshots raw/iphone/   # render every PNG in the folder, framed
`;

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
