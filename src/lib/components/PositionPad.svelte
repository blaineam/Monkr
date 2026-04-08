<script lang="ts">
	let {
		x = 50,
		y = 50,
		onchange
	}: {
		x: number;
		y: number;
		onchange: (x: number, y: number) => void;
	} = $props();

	let padRef = $state<HTMLDivElement | undefined>(undefined);
	let dragging = $state(false);
	let snapEnabled = $state(true);
	const snapSize = 10; // snap to 10% grid

	function snap(val: number): number {
		if (!snapEnabled) return Math.round(val);
		return Math.round(val / snapSize) * snapSize;
	}

	function updateFromEvent(e: MouseEvent | TouchEvent) {
		if (!padRef) return;
		const rect = padRef.getBoundingClientRect();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		const rawX = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
		const rawY = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
		onchange(snap(rawX), snap(rawY));
	}

	function handlePointerDown(e: MouseEvent) {
		dragging = true;
		updateFromEvent(e);
		window.addEventListener('mousemove', handlePointerMove);
		window.addEventListener('mouseup', handlePointerUp);
	}

	function handlePointerMove(e: MouseEvent) {
		if (dragging) updateFromEvent(e);
	}

	function handlePointerUp() {
		dragging = false;
		window.removeEventListener('mousemove', handlePointerMove);
		window.removeEventListener('mouseup', handlePointerUp);
	}

	function handleCenter() {
		onchange(50, 50);
	}

	function handleXInput(e: Event) {
		const val = parseInt((e.target as HTMLInputElement).value);
		if (!isNaN(val)) onchange(Math.max(0, Math.min(100, val)), y);
	}

	function handleYInput(e: Event) {
		const val = parseInt((e.target as HTMLInputElement).value);
		if (!isNaN(val)) onchange(x, Math.max(0, Math.min(100, val)));
	}

	// Grid lines for snap visualization
	let gridLines = $derived.by(() => {
		if (!snapEnabled) return [];
		const lines: number[] = [];
		for (let i = snapSize; i < 100; i += snapSize) lines.push(i);
		return lines;
	});
</script>

<div class="space-y-1">
	<div class="flex items-center justify-between">
		<span class="text-[10px] font-medium text-zinc-500">Position</span>
		<div class="flex items-center gap-2">
			<button
				class="text-[9px] {snapEnabled ? 'text-pink-400' : 'text-zinc-600'} hover:text-zinc-400"
				onclick={() => { snapEnabled = !snapEnabled; }}
				title="Toggle grid snapping"
			>Snap</button>
			<button class="text-[9px] text-zinc-600 hover:text-zinc-400" onclick={handleCenter}>Center</button>
		</div>
	</div>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={padRef}
		class="relative h-28 w-full cursor-crosshair rounded-lg border border-zinc-700 bg-zinc-800/60"
		onmousedown={handlePointerDown}
	>
		<!-- Grid lines -->
		<div class="absolute inset-0 pointer-events-none">
			{#if snapEnabled}
				{#each gridLines as pos}
					<div class="absolute top-0 h-full w-px bg-zinc-700/20" style="left: {pos}%;"></div>
					<div class="absolute left-0 h-px w-full bg-zinc-700/20" style="top: {pos}%;"></div>
				{/each}
			{/if}
			<div class="absolute left-1/2 top-0 h-full w-px bg-zinc-700/40"></div>
			<div class="absolute left-0 top-1/2 h-px w-full bg-zinc-700/40"></div>
		</div>
		<!-- Position dot -->
		<div
			class="absolute h-3 w-3 rounded-full bg-pink-500 transition-shadow
				{dragging ? 'ring-4 ring-pink-400/50' : 'ring-2 ring-pink-500/30'}"
			style="left: {x}%; top: {y}%; transform: translate(-50%, -50%);"
		></div>
	</div>
	<div class="flex justify-between items-center gap-2 text-[9px] text-zinc-600">
		<label class="flex items-center gap-1">
			x:
			<input
				type="number" min="0" max="100" value={x}
				class="w-10 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[9px] text-white text-center focus:border-pink-600 focus:outline-none"
				onchange={handleXInput}
			/>%
		</label>
		<label class="flex items-center gap-1">
			y:
			<input
				type="number" min="0" max="100" value={y}
				class="w-10 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[9px] text-white text-center focus:border-pink-600 focus:outline-none"
				onchange={handleYInput}
			/>%
		</label>
	</div>
</div>
