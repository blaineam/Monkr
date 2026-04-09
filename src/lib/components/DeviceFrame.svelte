<script lang="ts">
	import type { DeviceMeta, FrameStyle, TransformConfig } from '../types';
	import { deviceRegistry } from '../stores/devices.svelte';

	let {
		device,
		screenshotUrl = null,
		colorSlug = '',
		transform,
		frameStyle = 'default',
		borderRadius = 16,
		glow = { enabled: false, color: 'rgba(255,255,255,0.6)', blur: 20, spread: 2 }
	}: {
		device: DeviceMeta;
		screenshotUrl: string | null;
		colorSlug?: string;
		transform: TransformConfig;
		frameStyle?: FrameStyle;
		borderRadius?: number;
		glow?: { enabled: boolean; color: string; blur: number; spread: number };
	} = $props();

	let shadowCss = $derived(
		transform.shadow.enabled
			? `${transform.shadow.offsetX}px ${transform.shadow.offsetY}px ${transform.shadow.blur}px ${transform.shadow.spread}px ${transform.shadow.color}`
			: 'none'
	);

	let transformCss = $derived(
		`perspective(1200px) rotateX(${transform.tiltX}deg) rotateY(${transform.tiltY}deg) scale(${transform.zoom})`
	);

	let isCssDevice = $derived(device.slug === '_css');
	let screen = $derived(deviceRegistry.getScreenRect(device));
	let frameUrl = $derived(isCssDevice ? '' : deviceRegistry.getFrameUrl(device, colorSlug || device.colors[0]?.slug || ''));
	let maskUrl = $derived(isCssDevice ? '' : deviceRegistry.getMaskUrl(device));
	let showFrame = $derived(frameStyle !== 'none');

	let isBrowser = $derived(device.category === 'browser');
	let isTv = $derived(device.category === 'tv');
	let isDarkBrowser = $derived(device.id === 'browser-dark');

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

<div
	class="relative flex-shrink-0"
	style="transform: {transformCss}; transition: transform 0.3s ease;"
>
	<div
		style="filter: drop-shadow({shadowCss}){glow.enabled ? ` drop-shadow(0 0 ${glow.blur}px ${glow.color})` : ''}; width: {displayW}px; height: {displayH}px; position: relative;"
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
			<!-- Screenshot behind the frame, clipped to screen area -->
			<div
				class="absolute overflow-hidden"
				style="left: {screen.left}%; top: {screen.top}%; width: {screen.width}%; height: {screen.height}%;
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
