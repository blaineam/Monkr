<script lang="ts">
	import { computeMatrix3d } from '$lib/perspective';
	import { generateScreenMask, type ScreenMaskType } from '$lib/mockups';

	let imageUrl = $state('');
	let imageFile = $state<File | null>(null);
	let imageBlobUrl = $state<string | null>(null);
	let imageLoaded = $state(false);
	let naturalW = $state(1920);
	let naturalH = $state(1280);

	// Corner positions as percentages [x%, y%]
	// Order: TL, TR, BR, BL (matches MockupScene.screenCorners)
	let corners = $state<[number, number][]>([
		[20, 20],
		[80, 20],
		[80, 80],
		[20, 80]
	]);

	let screenMask = $state<ScreenMaskType>('macbook');
	let screenRadius = $state(1.2);
	let sceneName = $state('New Mockup');
	let sceneId = $state('new-mockup');
	let canvasWidth = $state(1920);
	let canvasHeight = $state(1280);

	// Screenshot for preview
	let screenshotUrl = $state<string | null>(null);

	// Drag state
	let dragging = $state<number | null>(null);
	let containerRef = $state<HTMLDivElement | undefined>(undefined);
	let displayW = $state(800);
	let displayH = $state(600);

	$effect(() => {
		if (!containerRef) return;
		const update = () => {
			if (!containerRef) return;
			displayW = containerRef.clientWidth;
			displayH = containerRef.clientHeight;
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(containerRef);
		return () => ro.disconnect();
	});

	const cornerLabels = ['TL', 'TR', 'BR', 'BL'];
	const cornerColors = ['#ef4444', '#22c55e', '#06b6d4', '#eab308'];

	const maskTypes: { value: ScreenMaskType; label: string }[] = [
		{ value: 'iphone-dynamic-island', label: 'iPhone Dynamic Island' },
		{ value: 'iphone-notch', label: 'iPhone Notch' },
		{ value: 'ipad', label: 'iPad' },
		{ value: 'macbook', label: 'MacBook' },
		{ value: 'macbook-notch', label: 'MacBook Notch' },
		{ value: 'monitor', label: 'Monitor' },
		{ value: 'rect', label: 'Rectangle' }
	];

	function handleImageLoad(e: Event) {
		const img = e.target as HTMLImageElement;
		naturalW = img.naturalWidth;
		naturalH = img.naturalHeight;
		canvasWidth = naturalW;
		canvasHeight = naturalH;
		imageLoaded = true;
	}

	function handleImageFile(e: Event) {
		const f = (e.target as HTMLInputElement).files?.[0];
		if (!f) return;
		imageFile = f;
		if (imageBlobUrl) URL.revokeObjectURL(imageBlobUrl);
		imageBlobUrl = URL.createObjectURL(f);
		imageUrl = '';
	}

	function handleScreenshotFile(e: Event) {
		const f = (e.target as HTMLInputElement).files?.[0];
		if (!f) return;
		if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
		screenshotUrl = URL.createObjectURL(f);
	}

	function loadFromUrl() {
		if (imageBlobUrl) URL.revokeObjectURL(imageBlobUrl);
		imageBlobUrl = null;
		imageLoaded = false;
	}

	function startDrag(idx: number, e: MouseEvent) {
		e.preventDefault();
		dragging = idx;
		window.addEventListener('mousemove', handleDrag);
		window.addEventListener('mouseup', stopDrag);
	}

	function handleDrag(e: MouseEvent) {
		if (dragging === null || !containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
		const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
		corners[dragging] = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
	}

	function stopDrag() {
		dragging = null;
		window.removeEventListener('mousemove', handleDrag);
		window.removeEventListener('mouseup', stopDrag);
	}

	// Computed perspective transform for preview — use DISPLAYED size, not original canvas size
	let screenW = $derived(Math.abs(corners[1][0] - corners[0][0]) * displayW / 100);
	let screenH = $derived(Math.abs(corners[3][1] - corners[0][1]) * displayH / 100);

	let matrix = $derived.by(() => {
		if (screenW < 5 || screenH < 5) return '';
		try {
			return computeMatrix3d(screenW, screenH, [
				(corners[0][0] / 100) * displayW,
				(corners[0][1] / 100) * displayH,
				(corners[1][0] / 100) * displayW,
				(corners[1][1] / 100) * displayH,
				(corners[3][0] / 100) * displayW,
				(corners[3][1] / 100) * displayH,
				(corners[2][0] / 100) * displayW,
				(corners[2][1] / 100) * displayH
			]);
		} catch {
			return '';
		}
	});

	let mask = $derived(
		screenW > 5 && screenH > 5
			? generateScreenMask(screenW, screenH, screenMask, screenRadius)
			: ''
	);

	// Export config
	let configJson = $derived(
		JSON.stringify(
			{
				id: sceneId,
				name: sceneName,
				description: '',
				imageUrl: imageUrl || '(local file)',
				screenCorners: corners.map((c) => [c[0], c[1]]),
				canvasWidth,
				canvasHeight,
				screenMask,
				screenRadius
			},
			null,
			2
		)
	);

	function copyConfig() {
		navigator.clipboard.writeText(configJson);
	}

	let displaySrc = $derived(imageBlobUrl || imageUrl);
</script>

<div class="flex h-full">
	<!-- Left panel: controls -->
	<div class="w-80 flex-shrink-0 overflow-y-auto border-r border-zinc-800 p-4 space-y-4">
		<h1 class="text-lg font-bold text-pink-400">Mockup Calibrator</h1>

		<!-- Image source -->
		<div class="space-y-2">
			<label class="text-xs text-zinc-400">Image URL</label>
			<div class="flex gap-1">
				<input
					type="text"
					bind:value={imageUrl}
					placeholder="https://images.unsplash.com/..."
					class="flex-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
					onchange={loadFromUrl}
				/>
				<button class="rounded bg-pink-600 px-2 py-1 text-xs" onclick={loadFromUrl}>Load</button>
			</div>
			<label class="text-xs text-zinc-400">Or upload file</label>
			<input type="file" accept="image/*" class="text-xs text-zinc-400" onchange={handleImageFile} />
		</div>

		<!-- Screenshot for preview -->
		<div class="space-y-1">
			<label class="text-xs text-zinc-400">Test Screenshot</label>
			<input type="file" accept="image/*" class="text-xs text-zinc-400" onchange={handleScreenshotFile} />
		</div>

		<!-- Scene metadata -->
		<div class="space-y-2 border-t border-zinc-800 pt-3">
			<div class="flex gap-2">
				<div class="flex-1">
					<label class="text-xs text-zinc-400">Scene Name</label>
					<input bind:value={sceneName} class="w-full rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200" />
				</div>
				<div class="flex-1">
					<label class="text-xs text-zinc-400">ID</label>
					<input bind:value={sceneId} class="w-full rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200" />
				</div>
			</div>
		</div>

		<!-- Screen mask -->
		<div class="space-y-2 border-t border-zinc-800 pt-3">
			<label class="text-xs text-zinc-400">Screen Mask</label>
			<select bind:value={screenMask} class="w-full rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200">
				{#each maskTypes as mt}
					<option value={mt.value}>{mt.label}</option>
				{/each}
			</select>
			<div>
				<label class="text-xs text-zinc-400">Corner Radius: {screenRadius}%</label>
				<input type="range" min="0" max="15" step="0.1" bind:value={screenRadius} class="w-full" />
			</div>
		</div>

		<!-- Corner coordinates -->
		<div class="space-y-2 border-t border-zinc-800 pt-3">
			<label class="text-xs font-medium text-zinc-400">Screen Corners</label>
			{#each corners as corner, i}
				<div class="flex items-center gap-2">
					<span class="w-5 text-xs font-bold" style="color: {cornerColors[i]}">{cornerLabels[i]}</span>
					<input
						type="number"
						bind:value={corner[0]}
						step="0.5"
						class="w-16 rounded bg-zinc-800 px-1 py-0.5 text-xs text-zinc-200"
					/>
					<span class="text-xs text-zinc-600">,</span>
					<input
						type="number"
						bind:value={corner[1]}
						step="0.5"
						class="w-16 rounded bg-zinc-800 px-1 py-0.5 text-xs text-zinc-200"
					/>
				</div>
			{/each}
		</div>

		<!-- Export -->
		<div class="space-y-2 border-t border-zinc-800 pt-3">
			<button class="w-full rounded bg-pink-600 px-3 py-2 text-sm font-medium hover:bg-pink-500" onclick={copyConfig}>
				Copy Config JSON
			</button>
			<pre class="max-h-48 overflow-auto rounded bg-zinc-900 p-2 text-[10px] text-zinc-400">{configJson}</pre>
		</div>
	</div>

	<!-- Right panel: canvas -->
	<div class="flex-1 flex items-center justify-center bg-zinc-950 p-6">
		{#if displaySrc}
			<div bind:this={containerRef} class="relative max-h-full max-w-full" style="aspect-ratio: {canvasWidth}/{canvasHeight};">
				<!-- Mockup photo -->
				<img
					src={displaySrc}
					alt="Mockup"
					class="h-full w-full object-contain"
					onload={handleImageLoad}
					crossorigin="anonymous"
				/>

				<!-- Screenshot preview with perspective transform -->
				{#if screenshotUrl && matrix && imageLoaded}
					<div
						class="absolute overflow-hidden"
						style="left: 0; top: 0; width: {screenW}px; height: {screenH}px;
							transform: {matrix}; transform-origin: 0 0;
							-webkit-mask-image: {mask}; mask-image: {mask};
							-webkit-mask-size: 100% 100%; mask-size: 100% 100%;
							-webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
							pointer-events: none;"
					>
						<img src={screenshotUrl} alt="Preview" class="h-full w-full object-cover" />
					</div>
				{/if}

				<!-- Quad outline -->
				<svg
					class="absolute inset-0 h-full w-full pointer-events-none"
					viewBox="0 0 100 100"
					preserveAspectRatio="none"
				>
					<polygon
						points="{corners.map((c) => `${c[0]},${c[1]}`).join(' ')}"
						fill="rgba(255,255,255,0.05)"
						stroke="rgba(255,255,255,0.6)"
						stroke-width="0.2"
						stroke-dasharray="0.5,0.5"
					/>
				</svg>

				<!-- Draggable corner handles -->
				{#each corners as corner, i}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute z-10 flex items-center justify-center"
						style="left: {corner[0]}%; top: {corner[1]}%; transform: translate(-50%, -50%); cursor: grab;"
						onmousedown={(e) => startDrag(i, e)}
					>
						<div
							class="h-4 w-4 rounded-full border-2 border-white shadow-lg"
							style="background: {cornerColors[i]};"
						></div>
						<span
							class="absolute -top-5 text-[10px] font-bold"
							style="color: {cornerColors[i]};"
						>
							{cornerLabels[i]} ({corner[0]}, {corner[1]})
						</span>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center text-zinc-500">
				<p class="text-lg">Load a mockup image to start calibrating</p>
				<p class="mt-2 text-sm">Paste a URL or upload a file in the left panel</p>
			</div>
		{/if}
	</div>
</div>
