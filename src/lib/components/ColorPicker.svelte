<script lang="ts">
	let {
		label = 'Color',
		value = '#000000',
		onchange
	}: {
		label?: string;
		value: string;
		onchange: (v: string) => void;
	} = $props();

	function handleInput(e: Event) {
		onchange((e.target as HTMLInputElement).value);
	}
</script>

<div class="flex items-center gap-3">
	<span class="text-[11px] font-medium text-zinc-500">{label}</span>
	<span class="relative">
		<span
			class="block h-6 w-6 rounded-md border border-zinc-700"
			style="background-color: {value}"
		></span>
		<input
			type="color"
			{value}
			oninput={handleInput}
			class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
		/>
	</span>
	<span class="font-mono text-[10px] text-zinc-600">{value}</span>
</div>
