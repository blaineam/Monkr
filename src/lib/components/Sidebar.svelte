<script lang="ts">
	import {
		Smartphone,
		Tablet,
		Laptop,
		Palette,
		SlidersHorizontal,
		Layout,
		ImageDown,
		ChevronDown,
		ChevronUp,
		Image
	} from 'lucide-svelte';
	import { store } from '../stores/state.svelte';
	import { deviceRegistry } from '../stores/devices.svelte';
	import { gradientPresets } from '../gradients';
	import DropZone from './DropZone.svelte';
	import ColorPicker from './ColorPicker.svelte';
	import Slider from './Slider.svelte';
	import ExportButton from './ExportButton.svelte';
	import type { ExportFormat, ExportScale, LayoutMode } from '../types';

	let {
		canvasRef
	}: {
		canvasRef: HTMLDivElement | undefined;
	} = $props();

	type SectionId = 'screenshots' | 'device' | 'background' | 'transform' | 'layout' | 'export';
	let openSections = $state<Set<SectionId>>(new Set(['screenshots', 'device', 'background']));

	function toggleSection(id: SectionId) {
		const next = new Set(openSections);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		openSections = next;
	}

	// Local bindings for sliders
	let tiltX = $state(store.transform.tiltX);
	let tiltY = $state(store.transform.tiltY);
	let zoom = $state(store.transform.zoom);
	let borderRadius = $state(store.transform.borderRadius);
	let shadowBlur = $state(store.transform.shadow.blur);

	$effect(() => {
		store.setTransform({ tiltX, tiltY, zoom, borderRadius });
	});

	$effect(() => {
		store.setShadow({ blur: shadowBlur });
	});

	let layoutCount = $derived(
		store.layout === 'single' ? 1 : store.layout === 'dual' ? 2 : 3
	);

	let selectedDevice = $derived(deviceRegistry.getDevice(store.deviceId));
	let bgImageInput = $state<HTMLInputElement | undefined>(undefined);
</script>

