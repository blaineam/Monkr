<script module lang="ts">
	// Approximate the midtones of the frame artwork, leaving room for highlights and shading.
	const iphoneFinishColors: Partial<Record<string, string>> = {
		black: '#343134',
		'black-titanium': '#383838',
		blue: '#c0cdd2',
		'2022-blue': '#99a5b5',
		burgundy: '#74484f',
		'cloud-white': '#d1d1d1',
		'cosmic-orange': '#e88a59',
		'dark-blue': '#424e63',
		'deep-blue': '#4b5265',
		glacier: '#b4c2d5',
		gold: '#ab9978',
		'gold-titanium': '#b39886',
		green: '#b1bbac',
		lavender: '#bdb4c8',
		'light-gold': '#d3c7b1',
		midnight: '#30363c',
		'mist-blue': '#99a9c3',
		'natural-titanium': '#9c9690',
		pink: '#b97ba2',
		'2023-pink': '#dabbbf',
		purple: '#ada2b2',
		red: '#c11025',
		sage: '#99a982',
		silver: '#c0c0c0',
		'sky-blue': '#b6c4d0',
		'space-black': '#38383d',
		starlight: '#d2ccc4',
		teal: '#65878b',
		ultramarine: '#6375b1',
		white: '#bdbdbb',
		'white-titanium': '#c7c3bc',
		yellow: '#cbc4a4'
	};

	// Finishes of the fold-style phones, sampled from the same artwork.
	iphoneFinishColors['night-sky'] = '#56678a';
	iphoneFinishColors['star-white'] = '#c9c6bf';

	/**
	 * Chassis geometry measured from each model's frame artwork (artwork pixels):
	 * the size of the artwork, the outer edge of the band on each side
	 * [left, right, top, bottom], where the corner curve ends, and the spans of
	 * the buttons that stick out past the band. Left runs top to bottom (ring
	 * switch or Action button, volume up, volume down); right is the side button.
	 */
	interface BodySpec {
		art: [number, number];
		rails: [number, number, number, number];
		radius: number;
		left: number[][];
		right: number[][];
		top: number[][];
		/** Fold-style phones: which posture the artwork shows. */
		fold?: 'open' | 'closed';
		/** Open posture: where the hinge crosses the band, as a fraction of the width. */
		hinge?: number;
		/** Closed posture: the side the hinge is on. */
		hingeSide?: 'left' | 'right';
	}
	const bodySpecs: Partial<Record<string, BodySpec>> = {
		'iphone-14': { art: [1463, 3165], rails: [84, 1378, 254, 2910], radius: 188, left: [[783, 884], [976, 1178], [1233, 1435]], right: [[1045, 1365]], top: [] },
		'iphone-14-plus': { art: [1605, 3473], rails: [98, 1507, 284, 3187], radius: 219, left: [[812, 913], [1004, 1206], [1260, 1462]], right: [[1073, 1393]], top: [] },
		'iphone-14-pro': { art: [1474, 3195], rails: [90, 1385, 262, 2934], radius: 217, left: [[776, 878], [969, 1172], [1226, 1429]], right: [[1109, 1429]], top: [] },
		'iphone-14-pro-max': { art: [1613, 3495], rails: [105, 1508, 293, 3203], radius: 210, left: [[807, 908], [999, 1202], [1256, 1459]], right: [[1139, 1459]], top: [] },
		'iphone-15': { art: [1474, 3195], rails: [88, 1385, 260, 2934], radius: 215, left: [[804, 906], [997, 1200], [1254, 1457]], right: [[1067, 1387]], top: [] },
		'iphone-15-plus': { art: [1613, 3495], rails: [102, 1510, 291, 3205], radius: 217, left: [[820, 921], [1012, 1215], [1269, 1472]], right: [[1082, 1402]], top: [] },
		'iphone-15-pro': { art: [1474, 3195], rails: [96, 1375, 270, 2926], radius: 207, left: [[790, 899], [988, 1191], [1245, 1448]], right: [[1128, 1448]], top: [] },
		'iphone-15-pro-max': { art: [1613, 3495], rails: [112, 1500, 300, 3196], radius: 206, left: [[820, 929], [1018, 1221], [1275, 1478]], right: [[1158, 1478]], top: [] },
		'iphone-16': { art: [1474, 3194], rails: [88, 1385, 260, 2934], radius: 219, left: [[816, 940], [1033, 1235], [1290, 1492]], right: [[1103, 1423]], top: [] },
		'iphone-16-plus': { art: [1613, 3496], rails: [102, 1510, 291, 3205], radius: 217, left: [[847, 971], [1064, 1266], [1321, 1523]], right: [[1133, 1454]], top: [] },
		'iphone-16-pro': { art: [1508, 3279], rails: [108, 1401, 285, 2995], radius: 221, left: [[840, 965], [1058, 1260], [1315, 1517]], right: [[1127, 1447]], top: [] },
		'iphone-16-pro-max': { art: [1650, 3587], rails: [121, 1529, 316, 3272], radius: 226, left: [[872, 997], [1090, 1293], [1347, 1550]], right: [[1159, 1480]], top: [] },
		'iphone-17': { art: [1508, 3278], rails: [106, 1401, 285, 2993], radius: 223, left: [[840, 965], [1057, 1260], [1314, 1517]], right: [[1126, 1447]], top: [] },
		'iphone-17-air': { art: [1575, 3420], rails: [112, 1464, 296, 3123], radius: 222, left: [[851, 975], [1068, 1270], [1325, 1527]], right: [[1138, 1458]], top: [] },
		'iphone-17-pro': { art: [1508, 3278], rails: [104, 1405, 281, 2997], radius: 225, left: [[840, 965], [1057, 1260], [1314, 1517]], right: [[1127, 1447]], top: [] },
		'iphone-17-pro-max': { art: [1650, 3585], rails: [119, 1531, 313, 3272], radius: 226, left: [[872, 997], [1089, 1292], [1346, 1549]], right: [[1159, 1479]], top: [] },
		'iphone-18-pro': { art: [1350, 2760], rails: [25, 1326, 22, 2738], radius: 220, left: [[580, 705], [797, 1000], [1054, 1257]], right: [[867, 1188]], top: [] },
		'iphone-18-pro-max': { art: [1470, 3000], rails: [29, 1441, 20, 2979], radius: 229, left: [[579, 704], [796, 999], [1053, 1256]], right: [[866, 1186]], top: [] },
		'iphone-duo-inner-open': { art: [2247, 3093], rails: [58, 2189, 59, 3035], radius: 212, left: [[436, 633], [678, 875]], right: [], top: [[665, 1003]], fold: 'open', hinge: 0.5 },
		'iphone-duo-outer-closed': { art: [1574, 2194], rails: [11, 1534, 32, 2162], radius: 230, left: [], right: [[639, 977]], top: [[716, 913], [959, 1155]], fold: 'closed', hingeSide: 'left' },
		'iphone-duo-outer-open': { art: [3056, 2194], rails: [39, 3016, 31, 2162], radius: 215, left: [[639, 977]], right: [], top: [[417, 614], [659, 856]], fold: 'open', hinge: 0.5 }
	};

	type WallSide = 'left' | 'right' | 'top' | 'bottom';
	type Vec3 = [number, number, number];

	/** The lens distance of the tilt transform, in display pixels. */
	const PERSPECTIVE = 1200;
	/** Direction towards the key light: above, a little to the left, in front. */
	const LIGHT: Vec3 = [-0.38, -0.58, 0.72];

	/** Scale a hex colour's brightness: below 1 towards black, above 1 towards white. */
	function tone(hex: string, factor: number): string {
		const n = parseInt(hex.slice(1), 16);
		const mix = (c: number) => Math.round(factor <= 1 ? c * factor : c + (255 - c) * Math.min(1, factor - 1));
		return `rgb(${mix(n >> 16)} ${mix((n >> 8) & 255)} ${mix(n & 255)})`;
	}
