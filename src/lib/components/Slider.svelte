<script lang="ts">
	let {
		label,
		value = 0,
		min = 0,
		max = 100,
		step = 1,
		unit = '',
		onchange
	}: {
		label: string;
		value: number;
		min?: number;
		max?: number;
		step?: number;
		unit?: string;
		onchange: (v: number) => void;
	} = $props();

	function handleInput(e: Event) {
		const v = parseFloat((e.target as HTMLInputElement).value);
		onchange(v);
	}

	let displayValue = $derived(Number.isInteger(step) ? value : value.toFixed(1));
</script>

<div class="flex flex-col gap-1">
	<div class="flex items-center justify-between">
		<span class="text-[11px] font-medium text-zinc-500">{label}</span>
		<span class="font-mono text-[11px] tabular-nums text-zinc-600">{displayValue}{unit}</span>
	</div>
	<input type="range" class="w-full" {value} {min} {max} {step} oninput={handleInput} />
</div>
