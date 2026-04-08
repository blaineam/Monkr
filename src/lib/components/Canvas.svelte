<script lang="ts">
	import { store } from '../stores/state.svelte';
	import { deviceRegistry } from '../stores/devices.svelte';
	import { computeMatrix3d } from '../perspective';
	import { generateScreenMask } from '../mockups';
	import DeviceFrame from './DeviceFrame.svelte';

	let {
		canvasRef = $bindable<HTMLDivElement | undefined>(undefined)
	}: {
		canvasRef?: HTMLDivElement | undefined;
	} = $props();

	let wrapperRef = $state<HTMLDivElement | undefined>(undefined);

	let magicScreenshotUrl = $derived(
		store.background.type === 'magic'
			? store.sceneObjects.find((o) => o.screenshotUrl)?.screenshotUrl ?? null
			: null
	);

	let backgroundStyle = $derived.by(() => {
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
			case 'transparent':
				return 'background: repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px;';
			case 'magic':
				return 'background-color: #000;';
			default:
				return `background-color: ${bg.solidColor};`;
		}
	});

	let viewScale = $state(0.5);

	$effect(() => {
		if (!wrapperRef) return;
		const cw = store.canvasSize.width;
		const ch = store.canvasSize.height;

		const update = () => {
			if (!wrapperRef) return;
			const ww = wrapperRef.clientWidth - 48;
			const wh = wrapperRef.clientHeight - 48;
			viewScale = Math.min(ww / cw, wh / ch, 1);
		};
		update();

		const ro = new ResizeObserver(update);
		ro.observe(wrapperRef);
		return () => ro.disconnect();
	});

	/** Generate SVG path string for text path effects */
	function makeTextPath(type: 'arc' | 'wave', degrees: number, width: number): string {
		const hw = width / 2;
		if (type === 'wave') {
			// S-curve: cubic bezier wave
			const amp = degrees * 3;
			return `M -${hw},0 C -${hw * 0.5},${-amp} ${hw * 0.5},${amp} ${hw},0`;
		}
		// Arc: circular arc
		const r = Math.max(50, 2000 / Math.abs(degrees));
		const y = degrees > 0 ? r * 0.3 : -r * 0.3;
		const sweep = degrees > 0 ? 1 : 0;
		return `M -${hw},${y} A ${r},${r} 0 0,${sweep} ${hw},${y}`;
	}

	function handleCanvasClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			store.selectObject(null);
		}
	}

	// Drag-to-reposition
	let dragging = $state<string | null>(null);
	let dragStartMouse = $state({ x: 0, y: 0 });
	let dragStartPos = $state({ x: 0, y: 0 });

	function startDrag(e: MouseEvent, objId: string) {
		e.stopPropagation();
		const obj = store.sceneObjects.find((o) => o.id === objId);
		if (!obj) return;
		store.selectObject(objId);
		dragging = objId;
		dragStartMouse = { x: e.clientX, y: e.clientY };
		dragStartPos = { x: obj.x, y: obj.y };
		window.addEventListener('mousemove', handleDragMove);
		window.addEventListener('mouseup', handleDragEnd);
	}

	function handleDragMove(e: MouseEvent) {
		if (!dragging || !canvasRef) return;
		const cw = store.canvasSize.width * viewScale;
		const ch = store.canvasSize.height * viewScale;
		const dx = ((e.clientX - dragStartMouse.x) / cw) * 100;
		const dy = ((e.clientY - dragStartMouse.y) / ch) * 100;
		const nx = Math.max(0, Math.min(100, dragStartPos.x + dx));
		const ny = Math.max(0, Math.min(100, dragStartPos.y + dy));
		store.updateObject(dragging, { x: Math.round(nx), y: Math.round(ny) });
	}

	function handleDragEnd() {
		dragging = null;
		window.removeEventListener('mousemove', handleDragMove);
		window.removeEventListener('mouseup', handleDragEnd);
	}

</script>

