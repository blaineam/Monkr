<script lang="ts">
	import {
		Smartphone,
		Tablet,
		Laptop,
		Globe,
		Tv,
		Palette,
		SlidersHorizontal,
		ImageDown,
		ChevronDown,
		ChevronUp,
		Image,
		Frame,
		Type,
		Maximize,
		Plus,
		Trash2,
		Copy,
		Layers,
		Save,
		FolderOpen,
		Download,
		Upload,
		Play,
		Square,
		Film
	} from 'lucide-svelte';
	import { store } from '../stores/state.svelte';
	import { deviceRegistry } from '../stores/devices.svelte';
	import { gradientPresets } from '../gradients';
	import { canvasPresets } from '../presets';
	import DropZone from './DropZone.svelte';
	import ColorPicker from './ColorPicker.svelte';
	import Slider from './Slider.svelte';
	import PositionPad from './PositionPad.svelte';
	import TiltPad from './TiltPad.svelte';
	import ExportButton from './ExportButton.svelte';
	import { searchUnsplash, backgroundCategories, type UnsplashPhoto } from '../unsplash';
	import { backgroundImageCategories } from '../backgrounds';
	import { layoutTemplates } from '../templates';
	import { scenePresets } from '../scenes';
	import { mockupScenes } from '../mockups';
	import { fontFamilies, loadFont, preloadFonts } from '../fonts';
	import { animationPresets, getValueAtTime, scaleTracksToduration, captureAndExportVideo } from '../animation';
	import type { AnimationTrack, VideoFormat, AnimResolution } from '../animation';
	import { onMount } from 'svelte';
	import type { ExportFormat, ExportScale, FrameStyle } from '../types';

	let {
		canvasRef
	}: {
		canvasRef: HTMLDivElement | undefined;
	} = $props();

	type SectionId = 'objects' | 'canvas' | 'background' | 'transform' | 'text' | 'export' | 'project' | 'appstore' | 'animation';
	let openSections = $state<Set<SectionId>>(new Set(['objects', 'canvas']));

	function toggleSection(id: SectionId) {
		const next = new Set(openSections);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		openSections = next;
	}

	let selectedObj = $derived(store.selectedObject);
	let selectedDevice = $derived(selectedObj ? deviceRegistry.getDevice(selectedObj.deviceId) : undefined);
	let bgImageInput = $state<HTMLInputElement | undefined>(undefined);

	// Gradient categories
	let gradientCategories = $derived.by(() => {
		const cats = new Map<string, typeof gradientPresets>();
		for (const p of gradientPresets) {
			const cat = p.category ?? 'Other';
			if (!cats.has(cat)) cats.set(cat, []);
			cats.get(cat)!.push(p);
		}
		return cats;
	});
	let activeGradientCategory = $state('Cosmic');

	// Unsplash state
	let unsplashQuery = $state('');
	let unsplashKeyInput = $state('');
	let hasUnsplashKey = $state(typeof window !== 'undefined' && !!localStorage.getItem('unsplash_key'));
	let projectName = $state('');
	let savedProjects = $state<Array<{ name: string; date: string }>>([]);

	// Animation state
	let animPreviewing = $state(false);
	let animExporting = $state(false);
	let animExportProgress = $state(0);
	let animVideoFormat = $state<VideoFormat>('mp4');
	let animResolution = $state<AnimResolution>('1080p');
	let animExportStatus = $state('');
	let animExportCancelled = $state(false);
	let animPreviewTimer = $state<ReturnType<typeof setInterval> | null>(null);
	let animPreviewTime = $state(0);

	function startAnimPreview() {
		if (animPreviewing) { stopAnimPreview(); return; }
		const preset = animationPresets.find((p) => p.id === store.animation.presetId);
		if (!preset) return;
		const objectIds = store.sceneObjects.map((o) => o.id);
		const duration = store.animation.duration;
		const tracks = scaleTracksToduration(preset.createTracks(objectIds), preset.duration, duration);
		const startTime = performance.now();

		animPreviewing = true;
		animPreviewTimer = setInterval(() => {
			const elapsed = (performance.now() - startTime) % duration;
			animPreviewTime = elapsed;
			for (const track of tracks) {
				const val = getValueAtTime(track, elapsed);
				if (val !== undefined) {
					store.updateObject(track.targetId, { [track.property]: val });
				}
			}
		}, 1000 / store.animation.fps);
	}

	function stopAnimPreview() {
		if (animPreviewTimer) clearInterval(animPreviewTimer);
		animPreviewTimer = null;
		animPreviewing = false;
	}

	function cancelAnimExport() {
		animExportCancelled = true;
	}

	async function exportAnimation() {
		if (!canvasRef || animExporting) return;
		const preset = animationPresets.find((p) => p.id === store.animation.presetId);
		if (!preset) return;

		animExporting = true;
		animExportCancelled = false;
		animExportProgress = 0;
		animExportStatus = 'Preparing...';

		const objectIds = store.sceneObjects.map((o) => o.id);
		const duration = store.animation.duration;
		const fps = store.animation.fps;
		const tracks = scaleTracksToduration(preset.createTracks(objectIds), preset.duration, duration);

		// Compute output dimensions (capped to selected resolution)
		const resCap = animResolution === '4k' ? { w: 3840, h: 2160 } : { w: 1920, h: 1080 };
		const rawW = canvasRef.offsetWidth;
		const rawH = canvasRef.offsetHeight;
		const capScale = Math.min(1, resCap.w / rawW, resCap.h / rawH);
		const outW = Math.round(rawW * capScale);
		const outH = Math.round(rawH * capScale);

		try {
			const video = await captureAndExportVideo(
				canvasRef,
				duration,
				fps,
				(time) => {
					for (const track of tracks) {
						const val = getValueAtTime(track, time);
						if (val !== undefined) {
							store.updateObject(track.targetId, { [track.property]: val });
						}
					}
				},
				outW,
				outH,
				store.animation.loop,
				animVideoFormat,
				animResolution,
				(pct) => { animExportProgress = pct; },
				(msg) => { animExportStatus = msg; },
				(msg) => { animExportStatus = msg.length > 40 ? msg.slice(0, 40) + '...' : msg; },
				() => animExportCancelled
			);

			if (!video) {
				// cancelled
				animExporting = false;
				animExportStatus = '';
				return;
			}

			animExportProgress = 95;
			animExportStatus = 'Downloading...';

			const ext = animVideoFormat;
			const url = URL.createObjectURL(video);
			const a = document.createElement('a');
			a.href = url;
			a.download = `monkr-animation-${Date.now()}.${ext}`;
			a.click();
			URL.revokeObjectURL(url);
			animExportProgress = 100;
			animExportStatus = '';
		} catch (err) {
			console.error('Animation export failed:', err);
			animExportStatus = 'Export failed';
		} finally {
			animExporting = false;
		}
	}
	let projectFileInput: HTMLInputElement | undefined = $state();

	function refreshProjects() {
		savedProjects = store.getSavedProjects();
	}
	let unsplashPhotos = $state<UnsplashPhoto[]>([]);
	let unsplashLoading = $state(false);
	let activeUnsplashCategory = $state('');
	let activeBgImageCategory = $state('abstract');
	let activeBgCat = $derived(backgroundImageCategories.find(c => c.id === activeBgImageCategory));

	async function searchBgImages(query: string) {
		if (!query) return;
		unsplashLoading = true;
		unsplashPhotos = await searchUnsplash(query);
		unsplashLoading = false;
	}

	function selectUnsplashBg(photo: UnsplashPhoto) {
		// Fetch as blob to avoid CORS issues with html-to-image export
		fetch(photo.urls.regular)
			.then(r => r.blob())
			.then(blob => {
				if (store.background.imageUrl) URL.revokeObjectURL(store.background.imageUrl);
				const file = new File([blob], 'unsplash.jpg', { type: 'image/jpeg' });
				store.setBackgroundImage(file);
			});
	}

	function selectCuratedBg(originalUrl: string) {
		if (store.background.imageUrl) URL.revokeObjectURL(store.background.imageUrl);
		// Local assets - set imageUrl directly
		store.setBackgroundType('image');
		// We need to set imageUrl on the background config. Use fetch to create a blob URL for consistency.
		fetch(originalUrl)
			.then(r => r.blob())
			.then(blob => {
				const file = new File([blob], 'background.jpg', { type: 'image/jpeg' });
				store.setBackgroundImage(file);
			});
	}

	onMount(() => {
		preloadFonts();
		refreshProjects();
	});

	// Canvas preset categories
	let presetCategories = $derived.by(() => {
		const cats = new Map<string, typeof canvasPresets>();
		for (const p of canvasPresets) {
			const cat = p.category ?? 'General';
			if (!cats.has(cat)) cats.set(cat, []);
			cats.get(cat)!.push(p);
		}
		return cats;
	});
	let activePresetCategory = $state('General');

	// Device category for the device picker within a selected object
	type DeviceCategory = 'phone' | 'tablet' | 'laptop' | 'browser' | 'tv';
	let activeDeviceCategory = $state<DeviceCategory>('phone');
	let filteredDevices = $derived(
		deviceRegistry.devices.filter((d) => d.category === activeDeviceCategory)
	);

	// Custom canvas size inputs
	let customW = $state('');
	let customH = $state('');

	function applyCustomSize() {
		const w = parseInt(customW);
		const h = parseInt(customH);
		if (w > 0 && h > 0) {
			store.setCanvasSize({ width: w, height: h, presetName: `${w}×${h}` });
		}
	}

	// Sync device category when selected object changes
	$effect(() => {
		if (selectedDevice) activeDeviceCategory = selectedDevice.category as DeviceCategory;
	});