</script>

<script lang="ts">
	import type { DeviceMeta, FrameStyle, TransformConfig } from '../types';
	import { deviceRegistry } from '../stores/devices.svelte';

	let {
		device,
		screenshotUrl = null,
		colorSlug = '',
		transform,
		frameStyle = 'default',
		bodyDepth = 0,
		borderRadius = 16,
		glow = { enabled: false, color: 'rgba(255,255,255,0.6)', blur: 20, spread: 2 }
	}: {
		device: DeviceMeta;
		screenshotUrl: string | null;
		colorSlug?: string;
		transform: TransformConfig;
		frameStyle?: FrameStyle;
		bodyDepth?: number;
		borderRadius?: number;
		glow?: { enabled: boolean; color: string; blur: number; spread: number };
	} = $props();

	const instanceId = $props.id();
	const shadowId = `monkr-shadow-${instanceId}`;
	let shadow = $derived(transform.shadow);
	let shadowColor = $derived(shadow.opacity === undefined
		? shadow.color
		: `rgb(from ${shadow.color} r g b / ${shadow.opacity})`
	);
	let shadowFilter = $derived(!shadow.enabled ? '' : shadow.spread
		? `url(#${shadowId})`
		: `drop-shadow(${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadowColor})`
	);
	let glowFilter = $derived(glow.enabled ? `drop-shadow(0 0 ${glow.blur}px ${glow.color})` : '');
	let filters = $derived([glowFilter, shadowFilter].filter(Boolean).join(' ') || 'none');

	let transformCss = $derived(
		`perspective(${PERSPECTIVE}px) rotateX(${transform.tiltX}deg) rotateY(${transform.tiltY}deg) scale(${transform.zoom})`
	);

	let isCssDevice = $derived(device.slug === '_css');
	let screen = $derived(deviceRegistry.getScreenRect(device));
	let frameColorSlug = $derived(colorSlug || device.colors[0]?.slug || '');
	let frameUrl = $derived(isCssDevice ? '' : deviceRegistry.getFrameUrl(device, frameColorSlug));
	let bodyColor = $derived(iphoneFinishColors[`${device.year}-${frameColorSlug}`] ?? iphoneFinishColors[frameColorSlug] ?? '#3a3c40');
	let maskUrl = $derived(isCssDevice ? '' : deviceRegistry.getMaskUrl(device));
	let showFrame = $derived(frameStyle !== 'none');
	let depth = $derived(frameStyle === 'default' && deviceRegistry.supportsBodyDepth(device)
		? Math.max(0, Math.min(60, bodyDepth))
		: 0
	);

	// The body is a real extrusion: the frame's silhouette repeated on planes
	// behind the face, each carrying the same tilt as the face, so the far edge
	// foreshortens and the band disappears behind the face when the phone is
	// seen square-on, as it does in a photograph. The straight runs of the band
	// are then overlaid with true wall planes that carry the hardware.
	let body = $derived.by(() => {
		if (!depth || isCssDevice) return null;
		const spec = bodySpecs[device.slug];
		const W = displayW;
		const H = displayH;
		const s = spec ? W / spec.art[0] : 1;
		const [railL, railR, railT, railB] = spec
			? spec.rails.map((v) => v * s)
			: [0, W, 0, H];
		const radius = spec ? spec.radius * s : Math.min(W, H) * 0.14;
		// An unfolded phone is half as thick as the same phone closed.
		const d = depth * (spec?.fold === 'open' ? 0.5 : 1);

		const a = (transform.tiltX * Math.PI) / 180;
		const b = (transform.tiltY * Math.PI) / 180;
		// Same order as the CSS transform: rotateY is applied to the point first.
		const rotate = ([x, y, z]: Vec3): Vec3 => {
			const x1 = x * Math.cos(b) + z * Math.sin(b);
			const z1 = -x * Math.sin(b) + z * Math.cos(b);
			return [x1, y * Math.cos(a) - z1 * Math.sin(a), y * Math.sin(a) + z1 * Math.cos(a)];
		};
		const dot = (p: Vec3, q: Vec3) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
		const normals: Record<WallSide, Vec3> = { left: [-1, 0, 0], right: [1, 0, 0], top: [0, -1, 0], bottom: [0, 1, 0] };
		// Middle of each wall, relative to the centre of the frame.
		const middles: Record<WallSide, Vec3> = {
			left: [railL - W / 2, 0, -d / 2],
			right: [railR - W / 2, 0, -d / 2],
			top: [0, railT - H / 2, -d / 2],
			bottom: [0, railB - H / 2, -d / 2]
		};
		const sides: WallSide[] = ['left', 'right', 'top', 'bottom'];
		const lit = {} as Record<WallSide, number>;
		const facing = {} as Record<WallSide, boolean>;
		for (const side of sides) {
			const n = rotate(normals[side]);
			const p = rotate(middles[side]);
			lit[side] = 0.66 + 0.6 * Math.max(0, dot(n, LIGHT));
			// Front-facing as seen from the lens, not just from straight ahead.
			facing[side] = dot(n, [-p[0], -p[1], PERSPECTIVE - p[2]]) > 0;
		}

		// Corner blends of the conic gradient, as angles seen from the body centre.
		const hw = (railR - railL) / 2;
		const hh = (railB - railT) / 2;
		const deg = (x: number, y: number) => (Math.atan2(x, y) * 180) / Math.PI;
		const c1 = deg(hw - radius, hh);
		const c2 = deg(hw, hh - radius);
		const centre = `${((railL + railR) / 2 / W) * 100}% ${((railT + railB) / 2 / H) * 100}%`;
		const clip = spec
			? `inset(${(railT / H) * 100}% ${(1 - railR / W) * 100}% ${(1 - railB / H) * 100}% ${(railL / W) * 100}%)`
			: 'none';
		const seam = spec?.fold === 'open' && spec.hinge
			? `linear-gradient(90deg, transparent calc(${spec.hinge * 100}% - 1.2px), rgb(0 0 0 / 0.7) calc(${spec.hinge * 100}% - 0.6px), rgb(0 0 0 / 0.7) calc(${spec.hinge * 100}% + 0.6px), transparent calc(${spec.hinge * 100}% + 1.2px)), `
			: '';

		const count = Math.min(16, Math.max(3, Math.ceil(d / 3)));
		const layers = Array.from({ length: count }, (_, index) => {
			// index 0 is the back of the phone and is painted first.
			const t = (count - index) / count;
			// A flat band with a polished chamfer at each edge, then the dark
			// turn into the back glass.
			const band = index === 0 ? 0.62 : index === 1 || index === count - 1 ? 1.2 : 0.96 + 0.06 * Math.sin(Math.PI * t);
			// A closed fold shows the gap between its two halves, except along
			// the hinge, which is one rounded spine.
			const gap = spec?.fold === 'closed' && index === Math.round(count / 2);
			const spine = 0.74 + 0.4 * Math.sin(Math.PI * (t - 0.5 / count));
			const shade = (side: WallSide) => tone(bodyColor, lit[side] * (spec?.hingeSide === side ? spine : gap ? 0.4 : band));
			const [top, right, bottom, left] = [shade('top'), shade('right'), shade('bottom'), shade('left')];
			return {
				transform: `${transformCss} translateZ(${-d * t}px)`,
				background: `${seam}conic-gradient(from 0deg at ${centre}, ${top} ${c1}deg, ${right} ${c2}deg, ${right} ${180 - c2}deg, ${bottom} ${180 - c1}deg, ${bottom} ${180 + c1}deg, ${left} ${180 + c2}deg, ${left} ${360 - c2}deg, ${top} ${360 - c1}deg)`
			};
		});

		// Wall planes for the straight runs of the band, only for measured models.
		// All four are always present, so they tilt in step with the face; the
		// ones turned away from the lens hide themselves (backface-visibility).
		interface Feature { kind: string; style: string }
		const walls: { side: WallSide; style: string; features: Feature[] }[] = [];
		const number = Number(device.id.match(/^iphone-(\d+)/)?.[1] ?? 0);
		if (spec) {
			const bodyH = railB - railT;
			const bodyW = railR - railL;
			for (const side of sides) {
				const upright = side === 'left' || side === 'right';
				const start = (upright ? railT : railL) + radius;
				const length = (upright ? bodyH : bodyW) - radius * 2;
				if (length <= 0) continue;
				// Place a feature by its run along the band (display px from the
				// frame's top or left) and its span across the depth (0 = face).
				const place = (from: number, to: number, c0: number, c1: number) => {
					const along = upright
						? `top: ${from - start}px; height: ${to - from}px;`
						: `left: ${from - start}px; width: ${to - from}px;`;
					const edge = { right: 'left', left: 'right', bottom: 'top', top: 'bottom' }[side];
					return `${along} ${edge}: ${c0 * 100}%; ${upright ? 'width' : 'height'}: ${(c1 - c0) * 100}%;`;
				};
				const finish = `--finish: ${tone(bodyColor, lit[side])}; --finish-hi: ${tone(bodyColor, lit[side] * 1.25)}; --finish-lo: ${tone(bodyColor, lit[side] * 0.62)};`;
				const features: Feature[] = [];
				if (number) {
					// Antenna breaks sit in the same places on every numbered model.
					const line = Math.max(1.2, bodyH * 0.0055);
					const breaks = upright ? [railT + bodyH * 0.104, railT + bodyH * 0.893]
						: side === 'top' ? [railL + bodyW * 0.785] : [railL + bodyW * 0.215];
					for (const at of breaks) features.push({ kind: 'antenna', style: place(at - line / 2, at + line / 2, 0, 1) });
				}
				const spans = side === 'bottom' ? [] : spec[side];
				for (const [from, to] of spans) features.push({ kind: 'button', style: finish + place(from * s, to * s, 0.3, 0.7) });
				if (side === 'right' && number >= 16) {
					// Camera Control is flush with the band, so the artwork cannot
					// place it; this is its position on the hardware, below the side button.
					features.push({ kind: 'camera', style: finish + place(railT + bodyH * 0.572, railT + bodyH * 0.678, 0.27, 0.73) });
				}
				if (side === 'bottom' && number) {
					const mid = (railL + railR) / 2;
					const port = bodyW * 0.058;
					const hole = Math.max(1.6, d * 0.17);
					const pitch = hole * 1.75;
					const holes = (from: number, n: number) => ({
						kind: 'holes',
						style: `--pitch: ${pitch}px; ` + place(from, from + pitch * n, 0.5 - hole / d / 2, 0.5 + hole / d / 2)
					});
					features.push({ kind: 'port', style: place(mid - port, mid + port, 0.34, 0.66) });
					features.push({ kind: 'screw', style: place(mid - port * 1.55 - hole / 2, mid - port * 1.55 + hole / 2, 0.5 - hole / d / 2, 0.5 + hole / d / 2) });
					features.push({ kind: 'screw', style: place(mid + port * 1.55 - hole / 2, mid + port * 1.55 + hole / 2, 0.5 - hole / d / 2, 0.5 + hole / d / 2) });
					features.push(holes(mid - port * 2 - pitch * 3, 3));
					features.push(holes(mid + port * 2, 5));
				}
				const [mx, my] = upright
					? [(side === 'left' ? railL : railR) - W / 2, start + length / 2 - H / 2]
					: [start + length / 2 - W / 2, (side === 'top' ? railT : railB) - H / 2];
				const turn = { right: 'rotateY(90deg)', left: 'rotateY(-90deg)', top: 'rotateX(90deg)', bottom: 'rotateX(-90deg)' }[side];
				const [w, h] = upright ? [d, length] : [length, d];
				walls.push({
					side,
					style: `left: ${(W - w) / 2}px; top: ${(H - h) / 2}px; width: ${w}px; height: ${h}px; transform: ${transformCss} translate3d(${mx}px, ${my}px, ${-d / 2}px) ${turn};`,
					features
				});
			}
		}

		// Where a wall is in view its buttons are drawn on the wall, so the
		// flat copies that stick out of the face artwork are trimmed away.
		const trim = (side: WallSide) => !!spec && facing[side] && side !== 'bottom' && spec[side].length > 0;
		const faceClip = spec && (trim('left') || trim('right') || trim('top'))
			? `inset(${trim('top') ? (railT / H) * 100 : 0}% ${trim('right') ? (1 - railR / W) * 100 : 0}% 0 ${trim('left') ? (railL / W) * 100 : 0}%)`
			: undefined;
		return { layers, walls, clip, faceClip };
	});

	let isBrowser = $derived(device.category === 'browser');
	let isTv = $derived(device.category === 'tv');
	let isWatch = $derived(device.category === 'watch');
	let isDarkBrowser = $derived(device.id === 'browser-dark');

	// Screenshot overscan: how far the (masked) screenshot bleeds OUTWARD past the
	// frame's transparent screen opening on every side, so the opaque bezel edge
	// always overlaps the screenshot and no transparent background shows through.
	//
	// Phones/tablets/desktops have low-curvature screen corners, so a 1px bleed is
	// enough to hide sub-pixel rounding seams (and keeps the mask scale change
	// imperceptible).
	//
	// Apple Watch openings are EXTREMELY rounded (corner radius ≈ 27-29% of the
	// screen width). At those corners the rounded-rect mask recedes steeply from
	// the bezel's inner edge, so a 1px bleed left a thin transparent sliver in the
	// gap between the masked screenshot corner and the bezel — visible as a
	// background-coloured crescent at each of the 4 corners. Bleeding the watch
	// screenshot further under the bezel (a few percent of the screen size) pushes
	// the masked corner curve beneath the opaque frame edge, closing the gap. The
	// mask still defines the visible rounded corners; only the hidden, overscanned
	// portion changes.
	let overscanPct = $derived(isWatch ? 2.4 : 0); // % of screen size, per side
	let overscanX = $derived((screen.width * overscanPct) / 100); // in canvas %
	let overscanY = $derived((screen.height * overscanPct) / 100);

	// Track screenshot natural dimensions for aspect-ratio-aware rendering
	let screenshotNatW = $state(0);
	let screenshotNatH = $state(0);

	$effect(() => {
		const url = screenshotUrl;
		if (!url) {
			screenshotNatW = 0;
			screenshotNatH = 0;
			return;
		}
		const img = new Image();
		img.onload = () => {
			screenshotNatW = img.naturalWidth;
			screenshotNatH = img.naturalHeight;
		};
		img.src = url;
	});

	let hasScreenshotDims = $derived(screenshotNatW > 0 && screenshotNatH > 0);

	// Use a reasonable display size (scale down large PNGs)
	let displayW = $derived(Math.min(device.pngW, 600));
	let displayH = $derived.by(() => {
		if (frameStyle === 'none' && hasScreenshotDims) {
			// No frame: use screenshot's native aspect ratio
			return displayW * (screenshotNatH / screenshotNatW);
		}
		if (isBrowser && hasScreenshotDims) {
			// Browser: content area matches screenshot AR, plus chrome (title bar + borders)
			const chromeH = ((device.pngH - device.svgH) / device.pngW) * displayW;
			return displayW * (screenshotNatH / screenshotNatW) + chromeH;
		}
		// Default: use device frame aspect ratio
		return displayW * (device.pngH / device.pngW);
	});