<div bind:this={wrapperRef} class="relative h-full w-full bg-zinc-950 {store.appStoreEnabled ? 'overflow-auto' : 'overflow-hidden'}">
	<!-- Centered scaled canvas -->
	<div
		class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
		style="width: {store.canvasSize.width * viewScale}px; height: {store.canvasSize.height * viewScale}px;"
	>
		<div
			bind:this={canvasRef}
			class="relative overflow-hidden"
			style="width: {store.canvasSize.width}px; height: {store.canvasSize.height}px;
				transform: scale({viewScale}); transform-origin: top left;
				{backgroundStyle}"
			onclick={handleCanvasClick}
			role="presentation"
		>
			<!-- ═══ PERSPECTIVE MOCKUP MODE ═══ -->
			{#if store.activeMockup}
				{@const mockup = store.activeMockup}
				{@const cw = store.canvasSize.width}
				{@const ch = store.canvasSize.height}
				<!-- Mockup scene photo -->
				{#if store.mockupImageUrl}
					<img
						src={store.mockupImageUrl}
						alt=""
						class="pointer-events-none absolute inset-0 h-full w-full object-cover"
						draggable="false"
					/>
				{:else}
					<div class="flex h-full w-full items-center justify-center bg-zinc-900">
						<span class="text-sm text-zinc-500">Loading scene...</span>
					</div>
				{/if}

				<!-- Perspective-warped + masked screenshot -->
				{@const corners = mockup.screenCorners}
				{@const tl = corners[0]}
				{@const tr = corners[1]}
				{@const br = corners[2]}
				{@const bl = corners[3]}
				{@const screenW = Math.abs(tr[0] - tl[0]) * cw / 100}
				{@const screenH = Math.abs(bl[1] - tl[1]) * ch / 100}

				{#if store.mockupScreenshotUrl}
					{@const matrix = computeMatrix3d(
						screenW, screenH,
						[
							(tl[0] / 100) * cw, (tl[1] / 100) * ch,
							(tr[0] / 100) * cw, (tr[1] / 100) * ch,
							(bl[0] / 100) * cw, (bl[1] / 100) * ch,
							(br[0] / 100) * cw, (br[1] / 100) * ch
						]
					)}
					{@const mask = generateScreenMask(screenW, screenH, mockup.screenMask, mockup.screenRadius)}
					<div
						class="absolute overflow-hidden"
						style="left: 0; top: 0; width: {screenW}px; height: {screenH}px;
							transform: {matrix}; transform-origin: 0 0;
							-webkit-mask-image: {mask};
							mask-image: {mask};
							-webkit-mask-size: 100% 100%;
							mask-size: 100% 100%;
							-webkit-mask-repeat: no-repeat;
							mask-repeat: no-repeat;"
					>
						<img
							src={store.mockupScreenshotUrl}
							alt="Screenshot"
							class="h-full w-full object-cover"
							draggable="false"
						/>
					</div>
				{:else if store.mockupImageUrl}
					<div class="absolute inset-0 flex items-center justify-center">
						<div class="rounded-lg bg-black/60 px-6 py-3 text-center text-sm text-zinc-300 backdrop-blur">
							Drop a screenshot to composite into the scene
						</div>
					</div>
				{/if}
			{:else}
			<!-- ═══ NORMAL MODE ═══ -->

			<!-- Magic background: blurred screenshot -->
			{#if magicScreenshotUrl}
				<img
					src={magicScreenshotUrl}
					alt=""
					class="pointer-events-none absolute inset-0 h-full w-full object-cover"
					style="filter: blur(80px) saturate(1.8) brightness(0.7); transform: scale(1.3);"
					draggable="false"
				/>
			{/if}

			<!-- Text blocks (above position) -->
			{#each store.textBlocks.filter(t => t.text && t.position === 'above') as tb (tb.id)}
				{@const isSelText = store.selectedTextId === tb.id}
				<div
					class="absolute left-0 right-0 text-center"
					style="top: {store.padding * 0.4}px;
						font-size: {tb.fontSize}px;
						font-weight: {tb.fontWeight};
						font-family: '{tb.fontFamily}', sans-serif;
						color: {tb.color};
						text-align: {tb.textAlign};
						letter-spacing: {tb.letterSpacing}px;
						line-height: {tb.lineHeight};
						padding: 0 {store.padding}px;
						overflow: visible;
						{tb.maxWidth > 0 ? `max-width: ${tb.maxWidth}%; margin: 0 auto; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;` : ''}
						transform: perspective(1200px) rotateX({tb.tiltX}deg) rotateY({tb.tiltY}deg) rotate({tb.rotation}deg);
						{tb.shadow.enabled ? `text-shadow: ${tb.shadow.offsetX}px ${tb.shadow.offsetY}px ${tb.shadow.blur}px ${tb.shadow.color};` : ''}
						"
					onclick={() => store.selectTextBlock(tb.id)}
				>
					{#if tb.arcDegrees !== 0}
						{@const estW = Math.max(500, tb.fontSize * tb.text.length * 0.7)}
						{@const estH = Math.max(300, tb.fontSize * 4)}
						{@const pathD = makeTextPath(tb.pathType, tb.arcDegrees, estW * 0.85)}
						<svg viewBox={`${-estW / 2} ${-estH / 2} ${estW} ${estH}`} style="width: 100%; height: {estH}px; overflow: visible; display: block;">
							<defs>
								<path id="text-arc-{tb.id}" d={pathD} />
							</defs>
							<text fill={tb.color} font-size={tb.fontSize} font-weight={tb.fontWeight} font-family="'{tb.fontFamily}', sans-serif" letter-spacing={tb.letterSpacing} text-anchor="middle"
								style={tb.shadow.enabled ? `filter: drop-shadow(${tb.shadow.offsetX}px ${tb.shadow.offsetY}px ${tb.shadow.blur}px ${tb.shadow.color})` : ''}>
								<textPath href="#text-arc-{tb.id}" startOffset="50%">{tb.text}</textPath>
							</text>
						</svg>
					{:else}
						{tb.text}
					{/if}
				</div>
			{/each}

			<!-- Legacy single text overlay above (backward compat) -->
			{#if store.textOverlay.enabled && store.textOverlay.text && store.textOverlay.position === 'above' && store.textBlocks.length === 0}
				{@const to = store.textOverlay}
				<div
					class="absolute left-0 right-0 text-center"
					style="top: {store.padding * 0.4}px;
						font-size: {to.fontSize}px;
						font-weight: {to.fontWeight};
						font-family: '{to.fontFamily}', sans-serif;
						color: {to.color};
						text-align: {to.textAlign};
						letter-spacing: {to.letterSpacing}px;
						line-height: {to.lineHeight};
						padding: 0 {store.padding}px;
						overflow: visible;
						transform: perspective(1200px) rotateX({to.tiltX}deg) rotateY({to.tiltY}deg) rotate({to.rotation}deg);
						{to.shadow.enabled ? `text-shadow: ${to.shadow.offsetX}px ${to.shadow.offsetY}px ${to.shadow.blur}px ${to.shadow.color};` : ''}"
				>
					{#if to.arcDegrees !== 0}
						{@const estW = Math.max(500, to.fontSize * to.text.length * 0.7)}
						{@const estH = Math.max(300, to.fontSize * 4)}
						{@const pathD = makeTextPath(to.pathType, to.arcDegrees, estW * 0.85)}
						<svg viewBox={`${-estW / 2} ${-estH / 2} ${estW} ${estH}`} style="width: 100%; height: {estH}px; overflow: visible; display: block;">
							<defs>
								<path id="text-arc" d={pathD} />
							</defs>
							<text fill={to.color} font-size={to.fontSize} font-weight={to.fontWeight} font-family="'{to.fontFamily}', sans-serif" letter-spacing={to.letterSpacing} text-anchor="middle"
								style={to.shadow.enabled ? `filter: drop-shadow(${to.shadow.offsetX}px ${to.shadow.offsetY}px ${to.shadow.blur}px ${to.shadow.color})` : ''}>
								<textPath href="#text-arc" startOffset="50%">{to.text}</textPath>
							</text>
						</svg>
					{:else}
						{to.text}
					{/if}
				</div>
			{/if}

			<!-- Scene objects -->
			{#each store.sceneObjects as obj (obj.id)}
				{@const device = deviceRegistry.getDevice(obj.deviceId)}
				{@const color = deviceRegistry.getDeviceColor(obj.deviceId, obj.deviceColorId)}
				{@const isSelected = store.selectedObjectId === obj.id}
				{#if device}
					{@const displayW = Math.min(device.pngW, 600)}
					{@const displayH = displayW * (device.pngH / device.pngW)}
					{@const maxScale = Math.min(
						(store.canvasSize.width - store.padding * 2) / displayW,
						(store.canvasSize.height - store.padding * 2) / displayH,
						1
					)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						data-object-id={obj.id}
						class="absolute {dragging === obj.id ? 'cursor-grabbing' : 'cursor-grab'}"
						style="left: {obj.x}%; top: {obj.y}%;
							transform: translate(-50%, -50%) scale({maxScale * obj.scale}) rotate({obj.rotation ?? 0}deg);"
						onmousedown={(e) => startDrag(e, obj.id)}
					>
						<DeviceFrame
							{device}
							screenshotUrl={obj.screenshotUrl}
							colorSlug={color?.slug ?? device.colors[0]?.slug ?? ''}
							transform={{ shadow: obj.shadow, tiltX: obj.tiltX, tiltY: obj.tiltY, zoom: 1 }}
							frameStyle={obj.frameStyle}
							borderRadius={obj.borderRadius}
							glow={obj.glow}
						/>
					</div>
				{/if}
			{/each}

			<!-- Text blocks (below position) -->
			{#each store.textBlocks.filter(t => t.text && t.position === 'below') as tb (tb.id)}
				{@const isSelText = store.selectedTextId === tb.id}
				<div
					class="absolute bottom-0 left-0 right-0 text-center"
					style="bottom: {store.padding * 0.4}px;
						font-size: {tb.fontSize}px;
						font-weight: {tb.fontWeight};
						font-family: '{tb.fontFamily}', sans-serif;
						color: {tb.color};
						text-align: {tb.textAlign};
						letter-spacing: {tb.letterSpacing}px;
						line-height: {tb.lineHeight};
						padding: 0 {store.padding}px;
						{tb.maxWidth > 0 ? `max-width: ${tb.maxWidth}%; margin: 0 auto; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;` : ''}
						transform: perspective(1200px) rotateX({tb.tiltX}deg) rotateY({tb.tiltY}deg) rotate({tb.rotation}deg);
						{tb.shadow.enabled ? `text-shadow: ${tb.shadow.offsetX}px ${tb.shadow.offsetY}px ${tb.shadow.blur}px ${tb.shadow.color};` : ''}
						"
					onclick={() => store.selectTextBlock(tb.id)}
				>
					{#if tb.arcDegrees !== 0}
						{@const estW = Math.max(500, tb.fontSize * tb.text.length * 0.7)}
						{@const estH = Math.max(300, tb.fontSize * 4)}
						{@const pathD = makeTextPath(tb.pathType, tb.arcDegrees, estW * 0.85)}
						<svg viewBox={`${-estW / 2} ${-estH / 2} ${estW} ${estH}`} style="width: 100%; height: {estH}px; overflow: visible; display: block;">
							<defs>
								<path id="text-arc-below-{tb.id}" d={pathD} />
							</defs>
							<text fill={tb.color} font-size={tb.fontSize} font-weight={tb.fontWeight} font-family="'{tb.fontFamily}', sans-serif" letter-spacing={tb.letterSpacing} text-anchor="middle"
								style={tb.shadow.enabled ? `filter: drop-shadow(${tb.shadow.offsetX}px ${tb.shadow.offsetY}px ${tb.shadow.blur}px ${tb.shadow.color})` : ''}>
								<textPath href="#text-arc-below-{tb.id}" startOffset="50%">{tb.text}</textPath>
							</text>
						</svg>
					{:else}
						{tb.text}
					{/if}
				</div>
			{/each}

			<!-- Text blocks (custom position) -->
			{#each store.textBlocks.filter(t => t.text && t.position === 'custom') as tb (tb.id)}
				{@const isSelText = store.selectedTextId === tb.id}
				<div
					class="absolute"
					style="left: {tb.x}%; top: {tb.y}%;
						transform: translate(-50%, -50%) perspective(1200px) rotateX({tb.tiltX}deg) rotateY({tb.tiltY}deg) rotate({tb.rotation}deg);
						font-size: {tb.fontSize}px;
						font-weight: {tb.fontWeight};
						font-family: '{tb.fontFamily}', sans-serif;
						color: {tb.color};
						text-align: {tb.textAlign};
						letter-spacing: {tb.letterSpacing}px;
						line-height: {tb.lineHeight};
						{tb.maxWidth > 0 ? `max-width: ${tb.maxWidth}%; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;` : 'white-space: nowrap;'}
						{tb.shadow.enabled ? `text-shadow: ${tb.shadow.offsetX}px ${tb.shadow.offsetY}px ${tb.shadow.blur}px ${tb.shadow.color};` : ''}
						"
					onclick={() => store.selectTextBlock(tb.id)}
				>
					{#if tb.arcDegrees !== 0}
						{@const svgW = Math.max(400, tb.fontSize * tb.text.length * 0.7)}
						{@const svgH = Math.max(250, tb.fontSize * 4)}
						{@const pathD = makeTextPath(tb.pathType, tb.arcDegrees, svgW * 0.85)}
						<svg style="overflow: visible; width: {svgW}px; height: {svgH}px; display: block;" viewBox={`${-svgW / 2} ${-svgH / 2} ${svgW} ${svgH}`}>
							<defs>
								<path id="text-path-{tb.id}" d={pathD} />
							</defs>
							<text fill={tb.color} font-size={tb.fontSize} font-weight={tb.fontWeight} font-family="'{tb.fontFamily}', sans-serif" letter-spacing={tb.letterSpacing} text-anchor="middle"
								style={tb.shadow.enabled ? `filter: drop-shadow(${tb.shadow.offsetX}px ${tb.shadow.offsetY}px ${tb.shadow.blur}px ${tb.shadow.color})` : ''}>
								<textPath href="#text-path-{tb.id}" startOffset="50%">{tb.text}</textPath>
							</text>
						</svg>
					{:else}
						{tb.text}
					{/if}
				</div>
			{/each}

			<!-- Legacy single text overlay below (backward compat) -->
			{#if store.textOverlay.enabled && store.textOverlay.text && store.textOverlay.position === 'below' && store.textBlocks.length === 0}
				{@const to = store.textOverlay}
				<div
					class="absolute bottom-0 left-0 right-0 text-center"
					style="bottom: {store.padding * 0.4}px;
						font-size: {to.fontSize}px;
						font-weight: {to.fontWeight};
						font-family: '{to.fontFamily}', sans-serif;
						color: {to.color};
						text-align: {to.textAlign};
						letter-spacing: {to.letterSpacing}px;
						line-height: {to.lineHeight};
						padding: 0 {store.padding}px;
						transform: perspective(1200px) rotateX({to.tiltX}deg) rotateY({to.tiltY}deg) rotate({to.rotation}deg);
						{to.shadow.enabled ? `text-shadow: ${to.shadow.offsetX}px ${to.shadow.offsetY}px ${to.shadow.blur}px ${to.shadow.color};` : ''}"
				>
					{#if to.arcDegrees !== 0}
						{@const estW = Math.max(500, to.fontSize * to.text.length * 0.7)}
						{@const estH = Math.max(300, to.fontSize * 4)}
						{@const pathD = makeTextPath(to.pathType, to.arcDegrees, estW * 0.85)}
						<svg viewBox={`${-estW / 2} ${-estH / 2} ${estW} ${estH}`} style="width: 100%; height: {estH}px; overflow: visible; display: block;">
							<defs>
								<path id="text-arc-below-legacy" d={pathD} />
							</defs>
							<text fill={to.color} font-size={to.fontSize} font-weight={to.fontWeight} font-family="'{to.fontFamily}', sans-serif" letter-spacing={to.letterSpacing} text-anchor="middle"
								style={to.shadow.enabled ? `filter: drop-shadow(${to.shadow.offsetX}px ${to.shadow.offsetY}px ${to.shadow.blur}px ${to.shadow.color})` : ''}>
								<textPath href="#text-arc-below-legacy" startOffset="50%">{to.text}</textPath>
							</text>
						</svg>
					{:else}
						{to.text}
					{/if}
				</div>
			{/if}

			<!-- Legacy single text overlay custom (backward compat) -->
			{#if store.textOverlay.enabled && store.textOverlay.text && store.textOverlay.position === 'custom' && store.textBlocks.length === 0}
				{@const to = store.textOverlay}
				<div
					class="absolute whitespace-nowrap"
					style="left: {to.x}%; top: {to.y}%;
						transform: translate(-50%, -50%) perspective(1200px) rotateX({to.tiltX}deg) rotateY({to.tiltY}deg) rotate({to.rotation}deg);
						font-size: {to.fontSize}px;
						font-weight: {to.fontWeight};
						font-family: '{to.fontFamily}', sans-serif;
						color: {to.color};
						text-align: {to.textAlign};
						letter-spacing: {to.letterSpacing}px;
						line-height: {to.lineHeight};
						{to.shadow.enabled ? `text-shadow: ${to.shadow.offsetX}px ${to.shadow.offsetY}px ${to.shadow.blur}px ${to.shadow.color};` : ''}"
				>
					{#if to.arcDegrees !== 0}
						{@const svgW = Math.max(400, to.fontSize * to.text.length * 0.7)}
						{@const svgH = Math.max(250, to.fontSize * 4)}
						{@const pathD = makeTextPath(to.pathType, to.arcDegrees, svgW * 0.85)}
						<svg style="overflow: visible; width: {svgW}px; height: {svgH}px; display: block;" viewBox={`${-svgW / 2} ${-svgH / 2} ${svgW} ${svgH}`}>
							<defs>
								<path id="text-path-custom" d={pathD} />
							</defs>
							<text fill={to.color} font-size={to.fontSize} font-weight={to.fontWeight} font-family="'{to.fontFamily}', sans-serif" letter-spacing={to.letterSpacing} text-anchor="middle"
								style={to.shadow.enabled ? `filter: drop-shadow(${to.shadow.offsetX}px ${to.shadow.offsetY}px ${to.shadow.blur}px ${to.shadow.color})` : ''}>
								<textPath href="#text-path-custom" startOffset="50%">{to.text}</textPath>
							</text>
						</svg>
					{:else}
						{to.text}
					{/if}
				</div>
			{/if}
			{/if}
		</div>

		<!-- App Store section dividers (visual only, not part of export canvas) -->
		{#if store.appStoreEnabled}
			{@const secW = store.appStore.sectionWidth}
			{@const numSec = store.appStore.numSections}
			{#each Array(numSec - 1) as _, i}
				<div
					class="pointer-events-none absolute top-0 bottom-0"
					style="left: {(i + 1) * secW * viewScale}px; width: 2px; background: rgba(236, 72, 153, 0.5); z-index: 50;"
				></div>
				<!-- Section number labels -->
			{/each}
			{#each Array(numSec) as _, i}
				<div
					class="pointer-events-none absolute text-[10px] font-bold text-pink-400/60"
					style="left: {(i * secW + secW / 2) * viewScale}px; top: 4px; transform: translateX(-50%); z-index: 50;"
				>
					{i + 1}/{numSec}
				</div>
			{/each}
		{/if}
	</div>
</div>
