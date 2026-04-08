<script lang="ts">
	let {
		tiltX = 0,
		tiltY = 0,
		onchange
	}: {
		tiltX: number;
		tiltY: number;
		onchange: (tiltX: number, tiltY: number) => void;
	} = $props();

	let padRef = $state<HTMLDivElement | undefined>(undefined);
	let dragging = $state(false);

	function updateFromEvent(e: MouseEvent) {
		if (!padRef) return;
		const rect = padRef.getBoundingClientRect();
		const nx = ((e.clientX - rect.left) / rect.width) * 60 - 30;
		const ny = ((e.clientY - rect.top) / rect.height) * 60 - 30;
		onchange(
			Math.round(Math.max(-30, Math.min(30, ny))),
			Math.round(Math.max(-30, Math.min(30, nx)))
		);
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

	function handleReset() {
		onchange(0, 0);
	}

	function handleXInput(e: Event) {
		const val = parseInt((e.target as HTMLInputElement).value);
		if (!isNaN(val)) onchange(Math.max(-30, Math.min(30, val)), tiltY);
	}

	function handleYInput(e: Event) {
		const val = parseInt((e.target as HTMLInputElement).value);
		if (!isNaN(val)) onchange(tiltX, Math.max(-30, Math.min(30, val)));
	}

	// Map tilt values (-30 to 30) to percentage (0 to 100)
	let dotX = $derived(((tiltY + 30) / 60) * 100);
	let dotY = $derived(((tiltX + 30) / 60) * 100);
</script>

<div class="space-y-1">
	<div class="flex items-center justify-between">
		<span class="text-[10px] font-medium text-zinc-500">3D Tilt</span>
		<button class="text-[9px] text-zinc-600 hover:text-zinc-400" onclick={handleReset}>Reset</button>
	</div>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={padRef}
		class="relative h-20 w-full cursor-crosshair rounded-lg border border-zinc-700 bg-zinc-800/60"
		onmousedown={handlePointerDown}
	>
		<div class="absolute inset-0 pointer-events-none">
			<div class="absolute left-1/2 top-0 h-full w-px bg-zinc-700/40"></div>
			<div class="absolute left-0 top-1/2 h-px w-full bg-zinc-700/40"></div>
		</div>
		<div
			class="absolute h-2.5 w-2.5 rounded-full bg-violet-500 transition-shadow
				{dragging ? 'ring-4 ring-violet-400/40' : 'ring-2 ring-violet-500/30'}"
			style="left: {dotX}%; top: {dotY}%; transform: translate(-50%, -50%);"
		></div>
	</div>
	<div class="flex justify-between items-center gap-2 text-[9px] text-zinc-600">
		<label class="flex items-center gap-1">
			X:
			<input
				type="number" min="-30" max="30" value={tiltX}
				class="w-10 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[9px] text-white text-center focus:border-violet-600 focus:outline-none"
				onchange={handleXInput}
			/>&deg;
		</label>
		<label class="flex items-center gap-1">
			Y:
			<input
				type="number" min="-30" max="30" value={tiltY}
				class="w-10 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[9px] text-white text-center focus:border-violet-600 focus:outline-none"
				onchange={handleYInput}
			/>&deg;
		</label>
	</div>
</div>
