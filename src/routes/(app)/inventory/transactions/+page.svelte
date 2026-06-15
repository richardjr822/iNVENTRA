<script lang="ts">
	import { page, navigating } from '$app/state';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { createTable, getCoreRowModel } from '@tanstack/table-core';
	import type { InventoryTransaction } from '$lib/types/inventory';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import {
		Search,
		Loader2,
		ChevronUp,
		ChevronDown,
		ChevronsUpDown,
		Package,
		X,
		ArrowLeft,
		Calendar
	} from '@lucide/svelte';

	let { data } = $props();

	// Filter state
	let searchQuery = $state('');
	let typeFilter = $state('all');
	let productFilter = $state('all');
	let userFilter = $state('all');
	let startDateFilter = $state('');
	let endDateFilter = $state('');

	// Sync local filters with URL parameters
	$effect(() => {
		searchQuery = data.search;
		typeFilter = data.transactionType;
		productFilter = data.productId;
		userFilter = data.userId;
		startDateFilter = data.startDate;
		endDateFilter = data.endDate;
	});

	// Columns definition
	const columns = [
		{ accessorKey: 'created_at', header: 'Date & Time' },
		{ accessorKey: 'product_name', header: 'Product' },
		{ accessorKey: 'product_sku', header: 'SKU' },
		{ accessorKey: 'transaction_type', header: 'Type' },
		{ accessorKey: 'quantity', header: 'Quantity' },
		{ accessorKey: 'remarks', header: 'Remarks / Reason' },
		{ accessorKey: 'user_full_name', header: 'Performed By' }
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
			data: data.transactions as InventoryTransaction[],
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

	function handleClearFilters() {
		searchQuery = '';
		typeFilter = 'all';
		productFilter = 'all';
		userFilter = 'all';
		startDateFilter = '';
		endDateFilter = '';

		const params = new SvelteURLSearchParams();
		params.set('page', '1');
		goto(`?${params.toString()}`);
	}

	function applyFilters() {
		const params = new SvelteURLSearchParams(page.url.searchParams);

		if (searchQuery.trim()) {
			params.set('q', searchQuery.trim());
		} else {
			params.delete('q');
		}

		if (typeFilter && typeFilter !== 'all') {
			params.set('type', typeFilter);
		} else {
			params.delete('type');
		}

		if (productFilter && productFilter !== 'all') {
			params.set('productId', productFilter);
		} else {
			params.delete('productId');
		}

		if (userFilter && userFilter !== 'all') {
			params.set('userId', userFilter);
		} else {
			params.delete('userId');
		}

		if (startDateFilter) {
			params.set('startDate', startDateFilter);
		} else {
			params.delete('startDate');
		}

		if (endDateFilter) {
			params.set('endDate', endDateFilter);
		} else {
			params.delete('endDate');
		}

		params.set('page', '1'); // Reset to page 1
		goto(`?${params.toString()}`);
	}

	function handleSort(columnId: string) {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		const currentSort = params.get('sortBy');
		const currentOrder = params.get('sortOrder');

		let newOrder = 'asc';
		if (currentSort === columnId) {
			newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
		} else if (columnId === 'created_at') {
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

	// Pagination variables
	const totalCount = $derived(data.totalCount);
	const currentPage = $derived(data.page);
	const limit = $derived(data.limit);
	const totalPages = $derived(Math.ceil(totalCount / limit) || 1);
	const fromEntry = $derived(totalCount === 0 ? 0 : (currentPage - 1) * limit + 1);
	const toEntry = $derived(Math.min(currentPage * limit, totalCount));
</script>

<svelte:head>
	<title>Transaction History - Inventra Inventory Management</title>
	<meta
		name="description"
		content="View historical logs of all inventory dispatches, adjustments, and updates."
	/>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-1">
			<div class="flex items-center gap-2">
				<a
					href="/inventory"
					class="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
				>
					<ArrowLeft class="h-3.5 w-3.5" />
					Back to Inventory
				</a>
			</div>
			<h2 class="text-2xl font-black tracking-tight">Stock Movements Ledger</h2>
			<p class="text-sm text-muted-foreground">
				Chronological history of all stock movements, write-offs, and adjustments.
			</p>
		</div>
	</div>

	<!-- Filters & Search Panel -->
	<div
		class="bg-card/45 border border-border/40 p-5 rounded-xl backdrop-blur-sm space-y-4 shadow-sm"
	>
		<form onsubmit={handleSearch} class="space-y-4">
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
				<!-- Search -->
				<div class="space-y-1.5 col-span-1 md:col-span-2">
					<Label for="q" class="text-xs font-bold tracking-wide text-muted-foreground"
						>Search Text</Label
					>
					<div class="relative">
						<Search
							class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
						/>
						<Input
							id="q"
							type="text"
							placeholder="Search product, SKU, remarks..."
							bind:value={searchQuery}
							class="pl-9 pr-9 h-9 text-xs focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 bg-background/50 border-border/60"
						/>
						{#if searchQuery}
							<button
								type="button"
								onclick={() => (searchQuery = '')}
								class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
								aria-label="Clear search"
							>
								<X class="h-3.5 w-3.5" />
							</button>
						{/if}
					</div>
				</div>

				<!-- Transaction Type -->
				<div class="space-y-1.5">
					<Label for="type" class="text-xs font-bold tracking-wide text-muted-foreground"
						>Movement Type</Label
					>
					<select
						id="type"
						bind:value={typeFilter}
						class="flex h-9 w-full rounded-xl border border-border/60 bg-background/50 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
					>
						<option value="all">All Types</option>
						<option value="STOCK_IN">STOCK_IN (+)</option>
						<option value="STOCK_OUT">STOCK_OUT (-)</option>
						<option value="ADJUSTMENT">ADJUSTMENT (+/-)</option>
						<option value="DAMAGED">DAMAGED (-)</option>
						<option value="RETURN">RETURN (+)</option>
					</select>
				</div>

				<!-- User filter -->
				<div class="space-y-1.5">
					<Label for="userId" class="text-xs font-bold tracking-wide text-muted-foreground"
						>Performed By</Label
					>
					<select
						id="userId"
						bind:value={userFilter}
						class="flex h-9 w-full rounded-xl border border-border/60 bg-background/50 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
					>
						<option value="all">All Users</option>
						{#each data.users as u (u.id)}
							<option value={u.id}>{u.fullName}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-border/10">
				<!-- Product filter -->
				<div class="space-y-1.5">
					<Label for="productId" class="text-xs font-bold tracking-wide text-muted-foreground"
						>Product Filter</Label
					>
					<select
						id="productId"
						bind:value={productFilter}
						class="flex h-9 w-full rounded-xl border border-border/60 bg-background/50 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
					>
						<option value="all">All Products</option>
						{#each data.products as prod (prod.id)}
							<option value={prod.id}>{prod.name} ({prod.sku})</option>
						{/each}
					</select>
				</div>

				<!-- Date range start -->
				<div class="space-y-1.5">
					<Label for="startDate" class="text-xs font-bold tracking-wide text-muted-foreground"
						>Start Date</Label
					>
					<div class="relative">
						<Calendar
							class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
						/>
						<Input
							id="startDate"
							type="date"
							bind:value={startDateFilter}
							class="pl-9 h-9 text-xs focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 bg-background/50 border-border/60"
						/>
					</div>
				</div>

				<!-- Date range end -->
				<div class="space-y-1.5">
					<Label for="endDate" class="text-xs font-bold tracking-wide text-muted-foreground"
						>End Date</Label
					>
					<div class="relative">
						<Calendar
							class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
						/>
						<Input
							id="endDate"
							type="date"
							bind:value={endDateFilter}
							class="pl-9 h-9 text-xs focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 bg-background/50 border-border/60"
						/>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-2 pt-2">
				<Button
					type="button"
					variant="outline"
					onclick={handleClearFilters}
					class="h-9 font-bold border-border/60 hover:bg-muted text-xs cursor-pointer"
				>
					Clear Filters
				</Button>
				<Button
					type="submit"
					class="h-9 font-bold bg-primary text-primary-foreground text-xs cursor-pointer"
				>
					Apply Filters
				</Button>
			</div>
		</form>
	</div>

	<!-- Ledger table -->
	<div
		class="relative overflow-hidden rounded-xl border border-border/40 bg-card/65 backdrop-blur-md shadow-sm"
	>
		<!-- Loading state overlay -->
		{#if navigating && navigating.to}
			<div
				class="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px] transition-opacity duration-300"
			>
				<div
					class="flex flex-col items-center gap-2 rounded-xl bg-card border border-border/80 p-5 shadow-2xl"
				>
					<Loader2 class="h-6 w-6 animate-spin text-primary" />
					<span class="text-xs font-bold text-muted-foreground">Loading ledger data...</span>
				</div>
			</div>
		{/if}

		<Table.Root>
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<Table.Row class="hover:bg-transparent bg-muted/40 border-b border-border/40">
						{#each headerGroup.headers as header (header.id)}
							<Table.Head class="font-bold text-foreground py-3">
								{#if ['created_at', 'quantity', 'product_name', 'transaction_type'].includes(header.column.id)}
									<button
										type="button"
										onclick={() => handleSort(header.column.id)}
										class="flex items-center gap-1.5 hover:text-foreground font-bold tracking-wide cursor-pointer transition-colors text-xs"
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
									<span class="text-xs">{header.column.columnDef.header}</span>
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>
			<Table.Body>
				{#if data.transactions.length > 0}
					{#each table.getRowModel().rows as row (row.original.id)}
						<Table.Row class="hover:bg-muted/30 border-b border-border/30 transition-colors">
							{#each row.getVisibleCells() as cell (cell.id)}
								<Table.Cell class="py-3 text-xs">
									<!-- Date Cell -->
									{#if cell.column.id === 'created_at'}
										<span class="font-mono text-muted-foreground">
											{new Date(cell.getValue() as string).toLocaleString(undefined, {
												year: 'numeric',
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit'
											})}
										</span>
										<!-- Product Cell -->
									{:else if cell.column.id === 'product_name'}
										<a
											href="/inventory/{row.original.product_id}"
											class="font-bold text-foreground hover:text-emerald-500 hover:underline block"
										>
											{cell.getValue()}
										</a>
										<!-- SKU Cell -->
									{:else if cell.column.id === 'product_sku'}
										<span class="font-mono text-muted-foreground">{cell.getValue()}</span>
										<!-- Transaction Type Cell -->
									{:else if cell.column.id === 'transaction_type'}
										{#if cell.getValue() === 'STOCK_IN'}
											<Badge
												class="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/15 font-bold text-[9px] tracking-wide py-0.5 uppercase"
											>
												STOCK IN
											</Badge>
										{:else if cell.getValue() === 'STOCK_OUT'}
											<Badge
												class="bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/15 font-bold text-[9px] tracking-wide py-0.5 uppercase"
											>
												STOCK OUT
											</Badge>
										{:else if cell.getValue() === 'ADJUSTMENT'}
											<Badge
												class="bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/15 font-bold text-[9px] tracking-wide py-0.5 uppercase"
											>
												ADJUSTMENT
											</Badge>
										{:else if cell.getValue() === 'DAMAGED'}
											<Badge
												class="bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/15 font-bold text-[9px] tracking-wide py-0.5 uppercase"
											>
												DAMAGED
											</Badge>
										{:else if cell.getValue() === 'RETURN'}
											<Badge
												class="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/15 font-bold text-[9px] tracking-wide py-0.5 uppercase"
											>
												RETURN
											</Badge>
										{/if}
										<!-- Quantity Cell -->
									{:else if cell.column.id === 'quantity'}
										<span
											class="font-black"
											class:text-emerald-500={Number(cell.getValue()) > 0}
											class:text-rose-500={Number(cell.getValue()) < 0}
											class:text-foreground={Number(cell.getValue()) === 0}
										>
											{#if Number(cell.getValue()) > 0}
												+{cell.getValue()}
											{:else}
												{cell.getValue()}
											{/if}
										</span>
										<!-- Remarks Cell -->
									{:else if cell.column.id === 'remarks'}
										<span
											class="text-muted-foreground italic max-w-xs block truncate"
											title={(cell.getValue() as string) || ''}
										>
											{cell.getValue() || '—'}
										</span>
										<!-- User Cell -->
									{:else if cell.column.id === 'user_full_name'}
										<span class="font-bold text-foreground">@{cell.getValue() || 'system'}</span>
									{:else}
										{cell.getValue()}
									{/if}
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				{:else}
					<Table.Row>
						<Table.Cell colspan={7} class="h-56 text-center">
							<div class="flex flex-col items-center justify-center space-y-3">
								<div
									class="rounded-2xl bg-muted/40 p-4 border border-border/20 text-muted-foreground shadow-inner"
								>
									<Package class="h-7 w-7 text-muted-foreground/80" />
								</div>
								<h3 class="text-base font-bold">No ledger logs found</h3>
								<p class="text-xs text-muted-foreground max-w-xs leading-relaxed">
									No stock transactions match your current query or filters. Reset filters to
									refresh.
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
				of <span class="text-foreground font-bold">{totalCount}</span> movements
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
