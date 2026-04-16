<script lang="ts">
	import { Download, Copy, Check, Layers } from 'lucide-svelte';
	import { store } from '../stores/state.svelte';
	import { exportCanvas, exportCanvasSections, copyToClipboard } from '../export';

	let {
		canvasRef
	}: {
		canvasRef: HTMLDivElement | undefined;
	} = $props();

	let exporting = $state(false);
	let copied = $state(false);
	let batchExporting = $state(false);
	let batchProgress = $state('');

	/** Check if any device has extra screenshots for batch export */
	let hasBatchScreenshots = $derived(
		store.sceneObjects.some((o) => o.extraScreenshots.length > 0)
	);

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

	/**
	 * Export all variations: for each device with extra screenshots,
	 * cycle through all screenshots (primary + extras) and export each render.
	 */
	async function handleBatchExport() {
		if (!canvasRef || batchExporting) return;
		batchExporting = true;

		try {
			// Collect all objects that have extra screenshots
			const batchObjects = store.sceneObjects.filter((o) => o.extraScreenshots.length > 0);
			if (batchObjects.length === 0) return;

			// For simplicity, batch over the first object with extras
			// (multi-device batch is more complex, handle single device first)
			const obj = batchObjects[0];
			const allScreenshots = [
				{ url: obj.screenshotUrl, file: obj.screenshotFile },
				...obj.extraScreenshots
			].filter((s) => s.url);

			for (let i = 0; i < allScreenshots.length; i++) {
				batchProgress = `Exporting ${i + 1} of ${allScreenshots.length}...`;

				// Swap screenshot on the device
				store.updateObject(obj.id, {
					screenshotUrl: allScreenshots[i].url,
					screenshotFile: allScreenshots[i].file
				});

				// Wait for DOM update + all images to finish loading
				await new Promise<void>((r) => requestAnimationFrame(() => r()));
				await new Promise<void>((resolve) => {
					const images = Array.from(canvasRef!.querySelectorAll('img'));
					const pending = images.filter((img) => !img.complete);
					if (pending.length === 0) return resolve();
					let remaining = pending.length;
					const onDone = () => { if (--remaining <= 0) resolve(); };
					for (const img of pending) {
						img.addEventListener('load', onDone, { once: true });
						img.addEventListener('error', onDone, { once: true });
					}
				});

				// Export
				if (store.appStoreEnabled) {
					await exportCanvasSections(
						canvasRef,
						store.appStore.numSections,
						store.appStore.sectionWidth,
						store.appStore.sectionHeight,
						store.exportConfig.format,
						store.exportConfig.scale,
						`variation-${i + 1}`
					);
				} else {
					await exportCanvas(canvasRef, store.exportConfig.format, store.exportConfig.scale, `variation-${i + 1}`);
				}
			}

			// Restore original primary screenshot
			store.updateObject(obj.id, {
				screenshotUrl: allScreenshots[0].url,
				screenshotFile: allScreenshots[0].file
			});
		} catch (err) {
			console.error('Batch export failed:', err);
		} finally {
			batchExporting = false;
			batchProgress = '';
		}
	}
</script>

<div class="space-y-2">
	<div class="flex gap-2">
		<button
			onclick={handleExport}
			disabled={exporting || batchExporting}
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
	{#if hasBatchScreenshots}
		<button
			onclick={handleBatchExport}
			disabled={batchExporting || exporting}
			class="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600/80 px-3 py-2 text-[11px] font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
		>
			<Layers size={13} />
			{batchExporting ? batchProgress : 'Export All Variations'}
		</button>
	{/if}
</div>
