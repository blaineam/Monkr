<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<title>Monkr - Mockup Generator</title>
	<meta name="description" content="Create beautiful device mockups in seconds" />
</svelte:head>

<div class="h-screen w-screen overflow-hidden bg-zinc-950 text-white">
	{@render children()}
</div>
