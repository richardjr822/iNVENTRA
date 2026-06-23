<script lang="ts">
	import { page } from '$app/state';
	import type { SessionUser } from '$lib/types';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import UserMenu from './UserMenu.svelte';
	import { Menu, Sun, Moon, Monitor, ChevronRight, Search } from '@lucide/svelte';

	let { user, mobileOpen = $bindable(false) }: { user: SessionUser; mobileOpen?: boolean } =
		$props();

	type ThemeMode = 'light' | 'dark' | 'system';
	let theme = $state<ThemeMode>('light');
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
		const saved = localStorage.getItem('theme') as ThemeMode | null;
		theme = saved ?? 'light';
		applyTheme(theme);
	});

	function applyTheme(mode: ThemeMode) {
		const root = document.documentElement;
		if (mode === 'dark') {
			root.classList.add('dark');
		} else if (mode === 'light') {
			root.classList.remove('dark');
		} else {
			// System: match OS preference
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			if (prefersDark) {
				root.classList.add('dark');
			} else {
				root.classList.remove('dark');
			}
		}
	}

	function cycleTheme() {
		const next: ThemeMode = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
		theme = next;
		localStorage.setItem('theme', next);
		applyTheme(next);
	}

	// Tooltip label for current theme button
	const themeLabel = $derived(
		theme === 'light'
			? 'Switch to Dark Mode'
			: theme === 'dark'
				? 'Switch to System Mode'
				: 'Switch to Light Mode'
	);

	const themeAriaLabel = $derived(`Current theme: ${theme}. ${themeLabel}`);

	// Generate breadcrumbs dynamically based on path
	const pathParts = $derived(page.url.pathname.split('/').filter(Boolean));

	const breadcrumbs = $derived([
		{ label: 'Inventra', href: '/dashboard' },
		...pathParts.map((part, index) => {
			const href = '/' + pathParts.slice(0, index + 1).join('/');
			let label = part;
			if (page.data.product && page.data.product.id === part) {
				label = page.data.product.name;
			} else {
				label = part
					.split('-')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ');
			}
			return { label, href };
		})
	]);

	// Extract active page title (last element of breadcrumbs, default to Dashboard)
	const pageTitle = $derived(breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard');
</script>

<header
	class="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border/60 bg-card/65 backdrop-blur-md px-4 sm:px-6 transition-all duration-300"
>
	<!-- Left Side: Hamburger & Breadcrumbs -->
	<div class="flex items-center gap-3 min-w-0 flex-1">
		<!-- Mobile Hamburger Button -->
		<Button
			variant="outline"
			size="icon"
			onclick={() => (mobileOpen = true)}
			class="lg:hidden rounded-full shadow-sm hover:bg-muted/70 cursor-pointer focus-visible:ring-emerald-500/50"
			aria-label="Open sidebar navigation"
			aria-expanded={mobileOpen}
			aria-controls="mobile-sidebar"
		>
			<Menu class="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
		</Button>

		<!-- Breadcrumbs (Hidden on small viewports) -->
		<nav
			class="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground"
			aria-label="Breadcrumb navigation"
		>
			{#each breadcrumbs as crumb, i (i)}
				{#if i > 0}
					<ChevronRight class="h-3 w-3 shrink-0" aria-hidden="true" />
				{/if}
				<a
					href={crumb.href}
					class="font-semibold transition-colors hover:text-foreground {i === breadcrumbs.length - 1
						? 'text-foreground font-black'
						: ''}"
					aria-current={i === breadcrumbs.length - 1 ? 'page' : undefined}
				>
					{crumb.label}
				</a>
			{/each}
		</nav>

		<!-- Mobile Title indicator -->
		<h1
			class="md:hidden text-base font-extrabold tracking-tight text-foreground truncate max-w-[150px]"
		>
			{pageTitle}
		</h1>
	</div>

	<!-- Right Side: Command Palette hint, Theme & User Menu -->
	<div class="flex items-center gap-2 shrink-0">
		<!-- Ctrl+K search hint (desktop only) -->
		<button
			type="button"
			onclick={() => {
				// Dispatch Ctrl+K keyboard event to open command palette
				window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
			}}
			class="hidden sm:flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			aria-label="Open command palette (Ctrl+K)"
		>
			<Search class="h-3 w-3" aria-hidden="true" />
			<span>Search</span>
			<kbd class="ml-1 rounded border border-border/60 bg-background px-1 py-0.5 font-mono text-[9px] font-bold"
				>Ctrl K</kbd
			>
		</button>

		<!-- Theme toggler (cycles Light → Dark → System) -->
		{#if mounted}
			<Button
				variant="outline"
				size="icon"
				onclick={cycleTheme}
				aria-label={themeAriaLabel}
				title={themeLabel}
				class="rounded-full shadow-sm hover:bg-muted/70 focus-visible:ring-emerald-500/50 cursor-pointer"
			>
				{#if theme === 'light'}
					<Sun
						class="h-[1.1rem] w-[1.1rem] text-amber-500 animate-in fade-in zoom-in spin-in-12 duration-200"
						aria-hidden="true"
					/>
				{:else if theme === 'dark'}
					<Moon
						class="h-[1.1rem] w-[1.1rem] text-slate-400 animate-in fade-in zoom-in spin-in-12 duration-200"
						aria-hidden="true"
					/>
				{:else}
					<Monitor
						class="h-[1.1rem] w-[1.1rem] text-muted-foreground animate-in fade-in zoom-in duration-200"
						aria-hidden="true"
					/>
				{/if}
			</Button>
		{/if}

		<!-- Profile User Menu Dropdown -->
		<UserMenu {user} />
	</div>
</header>
