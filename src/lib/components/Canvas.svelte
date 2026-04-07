<script lang="ts">
	import { store } from '../stores/state.svelte';
	import { deviceRegistry } from '../stores/devices.svelte';
	import DeviceLayout from './DeviceLayout.svelte';

	let {
		canvasRef = $bindable<HTMLDivElement | undefined>(undefined)
	}: {
		canvasRef?: HTMLDivElement | undefined;
	} = $props();

	let device = $derived(deviceRegistry.getDevice(store.deviceId));
	let deviceColor = $derived(deviceRegistry.getDeviceColor(store.deviceId, store.deviceColorId));

	let backgroundStyle = $derived(() => {
		const bg = store.background;
		switch (bg.type) {
			case 'solid':
				return `background-color: ${bg.solidColor};`;
			case 'gradient':
				return `background: ${bg.gradientCss};`;
			case 'image':
				return bg.imageUrl
					? `background-image: url(${bg.imageUrl}); background-size: cover; background-position: center;`
					: `background-color: ${bg.solidColor};`;
			default:
				return `background-color: ${bg.solidColor};`;
		}
	});
</script>

<div
	bind:this={canvasRef}
	class="relative flex h-full w-full items-center justify-center overflow-hidden"
	style={backgroundStyle()}
>
	{#if device}
		<DeviceLayout
			{device}
			screenshots={store.activeScreenshots}
			colorHex={deviceColor?.hex ?? '#2e2e2e'}
			layout={store.layout}
			transform={store.transform}
		/>
	{/if}
</div>
