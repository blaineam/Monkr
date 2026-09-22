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
	import {
		buildSequenceTracks,
		getValueAtTime,
		preInlineImages,
		resolveTrackValue,
		stripTransformForCapture,
		type AnimationTrack,
		type SequenceStep
	} from '$lib/animation';
	import { exportFilter } from '$lib/capture-filter';
	import { toJpeg, toPng } from 'html-to-image';
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

	// ─── Animation ────────────────────────────────────────────
	// Frame-by-frame animation capture for `monkr animate`. The driver calls
	// animStart once, animFrame(time) per frame (each returns one image), then
	// animEnd. Images are inlined and the view transform stripped once for the
	// whole run instead of per frame, which is what makes long clips practical.

	interface AnimStartArgs {
		projectJson: unknown;
		/** Chained presets; objects default to every scene object. */
		sequence: SequenceStep[];
		/** Apply preset values as offsets from each object's own pose. */
		relative?: boolean;
		format?: ExportFormat;
		scale?: ExportScale;
	}

	let anim: {
		tracks: AnimationTrack[];
		base: Map<string, Record<string, number>>;
		relative: boolean;
		format: ExportFormat;
		scale: ExportScale;
		restore: () => void;
	} | null = null;

	async function animStart({ projectJson, sequence, relative = false, format, scale }: AnimStartArgs) {
		if (anim) await animEnd();
		const json = typeof projectJson === 'string' ? projectJson : JSON.stringify(projectJson);
		await store.loadProject(new File([json], 'project.monkr', { type: 'application/json' }));
		await settle();
		if (!canvasRef) throw new Error('Headless canvas did not mount');
		await awaitImages();
		const ids = store.sceneObjects.map((o) => o.id);
		const tracks = buildSequenceTracks(sequence, ids);
		const base = new Map<string, Record<string, number>>();
		for (const o of store.sceneObjects) {
			base.set(o.id, { x: o.x, y: o.y, rotation: o.rotation, tiltX: o.tiltX, tiltY: o.tiltY, scale: o.scale });
		}
		const restoreImages = await preInlineImages(canvasRef);
		const restoreTransform = stripTransformForCapture(canvasRef);
		anim = {
			tracks, base, relative,
			format: format ?? store.exportConfig.format,
			scale: scale ?? store.exportConfig.scale,
			restore: () => { restoreTransform(); restoreImages(); }
		};
		return { objects: ids.length, tracks: tracks.length };
	}

	async function animFrame(time: number): Promise<string> {
		if (!anim || !canvasRef) throw new Error('animStart must be called first');
		const updates = new Map<string, Record<string, number>>();
		for (const track of anim.tracks) {
			const v = getValueAtTime(track, time);
			if (v === undefined) continue;
			const b = anim.base.get(track.targetId)?.[track.property] ?? v;
			const u = updates.get(track.targetId) ?? {};
			u[track.property] = resolveTrackValue(track.property, v, b, anim.relative);
			updates.set(track.targetId, u);
		}
		for (const [id, u] of updates) store.updateObject(id, u);
		await settle();
		const options = { pixelRatio: anim.scale, cacheBust: false, filter: exportFilter };
		return anim.format === 'jpg'
			? toJpeg(canvasRef, { ...options, quality: 0.92, backgroundColor: '#000000' })
			: toPng(canvasRef, options);
	}

	async function animEnd() {
		anim?.restore();
		anim = null;
	}

	onMount(() => {
		// `devices` is exposed purely so tests can assert every registered device
		// colour actually has frame art on disk. A missing PNG fails silently — the
		// frame <img> 404s and the device renders as a bare screenshot — so it needs
		// an automated check, and this route is already the automation surface.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).__monkr = { render, animStart, animFrame, animEnd, devices: deviceRegistry.devices };
		document.body.setAttribute('data-monkr-headless', 'ready');
	});
</script>

<!-- Full-viewport host so Canvas mounts; the capture strips the view transform,
     so final pixels are canvasSize * exportScale regardless of this size. -->
<div style="position: fixed; inset: 0; width: 100vw; height: 100vh;">
	<Canvas bind:canvasRef />
</div>