<aside class="flex h-full w-full flex-col overflow-y-auto bg-zinc-900 p-4">
	<!-- Screenshots Section -->
	<button
		class="mb-2 flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm font-semibold text-zinc-300 hover:text-white"
		onclick={() => toggleSection('screenshots')}
	>
		<span class="flex items-center gap-2"><Image size={16} /> Screenshots</span>
		{#if openSections.has('screenshots')}<ChevronUp size={14} />{:else}<ChevronDown size={14} />{/if}
	</button>
	{#if openSections.has('screenshots')}
		<div class="mb-4 space-y-2">
			{#each { length: layoutCount } as _, i}
				<DropZone
					screenshotUrl={store.screenshots[i]?.url ?? null}
					index={i}
					onupload={(file) => store.addScreenshot(i, file)}
					onremove={() => store.removeScreenshot(i)}
				/>
			{/each}
		</div>
	{/if}

	<!-- Device Section -->
	<button
		class="mb-2 flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm font-semibold text-zinc-300 hover:text-white"
		onclick={() => toggleSection('device')}
	>
		<span class="flex items-center gap-2"><Smartphone size={16} /> Device</span>
		{#if openSections.has('device')}<ChevronUp size={14} />{:else}<ChevronDown size={14} />{/if}
	</button>
	{#if openSections.has('device')}
		<div class="mb-4 space-y-3">
			<!-- Category tabs -->
			<div class="grid grid-cols-3 gap-1 rounded-lg bg-zinc-800 p-1">
				{#each [
					{ cat: 'phone', icon: Smartphone, label: 'Phones' },
					{ cat: 'tablet', icon: Tablet, label: 'Tablets' },
					{ cat: 'laptop', icon: Laptop, label: 'Laptops' }
				] as { cat, icon: Icon, label }}
					{@const devices = deviceRegistry.devices.filter((d) => d.category === cat)}
					{@const isActive = selectedDevice?.category === cat}
					<button
						class="flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors
							{isActive ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'}"
						onclick={() => {
							if (devices.length > 0) store.setDevice(devices[0].id);
						}}
					>
						<Icon size={12} />
						{label}
					</button>
				{/each}
			</div>

			<!-- Device list -->
			<div class="space-y-1">
				{#each deviceRegistry.devices.filter((d) => d.category === (selectedDevice?.category ?? 'phone')) as dev}
					<button
						class="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors
							{store.deviceId === dev.id ? 'bg-pink-600/20 text-pink-400 ring-1 ring-pink-600/40' : 'text-zinc-300 hover:bg-zinc-800'}"
						onclick={() => store.setDevice(dev.id)}
					>
						<div class="font-medium">{dev.name}</div>
						<div class="text-xs text-zinc-500">{dev.brand} &middot; {dev.year}</div>
					</button>
				{/each}
			</div>

			<!-- Color picker for device -->
			{#if selectedDevice}
				<div class="space-y-1.5">
					<span class="text-xs font-medium text-zinc-400">Color</span>
					<div class="flex gap-2">
						{#each selectedDevice.colors as color}
							<button
								class="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110
									{store.deviceColorId === color.id ? 'border-pink-500 ring-2 ring-pink-500/30' : 'border-zinc-600'}"
								style="background-color: {color.hex};"
								title={color.name}
								onclick={() => store.setDeviceColor(color.id)}
							></button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Background Section -->
	<button
		class="mb-2 flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm font-semibold text-zinc-300 hover:text-white"
		onclick={() => toggleSection('background')}
	>
		<span class="flex items-center gap-2"><Palette size={16} /> Background</span>
		{#if openSections.has('background')}<ChevronUp size={14} />{:else}<ChevronDown size={14} />{/if}
	</button>
	{#if openSections.has('background')}
		<div class="mb-4 space-y-3">
			<!-- Background type toggle -->
			<div class="grid grid-cols-3 gap-1 rounded-lg bg-zinc-800 p-1">
				{#each ['solid', 'gradient', 'image'] as type}
					<button
						class="rounded-md px-2 py-1.5 text-xs capitalize transition-colors
							{store.background.type === type ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'}"
						onclick={() => store.setBackgroundType(type as 'solid' | 'gradient' | 'image')}
					>
						{type}
					</button>
				{/each}
			</div>

			{#if store.background.type === 'solid'}
				<ColorPicker label="Color" bind:value={
					() => store.background.solidColor,
					(v) => store.setBackgroundColor(v)
				} />
			{:else if store.background.type === 'gradient'}
				<div class="grid grid-cols-4 gap-2">
					{#each gradientPresets as preset}
						<button
							class="h-10 rounded-lg border-2 transition-transform hover:scale-105
								{store.background.gradientName === preset.name ? 'border-pink-500' : 'border-transparent'}"
							style="background: {preset.css};"
							title={preset.name}
							onclick={() => store.setBackgroundGradient(preset.css, preset.name)}
						></button>
					{/each}
				</div>
			{:else}
				<div>
					<button
						class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-400 transition-colors hover:border-zinc-600"
						onclick={() => bgImageInput?.click()}
					>
						<ImageDown size={16} />
						Upload Background
					</button>
					<input
						bind:this={bgImageInput}
						type="file"
						accept="image/*"
						class="hidden"
						onchange={(e) => {
							const file = (e.target as HTMLInputElement).files?.[0];
							if (file) store.setBackgroundImage(file);
						}}
					/>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Layout Section -->
	<button
		class="mb-2 flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm font-semibold text-zinc-300 hover:text-white"
		onclick={() => toggleSection('layout')}
	>
		<span class="flex items-center gap-2"><Layout size={16} /> Layout</span>
		{#if openSections.has('layout')}<ChevronUp size={14} />{:else}<ChevronDown size={14} />{/if}
	</button>
	{#if openSections.has('layout')}
		<div class="mb-4">
			<div class="grid grid-cols-3 gap-1 rounded-lg bg-zinc-800 p-1">
				{#each [
					{ mode: 'single', label: 'Single' },
					{ mode: 'dual', label: 'Dual' },
					{ mode: 'triple', label: 'Triple' }
				] as { mode, label }}
					<button
						class="rounded-md px-2 py-2 text-xs transition-colors
							{store.layout === mode ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'}"
						onclick={() => store.setLayout(mode as LayoutMode)}
					>
						{label}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Transform Section -->
	<button
		class="mb-2 flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm font-semibold text-zinc-300 hover:text-white"
		onclick={() => toggleSection('transform')}
	>
		<span class="flex items-center gap-2"><SlidersHorizontal size={16} /> Transform</span>
		{#if openSections.has('transform')}<ChevronUp size={14} />{:else}<ChevronDown size={14} />{/if}
	</button>
	{#if openSections.has('transform')}
		<div class="mb-4 space-y-4">
			<!-- Shadow toggle -->
			<div class="flex items-center justify-between">
				<span class="text-xs font-medium text-zinc-400">Shadow</span>
				<button
					class="h-5 w-9 rounded-full transition-colors {store.transform.shadow.enabled ? 'bg-pink-600' : 'bg-zinc-700'}"
					aria-label="Toggle shadow"
					onclick={() => store.setShadow({ enabled: !store.transform.shadow.enabled })}
				>
					<div
						class="h-4 w-4 rounded-full bg-white transition-transform {store.transform.shadow.enabled ? 'translate-x-4' : 'translate-x-0.5'}"
					></div>
				</button>
			</div>

			{#if store.transform.shadow.enabled}
				<Slider label="Shadow Blur" bind:value={shadowBlur} min={0} max={100} step={1} unit="px" />
			{/if}

			<Slider label="Tilt X" bind:value={tiltX} min={-30} max={30} step={1} unit="deg" />
			<Slider label="Tilt Y" bind:value={tiltY} min={-30} max={30} step={1} unit="deg" />
			<Slider label="Zoom" bind:value={zoom} min={0.5} max={2} step={0.1} unit="x" />
		</div>
	{/if}

	<!-- Export Section -->
	<button
		class="mb-2 flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm font-semibold text-zinc-300 hover:text-white"
		onclick={() => toggleSection('export')}
	>
		<span class="flex items-center gap-2"><ImageDown size={16} /> Export</span>
		{#if openSections.has('export')}<ChevronUp size={14} />{:else}<ChevronDown size={14} />{/if}
	</button>
	{#if openSections.has('export')}
		<div class="mb-4 space-y-3">
			<!-- Scale -->
			<div class="space-y-1.5">
				<span class="text-xs font-medium text-zinc-400">Scale</span>
				<div class="grid grid-cols-3 gap-1 rounded-lg bg-zinc-800 p-1">
					{#each [1, 2, 3] as scale}
						<button
							class="rounded-md px-2 py-1.5 text-xs transition-colors
								{store.exportConfig.scale === scale ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'}"
							onclick={() => store.setExportScale(scale as ExportScale)}
						>
							{scale}x
						</button>
					{/each}
				</div>
			</div>

			<!-- Format -->
			<div class="space-y-1.5">
				<span class="text-xs font-medium text-zinc-400">Format</span>
				<div class="grid grid-cols-2 gap-1 rounded-lg bg-zinc-800 p-1">
					{#each ['png', 'jpg'] as format}
						<button
							class="rounded-md px-2 py-1.5 text-xs uppercase transition-colors
								{store.exportConfig.format === format ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'}"
							onclick={() => store.setExportFormat(format as ExportFormat)}
						>
							{format}
						</button>
					{/each}
				</div>
			</div>

			<ExportButton {canvasRef} />
		</div>
	{/if}
</aside>
