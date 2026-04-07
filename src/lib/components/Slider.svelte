<script lang="ts">
	let {
		label,
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		unit = ''
	}: {
		label: string;
		value: number;
		min?: number;
		max?: number;
		step?: number;
		unit?: string;
	} = $props();
</script>

<div class="flex flex-col gap-1.5">
	<label class="flex items-center justify-between text-xs font-medium text-zinc-400">
		<span>{label}</span>
		<span class="tabular-nums text-zinc-500"
			>{typeof value === 'number' ? (Number.isInteger(step) ? value : value.toFixed(1)) : value}{unit}</span
		>
		<input type="range" class="w-full" bind:value {min} {max} {step} />
	</label>
</div>
