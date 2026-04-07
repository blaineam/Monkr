<script lang="ts">
	import { Menu, X } from 'lucide-svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let canvasRef = $state<HTMLDivElement | undefined>(undefined);
	let mobileMenuOpen = $state(false);
</script>

<div class="flex h-screen flex-col">
	<!-- Header -->
	<header class="flex h-12 flex-shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4">
		<div class="flex items-center gap-2">
			<span class="text-lg font-bold tracking-tight">
				<span class="text-pink-500">M</span>onkr
			</span>
			<span class="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
				beta
			</span>
		</div>
		<!-- Mobile menu toggle -->
		<button
			class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white lg:hidden"
			onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
		>
			{#if mobileMenuOpen}
				<X size={20} />
			{:else}
				<Menu size={20} />
			{/if}
		</button>
	</header>

	<!-- Main content -->
	<div class="relative flex flex-1 overflow-hidden">
		<!-- Sidebar - Desktop -->
		<div class="hidden w-80 flex-shrink-0 border-r border-zinc-800 lg:block">
			<Sidebar {canvasRef} />
		</div>

		<!-- Canvas -->
		<div class="flex-1">
			<Canvas bind:canvasRef />
		</div>

		<!-- Mobile sidebar overlay -->
		{#if mobileMenuOpen}
			<!-- Backdrop -->
			<button
				class="fixed inset-0 z-40 bg-black/60 lg:hidden"
				onclick={() => (mobileMenuOpen = false)}
				aria-label="Close menu"
			></button>
			<!-- Slide-in panel -->
			<div class="fixed inset-y-0 left-0 z-50 w-80 shadow-2xl lg:hidden">
				<Sidebar {canvasRef} />
			</div>
		{/if}
	</div>
</div>
