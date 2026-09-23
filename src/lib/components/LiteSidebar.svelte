<script lang="ts">
	import { Download, Copy, Check } from 'lucide-svelte';
	import { store } from '../stores/state.svelte';
	import { deviceRegistry } from '../stores/devices.svelte';
	import { exportCanvas, copyToClipboard } from '../export';
	import DropZone from './DropZone.svelte';
	import type { ExportScale, FrameStyle } from '../types';

	let { canvasRef }: { canvasRef: HTMLDivElement | undefined } = $props();
	let category = $state<'phone' | 'tablet'>('phone');
	let busy = $state(false);
	let copied = $state(false);
	let current = $derived(store.sceneObjects[0]);
	let device = $derived(deviceRegistry.getDevice(current?.deviceId ?? ''));
	let devices = $derived(deviceRegistry.devices.filter((d) => d.category === category));
	$effect(() => {
		if (device?.category === 'phone' || device?.category === 'tablet') category = device.category;
	});

	function chooseCategory(next: 'phone' | 'tablet') {
		category = next;
		const first = deviceRegistry.devices.find((d) => d.category === next);
		if (current && device?.category !== next && first) {
			store.setObjectDevice(current.id, first.id);
		}
	}

	async function download() {
		if (!canvasRef || !current?.screenshotUrl || busy) return;
		busy = true;
		try { await exportCanvas(canvasRef, 'png', store.exportConfig.scale, 'lite', true); }
		finally { busy = false; }
	}

	async function copy() {
		if (!canvasRef || !current?.screenshotUrl || busy) return;
		busy = true;
		try {
			await copyToClipboard(canvasRef, store.exportConfig.scale, true);
			copied = true;
			setTimeout(() => copied = false, 2000);
		} finally { busy = false; }
	}
</script>

<aside class="h-full overflow-y-auto border-r border-zinc-800 bg-zinc-900 p-5 text-zinc-200">
	<h1 class="mb-1 text-xl font-bold text-pink-400">Monkr Lite</h1>
	<p class="mb-6 text-xs text-zinc-400">截图加边框，导出透明无留白 PNG</p>
	{#if current}
		<div class="space-y-5">
			<section class="space-y-2">
				<h2 class="text-xs font-semibold">1. 上传截图</h2>
				<DropZone screenshotUrl={current.screenshotUrl} onupload={(file) => store.setObjectScreenshot(current.id, file)} onremove={() => store.removeObjectScreenshot(current.id)} />
			</section>
			<section class="space-y-2">
				<h2 class="text-xs font-semibold">2. 选择设备</h2>
				<div class="grid grid-cols-2 gap-2">
					{#each [{ id: 'phone', label: '手机' }, { id: 'tablet', label: '平板' }] as item}
						<button class="rounded-md px-3 py-2 text-xs {category === item.id ? 'bg-pink-600 text-white' : 'bg-zinc-800 text-zinc-300'}" onclick={() => chooseCategory(item.id as 'phone' | 'tablet')}>{item.label}</button>
					{/each}
				</div>
				<select class="w-full rounded-md bg-zinc-800 p-2 text-xs" value={current.deviceId} onchange={(e) => store.setObjectDevice(current.id, e.currentTarget.value)}>
					{#each devices as option}
						<option value={option.id}>{option.name}</option>
					{/each}
				</select>
				{#if device && device.colors.length > 1}
					<select class="w-full rounded-md bg-zinc-800 p-2 text-xs" value={current.deviceColorId} onchange={(e) => store.setObjectDeviceColor(current.id, e.currentTarget.value)}>
						{#each device.colors as color}<option value={color.id}>{color.name}</option>{/each}
					</select>
				{/if}
			</section>
			<section class="space-y-2">
				<h2 class="text-xs font-semibold">边框</h2>
				<div class="grid grid-cols-3 gap-1">
					{#each [{ id: 'default', label: '设备边框' }, { id: 'outline', label: '线框' }, { id: 'none', label: '无边框' }] as item}
						<button class="rounded-md px-1 py-2 text-xs {current.frameStyle === item.id ? 'bg-pink-600 text-white' : 'bg-zinc-800 text-zinc-300'}" onclick={() => store.setObjectFrameStyle(current.id, item.id as FrameStyle)}>{item.label}</button>
					{/each}
				</div>
			</section>
			<section class="space-y-2">
				<h2 class="text-xs font-semibold">3. 导出分辨率</h2>
				<div class="grid grid-cols-4 gap-1">
					{#each [1, 2, 3, 4] as scale}
						<button class="rounded-md py-2 text-xs {store.exportConfig.scale === scale ? 'bg-pink-600 text-white' : 'bg-zinc-800 text-zinc-300'}" onclick={() => store.setExportScale(scale as ExportScale)}>{scale}×</button>
					{/each}
				</div>
				<p class="text-[11px] text-zinc-500">PNG 无损；自动裁掉全部透明边缘。</p>
				<div class="flex gap-2">
					<button class="flex flex-1 items-center justify-center gap-2 rounded-md bg-pink-600 px-3 py-2 text-xs font-semibold disabled:opacity-40" disabled={!current.screenshotUrl || busy} onclick={download}><Download size={14} />下载 PNG</button>
					<button class="rounded-md bg-zinc-800 px-3 py-2 disabled:opacity-40" title="复制 PNG" aria-label="复制 PNG" disabled={!current.screenshotUrl || busy} onclick={copy}>{#if copied}<Check size={15} />{:else}<Copy size={15} />{/if}</button>
				</div>
			</section>
		</div>
	{/if}
</aside>