</script>

<aside class="flex h-full w-full flex-col overflow-y-auto bg-zinc-900/95 backdrop-blur-sm">
	<div class="space-y-0.5 p-3">

		<!-- ═══ SCENE OBJECTS ════════════════════════════════ -->
		<button class="section-header" onclick={() => toggleSection('objects')}>
			<span class="flex items-center gap-2"><Layers size={14} /> Scene</span>
			{#if openSections.has('objects')}<ChevronUp size={12} />{:else}<ChevronDown size={12} />{/if}
		</button>
		{#if openSections.has('objects')}
			<div class="section-body space-y-2">
				<!-- Object list -->
				{#each store.sceneObjects as obj (obj.id)}
					{@const dev = deviceRegistry.getDevice(obj.deviceId)}
					<div
						class="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors cursor-pointer
							{store.selectedObjectId === obj.id
								? 'bg-pink-600/15 ring-1 ring-pink-600/30'
								: 'hover:bg-zinc-800/80'}"
					>
						<button class="flex-1 text-left" onclick={() => store.selectObject(obj.id)}>
							<div class="text-xs font-medium {store.selectedObjectId === obj.id ? 'text-pink-400' : 'text-zinc-300'}">
								{dev?.name ?? 'Unknown'}
							</div>
							<div class="text-[10px] text-zinc-600">{obj.screenshotUrl ? 'Has screenshot' : 'No screenshot'}</div>
						</button>
						<div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
							<button class="p-1 text-zinc-500 hover:text-zinc-300" title="Duplicate"
								onclick={() => store.duplicateObject(obj.id)}>
								<Copy size={12} />
							</button>
							{#if store.sceneObjects.length > 1}
								<button class="p-1 text-zinc-500 hover:text-red-400" title="Remove"
									onclick={() => store.removeObject(obj.id)}>
									<Trash2 size={12} />
								</button>
							{/if}
						</div>
					</div>
				{/each}

				<!-- Add device button -->
				<button
					class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-700 py-2 text-[11px] text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-400"
					onclick={() => store.addObject()}
				>
					<Plus size={12} /> Add Device
				</button>

				<!-- Layout templates -->
				<div class="space-y-1.5">
					<span class="text-[10px] font-medium text-zinc-500">Layout Templates</span>
					<div class="grid grid-cols-3 gap-1">
						{#each layoutTemplates as tmpl}
							<button
								class="flex flex-col items-center gap-0.5 rounded-md bg-zinc-800/60 px-1 py-1.5 text-[9px] text-zinc-500 transition-colors hover:bg-zinc-700/60 hover:text-zinc-300"
								onclick={() => store.applyTemplate(tmpl)}
								title={tmpl.description}
							>
								<!-- Mini preview dots -->
								<div class="relative h-6 w-10">
									{#each tmpl.positions as pos}
										<div
											class="absolute h-1.5 w-1 rounded-sm bg-zinc-500"
											style="left: {pos.x}%; top: {pos.y}%; transform: translate(-50%, -50%) scale({pos.scale}) rotate({pos.rotation}deg);"
										></div>
									{/each}
								</div>
								{tmpl.name}
							</button>
						{/each}
					</div>
				</div>

				<!-- Scene Presets -->
				<div class="space-y-1.5">
					<span class="text-[10px] font-medium text-zinc-500">Scene Presets</span>
					<div class="grid grid-cols-3 gap-1">
						{#each scenePresets as scene}
							<button
								class="flex flex-col items-center gap-0.5 rounded-md overflow-hidden text-[9px] text-zinc-400 transition-colors hover:ring-1 hover:ring-pink-500/40"
								onclick={() => store.applyScene(scene)}
								title={scene.description}
							>
								<div class="relative h-8 w-full">
									{#if scene.backgroundImageUrl}
										<img src={scene.backgroundImageUrl.replace('/original/', '/preview/')} alt="" class="h-full w-full object-cover" />
									{:else}
										<div class="h-full w-full" style="background: {scene.backgroundCss};"></div>
									{/if}
									<!-- Device position indicators -->
									{#each scene.devices as d}
										{@const dev = deviceRegistry.getDevice(d.deviceId)}
										{@const isPhone = dev?.category === 'phone'}
										{@const isTablet = dev?.category === 'tablet'}
										{@const aspect = dev ? dev.pngW / dev.pngH : 0.5}
										{@const h = (d.scale * (isPhone ? 55 : isTablet ? 45 : 30))}
										{@const w = h * aspect}
										<div
											class="absolute rounded-sm border border-white/60 bg-white/20"
											style="left: {d.x}%; top: {d.y}%; width: {w}%; height: {h}%; transform: translate(-50%, -50%) rotate({d.rotation}deg);"
										></div>
									{/each}
									{#if scene.appStore}
										<!-- Section divider lines for App Store scenes -->
										{#each Array(scene.appStore.numSections - 1) as _, si}
											<div class="absolute top-0 bottom-0 w-px bg-pink-400/50" style="left: {((si + 1) / scene.appStore.numSections) * 100}%;"></div>
										{/each}
										<div class="absolute bottom-0 right-0 rounded-tl bg-pink-500/80 px-1 text-[6px] font-bold text-white leading-tight">AS</div>
									{/if}
								</div>
								<span class="py-0.5">{scene.name}</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Perspective Mockups (hidden - needs calibration work) -->
				<!-- TODO: Re-enable once mockup coordinates are properly calibrated -->

				<!-- ─── Selected Object Properties ─── -->
				{#if selectedObj}
					<div class="mt-2 border-t border-zinc-800 pt-3 space-y-3">
						<!-- Screenshot -->
						<DropZone
							screenshotUrl={selectedObj.screenshotUrl}
							index={0}
							onupload={(file) => store.setObjectScreenshot(selectedObj!.id, file)}
							onremove={() => store.removeObjectScreenshot(selectedObj!.id)}
							onuploadmultiple={(files) => store.addObjectExtraScreenshots(selectedObj!.id, files)}
						/>

						<!-- Extra screenshots for batch export -->
						{#if selectedObj.extraScreenshots.length > 0}
							<div class="space-y-1">
								<div class="flex items-center justify-between">
									<span class="text-[10px] font-medium text-zinc-500">Batch Screenshots ({selectedObj.extraScreenshots.length + 1})</span>
									<button class="text-[9px] text-zinc-600 hover:text-red-400"
										onclick={() => store.clearObjectExtraScreenshots(selectedObj!.id)}>
										Clear All
									</button>
								</div>
								<div class="flex flex-wrap gap-1">
									{#if selectedObj.screenshotUrl}
										<div class="relative h-10 w-10 rounded border border-pink-500/40 overflow-hidden">
											<img src={selectedObj.screenshotUrl} alt="Primary" class="h-full w-full object-cover" />
											<span class="absolute bottom-0 left-0 right-0 bg-black/60 text-[7px] text-center text-pink-400">1</span>
										</div>
									{/if}
									{#each selectedObj.extraScreenshots as extra, i}
										<div class="group relative h-10 w-10 rounded border border-zinc-700 overflow-hidden">
											<img src={extra.url} alt="Extra {i + 2}" class="h-full w-full object-cover" />
											<span class="absolute bottom-0 left-0 right-0 bg-black/60 text-[7px] text-center text-zinc-400">{i + 2}</span>
											<button class="absolute -right-0.5 -top-0.5 rounded-full bg-red-600 p-0 text-white opacity-0 group-hover:opacity-100 w-3 h-3 flex items-center justify-center text-[7px]"
												onclick={() => store.removeObjectExtraScreenshot(selectedObj!.id, i)}>x</button>
										</div>
									{/each}
								</div>
								<div class="text-[8px] text-zinc-600">Drop multiple images or use Export All to render each variation.</div>
							</div>
						{/if}

						<!-- Device picker -->
						<div class="space-y-2">
							<span class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Device</span>
							<div class="grid grid-cols-5 gap-0.5 rounded-lg bg-zinc-800/80 p-0.5">
								{#each [
									{ cat: 'phone', icon: Smartphone },
									{ cat: 'tablet', icon: Tablet },
									{ cat: 'laptop', icon: Laptop },
									{ cat: 'tv', icon: Tv },
									{ cat: 'browser', icon: Globe }
								] as { cat, icon: Icon }}
									<button
										class="flex items-center justify-center rounded-md py-1.5 transition-colors
											{activeDeviceCategory === cat ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-400'}"
										onclick={() => {
											activeDeviceCategory = cat as DeviceCategory;
											const devs = deviceRegistry.devices.filter((d) => d.category === cat);
											if (devs.length > 0 && !devs.find(d => d.id === selectedObj?.deviceId)) {
												store.setObjectDevice(selectedObj!.id, devs[0].id);
											}
										}}
									>
										<Icon size={13} />
									</button>
								{/each}
							</div>

							<div class="max-h-32 space-y-0.5 overflow-y-auto">
								{#each filteredDevices as dev}
									<button
										class="w-full rounded-md px-2 py-1 text-left transition-colors
											{selectedObj?.deviceId === dev.id
												? 'bg-pink-600/15 text-pink-400'
												: 'text-zinc-400 hover:bg-zinc-800/80'}"
										onclick={() => store.setObjectDevice(selectedObj!.id, dev.id)}
									>
										<span class="text-[11px] font-medium">{dev.name}</span>
										<span class="ml-1 text-[9px] text-zinc-600">{dev.year}</span>
									</button>
								{/each}
							</div>
						</div>

						<!-- Device color -->
						{#if selectedDevice && selectedDevice.colors.length > 1}
							<div class="space-y-1">
								<span class="text-[10px] font-medium text-zinc-500">Color</span>
								<div class="flex flex-wrap gap-1">
									{#each selectedDevice.colors as color}
										<button
											class="rounded-md px-2 py-0.5 text-[10px] transition-all
												{selectedObj?.deviceColorId === color.id
													? 'bg-pink-600/20 text-pink-400 ring-1 ring-pink-600/40'
													: 'bg-zinc-800 text-zinc-500 hover:text-zinc-400'}"
											onclick={() => store.setObjectDeviceColor(selectedObj!.id, color.id)}
										>{color.name}</button>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Frame style -->
						<div class="space-y-1">
							<span class="text-[10px] font-medium text-zinc-500">Frame</span>
							<div class="grid grid-cols-3 gap-0.5 rounded-lg bg-zinc-800/80 p-0.5">
								{#each [
									{ style: 'default', label: 'Solid' },
									{ style: 'outline', label: 'Outline' },
									{ style: 'none', label: 'None' }
								] as { style, label }}
									<button
										class="rounded-md py-1 text-[10px] font-medium transition-colors
											{selectedObj?.frameStyle === style ? 'bg-zinc-700 text-white' : 'text-zinc-500'}"
										onclick={() => store.setObjectFrameStyle(selectedObj!.id, style as FrameStyle)}
									>{label}</button>
								{/each}
							</div>
							{#if selectedObj.frameStyle === 'none'}
								<Slider label="Corner Radius" value={selectedObj.borderRadius} min={0} max={80} step={1} unit="px"
									onchange={(v) => store.updateObject(selectedObj!.id, { borderRadius: v })} />
							{/if}
						</div>

						<!-- Position & Transform -->
						<div class="space-y-2">
							<span class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Transform</span>
							<PositionPad x={selectedObj.x} y={selectedObj.y}
								onchange={(nx, ny) => store.updateObject(selectedObj!.id, { x: nx, y: ny })} />
							<Slider label="Scale" value={selectedObj.scale} min={0.2} max={2} step={0.05} unit="x"
								onchange={(v) => store.updateObject(selectedObj!.id, { scale: v })} />
							<Slider label="Rotation" value={selectedObj.rotation} min={-180} max={180} step={1} unit="°"
								onchange={(v) => store.updateObject(selectedObj!.id, { rotation: v })} />
							<TiltPad tiltX={selectedObj.tiltX} tiltY={selectedObj.tiltY}
								onchange={(tx, ty) => store.updateObject(selectedObj!.id, { tiltX: tx, tiltY: ty })} />
						</div>

						<!-- Shadow -->
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-[10px] font-medium text-zinc-500">Shadow</span>
								<button
									class="h-4 w-7 rounded-full transition-colors {selectedObj.shadow.enabled ? 'bg-pink-600' : 'bg-zinc-700'}"
									onclick={() => store.setObjectShadow(selectedObj!.id, { enabled: !selectedObj!.shadow.enabled })}
								>
									<div class="h-3 w-3 rounded-full bg-white transition-transform
										{selectedObj.shadow.enabled ? 'translate-x-[14px]' : 'translate-x-0.5'}"></div>
								</button>
							</div>
							{#if selectedObj.shadow.enabled}
								<Slider label="Blur" value={selectedObj.shadow.blur} min={0} max={120} step={1} unit="px"
									onchange={(v) => store.setObjectShadow(selectedObj!.id, { blur: v })} />
								<Slider label="Offset Y" value={selectedObj.shadow.offsetY} min={-60} max={60} step={1} unit="px"
									onchange={(v) => store.setObjectShadow(selectedObj!.id, { offsetY: v })} />
								<Slider label="Offset X" value={selectedObj.shadow.offsetX} min={-60} max={60} step={1} unit="px"
									onchange={(v) => store.setObjectShadow(selectedObj!.id, { offsetX: v })} />
								<Slider label="Spread" value={selectedObj.shadow.spread} min={-20} max={40} step={1} unit="px"
									onchange={(v) => store.setObjectShadow(selectedObj!.id, { spread: v })} />
								<ColorPicker label="Shadow Color" value={selectedObj.shadow.color.startsWith('rgba')? '#000000' : selectedObj.shadow.color}
									onchange={(v) => store.setObjectShadow(selectedObj!.id, { color: v })} />
							{/if}
						</div>

						<!-- Glow -->
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-[10px] font-medium text-zinc-500">Edge Glow</span>
								<button
									class="h-4 w-7 rounded-full transition-colors {selectedObj.glow.enabled ? 'bg-pink-600' : 'bg-zinc-700'}"
									onclick={() => store.setObjectGlow(selectedObj!.id, { enabled: !selectedObj!.glow.enabled })}
								>
									<div class="h-3 w-3 rounded-full bg-white transition-transform
										{selectedObj.glow.enabled ? 'translate-x-[14px]' : 'translate-x-0.5'}"></div>
								</button>
							</div>
							{#if selectedObj.glow.enabled}
								<Slider label="Blur" value={selectedObj.glow.blur} min={1} max={60} step={1} unit="px"
									onchange={(v) => store.setObjectGlow(selectedObj!.id, { blur: v })} />
								<ColorPicker label="Glow Color" value={selectedObj.glow.color.startsWith('rgba') ? '#ffffff' : selectedObj.glow.color}
									onchange={(v) => store.setObjectGlow(selectedObj!.id, { color: v })} />
							{/if}
						</div>

						<!-- Swap Screenshot -->
						{#if store.sceneObjects.length > 1 && selectedObj.screenshotUrl}
							<div class="space-y-1">
								<span class="text-[10px] font-medium text-zinc-500">Swap Screenshot</span>
								<div class="flex flex-wrap gap-1">
									{#each store.sceneObjects.filter(o => o.id !== selectedObj!.id) as otherObj}
										{@const otherDevice = deviceRegistry.getDevice(otherObj.deviceId)}
										<button
											class="rounded-md bg-zinc-800 px-2 py-1 text-[9px] text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
											onclick={() => {
												const myUrl = selectedObj!.screenshotUrl;
												const myFile = selectedObj!.screenshotFile;
												store.updateObject(selectedObj!.id, { screenshotUrl: otherObj.screenshotUrl, screenshotFile: otherObj.screenshotFile });
												store.updateObject(otherObj.id, { screenshotUrl: myUrl, screenshotFile: myFile });
											}}
										>↔ {otherDevice?.name ?? 'Device'}</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- ═══ APP STORE ══════════════════════════════════ -->
		<button class="section-header" onclick={() => toggleSection('appstore')}>
			<span class="flex items-center gap-2"><Layers size={14} /> App Store</span>
			{#if openSections.has('appstore')}<ChevronUp size={12} />{:else}<ChevronDown size={12} />{/if}
		</button>
		{#if openSections.has('appstore')}
			<div class="section-body space-y-3">
				<!-- Toggle -->
				<label class="flex items-center gap-2 cursor-pointer">
					<input type="checkbox" checked={store.appStore.enabled}
						onchange={(e) => store.setAppStoreEnabled((e.target as HTMLInputElement).checked)}
						class="accent-pink-500" />
					<span class="text-[10px] text-zinc-400">Multi-Canvas Mode</span>
				</label>

				{#if store.appStore.enabled}
					<!-- Platform preset -->
					<div class="space-y-1">
						<span class="text-[10px] font-medium text-zinc-500">Platform</span>
						<div class="grid grid-cols-2 gap-0.5 rounded-lg bg-zinc-800/80 p-0.5">
							{#each [
								{ name: 'iPhone 6.7"', w: 1290, h: 2796 },
								{ name: 'iPhone 6.1"', w: 1179, h: 2556 },
								{ name: 'iPad 12.9"', w: 2048, h: 2732 },
								{ name: 'iPad 11"', w: 1668, h: 2388 },
								{ name: 'Mac', w: 1280, h: 800 },
								{ name: 'Apple TV', w: 1920, h: 1080 },
								{ name: 'Apple Watch', w: 410, h: 502 }
							] as preset}
								<button class="rounded-md py-1 text-[9px] font-medium transition-colors
									{store.appStore.presetName === preset.name ? 'bg-zinc-700 text-white' : 'text-zinc-500'}"
									onclick={() => store.setAppStoreSectionSize(preset.w, preset.h, preset.name)}>
									{preset.name}
								</button>
							{/each}
						</div>
					</div>

					<!-- Number of sections -->
					<div class="space-y-1">
						<span class="text-[10px] font-medium text-zinc-500">Sections: {store.appStore.numSections}</span>
						<input type="range" min="1" max="10" step="1"
							value={store.appStore.numSections}
							oninput={(e) => store.setAppStoreNumSections(+(e.target as HTMLInputElement).value)}
							class="w-full" />
					</div>

					<div class="rounded bg-zinc-800/60 px-2 py-1.5 text-[9px] text-zinc-500 leading-snug">
						Canvas is split into {store.appStore.numSections} sections at {store.appStore.sectionWidth}x{store.appStore.sectionHeight}. Use the existing tools to place devices and text across sections. Export slices each section into a separate image.
					</div>
				{/if}
			</div>
		{/if}

		<!-- ═══ CANVAS ══════════════════════════════════════ -->
		<button class="section-header" onclick={() => toggleSection('canvas')}>
			<span class="flex items-center gap-2"><Maximize size={14} /> Canvas</span>
			{#if openSections.has('canvas')}<ChevronUp size={12} />{:else}<ChevronDown size={12} />{/if}
		</button>
		{#if openSections.has('canvas')}
			<div class="section-body space-y-3">
				<!-- Preset category tabs -->
				<div class="flex gap-1 overflow-x-auto pb-1">
					{#each [...presetCategories.keys()] as cat}
						<button
							class="whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium transition-colors
								{activePresetCategory === cat ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-400'}"
							onclick={() => activePresetCategory = cat}
						>{cat}</button>
					{/each}
				</div>
				<!-- Preset chips -->
				<div class="flex flex-wrap gap-1">
					{#each presetCategories.get(activePresetCategory) ?? [] as preset}
						<button
							class="rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors
								{store.canvasSize.presetName === preset.name
									? 'bg-pink-600/20 text-pink-400 ring-1 ring-pink-600/40'
									: 'bg-zinc-800 text-zinc-500 hover:text-zinc-400'}"
							onclick={() => store.setCanvasSize({ width: preset.width, height: preset.height, presetName: preset.name })}
						>{preset.name}</button>
					{/each}
				</div>
				<!-- Custom size -->
				<div class="flex items-center gap-1.5">
					<input type="number" placeholder="W" bind:value={customW}
						class="w-16 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-white placeholder:text-zinc-600 focus:border-pink-600 focus:outline-none" />
					<span class="text-[10px] text-zinc-600">×</span>
					<input type="number" placeholder="H" bind:value={customH}
						class="w-16 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-white placeholder:text-zinc-600 focus:border-pink-600 focus:outline-none" />
					<button
						class="rounded-md bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-white"
						onclick={applyCustomSize}
					>Set</button>
				</div>
				<!-- Current size display -->
				<div class="text-[10px] text-zinc-600">{store.canvasSize.width} × {store.canvasSize.height}</div>
				<!-- Padding -->
				<Slider label="Padding" value={store.padding} min={0} max={300} step={4} unit="px"
					onchange={(v) => store.setPadding(v)} />
			</div>
		{/if}

		<!-- ═══ BACKGROUND ══════════════════════════════════ -->
		<button class="section-header" onclick={() => toggleSection('background')}>
			<span class="flex items-center gap-2"><Palette size={14} /> Background</span>
			{#if openSections.has('background')}<ChevronUp size={12} />{:else}<ChevronDown size={12} />{/if}
		</button>
		{#if openSections.has('background')}
			<div class="section-body space-y-3">
				<div class="grid grid-cols-5 gap-0.5 rounded-lg bg-zinc-800/80 p-0.5">
					{#each ['solid', 'gradient', 'image', 'magic', 'transparent'] as type}
						<button
							class="rounded-md px-1 py-1.5 text-[10px] font-medium capitalize transition-colors
								{store.background.type === type ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-400'}"
							onclick={() => store.setBackgroundType(type as any)}
						>{type === 'transparent' ? 'None' : type}</button>
					{/each}
				</div>

				{#if store.background.type === 'magic'}
					<div class="rounded-md bg-zinc-800/60 px-2 py-2 text-[9px] text-zinc-500">
						Background auto-generated from your screenshot with blur and saturation. Add a screenshot to see the effect.
					</div>
				{/if}

				{#if store.background.type === 'solid'}
					<ColorPicker label="Color" value={store.background.solidColor}
						onchange={(v) => store.setBackgroundColor(v)} />
				{:else if store.background.type === 'gradient'}
					<div class="flex gap-1 overflow-x-auto pb-1">
						{#each [...gradientCategories.keys()] as cat}
							<button
								class="whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium transition-colors
									{activeGradientCategory === cat ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-400'}"
								onclick={() => activeGradientCategory = cat}
							>{cat}</button>
						{/each}
					</div>
					<div class="grid grid-cols-4 gap-1.5">
						{#each gradientCategories.get(activeGradientCategory) ?? [] as preset}
							<button
								class="h-8 rounded-lg border-2 transition-all hover:scale-105
									{store.background.gradientName === preset.name
										? 'border-pink-500 ring-1 ring-pink-500/30'
										: 'border-transparent'}"
								style="background: {preset.css};"
								title={preset.name}
								onclick={() => store.setBackgroundGradient(preset.css, preset.name)}
							></button>
						{/each}
					</div>
				{:else if store.background.type === 'image'}
					<!-- Upload -->
					<button
						class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-800/50 px-3 py-2 text-[11px] text-zinc-400 transition-colors hover:border-zinc-600"
						onclick={() => bgImageInput?.click()}
					>
						<ImageDown size={14} /> Upload Image
					</button>
					<input bind:this={bgImageInput} type="file" accept="image/*" class="hidden"
						onchange={(e) => {
							const file = (e.target as HTMLInputElement).files?.[0];
							if (file) store.setBackgroundImage(file);
						}} />

					<!-- Curated background image categories -->
					<div class="space-y-2">
						<span class="text-[10px] font-medium text-zinc-500">Curated Backgrounds</span>
						<div class="flex flex-wrap gap-1">
							{#each backgroundImageCategories as cat}
								<button
									class="rounded-md px-1.5 py-0.5 text-[9px] font-medium
										{activeBgImageCategory === cat.id ? 'bg-pink-600/20 text-pink-400' : 'bg-zinc-800 text-zinc-600 hover:text-zinc-400'}"
									onclick={() => { activeBgImageCategory = cat.id; }}
								>{cat.name}</button>
							{/each}
						</div>
						{#if activeBgCat}
							<div class="grid grid-cols-3 gap-1 max-h-48 overflow-y-auto">
								{#each activeBgCat.images as img}
									<button
										class="h-14 overflow-hidden rounded-md transition-all hover:ring-2 hover:ring-pink-500/40"
										onclick={() => selectCuratedBg(img.original)}
									>
										<img src={img.preview} alt="" class="h-full w-full object-cover" loading="lazy" />
									</button>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Unsplash search -->
					<div class="space-y-2">
						<span class="text-[10px] font-medium text-zinc-500">Search Unsplash</span>
						{#if !hasUnsplashKey}
							<div class="space-y-1.5 rounded-md bg-zinc-800/60 px-2 py-2">
								<div class="text-[9px] text-zinc-500">Enter your Unsplash API key to search photos</div>
								<div class="flex gap-1">
									<input type="text" placeholder="Access Key" bind:value={unsplashKeyInput}
										class="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-white placeholder:text-zinc-600 focus:border-pink-600 focus:outline-none" />
									<button class="rounded-md bg-pink-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-pink-500"
										onclick={() => {
											if (unsplashKeyInput.trim()) {
												localStorage.setItem('unsplash_key', unsplashKeyInput.trim());
												hasUnsplashKey = true;
											}
										}}>Save</button>
								</div>
								<a href="https://unsplash.com/developers" target="_blank" rel="noopener noreferrer" class="text-[8px] text-zinc-600 hover:text-zinc-400 underline">Get a free API key</a>
							</div>
						{:else}
						<div class="flex gap-1">
							<input type="text" placeholder="Search images..." bind:value={unsplashQuery}
								onkeydown={(e) => { if (e.key === 'Enter') searchBgImages(unsplashQuery); }}
								class="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-white placeholder:text-zinc-600 focus:border-pink-600 focus:outline-none" />
							<button class="rounded-md bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-white"
								onclick={() => searchBgImages(unsplashQuery)}>Go</button>
						</div>
						<!-- Category chips -->
						<div class="flex flex-wrap gap-1">
							{#each backgroundCategories as cat}
								<button
									class="rounded-md px-1.5 py-0.5 text-[9px] font-medium
										{activeUnsplashCategory === cat.name ? 'bg-pink-600/20 text-pink-400' : 'bg-zinc-800 text-zinc-600 hover:text-zinc-400'}"
									onclick={() => {
										activeUnsplashCategory = cat.name;
										unsplashQuery = cat.query;
										searchBgImages(cat.query);
									}}
								>{cat.name}</button>
							{/each}
						</div>
						<!-- Results grid -->
						{#if unsplashLoading}
							<div class="text-center text-[10px] text-zinc-500 py-4">Loading...</div>
						{:else if unsplashPhotos.length > 0}
							<div class="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
								{#each unsplashPhotos as photo}
									<button
										class="h-14 overflow-hidden rounded-md transition-all hover:ring-2 hover:ring-pink-500/40"
										onclick={() => selectUnsplashBg(photo)}
									>
										<img src={photo.urls.thumb} alt={photo.alt_description ?? ''} class="h-full w-full object-cover" />
									</button>
								{/each}
							</div>
							<div class="text-[8px] text-zinc-600 text-center">Photos from Unsplash</div>
						{/if}
					{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- ═══ TEXT ═════════════════════════════════════════ -->
		<button class="section-header" onclick={() => toggleSection('text')}>
			<span class="flex items-center gap-2"><Type size={14} /> Text{#if store.textBlocks.length > 0}<span class="text-[9px] text-zinc-500">({store.textBlocks.length})</span>{/if}</span>
			{#if openSections.has('text')}<ChevronUp size={12} />{:else}<ChevronDown size={12} />{/if}
		</button>
		{#if openSections.has('text')}
			<div class="section-body space-y-3">
				<!-- Text block list -->
				<div class="space-y-1">
					{#each store.textBlocks as tb (tb.id)}
						<div class="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] cursor-pointer transition-colors
							{store.selectedTextId === tb.id ? 'bg-zinc-700/80 text-white' : 'text-zinc-400 hover:bg-zinc-800'}"
							onclick={() => store.selectTextBlock(tb.id)}
						>
							<Type size={10} class="shrink-0 text-zinc-500" />
							<span class="flex-1 truncate">{tb.text || 'Untitled'}</span>
							<button class="p-0.5 text-zinc-600 hover:text-pink-400" onclick={(e) => { e.stopPropagation(); store.duplicateTextBlock(tb.id); }}>
								<Copy size={10} />
							</button>
							<button class="p-0.5 text-zinc-600 hover:text-red-400" onclick={(e) => { e.stopPropagation(); store.removeTextBlock(tb.id); }}>
								<Trash2 size={10} />
							</button>
						</div>
					{/each}
				</div>

				<!-- Add text button -->
				<button class="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-700 py-1.5 text-[10px] font-medium text-zinc-400 hover:border-pink-600 hover:text-pink-400 transition-colors"
					onclick={() => store.addTextBlock()}>
					<Plus size={12} /> Add Text
				</button>

				<!-- Selected text block settings -->
				{#if store.selectedTextBlock}
					{@const tb = store.selectedTextBlock}
					<input type="text" placeholder="Enter text..." value={tb.text}
						oninput={(e) => store.updateTextBlock(tb.id, { text: (e.target as HTMLInputElement).value })}
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-pink-600 focus:outline-none" />

					<!-- Font family -->
					<div class="space-y-1">
						<span class="text-[10px] font-medium text-zinc-500">Font</span>
						<select
							value={tb.fontFamily}
							onchange={(e) => {
								const f = (e.target as HTMLSelectElement).value;
								loadFont(f);
								store.updateTextBlock(tb.id, { fontFamily: f });
							}}
							class="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-[11px] text-white focus:border-pink-600 focus:outline-none"
						>
							{#each fontFamilies as font}
								<option value={font} style="font-family: '{font}', sans-serif;">{font}</option>
							{/each}
						</select>
						<div class="rounded-md bg-zinc-800/60 px-3 py-2 text-center"
							style="font-family: '{tb.fontFamily}', sans-serif; font-size: 14px; font-weight: {tb.fontWeight}; color: {tb.color};">
							{tb.text || 'Preview Text'}
						</div>
					</div>

					<!-- Position mode -->
					<div class="grid grid-cols-3 gap-0.5 rounded-lg bg-zinc-800/80 p-0.5">
						<button class="rounded-md py-1 text-[10px] font-medium {tb.position === 'above' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}"
							onclick={() => store.updateTextBlock(tb.id, { position: 'above' })}>Above</button>
						<button class="rounded-md py-1 text-[10px] font-medium {tb.position === 'below' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}"
							onclick={() => store.updateTextBlock(tb.id, { position: 'below' })}>Below</button>
						<button class="rounded-md py-1 text-[10px] font-medium {tb.position === 'custom' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}"
							onclick={() => store.updateTextBlock(tb.id, { position: 'custom' })}>Custom</button>
					</div>

					<!-- Custom position pad -->
					{#if tb.position === 'custom'}
						<PositionPad x={tb.x} y={tb.y}
							onchange={(x, y) => store.updateTextBlock(tb.id, { x, y })} />
					{/if}

					<!-- Alignment -->
					<div class="space-y-1">
						<span class="text-[10px] font-medium text-zinc-500">Align</span>
						<div class="grid grid-cols-3 gap-0.5 rounded-lg bg-zinc-800/80 p-0.5">
							{#each ['left', 'center', 'right'] as align}
								<button class="rounded-md py-1 text-[10px] font-medium capitalize
									{tb.textAlign === align ? 'bg-zinc-700 text-white' : 'text-zinc-500'}"
									onclick={() => store.updateTextBlock(tb.id, { textAlign: align as 'left' | 'center' | 'right' })}
								>{align}</button>
							{/each}
						</div>
					</div>

					<Slider label="Font Size" value={tb.fontSize} min={12} max={200} step={2} unit="px"
						onchange={(v) => store.updateTextBlock(tb.id, { fontSize: v })} />
					<Slider label="Weight" value={tb.fontWeight} min={100} max={900} step={100} unit=""
						onchange={(v) => store.updateTextBlock(tb.id, { fontWeight: v })} />
					<Slider label="Letter Spacing" value={tb.letterSpacing} min={-3} max={10} step={0.5} unit="px"
						onchange={(v) => store.updateTextBlock(tb.id, { letterSpacing: v })} />
					<Slider label="Line Height" value={tb.lineHeight} min={0.8} max={3} step={0.1} unit=""
						onchange={(v) => store.updateTextBlock(tb.id, { lineHeight: v })} />
					<Slider label="Max Width" value={tb.maxWidth} min={0} max={100} step={5} unit="%"
						onchange={(v) => store.updateTextBlock(tb.id, { maxWidth: v })} />
					<ColorPicker label="Color" value={tb.color}
						onchange={(v) => store.updateTextBlock(tb.id, { color: v })} />

					<!-- Rotation -->
					<Slider label="Rotation" value={tb.rotation} min={-180} max={180} step={1} unit="°"
						onchange={(v) => store.updateTextBlock(tb.id, { rotation: v })} />

					<!-- 3D Tilt -->
					<TiltPad tiltX={tb.tiltX} tiltY={tb.tiltY}
						onchange={(tx, ty) => store.updateTextBlock(tb.id, { tiltX: tx, tiltY: ty })} />

					<!-- Text Path -->
					<div class="flex items-center gap-2">
						<Slider label="Path" value={tb.arcDegrees} min={-30} max={30} step={1} unit="°"
							onchange={(v) => store.updateTextBlock(tb.id, { arcDegrees: v })} />
					</div>
					<div class="flex gap-1">
						<button class="flex-1 rounded-md px-2 py-1 text-[10px] font-medium
							{tb.pathType === 'arc' ? 'bg-pink-600/20 text-pink-400' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}"
							onclick={() => store.updateTextBlock(tb.id, { pathType: 'arc' })}>Arc</button>
						<button class="flex-1 rounded-md px-2 py-1 text-[10px] font-medium
							{tb.pathType === 'wave' ? 'bg-pink-600/20 text-pink-400' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}"
							onclick={() => store.updateTextBlock(tb.id, { pathType: 'wave' })}>S-Curve</button>
					</div>

					<!-- Drop Shadow -->
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-[10px] font-medium text-zinc-500">Drop Shadow</span>
							<button
								class="h-4 w-7 rounded-full transition-colors {tb.shadow.enabled ? 'bg-pink-600' : 'bg-zinc-700'}"
								onclick={() => store.updateTextBlock(tb.id, { shadow: { ...tb.shadow, enabled: !tb.shadow.enabled } })}
							>
								<div class="h-3 w-3 rounded-full bg-white transition-transform
									{tb.shadow.enabled ? 'translate-x-[14px]' : 'translate-x-0.5'}"></div>
							</button>
						</div>
						{#if tb.shadow.enabled}
							<Slider label="Blur" value={tb.shadow.blur} min={0} max={40} step={1} unit="px"
								onchange={(v) => store.updateTextBlock(tb.id, { shadow: { ...tb.shadow, blur: v } })} />
							<Slider label="Offset X" value={tb.shadow.offsetX} min={-20} max={20} step={1} unit="px"
								onchange={(v) => store.updateTextBlock(tb.id, { shadow: { ...tb.shadow, offsetX: v } })} />
							<Slider label="Offset Y" value={tb.shadow.offsetY} min={-20} max={20} step={1} unit="px"
								onchange={(v) => store.updateTextBlock(tb.id, { shadow: { ...tb.shadow, offsetY: v } })} />
							<ColorPicker label="Shadow Color" value={tb.shadow.color}
								onchange={(v) => store.updateTextBlock(tb.id, { shadow: { ...tb.shadow, color: v } })} />
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- ═══ PROJECT ═════════════════════════════════════ -->
		<button class="section-header" onclick={() => toggleSection('project')}>
			<span class="flex items-center gap-2"><Save size={14} /> Project</span>
			{#if openSections.has('project')}<ChevronUp size={12} />{:else}<ChevronDown size={12} />{/if}
		</button>
		{#if openSections.has('project')}
			<div class="section-body space-y-3">
				<!-- Save to browser -->
				<div class="space-y-1">
					<span class="text-[10px] font-medium text-zinc-500">Save Project</span>
					<div class="flex gap-1">
						<input type="text" placeholder="Project name" bind:value={projectName}
							class="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-white placeholder:text-zinc-600 focus:border-pink-600 focus:outline-none" />
						<button class="rounded-md bg-pink-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-pink-500"
							onclick={() => {
								if (projectName.trim()) {
									store.saveToLocalStorage(projectName.trim());
									refreshProjects();
								}
							}}>Save</button>
					</div>
				</div>

				<!-- Saved projects list -->
				{#if savedProjects.length > 0}
					<div class="space-y-1">
						<span class="text-[10px] font-medium text-zinc-500">Saved Projects</span>
						<div class="max-h-32 space-y-0.5 overflow-y-auto">
							{#each savedProjects as project}
								<div class="flex items-center justify-between rounded-md bg-zinc-800/60 px-2 py-1.5">
									<button class="flex-1 text-left text-[10px] text-zinc-300 hover:text-white"
										onclick={() => { store.loadFromLocalStorage(project.name); projectName = project.name; }}>
										{project.name}
									</button>
									<button class="text-zinc-600 hover:text-red-400" aria-label="Delete project"
										onclick={() => { store.deleteFromLocalStorage(project.name); refreshProjects(); }}>
										<Trash2 size={10} />
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- File import/export -->
				<div class="flex gap-1">
					<button class="flex-1 flex items-center justify-center gap-1 rounded-md bg-zinc-800 px-2 py-1.5 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-white"
						onclick={() => store.saveProject(projectName || 'monkr-project')}>
						<Download size={11} /> Export .monkr
					</button>
					<button class="flex-1 flex items-center justify-center gap-1 rounded-md bg-zinc-800 px-2 py-1.5 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-white"
						onclick={() => projectFileInput?.click()}>
						<Upload size={11} /> Import
					</button>
					<input bind:this={projectFileInput} type="file" accept=".monkr,.json" class="hidden"
						onchange={(e) => {
							const file = (e.target as HTMLInputElement).files?.[0];
							if (file) store.loadProject(file).then(refreshProjects);
						}} />
				</div>

				<!-- Reset -->
				<button class="w-full rounded-md border border-red-900/50 bg-red-950/30 px-2 py-1.5 text-[10px] text-red-400 hover:bg-red-900/40 hover:text-red-300"
					onclick={() => { if (confirm('Reset project to defaults? This cannot be undone.')) { store.resetProject(); projectName = ''; refreshProjects(); } }}>
					Reset Project
				</button>
			</div>
		{/if}

		<!-- ═══ ANIMATION ══════════════════════════════════ -->
		<button class="section-header" onclick={() => toggleSection('animation')}>
			<span class="flex items-center gap-2"><Film size={14} /> Animation</span>
			{#if openSections.has('animation')}<ChevronUp size={12} />{:else}<ChevronDown size={12} />{/if}
		</button>
		{#if openSections.has('animation')}
			<div class="section-body space-y-3">
				<!-- Presets -->
				<div class="space-y-1">
					<span class="text-[10px] font-medium text-zinc-500">Animation Preset</span>
					<div class="grid grid-cols-2 gap-0.5">
						{#each animationPresets as preset}
							<button class="rounded-md px-2 py-1 text-[9px] font-medium transition-colors
								{store.animation.presetId === preset.id ? 'bg-pink-600/80 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}"
								onclick={() => store.setAnimationPreset(store.animation.presetId === preset.id ? null : preset.id)}
								title={preset.description}>
								{preset.name}
							</button>
						{/each}
					</div>
				</div>

				{#if store.animation.presetId}
					<!-- Duration -->
					<div class="space-y-1">
						<label class="text-[10px] text-zinc-500">Duration: {(store.animation.duration / 1000).toFixed(1)}s</label>
						<input type="range" min="500" max="10000" step="100"
							value={store.animation.duration}
							oninput={(e) => store.setAnimationDuration(+(e.target as HTMLInputElement).value)}
							class="w-full" />
					</div>

					<!-- FPS -->
					<div class="space-y-1">
						<label class="text-[10px] text-zinc-500">FPS: {store.animation.fps}</label>
						<input type="range" min="10" max="60" step="5"
							value={store.animation.fps}
							oninput={(e) => store.setAnimationFps(+(e.target as HTMLInputElement).value)}
							class="w-full" />
					</div>

					<!-- Loop -->
					<label class="flex items-center gap-2 cursor-pointer">
						<input type="checkbox" checked={store.animation.loop}
							onchange={(e) => store.setAnimationLoop((e.target as HTMLInputElement).checked)}
							class="accent-pink-500" />
						<span class="text-[10px] text-zinc-400">Loop</span>
					</label>

					<!-- Format -->
					<div class="space-y-1">
						<span class="text-[10px] font-medium text-zinc-500">Format</span>
						<div class="grid grid-cols-3 gap-0.5 rounded-lg bg-zinc-800/80 p-0.5">
							{#each ['mp4', 'mov', 'webm'] as fmt}
								<button class="rounded-md py-1 text-[9px] font-medium uppercase transition-colors
									{animVideoFormat === fmt ? 'bg-zinc-700 text-white' : 'text-zinc-500'}"
									onclick={() => animVideoFormat = fmt as VideoFormat}>
									{fmt}
								</button>
							{/each}
						</div>
					</div>

					<!-- Resolution -->
					<div class="space-y-1">
						<span class="text-[10px] font-medium text-zinc-500">Max Resolution</span>
						<div class="grid grid-cols-2 gap-0.5 rounded-lg bg-zinc-800/80 p-0.5">
							<button class="rounded-md py-1 text-[9px] font-medium transition-colors
								{animResolution === '1080p' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}"
								onclick={() => animResolution = '1080p'}>
								1080p
							</button>
							<button class="rounded-md py-1 text-[9px] font-medium transition-colors
								{animResolution === '4k' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}"
								onclick={() => animResolution = '4k'}>
								4K
							</button>
						</div>
					</div>

					<!-- Preview / Export -->
					<div class="flex gap-1">
						<button
							class="flex-1 flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-colors
								{animPreviewing ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}"
							onclick={startAnimPreview}>
							{#if animPreviewing}
								<Square size={10} /> Stop
							{:else}
								<Play size={10} /> Preview
							{/if}
						</button>
						<button
							class="flex-1 flex items-center justify-center gap-1 rounded-md bg-pink-600 px-2 py-1.5 text-[10px] font-medium text-white hover:bg-pink-500 disabled:opacity-50"
							disabled={animExporting}
							onclick={exportAnimation}>
							<Download size={10} />
							{#if animExporting}
								{Math.round(animExportProgress)}%
							{:else}
								Export {animVideoFormat.toUpperCase()}
							{/if}
						</button>
					</div>
					{#if animExporting && animExportStatus}
						<div class="text-[9px] text-zinc-500 truncate">{animExportStatus}</div>
					{/if}
				{/if}
			</div>
		{/if}

		<!-- ═══ EXPORT ══════════════════════════════════════ -->
		<button class="section-header" onclick={() => toggleSection('export')}>
			<span class="flex items-center gap-2"><ImageDown size={14} /> Export</span>
			{#if openSections.has('export')}<ChevronUp size={12} />{:else}<ChevronDown size={12} />{/if}
		</button>
		{#if openSections.has('export')}
			<div class="section-body space-y-3">
				<div class="space-y-1">
					<span class="text-[10px] font-medium text-zinc-500">Scale</span>
					<div class="grid grid-cols-3 gap-0.5 rounded-lg bg-zinc-800/80 p-0.5">
						{#each [1, 2, 3] as scale}
							<button class="rounded-md py-1 text-[10px] font-medium transition-colors
								{store.exportConfig.scale === scale ? 'bg-zinc-700 text-white' : 'text-zinc-500'}"
								onclick={() => store.setExportScale(scale as ExportScale)}>{scale}x</button>
						{/each}
					</div>
				</div>
				<div class="space-y-1">
					<span class="text-[10px] font-medium text-zinc-500">Format</span>
					<div class="grid grid-cols-2 gap-0.5 rounded-lg bg-zinc-800/80 p-0.5">
						{#each ['png', 'jpg'] as format}
							<button class="rounded-md py-1 text-[10px] font-medium uppercase transition-colors
								{store.exportConfig.format === format ? 'bg-zinc-700 text-white' : 'text-zinc-500'}"
								onclick={() => store.setExportFormat(format as ExportFormat)}>{format}</button>
						{/each}
					</div>
				</div>
				<ExportButton {canvasRef} />
			</div>
		{/if}
	</div>
</aside>

<!-- Animation export overlay — covers the entire viewport to hide canvas resizing -->
{#if animExporting}
	<div class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md">
		<div class="flex flex-col items-center gap-6 rounded-2xl bg-zinc-900/90 border border-zinc-700/50 px-12 py-10 shadow-2xl">
			<!-- Spinner -->
			<div class="h-12 w-12 rounded-full border-4 border-zinc-700 border-t-pink-500 animate-spin"></div>

			<!-- Status -->
			<div class="text-center space-y-2">
				<h3 class="text-lg font-semibold text-white">Rendering Video</h3>
				<p class="text-sm text-zinc-400">{animExportStatus || 'Preparing...'}</p>
			</div>

			<!-- Progress bar -->
			<div class="w-64 h-2 rounded-full bg-zinc-800 overflow-hidden">
				<div class="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all duration-300"
					style="width: {Math.round(animExportProgress)}%"></div>
			</div>
			<span class="text-xs text-zinc-500">{Math.round(animExportProgress)}%</span>

			<!-- Cancel -->
			<button
				class="rounded-lg border border-zinc-700 px-6 py-2 text-sm font-medium text-zinc-400 transition-colors hover:border-red-500/50 hover:text-red-400"
				onclick={cancelAnimExport}>
				Cancel
			</button>
		</div>
	</div>
{/if}

<style>
	:global(.section-header) {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		padding: 8px 6px;
		font-size: 12px;
		font-weight: 600;
		color: #a1a1aa;
		border-radius: 8px;
		transition: color 0.15s;
	}
	:global(.section-header:hover) {
		color: #ffffff;
	}
	:global(.section-body) {
		padding: 4px 6px 12px;
	}
</style>
