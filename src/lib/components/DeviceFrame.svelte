<script lang="ts">
	import type { DeviceMeta, TransformConfig } from '../types';

	let {
		device,
		screenshotUrl = null,
		colorHex = '#2e2e2e',
		transform
	}: {
		device: DeviceMeta;
		screenshotUrl: string | null;
		colorHex?: string;
		transform: TransformConfig;
	} = $props();

	let shadowCss = $derived(
		transform.shadow.enabled
			? `${transform.shadow.offsetX}px ${transform.shadow.offsetY}px ${transform.shadow.blur}px ${transform.shadow.spread}px ${transform.shadow.color}`
			: 'none'
	);

	let transformCss = $derived(
		`perspective(1200px) rotateX(${transform.tiltX}deg) rotateY(${transform.tiltY}deg) scale(${transform.zoom})`
	);

	let screenStyle = $derived(
		`position: absolute; left: ${(device.screen.x / device.frameWidth) * 100}%; top: ${(device.screen.y / device.frameHeight) * 100}%; width: ${(device.screen.width / device.frameWidth) * 100}%; height: ${(device.screen.height / device.frameHeight) * 100}%; border-radius: ${(device.screen.borderRadius / device.frameWidth) * 100}%; overflow: hidden;`
	);
</script>

<div
	class="relative flex-shrink-0"
	style="transform: {transformCss}; filter: drop-shadow({shadowCss}); transition: transform 0.3s ease;"
>
	<!-- Device bezel (CSS-rendered) -->
	<div
		class="relative"
		style="width: {device.frameWidth}px; height: {device.frameHeight}px; max-width: 100%;"
	>
		<!-- Bezel background -->
		<div
			class="absolute inset-0"
			style="background-color: {colorHex}; border-radius: {(device.screen.borderRadius + 8) / device.frameWidth * 100}%; border: 1px solid rgba(255,255,255,0.1);"
		></div>

		<!-- Screen area -->
		<div style={screenStyle}>
			{#if screenshotUrl}
				<img
					src={screenshotUrl}
					alt="Screenshot"
					class="h-full w-full object-cover"
					style="display: block;"
				/>
			{:else}
				<div class="flex h-full w-full items-center justify-center bg-zinc-900">
					<span class="text-xs text-zinc-600">No screenshot</span>
				</div>
			{/if}
		</div>

		<!-- Notch/Dynamic Island (for phones) -->
		{#if device.category === 'phone'}
			<div
				class="absolute left-1/2 -translate-x-1/2 bg-black"
				style="top: {(device.screen.y / device.frameHeight) * 100 + 0.8}%; width: 28%; height: 3.2%; border-radius: 999px;"
			></div>
		{/if}
	</div>
</div>
