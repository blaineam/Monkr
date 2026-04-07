<script lang="ts">
	let {
		label = 'Color',
		value = $bindable('#000000')
	}: {
		label?: string;
		value: string;
	} = $props();
</script>

<div class="flex items-center gap-3">
	<label class="flex items-center gap-3 text-xs font-medium text-zinc-400">
		{label}
		<span class="relative">
			<span
				class="block h-8 w-8 rounded-lg border border-zinc-700"
				style="background-color: {value}"
			></span>
			<input
				type="color"
				bind:value
				class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
			/>
		</span>
	</label>
	<span class="font-mono text-xs text-zinc-500">{value}</span>
</div>