</script>

{#if shadow.enabled && shadow.spread}
	<!-- Morphology expands or contracts the alpha silhouette before it is blurred. -->
	<svg width="0" height="0" class="absolute pointer-events-none" aria-hidden="true">
		<defs>
			<filter id={shadowId} x="-150%" y="-150%" width="400%" height="400%" color-interpolation-filters="sRGB">
				<feMorphology in="SourceAlpha" operator={shadow.spread > 0 ? 'dilate' : 'erode'} radius={Math.abs(shadow.spread)} />
				<feGaussianBlur stdDeviation={shadow.blur} />
				<feOffset dx={shadow.offsetX} dy={shadow.offsetY} result="shadow-mask" />
				<feFlood flood-color={shadowColor} />
				<feComposite in2="shadow-mask" operator="in" />
				<feMerge>
					<feMergeNode />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>
	</svg>
{/if}
<div class="relative flex-shrink-0" style:filter={filters}>
	{#if body}
		<!-- The body behind the face: the frame's silhouette on receding planes. -->
		{#each body.layers as layer}
			<div class="body-part" aria-hidden="true"
				style="width: {displayW}px; height: {displayH}px; transform: {layer.transform};
					clip-path: {body.clip};
					-webkit-mask-image: url({frameUrl}); mask-image: url({frameUrl});
					-webkit-mask-size: 100% 100%; mask-size: 100% 100%;
					-webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
					background: {layer.background};"
			></div>
		{/each}
		<!-- Hardware on the walls that face the viewer. -->
		{#each body.walls as wall (wall.side)}
			<div class="body-part body-wall body-wall-{wall.side}" aria-hidden="true" style={wall.style}>
				{#each wall.features as feature}
					<div class="wall-{feature.kind}" style={feature.style}></div>
				{/each}
			</div>
		{/each}
	{/if}
	<div
		class="relative"
		style="width: {displayW}px; height: {displayH}px; transform: {transformCss}; transition: transform 0.3s ease;"
	>
		{#if isCssDevice && showFrame}
			<!-- CSS-rendered frames for TV and browser -->
			{#if isBrowser}
				<!-- Browser frame -->
				<div
					class="absolute inset-0 flex flex-col overflow-hidden rounded-xl"
					style="border: 2px solid {isDarkBrowser ? '#3f3f46' : '#d4d4d8'};"
				>
					<!-- Title bar -->
					<div
						class="flex items-center gap-2 px-3 py-2"
						style="background: {isDarkBrowser ? '#27272a' : '#f4f4f5'}; border-bottom: 1px solid {isDarkBrowser ? '#3f3f46' : '#d4d4d8'};"
					>
						<!-- Traffic lights -->
						<div class="flex gap-1.5">
							<div class="h-2.5 w-2.5 rounded-full bg-[#ff5f57]"></div>
							<div class="h-2.5 w-2.5 rounded-full bg-[#febc2e]"></div>
							<div class="h-2.5 w-2.5 rounded-full bg-[#28c840]"></div>
						</div>
						<!-- URL bar -->
						<div
							class="flex-1 rounded-md px-3 py-1 text-[10px]"
							style="background: {isDarkBrowser ? '#18181b' : '#e4e4e7'}; color: {isDarkBrowser ? '#71717a' : '#a1a1aa'};"
						>
							https://example.com
						</div>
					</div>
					<!-- Content area -->
					<div class="flex-1 overflow-hidden" style="background: {isDarkBrowser ? '#18181b' : '#ffffff'};">
						{#if screenshotUrl}
							<img src={screenshotUrl} alt="Screenshot" class="h-full w-full object-cover" draggable="false" />
						{:else}
							<div class="flex h-full w-full items-center justify-center">
								<span class="text-[10px]" style="color: {isDarkBrowser ? '#52525b' : '#a1a1aa'};">No screenshot</span>
							</div>
						{/if}
	</div>
				</div>
			{:else if isTv}
				<!-- TV frame -->
				<div class="absolute inset-0 flex flex-col items-center">
					<!-- Screen bezel -->
					<div
						class="relative w-full overflow-hidden rounded-lg"
						style="flex: 1; border: {device.id === 'apple-tv-4k' ? '3px' : '6px'} solid {colorSlug === 'silver' ? '#a1a1aa' : '#27272a'}; background: #000;"
					>
						{#if screenshotUrl}
							<img src={screenshotUrl} alt="Screenshot" class="h-full w-full object-cover" draggable="false" />
						{:else}
							<div class="flex h-full w-full items-center justify-center bg-black">
								<span class="text-[10px] text-zinc-700">No screenshot</span>
							</div>
						{/if}
					</div>
					<!-- Stand -->
					{#if device.id === 'tv-flat'}
						<div class="flex flex-col items-center">
							<div
								class="h-4 w-1"
								style="background: {colorSlug === 'silver' ? '#a1a1aa' : '#3f3f46'};"
							></div>
							<div
								class="h-1 w-16 rounded-full"
								style="background: {colorSlug === 'silver' ? '#a1a1aa' : '#3f3f46'};"
							></div>
						</div>
					{:else}
						<!-- Apple TV: no stand, just a thin bottom chin -->
						<div class="h-1"></div>
					{/if}
				</div>
			{/if}
		{:else if showFrame}
			<!-- Screenshot behind the frame, clipped to screen area.
			     Overscanned outward on every side so the opaque frame edge always
			     overlaps the masked screenshot and no transparent background shows
			     through the screen opening. Phones/tablets use a 1px bleed (covers
			     sub-pixel rounding seams); watches use a larger percentage bleed
			     (overscanX/overscanY) because their highly-rounded corners otherwise
			     leave a transparent sliver — see the overscan note in <script>. The
			     SVG mask scales with the div, so the visible rounded corners stay
			     correct; only the hidden overscanned portion grows. -->
			<div
				class="absolute overflow-hidden"
				style="left: calc({screen.left}% - {isWatch ? `${overscanX}%` : '1px'});
					top: calc({screen.top}% - {isWatch ? `${overscanY}%` : '1px'});
					width: calc({screen.width}% + {isWatch ? `${overscanX * 2}%` : '2px'});
					height: calc({screen.height}% + {isWatch ? `${overscanY * 2}%` : '2px'});
					-webkit-mask-image: url({maskUrl});
					mask-image: url({maskUrl});
					-webkit-mask-size: 100% 100%;
					mask-size: 100% 100%;
					-webkit-mask-repeat: no-repeat;
					mask-repeat: no-repeat;"
			>
				{#if screenshotUrl}
					<img src={screenshotUrl} alt="Screenshot" class="h-full w-full object-cover" draggable="false" />
				{:else}
					<div class="flex h-full w-full items-center justify-center bg-black">
						<span class="text-[10px] text-zinc-700">No screenshot</span>
					</div>
				{/if}
			</div>

			<!-- Device frame PNG overlay -->
			<img
				src={frameUrl}
				alt={device.name}
				class="absolute inset-0 h-full w-full pointer-events-none"
				style="{frameStyle === 'outline' ? 'opacity: 0.3;' : ''}"
				style:clip-path={body?.faceClip}
				draggable="false"
			/>
		{:else}
			<!-- No frame mode: just screenshot with rounded corners -->
			<div
				class="absolute inset-0 overflow-hidden"
				style="border-radius: {borderRadius}px;"
			>
				{#if screenshotUrl}
					<img src={screenshotUrl} alt="Screenshot" class="h-full w-full object-cover" draggable="false" />
				{:else}
					<div class="flex h-full w-full items-center justify-center bg-zinc-900">
						<span class="text-sm text-zinc-600">No screenshot</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.body-part {
		position: absolute;
		left: 0;
		top: 0;
		pointer-events: none;
		transition: transform 0.3s ease;
	}
	/* A wall plane only exists while it faces the lens. */
	.body-wall {
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}
	/* The band catches the light along its length rather than as one flat tone. */
	.body-wall-left,
	.body-wall-right {
		background: linear-gradient(to bottom, rgb(255 255 255 / 0), rgb(255 255 255 / 0.2) 16%, rgb(255 255 255 / 0.03) 40%,
			rgb(0 0 0 / 0.1) 72%, rgb(0 0 0 / 0));
	}
	.body-wall-top,
	.body-wall-bottom {
		background: linear-gradient(to right, rgb(255 255 255 / 0), rgb(255 255 255 / 0.16) 22%, rgb(255 255 255 / 0.02) 50%,
			rgb(0 0 0 / 0.1) 80%, rgb(0 0 0 / 0));
	}
	.body-wall > div {
		position: absolute;
	}
	.wall-antenna {
		background: rgb(128 128 128 / 0.55);
		box-shadow: 0 0 0 0.3px rgb(0 0 0 / 0.18);
	}
	.wall-button {
		border-radius: 999px;
		background: linear-gradient(135deg, var(--finish-hi), var(--finish) 38%, var(--finish) 70%, var(--finish-lo));
		box-shadow: 0 0 0 0.5px rgb(0 0 0 / 0.38), 0 0 1.4px 0.3px rgb(0 0 0 / 0.28), inset 0 0 0.8px rgb(255 255 255 / 0.5);
	}
	.wall-camera {
		border-radius: 999px;
		background: linear-gradient(135deg, var(--finish-lo), var(--finish) 55%, var(--finish-lo));
		box-shadow: inset 0 0 0 0.7px rgb(0 0 0 / 0.55), inset 0 0 2px 1px rgb(0 0 0 / 0.3), 0 0 0 0.5px rgb(255 255 255 / 0.22);
	}
	.wall-port {
		border-radius: 999px;
		background: #0a0a0b;
		box-shadow: 0 0 0 0.6px rgb(255 255 255 / 0.16), inset 0 0 0 1px rgb(60 60 64 / 0.9);
	}
	.wall-screw {
		border-radius: 50%;
		background: radial-gradient(circle, #1b1b1d 30%, #4a4a4e 34%, #2a2a2c 70%);
	}
	.wall-holes {
		background: radial-gradient(circle closest-side, #0a0a0b 78%, transparent 82%) 0 50% / var(--pitch) 100% repeat-x;
	}
</style>
