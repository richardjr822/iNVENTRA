<script lang="ts">
	import { page, navigating } from '$app/state';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { SubmitFunction } from './$types';
	import { toastService } from '$lib/services/toast.svelte';
	import { createTable, getCoreRowModel } from '@tanstack/table-core';
	import type { Category } from '$lib/types/category';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import {
		Search,
		Plus,
		MoreHorizontal,
		Eye,
		Edit2,
		Trash2,
		Loader2,
		ChevronUp,
		ChevronDown,
		ChevronsUpDown,
		FolderOpen,
		X
	} from '@lucide/svelte';

	let { data } = $props();

	// Search state
	// eslint-disable-next-line svelte/prefer-writable-derived
	let searchQuery = $state('');

	// Sync local search query state with URL changes
	$effect(() => {
		searchQuery = data.search;
	});

	// View Details Modal state
	let isViewOpen = $state(false);
	let selectedCategory = $state<Category | null>(null);

	// Delete Modal state
	let isDeleteOpen = $state(false);
	let categoryToDelete = $state<Category | null>(null);

	// Action loading state
	let isDeleting = $state(false);

	// TanStack Table columns structure definition
	const columns = [
		{ accessorKey: 'name', header: 'Category Name' },
		{ accessorKey: 'description', header: 'Description' },
		{ accessorKey: 'created_at', header: 'Created Date' },
		{ id: 'actions', header: 'Actions' }
	];

	// Create TanStack table instance reactively based on incoming server page data
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
			data: data.categories as Category[],
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

	// Handlers
	function handleSearch(e: Event) {
		e.preventDefault();
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (searchQuery.trim()) {
			params.set('q', searchQuery.trim());
		} else {
			params.delete('q');
		}
		params.set('page', '1'); // Reset to page 1 on new search query
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	function handleClearSearch() {
		searchQuery = '';
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.delete('q');
		params.set('page', '1');
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
			newOrder = 'desc'; // Default created date to descending
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

	function openViewDialog(category: Category) {
		selectedCategory = category;
		isViewOpen = true;
	}

	function openDeleteDialog(category: Category) {
		categoryToDelete = category;
		isDeleteOpen = true;
	}

	// Pagination math derived from page data
	const totalCount = $derived(data.totalCount);
	const currentPage = $derived(data.page);
	const limit = $derived(data.limit);
	const totalPages = $derived(Math.ceil(totalCount / limit) || 1);
	const fromEntry = $derived(totalCount === 0 ? 0 : (currentPage - 1) * limit + 1);
	const toEntry = $derived(Math.min(currentPage * limit, totalCount));

	const isViewer = $derived(data.user.role === 'viewer');

	// Deletion enhance response handler
	const handleDeleteEnhance: SubmitFunction = () => {
		isDeleting = true;
		return async ({ result, update }) => {
			isDeleting = false;
			isDeleteOpen = false;
			categoryToDelete = null;

			if (result.type === 'success') {
				toastService.trigger('Category deleted successfully!', 'success');
				await update();
			} else if (result.type === 'failure') {
				const errorMsg = result.data?.error || 'Failed to delete category';
				toastService.trigger(errorMsg, 'error');
			}
		};
	};
</script>

<svelte:head>
	<title>Categories - Inventra Inventory Management</title>
	<meta
		name="description"
		content="View, search, create, update and structure product categories."
	/>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-black tracking-tight">Categories</h2>
			<p class="text-sm text-muted-foreground">Manage and structure physical product categories.</p>
		</div>

		{#if !isViewer}
			<Button
				href="/categories/create"
				class="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shrink-0 cursor-pointer shadow-sm shadow-primary/15"
			>
				<Plus class="mr-2 h-4.5 w-4.5" />
				Add Category
			</Button>
		{/if}
	</div>

	<!-- Controls: Search & Statistics -->
	<div
		class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card/40 border border-border/40 p-4 rounded-xl backdrop-blur-sm"
	>
		<form onsubmit={handleSearch} class="flex items-center gap-2 w-full sm:max-w-md">
			<div class="relative w-full">
				<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Search categories by name..."
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
				class="h-10 px-4 font-bold cursor-pointer border border-border/60"
			>
				Search
			</Button>
		</form>

		<div class="text-xs font-semibold text-muted-foreground self-end sm:self-center">
			Total Categories: <span
				class="text-foreground text-sm font-bold bg-muted/50 px-2.5 py-1 rounded-lg border border-border/40"
				>{totalCount}</span
			>
		</div>
	</div>

	<!-- Categories Table Container -->
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
								{#if header.column.id === 'name' || header.column.id === 'created_at'}
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
				{#if data.categories.length > 0}
					{#each table.getRowModel().rows as row (row.original.id)}
						<Table.Row class="hover:bg-muted/30 border-b border-border/30 transition-colors">
							{#each row.getVisibleCells() as cell (cell.id)}
								<Table.Cell class="py-3">
									{#if cell.column.id === 'name'}
										<span class="font-bold text-foreground block tracking-wide"
											>{cell.getValue()}</span
										>
									{:else if cell.column.id === 'description'}
										<span
											class="text-muted-foreground text-sm max-w-md line-clamp-1 block leading-relaxed"
											title={cell.getValue() as string}
										>
											{cell.getValue() || '—'}
										</span>
									{:else if cell.column.id === 'created_at'}
										<span class="text-muted-foreground font-mono text-xs block">
											{new Date(cell.getValue() as string).toLocaleDateString(undefined, {
												year: 'numeric',
												month: 'short',
												day: 'numeric'
											})}
										</span>
									{:else if cell.column.id === 'actions'}
										<DropdownMenu.Root>
											<DropdownMenu.Trigger>
												<Button
													variant="ghost"
													size="icon"
													class="h-8 w-8 p-0 hover:bg-muted cursor-pointer"
												>
													<MoreHorizontal class="h-4 w-4" />
													<span class="sr-only">Open menu</span>
												</Button>
											</DropdownMenu.Trigger>
											<DropdownMenu.Content align="end" class="border-border/60 bg-card p-1">
												<DropdownMenu.Item
													onclick={() => openViewDialog(row.original)}
													class="flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted rounded-lg cursor-pointer"
												>
													<Eye class="h-4 w-4 text-muted-foreground" />
													View Details
												</DropdownMenu.Item>

												{#if !isViewer}
													<DropdownMenu.Item
														class="rounded-lg hover:bg-muted focus:bg-muted cursor-pointer p-0 text-foreground"
													>
														<a
															href="/categories/{row.original.id}/edit"
															class="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
														>
															<Edit2 class="h-4 w-4 text-muted-foreground" />
															Edit Category
														</a>
													</DropdownMenu.Item>

													<DropdownMenu.Separator class="bg-border/50 my-1" />

													<DropdownMenu.Item
														onclick={() => openDeleteDialog(row.original)}
														class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
													>
														<Trash2 class="h-4 w-4 text-destructive/80" />
														Delete Category
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
						<Table.Cell colspan={4} class="h-56 text-center">
							<div class="flex flex-col items-center justify-center space-y-3">
								<div
									class="rounded-2xl bg-muted/40 p-4 border border-border/20 text-muted-foreground shadow-inner"
								>
									<FolderOpen class="h-7 w-7 text-muted-foreground/80" />
								</div>
								<h3 class="text-base font-bold">No categories found</h3>
								<p class="text-xs text-muted-foreground max-w-xs leading-relaxed">
									{#if data.search}
										No results found matching "{data.search}". Refine your search keywords.
									{:else}
										There are no physical categories created yet. Click below to add one.
									{/if}
								</p>
								{#if !isViewer && !data.search}
									<Button
										href="/categories/create"
										size="sm"
										class="bg-primary text-primary-foreground font-bold cursor-pointer mt-1"
									>
										<Plus class="mr-1.5 h-4 w-4" />
										Create Category
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
				of <span class="text-foreground font-bold">{totalCount}</span> categories
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

<!-- Category View Modal -->
<Dialog.Root bind:open={isViewOpen}>
	<Dialog.Content class="sm:max-w-[500px] border-border/50 bg-card p-6 shadow-2xl backdrop-blur-xl">
		<Dialog.Header>
			<Dialog.Title class="text-xl font-bold tracking-tight">Category Details</Dialog.Title>
			<Dialog.Description class="text-sm"
				>Comprehensive profile of the physical category.</Dialog.Description
			>
		</Dialog.Header>

		{#if selectedCategory}
			<div class="space-y-4 py-4 text-sm">
				<div class="grid grid-cols-3 items-start gap-4 border-b border-border/40 pb-3">
					<span class="font-bold text-muted-foreground">Category Name</span>
					<span class="col-span-2 font-black text-foreground">{selectedCategory.name}</span>
				</div>

				<div class="grid grid-cols-3 items-start gap-4 border-b border-border/40 pb-3">
					<span class="font-bold text-muted-foreground">Unique Identifier</span>
					<span class="col-span-2 font-mono text-xs text-muted-foreground select-all break-all"
						>{selectedCategory.id}</span
					>
				</div>

				<div class="grid grid-cols-3 items-start gap-4 border-b border-border/40 pb-3">
					<span class="font-bold text-muted-foreground">Description</span>
					<span class="col-span-2 text-foreground leading-relaxed whitespace-pre-wrap"
						>{selectedCategory.description || 'No description provided.'}</span
					>
				</div>

				<div class="grid grid-cols-3 items-start gap-4 pb-1">
					<span class="font-bold text-muted-foreground">Created Date</span>
					<span class="col-span-2 font-mono text-xs text-foreground">
						{new Date(selectedCategory.created_at).toLocaleString(undefined, {
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
		{/if}

		<Dialog.Footer class="border-t border-border/40 pt-4 flex sm:justify-end">
			<Button
				onclick={() => (isViewOpen = false)}
				class="font-bold cursor-pointer bg-secondary text-secondary-foreground hover:bg-muted"
				>Close</Button
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Category Delete Confirmation Alert Dialog -->
<AlertDialog.Root bind:open={isDeleteOpen}>
	<AlertDialog.Content class="border-destructive/20 bg-card p-6 shadow-2xl backdrop-blur-xl">
		<AlertDialog.Header>
			<AlertDialog.Title
				class="text-xl font-bold tracking-tight text-destructive flex items-center gap-2"
			>
				Are you absolutely sure?
			</AlertDialog.Title>
			<AlertDialog.Description class="text-sm leading-relaxed">
				This action cannot be undone. This will permanently delete the category
				<strong
					class="text-foreground font-black bg-muted px-1.5 py-0.5 rounded border border-border/30"
				>
					{categoryToDelete?.name}
				</strong>
				and remove it and all of its associations from the database.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<AlertDialog.Footer class="border-t border-border/40 pt-4 flex gap-2 justify-end">
			<AlertDialog.Cancel
				variant="outline"
				class="font-bold cursor-pointer border-border/60 hover:bg-muted"
				disabled={isDeleting}
			>
				Cancel
			</AlertDialog.Cancel>

			<form method="POST" action="?/deleteCategory" use:enhance={handleDeleteEnhance}>
				<input type="hidden" name="id" value={categoryToDelete?.id} />
				<Button
					type="submit"
					variant="destructive"
					class="font-bold cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-2"
					disabled={isDeleting}
				>
					{#if isDeleting}
						<Loader2 class="h-4 w-4 animate-spin" />
						Deleting...
					{:else}
						Yes, Delete Category
					{/if}
				</Button>
			</form>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
