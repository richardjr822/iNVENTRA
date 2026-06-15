<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { SessionUser } from '$lib/types';
	import {
		Search,
		LayoutDashboard,
		Package,
		Tags,
		Boxes,
		FileText,
		History,
		Settings,
		ArrowRight,
		Keyboard
	} from '@lucide/svelte';

	let { user }: { user: SessionUser } = $props();

	// Command palette open state
	let isOpen = $state(false);
	let query = $state('');
	let selectedIndex = $state(0);
	let inputEl = $state<HTMLInputElement | null>(null);

	// Navigation items (role-filtered)
	const navItems = $derived([
		{
			label: 'Dashboard',
			description: 'System overview and KPI metrics',
			href: '/dashboard',
			icon: LayoutDashboard,
			category: 'Navigation',
			roles: ['admin', 'inventory_manager', 'viewer']
		},
		{
			label: 'Products',
			description: 'Manage product catalog and SKUs',
			href: '/products',
			icon: Package,
			category: 'Navigation',
			roles: ['admin', 'inventory_manager', 'viewer']
		},
		{
			label: 'Add Product',
			description: 'Create a new product entry',
			href: '/products/create',
			icon: Package,
			category: 'Actions',
			roles: ['admin', 'inventory_manager']
		},
		{
			label: 'Categories',
			description: 'Manage product categories',
			href: '/categories',
			icon: Tags,
			category: 'Navigation',
			roles: ['admin', 'inventory_manager', 'viewer']
		},
		{
			label: 'Add Category',
			description: 'Create a new category',
			href: '/categories/create',
			icon: Tags,
			category: 'Actions',
			roles: ['admin', 'inventory_manager']
		},
		{
			label: 'Inventory',
			description: 'Monitor warehouse quantities and stock levels',
			href: '/inventory',
			icon: Boxes,
			category: 'Navigation',
			roles: ['admin', 'inventory_manager', 'viewer']
		},
		{
			label: 'Stock In',
			description: 'Record incoming stock',
			href: '/inventory/stock-in',
			icon: Boxes,
			category: 'Inventory Actions',
			roles: ['admin', 'inventory_manager']
		},
		{
			label: 'Stock Out',
			description: 'Record outgoing stock',
			href: '/inventory/stock-out',
			icon: Boxes,
			category: 'Inventory Actions',
			roles: ['admin', 'inventory_manager']
		},
		{
			label: 'Adjustment',
			description: 'Manual inventory adjustment',
			href: '/inventory/adjustment',
			icon: Boxes,
			category: 'Inventory Actions',
			roles: ['admin', 'inventory_manager']
		},
		{
			label: 'Damaged Items',
			description: 'Log damaged or written-off stock',
			href: '/inventory/damaged',
			icon: Boxes,
			category: 'Inventory Actions',
			roles: ['admin', 'inventory_manager']
		},
		{
			label: 'Returns',
			description: 'Process returned goods',
			href: '/inventory/returns',
			icon: Boxes,
			category: 'Inventory Actions',
			roles: ['admin', 'inventory_manager']
		},
		{
			label: 'Transaction History',
			description: 'View all inventory transactions',
			href: '/inventory/transactions',
			icon: History,
			category: 'Navigation',
			roles: ['admin', 'inventory_manager', 'viewer']
		},
		{
			label: 'Reports',
			description: 'Download reports and analytics',
			href: '/reports',
			icon: FileText,
			category: 'Navigation',
			roles: ['admin', 'inventory_manager', 'viewer']
		},
		{
			label: 'Audit Logs',
			description: 'View system-wide activity logs',
			href: '/audit-logs',
			icon: History,
			category: 'Navigation',
			roles: ['admin']
		},
		{
			label: 'User Management',
			description: 'Manage user accounts and roles',
			href: '/users',
			icon: Settings,
			category: 'Navigation',
			roles: ['admin']
		},
		{
			label: 'Create User',
			description: 'Add a new user account',
			href: '/users/create',
			icon: Settings,
			category: 'Actions',
			roles: ['admin']
		},
		{
			label: 'Settings',
			description: 'System configuration and integrations',
			href: '/settings',
			icon: Settings,
			category: 'Navigation',
			roles: ['admin']
		}
	].filter((item) => item.roles.includes(user.role)));

	// Filtered results based on query
	const results = $derived(
		query.trim() === ''
			? navItems.slice(0, 8) // Show first 8 items by default
			: navItems
					.filter(
						(item) =>
							item.label.toLowerCase().includes(query.toLowerCase()) ||
							item.description.toLowerCase().includes(query.toLowerCase()) ||
							item.category.toLowerCase().includes(query.toLowerCase())
					)
					.slice(0, 10)
	);

	// Group results by category
	const grouped = $derived(
		results.reduce(
			(acc, item) => {
				if (!acc[item.category]) acc[item.category] = [];
				acc[item.category].push(item);
				return acc;
			},
			{} as Record<string, typeof results>
		)
	);

	// Flat results for keyboard nav
	const flatResults = $derived(results);

	function open() {
		isOpen = true;
		query = '';
		selectedIndex = 0;
		// Focus input after next tick
		setTimeout(() => inputEl?.focus(), 50);
	}

	function close() {
		isOpen = false;
		query = '';
		selectedIndex = 0;
	}

	function navigate(href: string) {
		close();
		goto(href);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = (selectedIndex + 1) % flatResults.length;
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = (selectedIndex - 1 + flatResults.length) % flatResults.length;
				break;
			case 'Enter':
				e.preventDefault();
				if (flatResults[selectedIndex]) {
					navigate(flatResults[selectedIndex].href);
				}
				break;
			case 'Escape':
				e.preventDefault();
				close();
				break;
		}
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault();
			if (isOpen) {
				close();
			} else {
				open();
			}
		}
	}

	// Is item active (current route)
	const currentPath = $derived(page.url.pathname);
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if isOpen}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
		onclick={close}
		aria-hidden="true"
	></div>

	<!-- Palette Panel -->
	<div
		class="fixed left-1/2 top-[15%] z-[201] w-full max-w-xl -translate-x-1/2 animate-in fade-in slide-in-from-top-4 duration-200"
		role="dialog"
		aria-modal="true"
		aria-label="Command Palette"
	>
		<div
			class="overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl"
		>
			<!-- Search Input -->
			<div class="flex items-center gap-3 border-b border-border/40 px-4 py-3.5">
				<Search class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
				<input
					bind:this={inputEl}
					bind:value={query}
					onkeydown={handleKeydown}
					type="text"
					placeholder="Search pages and actions..."
					class="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
					role="combobox"
					aria-expanded="true"
					aria-controls="command-palette-results"
					aria-activedescendant={flatResults[selectedIndex]
						? `cmd-item-${selectedIndex}`
						: undefined}
					autocomplete="off"
					spellcheck="false"
				/>
				<kbd
					class="hidden shrink-0 rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground sm:block"
					aria-label="Press Escape to close"
				>
					ESC
				</kbd>
			</div>

			<!-- Results -->
			<div
				id="command-palette-results"
				class="max-h-[min(400px,60vh)] overflow-y-auto overscroll-contain"
				role="listbox"
				aria-label="Search results"
			>
				{#if flatResults.length === 0}
					<div class="flex flex-col items-center justify-center gap-2 py-10 text-center">
						<Search class="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
						<p class="text-sm font-semibold text-muted-foreground">No results for "{query}"</p>
						<p class="text-xs text-muted-foreground/70">Try a different search term</p>
					</div>
				{:else}
					{#each Object.entries(grouped) as [category, items] (category)}
						<div class="px-2 pt-3 pb-1">
							<p class="mb-1 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
								{category}
							</p>
							{#each items as item (item.href)}
								{@const globalIdx = flatResults.indexOf(item)}
								{@const Icon = item.icon}
								{@const isSelected = globalIdx === selectedIndex}
								{@const isActive = currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(item.href))}
								<button
									id="cmd-item-{globalIdx}"
									type="button"
									role="option"
									aria-selected={isSelected}
									onclick={() => navigate(item.href)}
									onmouseenter={() => (selectedIndex = globalIdx)}
									class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer
									{isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/60'}"
								>
									<div
										class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
										{isSelected ? 'bg-primary-foreground/15' : 'bg-muted/60'}"
									>
										<Icon class="h-3.5 w-3.5 {isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}" aria-hidden="true" />
									</div>
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<span class="text-sm font-semibold truncate {isSelected ? 'text-primary-foreground' : 'text-foreground'}">
												{item.label}
											</span>
											{#if isActive}
												<span class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide
												{isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'}">
													Current
												</span>
											{/if}
										</div>
										<p class="text-xs truncate {isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}">
											{item.description}
										</p>
									</div>
									<ArrowRight
										class="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity {isSelected ? 'opacity-100 text-primary-foreground' : ''}"
										aria-hidden="true"
									/>
								</button>
							{/each}
						</div>
					{/each}
				{/if}
			</div>

			<!-- Footer -->
			<div
				class="flex items-center justify-between border-t border-border/40 px-4 py-2.5 bg-muted/20"
			>
				<div class="flex items-center gap-3 text-[10px] font-semibold text-muted-foreground">
					<span class="flex items-center gap-1">
						<kbd class="rounded border border-border/60 bg-background px-1 py-0.5 font-mono text-[9px]">↑</kbd>
						<kbd class="rounded border border-border/60 bg-background px-1 py-0.5 font-mono text-[9px]">↓</kbd>
						Navigate
					</span>
					<span class="flex items-center gap-1">
						<kbd class="rounded border border-border/60 bg-background px-1 py-0.5 font-mono text-[9px]">↵</kbd>
						Open
					</span>
					<span class="flex items-center gap-1">
						<kbd class="rounded border border-border/60 bg-background px-1 py-0.5 font-mono text-[9px]">ESC</kbd>
						Close
					</span>
				</div>
				<div class="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60">
					<Keyboard class="h-3 w-3" aria-hidden="true" />
					<span>Ctrl+K</span>
				</div>
			</div>
		</div>
	</div>
{/if}
