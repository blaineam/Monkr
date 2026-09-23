<script lang="ts">
	import Canvas from '$lib/components/Canvas.svelte';
	import LiteSidebar from '$lib/components/LiteSidebar.svelte';
	import { store } from '$lib/stores/state.svelte';
	let canvasRef = $state<HTMLDivElement | undefined>(undefined);
	$effect(() => {
		if (store.background.type !== 'transparent') store.setBackgroundType('transparent');
		if (store.exportConfig.format !== 'png') store.setExportFormat('png');
	});
</script>

<svelte:head><title>Monkr Lite</title></svelte:head>
<main class="flex h-screen min-h-0 flex-col bg-zinc-950 md:flex-row">
	<div class="h-[45vh] shrink-0 overflow-y-auto md:h-full md:w-80"><LiteSidebar {canvasRef} /></div>
	<div class="min-h-0 flex-1"><Canvas bind:canvasRef /></div>
</main>
