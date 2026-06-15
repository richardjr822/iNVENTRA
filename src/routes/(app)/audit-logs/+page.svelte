<script lang="ts">
	import { page, navigating } from '$app/state';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { createTable, getCoreRowModel } from '@tanstack/table-core';
	import type { AuditLogWithUser } from '$lib/types/audit-log';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Search,
		MoreHorizontal,
		Eye,
		Loader2,
		ShieldAlert,
		X,
		CalendarRange,
		ArrowRight,
		FileText
	} from '@lucide/svelte';

	let { data } = $props();

	// Search & Filter local states
	let searchQuery = $state('');
	let userFilter = $state('all');
	let actionFilter = $state('all');
	let startDate = $state('');
	let endDate = $state('');

	// Sync local states with URL changes
	$effect(() => {
		searchQuery = data.search;
		userFilter = data.userId;
		actionFilter = data.action;
		startDate = data.startDate;
		endDate = data.endDate;
	});

	// Details Dialog state
	let isDetailsOpen = $state(false);
	let selectedLog = $state<AuditLogWithUser | null>(null);

	// Table columns structure definition
	const columns = [
		{ accessorKey: 'created_at', header: 'Timestamp' },
		{ id: 'user', header: 'User' },
		{ accessorKey: 'action', header: 'Action' },
		{ accessorKey: 'entity', header: 'Entity' },
		{ accessorKey: 'entity_id', header: 'Entity ID' },
		{ id: 'actions', header: 'Actions' }
	];

	let tableState: any = $state({
		columnPinning: { left: [], right: [] },
		columnVisibility: {},
		columnOrder: [],
		columnFilters: [],
		globalFilter: null,
		sorting: [],
		expanded: {},
		grouping: [],
		pagination: { pageIndex: 0, pageSize: 15 },
		rowSelection: {}
	});

	$effect(() => {
		tableState.pagination.pageIndex = data.page - 1;
		tableState.pagination.pageSize = data.limit;
	});

	let table = $derived(
		createTable({
			data: data.logs as AuditLogWithUser[],
			columns,
			getCoreRowModel: getCoreRowModel(),
			manualPagination: true,
			state: tableState,
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

	// Event Handlers
	function handleSearch(e: Event) {
		e.preventDefault();
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (searchQuery.trim()) {
			params.set('q', searchQuery.trim());
		} else {
			params.delete('q');
		}
		params.set('page', '1');
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	function handleClearSearch() {
		searchQuery = '';
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.delete('q');
		params.set('page', '1');
		goto(`?${params.toString()}`);
	}

	function handleFilterChange(key: 'userId' | 'action' | 'startDate' | 'endDate', value: string) {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (value) {
			params.set(key, value);
		} else {
			params.delete(key);
		}
		params.set('page', '1');
		goto(`?${params.toString()}`);
	}

	function handleClearAllFilters() {
		searchQuery = '';
		userFilter = 'all';
		actionFilter = 'all';
		startDate = '';
		endDate = '';
		goto('?');
	}

	function handlePageChange(newPage: number) {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('page', newPage.toString());
		goto(`?${params.toString()}`);
	}

	function openDetailsDialog(log: AuditLogWithUser) {
		selectedLog = log;
		isDetailsOpen = true;
	}

	// Pagination variables
	const totalCount = $derived(data.totalCount);
	const currentPage = $derived(data.page);
	const limit = $derived(data.limit);
	const totalPages = $derived(Math.ceil(totalCount / limit) || 1);
	const fromEntry = $derived(totalCount === 0 ? 0 : (currentPage - 1) * limit + 1);
	const toEntry = $derived(Math.min(currentPage * limit, totalCount));

	// Action formatting
	function formatAction(action: string) {
		if (action === 'STOCK_IN') return 'Stock In';
		if (action === 'STOCK_OUT') return 'Stock Out';
		if (action === 'ADJUSTMENT') return 'Adjustment';
		if (action === 'DAMAGED') return 'Damaged';
		if (action === 'RETURN') return 'Return';
		return action;
	}

	function getActionBadgeVariant(action: string) {
		const formatted = formatAction(action).toLowerCase();
		if (formatted.includes('create') || formatted.includes('in') || formatted.includes('return')) return 'outline';
		if (formatted.includes('delete') || formatted.includes('damaged')) return 'destructive';
		if (formatted.includes('update') || formatted.includes('adjustment') || formatted.includes('reset')) return 'default';
		return 'secondary';
	}
</script>

<svelte:head>
	<title>Audit Logs - Inventra Admin</title>
	<meta name="description" content="Review historical records, product catalog updates, stock events, user resets, and login activities." />
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-black tracking-tight">Audit Logs</h2>
			<p class="text-sm text-muted-foreground">Monitor system-wide activity, account configurations, and inventory movements.</p>
		</div>
	</div>

	<!-- Controls: Search & Multi-filters -->
	<div
		class="flex flex-col gap-4 bg-card/40 border border-border/40 p-4 rounded-xl backdrop-blur-sm"
	>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 items-end">
			<!-- Search bar -->
			<div class="space-y-1.5 lg:col-span-2">
				<span class="text-xs font-bold text-muted-foreground">Search keywords:</span>
				<form onsubmit={handleSearch} class="flex items-center gap-2 w-full">
					<div class="relative w-full">
						<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Search by action or entity..."
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
					<Button
						type="submit"
						variant="secondary"
						class="h-10 px-4 font-bold cursor-pointer border border-border/60 shrink-0"
					>
						Search
					</Button>
				</form>
			</div>

			<!-- Filter by User -->
			<div class="space-y-1.5">
				<span class="text-xs font-bold text-muted-foreground">User:</span>
				<select
					bind:value={userFilter}
					onchange={() => handleFilterChange('userId', userFilter)}
					class="w-full h-10 rounded-lg border border-border/60 bg-background/50 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 cursor-pointer font-medium text-foreground transition-all duration-150"
				>
					<option value="all">All Users</option>
					{#each data.usersList as user (user.id)}
						<option value={user.id}>{user.fullName} ({user.username})</option>
					{/each}
				</select>
			</div>

			<!-- Filter by Action -->
			<div class="space-y-1.5">
				<span class="text-xs font-bold text-muted-foreground">Action:</span>
				<select
					bind:value={actionFilter}
					onchange={() => handleFilterChange('action', actionFilter)}
					class="w-full h-10 rounded-lg border border-border/60 bg-background/50 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 cursor-pointer font-medium text-foreground transition-all duration-150"
				>
					<option value="all">All Actions</option>
					<optgroup label="Authentication">
						<option value="Login">Login</option>
						<option value="Logout">Logout</option>
					</optgroup>
					<optgroup label="Products">
						<option value="Create Product">Create Product</option>
						<option value="Update Product">Update Product</option>
						<option value="Archive Product">Archive Product</option>
					</optgroup>
					<optgroup label="Categories">
						<option value="Create Category">Create Category</option>
						<option value="Update Category">Update Category</option>
						<option value="Delete Category">Delete Category</option>
					</optgroup>
					<optgroup label="Inventory Movements">
						<option value="STOCK_IN">Stock In</option>
						<option value="STOCK_OUT">Stock Out</option>
						<option value="ADJUSTMENT">Adjustment</option>
						<option value="DAMAGED">Damaged</option>
						<option value="RETURN">Return</option>
					</optgroup>
					<optgroup label="Users Management">
						<option value="Create User">Create User</option>
						<option value="Update User">Update User</option>
						<option value="Activate User">Activate User</option>
						<option value="Deactivate User">Deactivate User</option>
						<option value="Reset Password">Reset Password</option>
					</optgroup>
				</select>
			</div>

			<!-- Date Range Filters -->
			<div class="space-y-1.5">
				<span class="text-xs font-bold text-muted-foreground">Date range:</span>
				<div class="flex items-center gap-1.5">
					<Input
						type="date"
						bind:value={startDate}
						onchange={() => handleFilterChange('startDate', startDate)}
						class="h-10 text-xs focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 bg-background/50 border-border/60"
					/>
					<ArrowRight class="h-4 w-4 text-muted-foreground shrink-0" />
					<Input
						type="date"
						bind:value={endDate}
						onchange={() => handleFilterChange('endDate', endDate)}
						class="h-10 text-xs focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 bg-background/50 border-border/60"
					/>
				</div>
			</div>
		</div>

		<!-- Clear filter actions -->
		{#if data.search || data.userId !== 'all' || data.action !== 'all' || data.startDate || data.endDate}
			<div class="flex items-center justify-between border-t border-border/20 pt-3 text-xs">
				<span class="text-muted-foreground font-medium">Active filters are applied to the audit feed.</span>
				<Button
					variant="ghost"
					size="sm"
					onclick={handleClearAllFilters}
					class="h-7 text-xs font-bold cursor-pointer text-destructive hover:bg-destructive/10"
				>
					Clear All Filters
				</Button>
			</div>
		{/if}
	</div>

	<!-- Audit Logs Table -->
	<div
		class="relative overflow-hidden rounded-xl border border-border/40 bg-card/65 backdrop-blur-md shadow-sm"
	>
		<!-- Navigation Overlay -->
		{#if navigating && navigating.to}
			<div
				class="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px] transition-opacity duration-300"
			>
				<div
					class="flex flex-col items-center gap-2 rounded-xl bg-card border border-border/80 p-5 shadow-2xl"
				>
					<Loader2 class="h-6 w-6 animate-spin text-primary" />
					<span class="text-xs font-bold text-muted-foreground">Syncing audit logs...</span>
				</div>
			</div>
		{/if}

		<Table.Root>
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<Table.Row class="hover:bg-transparent bg-muted/40 border-b border-border/40">
						{#each headerGroup.headers as header (header.id)}
							<Table.Head class="font-bold text-foreground py-3">
								{header.column.columnDef.header}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>

			<Table.Body>
				{#if data.logs.length > 0}
					{#each table.getRowModel().rows as row (row.original.id)}
						<Table.Row
							onclick={() => openDetailsDialog(row.original)}
							class="hover:bg-muted/30 border-b border-border/30 transition-colors cursor-pointer"
						>
							{#each row.getVisibleCells() as cell (cell.id)}
								<Table.Cell class="py-3">
									{#if cell.column.id === 'created_at'}
										<span class="text-muted-foreground font-mono text-xs block whitespace-nowrap">
											{new Date(cell.getValue() as string).toLocaleString(undefined, {
												year: 'numeric',
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit',
												second: '2-digit'
											})}
										</span>
									{:else if cell.column.id === 'user'}
										{#if row.original.users}
											<div class="flex flex-col">
												<span class="text-foreground text-sm font-semibold">{row.original.users.full_name}</span>
												<span class="text-muted-foreground text-[10px] font-mono">@{row.original.users.username}</span>
											</div>
										{:else}
											<span class="text-muted-foreground text-xs italic">System / Anonymous</span>
										{/if}
									{:else if cell.column.id === 'action'}
										<Badge variant={getActionBadgeVariant(cell.getValue() as string)} class="font-bold tracking-wide">
											{formatAction(cell.getValue() as string)}
										</Badge>
									{:else if cell.column.id === 'entity'}
										<span class="text-foreground text-xs font-mono capitalize">{cell.getValue() || '—'}</span>
									{:else if cell.column.id === 'entity_id'}
										<span class="text-muted-foreground font-mono text-[10px] block max-w-[120px] truncate" title={cell.getValue() as string}>
											{cell.getValue() || '—'}
										</span>
									{:else if cell.column.id === 'actions'}
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 p-0 hover:bg-muted cursor-pointer"
											onclick={(e) => {
												e.stopPropagation();
												openDetailsDialog(row.original);
											}}
										>
											<Eye class="h-4 w-4 text-muted-foreground" />
											<span class="sr-only">View Details</span>
										</Button>
									{/if}
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="h-56 text-center">
							<div class="flex flex-col items-center justify-center space-y-3">
								<div
									class="rounded-2xl bg-muted/40 p-4 border border-border/20 text-muted-foreground shadow-inner"
								>
									<ShieldAlert class="h-7 w-7 text-muted-foreground/80" />
								</div>
								<h3 class="text-base font-bold">No logs matched</h3>
								<p class="text-xs text-muted-foreground max-w-xs leading-relaxed">
									No operations recorded matching your current query combination. Adjust dates or criteria.
								</p>
								{#if data.search || data.userId !== 'all' || data.action !== 'all' || data.startDate || data.endDate}
									<Button
										onclick={handleClearAllFilters}
										size="sm"
										variant="outline"
										class="font-bold border-border/60 hover:bg-muted cursor-pointer"
									>
										Clear All Filters
									</Button>
								{/if}
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
				of <span class="text-foreground font-bold">{totalCount}</span> entries
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

<!-- Audit Details Modal -->
<Dialog.Root bind:open={isDetailsOpen}>
	<Dialog.Content class="sm:max-w-[650px] border-border/50 bg-card p-6 shadow-2xl backdrop-blur-xl">
		<Dialog.Header>
			<Dialog.Title class="text-xl font-bold tracking-tight flex items-center gap-2">
				<FileText class="h-5 w-5 text-primary" />
				Audit Transaction Details
			</Dialog.Title>
			<Dialog.Description class="text-sm">
				Granular system metadata for the selected operation.
			</Dialog.Description>
		</Dialog.Header>

		{#if selectedLog}
			<div class="space-y-4 py-3 text-sm max-h-[75vh] overflow-y-auto pr-1">
				<!-- Core metadata metadata layout -->
				<div class="grid grid-cols-2 gap-4 border-b border-border/40 pb-4">
					<div>
						<span class="text-xs font-bold text-muted-foreground block">Action Type</span>
						<Badge variant={getActionBadgeVariant(selectedLog.action)} class="font-bold mt-1">
							{formatAction(selectedLog.action)}
						</Badge>
					</div>
					<div>
						<span class="text-xs font-bold text-muted-foreground block">Executed By</span>
						{#if selectedLog.users}
							<span class="text-foreground text-sm font-semibold block mt-0.5">
								{selectedLog.users.full_name} (@{selectedLog.users.username})
							</span>
						{:else}
							<span class="text-muted-foreground text-xs italic block mt-0.5">System</span>
						{/if}
					</div>
					<div>
						<span class="text-xs font-bold text-muted-foreground block">Target Entity</span>
						<span class="font-mono text-xs text-foreground block mt-0.5 capitalize">
							{selectedLog.entity}
						</span>
					</div>
					<div>
						<span class="text-xs font-bold text-muted-foreground block">Record ID</span>
						<span class="font-mono text-xs text-foreground block mt-0.5 break-all select-all">
							{selectedLog.entity_id || '—'}
						</span>
					</div>
					<div class="col-span-2">
						<span class="text-xs font-bold text-muted-foreground block">Timestamp</span>
						<span class="font-mono text-xs text-foreground block mt-0.5">
							{new Date(selectedLog.created_at).toLocaleString(undefined, {
								weekday: 'short',
								year: 'numeric',
								month: 'long',
								day: 'numeric',
								hour: '2-digit',
								minute: '2-digit',
								second: '2-digit'
							})}
						</span>
					</div>
				</div>

				<!-- Snapshot comparisons JSON Blocks -->
				<div class="space-y-3">
					<div>
						<span class="text-xs font-bold text-muted-foreground block mb-1.5">Previous Snapshot (old_data)</span>
						{#if selectedLog.old_data}
							<pre class="bg-muted/65 p-3 rounded-lg text-xs overflow-auto max-h-[160px] border border-border/40 font-mono select-all select-text leading-relaxed">{JSON.stringify(selectedLog.old_data, null, 2)}</pre>
						{:else}
							<span class="text-muted-foreground text-xs italic block bg-muted/40 p-2 rounded-lg border border-border/30">None (Create Action)</span>
						{/if}
					</div>

					<div>
						<span class="text-xs font-bold text-muted-foreground block mb-1.5">Resulting Snapshot (new_data)</span>
						{#if selectedLog.new_data}
							<pre class="bg-muted/65 p-3 rounded-lg text-xs overflow-auto max-h-[160px] border border-border/40 font-mono select-all select-text leading-relaxed">{JSON.stringify(selectedLog.new_data, null, 2)}</pre>
						{:else}
							<span class="text-muted-foreground text-xs italic block bg-muted/40 p-2 rounded-lg border border-border/30">None (Delete/Archive Action)</span>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<Dialog.Footer class="border-t border-border/40 pt-4 flex sm:justify-end">
			<Button
				onclick={() => (isDetailsOpen = false)}
				class="font-bold cursor-pointer bg-secondary text-secondary-foreground hover:bg-muted"
			>
				Close Details
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
