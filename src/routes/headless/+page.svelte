<script lang="ts">
	// Headless automation entrypoint. Renders the editor Canvas off to the side
	// and exposes `window.__monkr.render(...)` so external tooling (Playwright)
	// can load a saved project, swap in fresh screenshots, and pull back framed
	// PNG/JPEG data URLs — the exact pixels the manual "Export" button produces,
	// with no human in the loop. Not linked from the UI.
	import { onMount, tick } from 'svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import { store } from '$lib/stores/state.svelte';
	import { deviceRegistry } from '$lib/stores/devices.svelte';
	import { captureToDataUrl } from '$lib/export';
	import type { ExportFormat, ExportScale } from '$lib/types';

	let canvasRef = $state<HTMLDivElement | undefined>(undefined);

	/** Flush Svelte + paint two frames so new <img> src values are committed. */
	async function settle(): Promise<void> {
		await tick();
		await new Promise<void>((r) => requestAnimationFrame(() => r()));
		await new Promise<void>((r) => requestAnimationFrame(() => r()));
	}

	/** Wait for every <img> in the canvas to fully decode before capture. */
	async function awaitImages(): Promise<void> {
		if (!canvasRef) return;
		const imgs = Array.from(canvasRef.querySelectorAll('img'));
		await Promise.all(
			imgs.map((img) =>
				img.decode().catch(
					() =>
						new Promise<void>((resolve) => {
							if (img.complete) return resolve();
							img.addEventListener('load', () => resolve(), { once: true });
							img.addEventListener('error', () => resolve(), { once: true });
						})
				)
			)
		);
	}

	interface RenderArgs {
		/** A .monkr project, as a JSON string or already-parsed object. */
		projectJson: unknown;
		/** Ordered screenshot data URLs; one framed image is produced per entry. */
		screenshots: string[];
		/** Override the project's export format/scale (defaults to the project's). */
		format?: ExportFormat;
		scale?: ExportScale;
	}

	/**
	 * Load `projectJson`, then for each screenshot swap it onto the (single)
	 * device and capture the canvas. Returns one data URL per screenshot, in
	 * order. If `screenshots` is empty, renders the project's own screenshot.
	 */
	async function render({ projectJson, screenshots, format, scale }: RenderArgs): Promise<string[]> {
		const json = typeof projectJson === 'string' ? projectJson : JSON.stringify(projectJson);
		const file = new File([json], 'project.monkr', { type: 'application/json' });
		await store.loadProject(file);
		await settle();

		if (!canvasRef) throw new Error('Headless canvas did not mount');
		if (store.sceneObjects.length === 0) throw new Error('Project has no scene objects');

		const obj = store.sceneObjects[0];
		const fmt: ExportFormat = format ?? store.exportConfig.format;
		const scl: ExportScale = scale ?? store.exportConfig.scale;
		// Fall back to the project's own screenshots (primary + extras) when the
		// caller passes none — lets the driver hand over a single project payload
		// with the screenshots already embedded rather than shipping them twice.
		const shots = screenshots.length
			? screenshots
			: ([obj.screenshotUrl, ...obj.extraScreenshots.map((e) => e.url)].filter(
					Boolean
				) as string[]);

		const out: string[] = [];
		for (const shot of shots) {
			store.updateObject(obj.id, { screenshotUrl: shot, screenshotFile: null });
			await settle();
			await awaitImages();
			out.push(await captureToDataUrl(canvasRef, fmt, scl));
		}
		return out;
	}

	onMount(() => {
		// `devices` is exposed purely so tests can assert every registered device
		// colour actually has frame art on disk. A missing PNG fails silently — the
		// frame <img> 404s and the device renders as a bare screenshot — so it needs
		// an automated check, and this route is already the automation surface.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).__monkr = { render, devices: deviceRegistry.devices };
		document.body.setAttribute('data-monkr-headless', 'ready');
	});
</script>

<!-- Full-viewport host so Canvas mounts; the capture strips the view transform,
     so final pixels are canvasSize * exportScale regardless of this size. -->
<div style="position: fixed; inset: 0; width: 100vw; height: 100vh;">
	<Canvas bind:canvasRef />
</div>
