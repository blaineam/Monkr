<script lang="ts">
	import { Menu, X } from 'lucide-svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let canvasRef = $state<HTMLDivElement | undefined>(undefined);
	let mobileMenuOpen = $state(false);
</script>

<div class="flex h-screen flex-col bg-zinc-950">
	<!-- Header -->
	<header class="flex h-10 flex-shrink-0 items-center justify-between border-b border-zinc-800/60 bg-zinc-900/80 px-4 backdrop-blur-sm">
		<div class="flex items-center gap-2">
			<span class="text-sm font-bold tracking-tight">
				<span class="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">Monkr</span>
			</span>
		</div>
		<div class="hidden items-center gap-2 lg:flex">
			<a
				href="https://github.com/blaineam/Monkr"
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
				title="View on GitHub"
			>
				<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
				<span>GitHub</span>
			</a>
		</div>
		<!-- Mobile menu toggle -->
		<button
			class="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white lg:hidden"
			onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
		>
			{#if mobileMenuOpen}
				<X size={18} />
			{:else}
				<Menu size={18} />
			{/if}
		</button>
	</header>

	<!-- Main content -->
	<div class="relative flex flex-1 overflow-hidden">
		<!-- Sidebar - Desktop -->
		<div class="hidden w-72 flex-shrink-0 border-r border-zinc-800/60 lg:block">
			<Sidebar {canvasRef}  />
		</div>

		<!-- Canvas -->
		<div class="flex-1">
			<Canvas bind:canvasRef />
		</div>

		<!-- Mobile sidebar overlay -->
		{#if mobileMenuOpen}
			<button
				class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
				onclick={() => (mobileMenuOpen = false)}
				aria-label="Close menu"
			></button>
			<div class="fixed inset-y-0 left-0 z-50 w-72 shadow-2xl lg:hidden">
				<Sidebar {canvasRef}  />
			</div>
		{/if}
	</div>
</div>
