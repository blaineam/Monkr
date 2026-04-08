<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<title>Monkr - Mockup Generator</title>
	<meta name="description" content="Create beautiful device mockups in seconds. Free, open-source, and runs entirely in your browser." />
	<meta name="author" content="Blaine Miller" />
	<meta name="theme-color" content="#09090b" />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://monkr.wemiller.com" />
	<meta property="og:title" content="Monkr - Beautiful Device Mockups" />
	<meta property="og:description" content="Create stunning device mockups in seconds. Free, open-source, and runs entirely in your browser." />
	<meta property="og:image" content="https://monkr.wemiller.com/og-image.jpg" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:type" content="image/jpeg" />
	<meta property="og:site_name" content="Monkr" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Monkr - Beautiful Device Mockups" />
	<meta name="twitter:description" content="Create stunning device mockups in seconds. Free, open-source, and runs entirely in your browser." />
	<meta name="twitter:image" content="https://monkr.wemiller.com/og-image.jpg" />

	<!-- Favicon & Icons -->
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
	<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
	<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
	<link rel="manifest" href="/site.webmanifest" />

	<!-- Canonical -->
	<link rel="canonical" href="https://monkr.wemiller.com" />
</svelte:head>

<div class="h-screen w-screen overflow-hidden bg-zinc-950 text-white">
	{@render children()}
</div>
