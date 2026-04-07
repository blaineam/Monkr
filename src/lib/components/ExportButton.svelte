<script lang="ts">
	import { Download } from 'lucide-svelte';
	import { store } from '../stores/state.svelte';
	import { exportCanvas } from '../export';

	let {
		canvasRef
	}: {
		canvasRef: HTMLDivElement | undefined;
	} = $props();

	let exporting = $state(false);

	async function handleExport() {
		if (!canvasRef || exporting) return;
		exporting = true;
		try {
			await exportCanvas(canvasRef, store.exportConfig.format, store.exportConfig.scale);
		} catch (err) {
			console.error('Export failed:', err);
		} finally {
			exporting = false;
		}
	}
</script>

<button
	onclick={handleExport}
	disabled={exporting}
	class="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-pink-500 disabled:opacity-50"
>
	<Download size={18} />
	{exporting ? 'Exporting...' : 'Download'}
</button>
