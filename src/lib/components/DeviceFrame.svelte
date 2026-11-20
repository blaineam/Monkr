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

	// Chassis edges and button spans measured in the 1470 × 3000 frame artwork.
	const proMaxRailInset = 29 / 1470 * 100;
	const proMaxButtons = {
		left: [[581, 702], [798, 997], [1055, 1254]],
		right: [[865, 1186]]
	};
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
		`perspective(1200px) rotateX(${transform.tiltX}deg) rotateY(${transform.tiltY}deg) scale(${transform.zoom})`
	);

	let isCssDevice = $derived(device.slug === '_css');
	let screen = $derived(deviceRegistry.getScreenRect(device));
	let frameColorSlug = $derived(colorSlug || device.colors[0]?.slug || '');
	let frameUrl = $derived(isCssDevice ? '' : deviceRegistry.getFrameUrl(device, frameColorSlug));
	let bodyColor = $derived(iphoneFinishColors[`${device.year}-${frameColorSlug}`] ?? iphoneFinishColors[frameColorSlug] ?? '#3a3c40');
	let bodyGradient = $derived(`linear-gradient(172deg,
		color-mix(in srgb, ${bodyColor}, white 35%) 0%,
		color-mix(in srgb, ${bodyColor}, white 52%) 10%,
		color-mix(in srgb, ${bodyColor}, white 13%) 26%,
		color-mix(in srgb, ${bodyColor}, white 20%) 72%,
		color-mix(in srgb, ${bodyColor}, white 37%) 94%,
		color-mix(in srgb, ${bodyColor}, black 14%) 100%)`);
	let maskUrl = $derived(isCssDevice ? '' : deviceRegistry.getMaskUrl(device));
	let showFrame = $derived(frameStyle !== 'none');
	let depth = $derived(frameStyle === 'default' && deviceRegistry.supportsBodyDepth(device)
		? Math.max(0, Math.min(40, bodyDepth))
		: 0
	);
	let bodyOffset = $derived.by(() => {
		const { tiltX, tiltY } = transform;
		const tilt = Math.hypot(tiltX, tiltY);
		// Project the sidewall separately from the face. A rear plane recedes
		// entirely inside the face's silhouette at shallow perspective angles.
		const sideAngle = Math.min(tilt * 4.5, 90) * Math.PI / 180;
		const distance = depth * Math.sin(sideAngle);
		const scale = tilt ? distance / tilt : 0;
		return { x: -tiltY * scale, y: tiltX * scale, layers: Math.min(16, Math.ceil(distance / 2)) };
	});
	let hasProMaxSidewall = $derived(device.id === 'iphone-18-pro-max' && bodyOffset.layers > 0);
	let buttonSide = $derived<keyof typeof proMaxButtons>(bodyOffset.x < 0 ? 'left' : 'right');
	let showSideButtons = $derived(hasProMaxSidewall && Math.abs(bodyOffset.x) >= 4);
	let bodyClip = $derived(hasProMaxSidewall ? `inset(0 ${proMaxRailInset}% 0 ${proMaxRailInset}%)` : undefined);
	let faceClip = $derived(showSideButtons
		? buttonSide === 'left' ? `inset(0 0 0 ${proMaxRailInset}%)` : `inset(0 ${proMaxRailInset}% 0 0)`
		: undefined
	);

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
	<div
		class="relative"
		style="width: {displayW}px; height: {displayH}px; transform: {transformCss}; transition: transform 0.3s ease;"
	>
		<!-- Stack the frame's alpha silhouette behind the original face. -->
		{#each { length: bodyOffset.layers } as _, index}
			{@const fraction = (bodyOffset.layers - index) / bodyOffset.layers}
			{@const shade = fraction === 1 ? 0.66 : 0.80 + 0.36 * Math.sin(Math.PI * fraction ** 0.65)}
			<div class="absolute inset-0 pointer-events-none" aria-hidden="true"
				style:clip-path={bodyClip}
				style="transform: translate({bodyOffset.x * fraction}px, {bodyOffset.y * fraction}px);
					mask-image: url({frameUrl}); mask-size: 100% 100%; mask-repeat: no-repeat;
					background: {bodyGradient};
					filter: brightness({shade});"
			></div>
		{/each}
		{#if showSideButtons}
			<!-- Place each button just past the middle of the visible sidewall. -->
			{#each proMaxButtons[buttonSide] as [top, bottom]}
				<div class="side-button absolute pointer-events-none" aria-hidden="true"
					style="--button-finish: {bodyColor};
						left: {buttonSide === 'left' ? proMaxRailInset : 100 - proMaxRailInset}%;
						top: {top / device.pngH * 100}%; height: {(bottom - top) / device.pngH * 100}%;
						width: {Math.min(12, Math.abs(bodyOffset.x) * 0.58)}px;
						transform: translate(calc({bodyOffset.x * 0.55}px - 50%), {bodyOffset.y * 0.55}px);"
				></div>
			{/each}
		{/if}
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
				style:clip-path={faceClip}
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
	.side-button {
		border-radius: 4px;
		background: linear-gradient(90deg,
			color-mix(in srgb, var(--button-finish), black 30%),
			color-mix(in srgb, var(--button-finish), white 22%) 25%,
			var(--button-finish) 72%,
			color-mix(in srgb, var(--button-finish), black 25%));
		box-shadow: 0 0 0 0.5px rgb(0 0 0 / 42%), 0.6px 0.8px 1.2px rgb(0 0 0 / 30%),
			inset 0 0.7px 0 rgb(255 255 255 / 28%);
	}
</style>
