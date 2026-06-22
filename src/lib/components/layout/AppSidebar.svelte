<script lang="ts">
	import { page } from '$app/state';
	import type { SessionUser } from '$lib/types';
	import * as Sheet from '$lib/components/ui/sheet';
	import {
		LayoutDashboard,
		Package,
		Tags,
		Boxes,
		FileText,
		History,
		Settings,
		Keyboard
	} from '@lucide/svelte';

	let { user, mobileOpen = $bindable(false) }: { user: SessionUser; mobileOpen?: boolean } =
		$props();

	// Navigation Items structure
	const navItems = [
		{
			label: 'Dashboard',
			href: '/dashboard',
			icon: LayoutDashboard,
			roles: ['admin', 'inventory_manager', 'viewer']
		},
		{
			label: 'Products',
			href: '/products',
			icon: Package,
			roles: ['admin', 'inventory_manager', 'viewer']
		},
		{
			label: 'Audit Logs',
			href: '/audit-logs',
			icon: History,
			roles: ['admin']
		},
		{
			label: 'Settings',
			href: '/settings',
			icon: Settings,
			roles: ['admin']
		}
	];

	// Filtered menu items based on role
	const allowedItems = $derived(navItems.filter((item) => item.roles.includes(user.role)));

	// Get path helper to mark active status
	const currentPath = $derived(page.url.pathname);
	const isActive = (href: string) => {
		if (href === '/dashboard') {
			return currentPath === '/dashboard';
		}
		return currentPath.startsWith(href);
	};

	function openCommandPalette() {
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
	}
</script>

<!-- DESKTOP SIDEBAR -->
<aside
	id="desktop-sidebar"
	class="hidden lg:flex flex-col w-64 border-r border-border/60 bg-card/65 backdrop-blur-md h-screen fixed left-0 top-0 z-30 transition-all duration-300"
	aria-label="Main sidebar navigation"
>
	<!-- Logo Section -->
	<div class="flex h-16 items-center px-6 border-b border-border/60">
		<a href="/dashboard" class="flex items-center gap-2.5" aria-label="Inventra — Go to Dashboard">
			<div
				class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-emerald-500 text-primary-foreground shadow-md"
				aria-hidden="true"
			>
				<Boxes class="h-4.5 w-4.5" />
			</div>
			<span
				class="text-xl font-black tracking-wider bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
			>
				Inventra
			</span>
		</a>
	</div>

	<!-- Navigation Section -->
	<nav class="flex-1 overflow-y-auto px-4 py-6 space-y-1.5" aria-label="Main Navigation">
		{#each allowedItems as item (item.href)}
			{@const Icon = item.icon}
			{@const active = isActive(item.href)}
			<a
				href={item.href}
				class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition-all border text-left cursor-pointer group
				{active
					? 'bg-primary text-primary-foreground border-primary shadow-sm'
					: 'border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground'}"
				aria-current={active ? 'page' : undefined}
			>
				<Icon class="h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110" aria-hidden="true" />
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>

	<!-- Sidebar footer -->
	<div class="p-4 border-t border-border/60 bg-muted/20 space-y-2">
		<!-- Ctrl+K shortcut hint -->
		<button
			type="button"
			onclick={openCommandPalette}
			class="flex w-full items-center gap-2 rounded-xl border border-border/40 bg-background/40 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			aria-label="Open command palette"
		>
			<Keyboard class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
			<span class="flex-1 text-left">Quick search</span>
			<kbd class="rounded border border-border/50 bg-background px-1.5 py-0.5 font-mono text-[9px] font-bold">Ctrl K</kbd>
		</button>

		<!-- Connection status -->
		<div class="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
			<span class="relative flex h-2 w-2" aria-hidden="true">
				<span
					class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
				></span>
				<span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
			</span>
			<span>Connected to Supabase</span>
		</div>
	</div>
</aside>

<!-- MOBILE DRAWER / SHEET -->
<Sheet.Root bind:open={mobileOpen}>
	<Sheet.Content
		id="mobile-sidebar"
		side="left"
		class="w-72 p-0 bg-card border-r border-border/60 flex flex-col h-full"
	>
		<!-- Mobile Header Logo & Close -->
		<div class="flex h-16 items-center justify-between px-6 border-b border-border/60">
			<a
				href="/dashboard"
				class="flex items-center gap-2.5"
				onclick={() => (mobileOpen = false)}
				aria-label="Inventra — Go to Dashboard"
			>
				<div
					class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-emerald-500 text-primary-foreground shadow-md"
					aria-hidden="true"
				>
					<Boxes class="h-4.5 w-4.5" />
				</div>
				<span
					class="text-xl font-black tracking-wider bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
				>
					Inventra
				</span>
			</a>
		</div>

		<!-- Mobile Navigation List -->
		<nav class="flex-1 overflow-y-auto px-4 py-6 space-y-1.5" aria-label="Mobile Navigation">
			{#each allowedItems as item (item.href)}
				{@const Icon = item.icon}
				{@const active = isActive(item.href)}
				<a
					href={item.href}
					onclick={() => (mobileOpen = false)}
					class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition-all border text-left cursor-pointer group
					{active
						? 'bg-primary text-primary-foreground border-primary shadow-sm'
						: 'border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground'}"
					aria-current={active ? 'page' : undefined}
				>
					<Icon class="h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110" aria-hidden="true" />
					<span>{item.label}</span>
				</a>
			{/each}
		</nav>

		<!-- Mobile Sidebar footer -->
		<div class="p-4 border-t border-border/60 bg-muted/20 space-y-2">
			<!-- Connection status -->
			<div class="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
				<span class="relative flex h-2 w-2" aria-hidden="true">
					<span
						class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
					></span>
					<span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
				</span>
				<span>Connected to Supabase</span>
			</div>
		</div>
	</Sheet.Content>
</Sheet.Root>
