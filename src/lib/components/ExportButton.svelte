<script lang="ts">
	import { Download, Copy, Check } from 'lucide-svelte';
	import { store } from '../stores/state.svelte';
	import { exportCanvas, exportCanvasSections, copyToClipboard } from '../export';

	let {
		canvasRef
	}: {
		canvasRef: HTMLDivElement | undefined;
	} = $props();

	let exporting = $state(false);
	let copied = $state(false);

	async function handleExport() {
		if (!canvasRef || exporting) return;
		exporting = true;
		try {
			if (store.appStoreEnabled) {
				await exportCanvasSections(
					canvasRef,
					store.appStore.numSections,
					store.appStore.sectionWidth,
					store.appStore.sectionHeight,
					store.exportConfig.format,
					store.exportConfig.scale
				);
			} else {
				await exportCanvas(canvasRef, store.exportConfig.format, store.exportConfig.scale);
			}
		} catch (err) {
			console.error('Export failed:', err);
		} finally {
			exporting = false;
		}
	}

	async function handleCopy() {
		if (!canvasRef || copied) return;
		try {
			await copyToClipboard(canvasRef, store.exportConfig.scale);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch (err) {
			console.error('Copy failed:', err);
		}
	}
</script>

<div class="flex gap-2">
	<button
		onclick={handleExport}
		disabled={exporting}
		class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-pink-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-pink-500 disabled:opacity-50"
	>
		<Download size={14} />
		{exporting ? 'Saving...' : store.appStoreEnabled ? `Download ${store.appStore.numSections} Slides` : 'Download'}
	</button>
	<button
		onclick={handleCopy}
		class="flex items-center justify-center rounded-lg bg-zinc-800 px-3 py-2.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
		title="Copy to clipboard"
	>
		{#if copied}
			<Check size={14} class="text-green-400" />
		{:else}
			<Copy size={14} />
		{/if}
	</button>
</div>
