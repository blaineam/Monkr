<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<!-- All meta/OG/SEO tags are in app.html so crawlers see them without JS -->

<div class="h-screen w-screen overflow-hidden bg-zinc-950 text-white">
	{@render children()}
</div>
