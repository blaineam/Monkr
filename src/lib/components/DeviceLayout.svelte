<script lang="ts">
	import type { DeviceMeta, LayoutMode, TransformConfig } from '../types';
	import DeviceFrame from './DeviceFrame.svelte';

	let {
		device,
		screenshots,
		colorHex = '#2e2e2e',
		layout,
		transform
	}: {
		device: DeviceMeta;
		screenshots: (string | null)[];
		colorHex?: string;
		layout: LayoutMode;
		transform: TransformConfig;
	} = $props();

	let count = $derived(layout === 'single' ? 1 : layout === 'dual' ? 2 : 3);
	let gap = $derived(layout === 'single' ? 0 : 40);

	// Scale down device frames to fit within the canvas
	let frameScale = $derived(
		layout === 'single'
			? device.category === 'laptop' ? 0.55 : 0.5
			: layout === 'dual'
				? device.category === 'laptop' ? 0.4 : 0.35
				: device.category === 'laptop' ? 0.32 : 0.28
	);
</script>

<div
	class="flex items-center justify-center"
	style="gap: {gap}px; transform: scale({frameScale}); transform-origin: center;"
>
	{#each Array(count) as _, i}
		<DeviceFrame
			{device}
			screenshotUrl={screenshots[i] ?? null}
			{colorHex}
			{transform}
		/>
	{/each}
</div>
