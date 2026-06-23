<script lang="ts">
	import { page, navigating } from '$app/state';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { toastService } from '$lib/services/toast.svelte';
	import { createTable, getCoreRowModel } from '@tanstack/table-core';
	import type { InventoryOverviewItem } from '$lib/types/inventory';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Search,
		Eye,
		MoreHorizontal,
		Loader2,
		ChevronUp,
		ChevronDown,
		ChevronsUpDown,
		Package,
		X,
		ArrowUpRight,
		ArrowDownLeft,
		SlidersHorizontal,
		AlertTriangle,
		RotateCcw,
		RefreshCw
	} from '@lucide/svelte';

	let { data } = $props();

	// Role detection
	const isManager = $derived(data.user.role === 'inventory_manager');
	const isViewer = $derived(data.user.role === 'viewer');

	// ── PHP Peso formatter ─────────────────────────────────────────────────────
	function phpFormat(n: number): string {
		return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	// Search and filter state
	let searchQuery = $state('');
	let categoryFilter = $state('all');
	let statusFilter = $state('all');

	// Sync local states with URL changes
	$effect(() => {
		searchQuery = data.search;
		categoryFilter = data.categoryId;
		statusFilter = data.status;
	});

	// Check if any errors or toasts are passed in URL
	$effect(() => {
		const errorParam = page.url.searchParams.get('error');
		if (errorParam === 'unauthorized_role') {
			toastService.trigger(
				'Access Denied: You do not have permissions to perform this action.',
				'error'
			);
		} else if (errorParam === 'loading_failed') {
			toastService.trigger('Failed to load the requested page.', 'error');
		}

		const toastParam = page.url.searchParams.get('toast');
		if (toastParam === 'stock_in_success') {
			toastService.trigger('Stock In transaction completed successfully!', 'success');
		} else if (toastParam === 'stock_out_success') {
			toastService.trigger('Stock Out transaction completed successfully!', 'success');
		} else if (toastParam === 'adjustment_success') {
			toastService.trigger('Inventory adjustment applied successfully!', 'success');
		} else if (toastParam === 'damaged_success') {
			toastService.trigger('Damaged stock logged successfully!', 'success');
		} else if (toastParam === 'returns_success') {
			toastService.trigger('Returned stock logged successfully!', 'success');
		}
	});

	// Table columns definition (full, for admin/viewer)
	const columns = [
		{ id: 'image', header: 'Image' },
		{ accessorKey: 'sku', header: 'SKU' },
		{ accessorKey: 'barcode', header: 'Barcode' },
		{ accessorKey: 'product_name', header: 'Product Name' },
		{ accessorKey: 'category_name', header: 'Category' },
		{ accessorKey: 'quantity', header: 'In Stock' },
		{ id: 'status', header: 'Replenish Status' },
		{ accessorKey: 'updated_at', header: 'Last Updated' },
		{ id: 'actions', header: 'Actions' }
	];

	// TanStack table state reactivity
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let tableState: any = $state({
		columnPinning: { left: [], right: [] },
		columnVisibility: {},
		columnOrder: [],
		columnFilters: [],
		globalFilter: null,
		sorting: [],
		expanded: {},
		grouping: [],
		pagination: { pageIndex: 0, pageSize: 10 },
		rowSelection: {}
	});

	$effect(() => {
		tableState.pagination.pageIndex = data.page - 1;
		tableState.pagination.pageSize = data.limit;
	});

	let table = $derived(
		createTable({
			data: data.items as InventoryOverviewItem[],
			columns,
			getCoreRowModel: getCoreRowModel(),
			manualPagination: true,
			manualSorting: true,
			manualFiltering: true,
			state: tableState,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			onStateChange: (updater: any) => {
				if (typeof updater === 'function') {
					tableState = updater(tableState);
				} else {
					tableState = updater;
				}
			},
			renderFallbackValue: (val: unknown) => val
		})
	);

	function handleSearch(e: Event) {
		e.preventDefault();
		applyFilters();
	}

	function handleClearSearch() {
		searchQuery = '';
		applyFilters();
	}

	function applyFilters() {
		const params = new SvelteURLSearchParams(page.url.searchParams);

		if (searchQuery.trim()) {
			params.set('q', searchQuery.trim());
		} else {
			params.delete('q');
		}

		if (categoryFilter && categoryFilter !== 'all') {
			params.set('categoryId', categoryFilter);
		} else {
			params.delete('categoryId');
		}

		if (statusFilter && statusFilter !== 'all') {
			params.set('status', statusFilter);
		} else {
			params.delete('status');
		}

		params.set('page', '1'); // Reset to page 1
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	function handleSort(columnId: string) {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		const currentSort = params.get('sortBy');
		const currentOrder = params.get('sortOrder');

		let newOrder = 'asc';
		if (currentSort === columnId) {
			newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
		} else if (columnId === 'updated_at') {
			newOrder = 'desc';
		}

		params.set('sortBy', columnId);
		params.set('sortOrder', newOrder);
		goto(`?${params.toString()}`);
	}

	function handlePageChange(newPage: number) {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('page', newPage.toString());
		goto(`?${params.toString()}`);
	}

	// Pagination parameters
	const totalCount = $derived(data.totalCount);
	const currentPage = $derived(data.page);
	const limit = $derived(data.limit);
	const totalPages = $derived(Math.ceil(totalCount / limit) || 1);
	const fromEntry = $derived(totalCount === 0 ? 0 : (currentPage - 1) * limit + 1);
	const toEntry = $derived(Math.min(currentPage * limit, totalCount));
</script>

<svelte:head>
	<title>Inventory - Inventra Inventory Management</title>
	<meta
		name="description"
		content="Monitor real-time warehouse quantities, track replenishment statuses, and perform transaction operations."
	/>
</svelte:head>

<!-- ═══════════════════════════════════════════════════════════════════════════
     INVENTORY MANAGER — Simplified Inventory View
     ═══════════════════════════════════════════════════════════════════════ -->
{#if isManager}
<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-black tracking-tight">Stock Management</h2>
			<p class="text-sm text-muted-foreground">
				View stock levels and quickly add or remove stock.
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button
				href="/inventory/stock-in"
				class="bg-emerald-600 text-white hover:bg-emerald-700 font-bold h-10 shrink-0 cursor-pointer shadow-sm"
			>
				<ArrowUpRight class="mr-1.5 h-4 w-4" />
				Add Stock
			</Button>
			<Button
				href="/inventory/stock-out"
				class="bg-rose-600 text-white hover:bg-rose-700 font-bold h-10 shrink-0 cursor-pointer shadow-sm"
			>
				<ArrowDownLeft class="mr-1.5 h-4 w-4" />
				Remove Stock
			</Button>
		</div>
	</div>

	<!-- Search bar (simplified — name only) -->
	<form
		onsubmit={handleSearch}
		class="flex items-center gap-2 bg-card/40 border border-border/40 p-4 rounded-xl backdrop-blur-sm"
	>
		<div class="relative flex-grow max-w-md">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				type="text"
				placeholder="Search by product name..."
				bind:value={searchQuery}
				class="pl-9 pr-9 h-11 w-full focus-visible:ring-primary/50 focus-visible:border-primary bg-background/50 border-border/60 text-base"
			/>
			{#if searchQuery}
				<button
					type="button"
					onclick={handleClearSearch}
					class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
					aria-label="Clear search"
				>
					<X class="h-4 w-4" />
				</button>
			{/if}
		</div>
		<Button type="submit" class="h-11 px-5 font-bold cursor-pointer">Search</Button>
		<div class="ml-auto text-xs font-semibold text-muted-foreground hidden sm:block">
			<span class="text-foreground text-sm font-bold bg-muted/50 px-2.5 py-1.5 rounded-lg border border-border/40">{totalCount}</span> items
		</div>
	</form>

	<!-- Simplified Inventory Table -->
	<div class="relative overflow-hidden rounded-xl border border-border/40 bg-card/65 backdrop-blur-md shadow-sm">
		{#if navigating && navigating.to}
			<div class="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
				<div class="flex flex-col items-center gap-2 rounded-xl bg-card border border-border/80 p-5 shadow-2xl">
					<Loader2 class="h-6 w-6 animate-spin text-primary" />
					<span class="text-xs font-bold text-muted-foreground">Loading...</span>
				</div>
			</div>
		{/if}

		<table class="w-full text-left border-collapse" aria-label="Inventory stock levels">
			<thead>
				<tr class="bg-muted/40 border-b border-border/40">
					<th class="p-4 text-sm font-bold text-foreground tracking-wide" scope="col">Product Name</th>
					<th class="p-4 text-sm font-bold text-foreground tracking-wide text-center" scope="col">In Stock</th>
					<th class="p-4 text-sm font-bold text-foreground tracking-wide" scope="col">Status</th>
					<th class="p-4 text-sm font-bold text-foreground tracking-wide text-right" scope="col">Quick Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-border/30">
				{#if data.items.length > 0}
					{#each data.items as item (item.product_id)}
						<tr class="hover:bg-muted/20 transition-colors">
							<!-- Product Name -->
							<td class="p-4">
								<span class="font-bold text-sm text-foreground">{item.product_name}</span>
							</td>
							<!-- In Stock count -->
							<td class="p-4 text-center">
								<span class="text-xl font-black {item.quantity === 0 ? 'text-destructive' : item.quantity <= data.lowStockThreshold ? 'text-amber-500' : 'text-foreground'}">
									{item.quantity}
								</span>
							</td>
							<!-- Status Badge -->
							<td class="p-4">
								{#if item.quantity === 0}
									<Badge class="bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 font-black text-xs uppercase tracking-wider">
										Out of Stock
									</Badge>
								{:else if item.quantity <= data.lowStockThreshold}
									<Badge class="bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/15 font-black text-xs uppercase tracking-wider">
										Low Stock
									</Badge>
								{:else}
									<Badge class="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/15 font-black text-xs uppercase tracking-wider">
										In Stock
									</Badge>
								{/if}
							</td>
							<!-- Quick Action Buttons (large targets for ease of use) -->
							<td class="p-4">
								<div class="flex justify-end gap-2">
									{#if item.status !== 'archived'}
										<a
											href="/inventory/stock-in?productId={item.product_id}"
											class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/10 border border-emerald-600/30 px-4 py-2 text-sm font-bold text-emerald-600 hover:bg-emerald-600/20 transition-colors"
											aria-label="Add stock for {item.product_name}"
										>
											<ArrowUpRight class="h-4 w-4" aria-hidden="true" />
											Add Stock
										</a>
										<a
											href="/inventory/stock-out?productId={item.product_id}"
											class="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/10 border border-rose-600/30 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-600/20 transition-colors"
											aria-label="Remove stock for {item.product_name}"
										>
											<ArrowDownLeft class="h-4 w-4" aria-hidden="true" />
											Remove
										</a>
									{:else}
										<span class="text-xs text-muted-foreground italic px-2">Archived</span>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan={4} class="h-56 text-center">
							<div class="flex flex-col items-center justify-center space-y-3">
								<div class="rounded-2xl bg-muted/40 p-4 border border-border/20 text-muted-foreground shadow-inner">
									<Package class="h-7 w-7 text-muted-foreground/80" />
								</div>
								<h3 class="text-base font-bold">No inventory items found</h3>
								<p class="text-xs text-muted-foreground max-w-xs leading-relaxed">
									Try searching for a different name.
								</p>
							</div>
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if totalCount > 0}
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border/40 pt-4 text-xs font-semibold text-muted-foreground">
			<div>
				Showing <span class="text-foreground font-bold">{fromEntry}</span> to
				<span class="text-foreground font-bold">{toEntry}</span>
				of <span class="text-foreground font-bold">{totalCount}</span> items
			</div>
			<div class="flex items-center gap-1.5 self-end sm:self-auto">
				<Button
					variant="outline"
					size="sm"
					onclick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage <= 1}
					class="h-9 font-bold border-border/60 hover:bg-muted cursor-pointer disabled:opacity-50"
				>
					Previous
				</Button>
				<div class="flex items-center gap-1">
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNum (pageNum)}
						{#if pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1}
							<Button
								variant={currentPage === pageNum ? 'default' : 'outline'}
								size="sm"
								onclick={() => handlePageChange(pageNum)}
								class="h-9 w-9 font-bold p-0 cursor-pointer {currentPage === pageNum
									? 'bg-primary text-primary-foreground border-primary shadow-sm'
									: 'border-border/60 hover:bg-muted'}"
							>
								{pageNum}
							</Button>
						{:else if pageNum === 2 || pageNum === totalPages - 1}
							<span class="text-muted-foreground/60 px-1 font-bold">...</span>
						{/if}
					{/each}
				</div>
				<Button
					variant="outline"
					size="sm"
					onclick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage >= totalPages}
					class="h-9 font-bold border-border/60 hover:bg-muted cursor-pointer disabled:opacity-50"
				>
					Next
				</Button>
			</div>
		</div>
	{/if}
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     ADMIN / VIEWER — Full Inventory View (unchanged)
     ═══════════════════════════════════════════════════════════════════════ -->
{:else}
<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-black tracking-tight">Warehouse Inventory</h2>
			<p class="text-sm text-muted-foreground">
				Monitor quantities, trigger replenishment alerts, and log stock actions.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				onclick={() => {
					goto('?refresh=' + Math.random());
					toastService.trigger('Inventory sync completed.', 'success');
				}}
				class="border-border/60 hover:bg-muted font-bold shrink-0 cursor-pointer text-xs h-9"
			>
				<RefreshCw class="mr-1.5 h-3.5 w-3.5" />
				Sync Warehouse
			</Button>

			<Button
				variant="outline"
				href="/inventory/transactions"
				class="border-border/60 hover:bg-muted font-bold shrink-0 cursor-pointer text-xs h-9"
			>
				Ledger History
			</Button>

			{#if !isViewer}
				<div class="flex gap-1.5">
					<Button
						href="/inventory/stock-in"
						class="bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs h-9 shrink-0 cursor-pointer shadow-sm"
					>
						<ArrowUpRight class="mr-1 h-3.5 w-3.5" />
						Stock In
					</Button>
					<Button
						href="/inventory/stock-out"
						class="bg-rose-600 text-white hover:bg-rose-700 font-bold text-xs h-9 shrink-0 cursor-pointer shadow-sm"
					>
						<ArrowDownLeft class="mr-1 h-3.5 w-3.5" />
						Stock Out
					</Button>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="secondary"
									class="border border-border/60 hover:bg-muted font-bold text-xs h-9 shrink-0 cursor-pointer"
								>
									More Actions
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="border-border/60 bg-card p-1">
							<DropdownMenu.Item class="rounded-lg hover:bg-muted cursor-pointer">
								<a
									href="/inventory/adjustment"
									class="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs font-semibold"
								>
									<SlidersHorizontal class="h-3.5 w-3.5 text-muted-foreground" />
									Adjustment
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Item class="rounded-lg hover:bg-muted cursor-pointer">
								<a
									href="/inventory/damaged"
									class="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-amber-500"
								>
									<AlertTriangle class="h-3.5 w-3.5 text-amber-500" />
									Damaged Items
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Item class="rounded-lg hover:bg-muted cursor-pointer">
								<a
									href="/inventory/returns"
									class="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-emerald-500"
								>
									<RotateCcw class="h-3.5 w-3.5 text-emerald-500" />
									Returns
								</a>
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{/if}
		</div>
	</div>

	<!-- Controls: Search & Filters -->
	<div
		class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-card/40 border border-border/40 p-4 rounded-xl backdrop-blur-sm space-y-3 lg:space-y-0"
	>
		<form
			onsubmit={handleSearch}
			class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:max-w-xl"
		>
			<!-- Search input -->
			<div class="relative flex-grow">
				<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Search SKU, barcode, product name..."
					bind:value={searchQuery}
					class="pl-9 pr-9 h-10 w-full focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 bg-background/50 border-border/60"
				/>
				{#if searchQuery}
					<button
						type="button"
						onclick={handleClearSearch}
						class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
						aria-label="Clear search"
					>
						<X class="h-4 w-4" />
					</button>
				{/if}
			</div>

			<!-- Filter Selects -->
			<div class="flex gap-2 shrink-0">
				<!-- Category Filter -->
				<select
					bind:value={categoryFilter}
					onchange={applyFilters}
					class="h-10 px-3 rounded-xl border border-border/60 bg-background/50 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 max-w-[150px]"
				>
					<option value="all">All Categories</option>
					{#each data.categories as cat (cat.id)}
						<option value={cat.id}>{cat.name}</option>
					{/each}
				</select>

				<!-- Status Filter -->
				<select
					bind:value={statusFilter}
					onchange={applyFilters}
					class="h-10 px-3 rounded-xl border border-border/60 bg-background/50 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
				>
					<option value="all">All Statuses</option>
					<option value="active">Active Products</option>
					<option value="inactive">Inactive Products</option>
					<option value="archived">Archived Products</option>
				</select>

				<Button
					type="submit"
					variant="secondary"
					class="h-10 px-4 font-bold cursor-pointer border border-border/60 shrink-0"
				>
					Search
				</Button>
			</div>
		</form>

		<div class="text-xs font-semibold text-muted-foreground self-start lg:self-center shrink-0">
			Total Records: <span
				class="text-foreground text-sm font-bold bg-muted/50 px-2.5 py-1 rounded-lg border border-border/40"
				>{totalCount}</span
			>
		</div>
	</div>

	<!-- Inventory Table Container -->
	<div
		class="relative overflow-hidden rounded-xl border border-border/40 bg-card/65 backdrop-blur-md shadow-sm"
	>
		<!-- Navigation Page loading indicator overlay -->
		{#if navigating && navigating.to}
			<div
				class="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px] transition-opacity duration-300"
			>
				<div
					class="flex flex-col items-center gap-2 rounded-xl bg-card border border-border/80 p-5 shadow-2xl"
				>
					<Loader2 class="h-6 w-6 animate-spin text-primary" />
					<span class="text-xs font-bold text-muted-foreground">Loading fresh data...</span>
				</div>
			</div>
		{/if}

		<Table.Root>
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<Table.Row class="hover:bg-transparent bg-muted/40 border-b border-border/40">
						{#each headerGroup.headers as header (header.id)}
							<Table.Head class="font-bold text-foreground py-3">
								{#if ['name', 'sku', 'quantity', 'updated_at'].includes(header.column.id)}
									<button
										type="button"
										onclick={() => handleSort(header.column.id)}
										class="flex items-center gap-1.5 hover:text-foreground font-bold tracking-wide cursor-pointer transition-colors"
										aria-label="Sort by {header.column.columnDef.header}"
									>
										<span>{header.column.columnDef.header}</span>
										{#if data.sortBy === header.column.id}
											{#if data.sortOrder === 'asc'}
												<ChevronUp class="h-4 w-4 text-primary" />
											{:else}
												<ChevronDown class="h-4 w-4 text-primary" />
											{/if}
										{:else}
											<ChevronsUpDown class="h-3.5 w-3.5 text-muted-foreground/40" />
										{/if}
									</button>
								{:else}
									{header.column.columnDef.header}
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>
			<Table.Body>
				{#if data.items.length > 0}
					{#each table.getRowModel().rows as row (row.original.product_id)}
						<Table.Row class="hover:bg-muted/30 border-b border-border/30 transition-colors">
							{#each row.getVisibleCells() as cell (cell.id)}
								<Table.Cell class="py-3">
									<!-- Custom cell renderers based on column ID -->
									{#if cell.column.id === 'image'}
										<div
											class="flex h-10 w-10 items-center justify-center rounded-lg border border-border/40 bg-muted/40 overflow-hidden shrink-0"
										>
											{#if row.original.image_url}
												<img
													src={row.original.image_url}
													alt={row.original.product_name}
													class="h-full w-full object-cover"
													onerror={(e) => {
														(e.currentTarget as HTMLImageElement).style.display = 'none';
													}}
												/>
											{:else}
												<Package class="h-4 w-4 text-muted-foreground/85" />
											{/if}
										</div>
									{:else if cell.column.id === 'sku'}
										<span class="font-mono text-xs font-bold text-muted-foreground select-all"
											>{cell.getValue()}</span
										>
									{:else if cell.column.id === 'barcode'}
										<span class="font-mono text-xs text-muted-foreground"
											>{cell.getValue() || '—'}</span
										>
									{:else if cell.column.id === 'product_name'}
										<a
											href="/inventory/{row.original.product_id}"
											class="font-bold text-foreground hover:text-emerald-500 hover:underline block tracking-wide text-xs"
										>
											{cell.getValue()}
										</a>
									{:else if cell.column.id === 'category_name'}
										<span class="text-muted-foreground text-xs font-semibold"
											>{cell.getValue() || '—'}</span
										>
									{:else if cell.column.id === 'quantity'}
										<span class="font-black text-sm text-foreground">{cell.getValue()}</span>
									{:else if cell.column.id === 'status'}
										{#if row.original.quantity === 0}
											<Badge
												class="bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 font-black text-[10px] uppercase tracking-wider"
											>
												Out of Stock
											</Badge>
										{:else if row.original.quantity <= data.lowStockThreshold}
											<Badge
												class="bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/15 font-black text-[10px] uppercase tracking-wider"
											>
												Low Stock
											</Badge>
										{:else}
											<Badge
												class="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/15 font-black text-[10px] uppercase tracking-wider"
											>
												In Stock
											</Badge>
										{/if}

										{#if row.original.status === 'archived'}
											<Badge
												class="ml-1 bg-muted text-muted-foreground border border-border text-[9px] uppercase font-bold"
											>
												Archived
											</Badge>
										{/if}
									{:else if cell.column.id === 'updated_at'}
										<span class="text-muted-foreground font-mono text-xs block">
											{new Date(cell.getValue() as string).toLocaleString(undefined, {
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit'
											})}
										</span>
									{:else if cell.column.id === 'actions'}
										<DropdownMenu.Root>
											<DropdownMenu.Trigger>
												{#snippet child({ props })}
													<Button
														{...props}
														variant="ghost"
														size="icon"
														class="h-8 w-8 p-0 hover:bg-muted cursor-pointer"
													>
														<MoreHorizontal class="h-4 w-4" />
														<span class="sr-only">Open menu</span>
													</Button>
												{/snippet}
											</DropdownMenu.Trigger>
											<DropdownMenu.Content align="end" class="border-border/60 bg-card p-1">
												<DropdownMenu.Item
													class="rounded-lg hover:bg-muted focus:bg-muted cursor-pointer p-0 text-foreground"
												>
													<a
														href="/inventory/{row.original.product_id}"
														class="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold"
													>
														<Eye class="h-4 w-4 text-muted-foreground" />
														View Movements
													</a>
												</DropdownMenu.Item>

												{#if !isViewer && row.original.status !== 'archived'}
													<DropdownMenu.Separator class="bg-border/50 my-1" />
													<DropdownMenu.Item class="rounded-lg hover:bg-muted cursor-pointer p-0">
														<a
															href="/inventory/stock-in?productId={row.original.product_id}"
															class="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-500"
														>
															<ArrowUpRight class="h-4 w-4 text-emerald-500" />
															Stock In
														</a>
													</DropdownMenu.Item>
													<DropdownMenu.Item class="rounded-lg hover:bg-muted cursor-pointer p-0">
														<a
															href="/inventory/stock-out?productId={row.original.product_id}"
															class="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500"
														>
															<ArrowDownLeft class="h-4 w-4 text-rose-500" />
															Stock Out
														</a>
													</DropdownMenu.Item>
												{/if}
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									{/if}
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				{:else}
					<Table.Row>
						<Table.Cell colspan={9} class="h-56 text-center">
							<div class="flex flex-col items-center justify-center space-y-3">
								<div
									class="rounded-2xl bg-muted/40 p-4 border border-border/20 text-muted-foreground shadow-inner"
								>
									<Package class="h-7 w-7 text-muted-foreground/80" />
								</div>
								<h3 class="text-base font-bold">No inventory items found</h3>
								<p class="text-xs text-muted-foreground max-w-xs leading-relaxed">
									No results found matching your filters. Reset search queries or try category
									filters.
								</p>
							</div>
						</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- Pagination Footer -->
	{#if totalCount > 0}
		<div
			class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border/40 pt-4 text-xs font-semibold text-muted-foreground"
		>
			<div>
				Showing <span class="text-foreground font-bold">{fromEntry}</span> to
				<span class="text-foreground font-bold">{toEntry}</span>
				of <span class="text-foreground font-bold">{totalCount}</span> items
			</div>

			<div class="flex items-center gap-1.5 self-end sm:self-auto">
				<Button
					variant="outline"
					size="sm"
					onclick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage <= 1}
					class="h-8 font-bold border-border/60 hover:bg-muted cursor-pointer active:scale-95 disabled:scale-100 disabled:opacity-50"
				>
					Previous
				</Button>

				<div class="flex items-center gap-1">
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNum (pageNum)}
						{#if pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1}
							<Button
								variant={currentPage === pageNum ? 'default' : 'outline'}
								size="sm"
								onclick={() => handlePageChange(pageNum)}
								class="h-8 w-8 font-bold p-0 cursor-pointer {currentPage === pageNum
									? 'bg-primary text-primary-foreground border-primary shadow-sm'
									: 'border-border/60 hover:bg-muted'}"
							>
								{pageNum}
							</Button>
						{:else if pageNum === 2 || pageNum === totalPages - 1}
							<span class="text-muted-foreground/60 px-1 font-bold">...</span>
						{/if}
					{/each}
				</div>

				<Button
					variant="outline"
					size="sm"
					onclick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage >= totalPages}
					class="h-8 font-bold border-border/60 hover:bg-muted cursor-pointer active:scale-95 disabled:scale-100 disabled:opacity-50"
				>
					Next
				</Button>
			</div>
		</div>
	{/if}
</div>
{/if}
