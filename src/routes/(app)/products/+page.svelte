<script lang="ts">
	import { page, navigating } from '$app/state';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { SubmitFunction } from './$types';
	import { toastService } from '$lib/services/toast.svelte';
	import { createTable, getCoreRowModel } from '@tanstack/table-core';
	import type { Product } from '$lib/types/product';
	import * as Table from '$lib/components/ui/table';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Search,
		Plus,
		MoreHorizontal,
		Eye,
		Edit2,
		Archive,
		Loader2,
		ChevronUp,
		ChevronDown,
		ChevronsUpDown,
		Package,
		X,
		ShoppingBag,
		Trash2,
		Database,
		Save
	} from '@lucide/svelte';

	let { data, form } = $props();

	// Role-based detection
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

	// Realtime debounced search
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const query = searchQuery;
		if (query === data.search) return;

		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			applyFilters();
		}, 300);

		return () => {
			if (searchTimeout) clearTimeout(searchTimeout);
		};
	});

	// ── Manager Quick-Add Modal State ──────────────────────────────────────────
	let isAddModalOpen = $state(false);
	let addName = $state('');
	let addPrice = $state('');
	let isAdding = $state(false);

	function openAddModal() {
		addName = '';
		addPrice = '';
		isAddModalOpen = true;
	}

	function closeAddModal() {
		isAddModalOpen = false;
	}

	// Handle form result for createSimple
	$effect(() => {
		if (form?.simpleSuccess) {
			toastService.trigger('Product added successfully!', 'success');
			isAddModalOpen = false;
			addName = '';
			addPrice = '';
		} else if (form?.simpleError) {
			toastService.trigger(form.simpleError as string, 'error');
		}
	});

	const handleSimpleSubmit: SubmitFunction = () => {
		isAdding = true;
		return async ({ result, update }) => {
			isAdding = false;
			if (result.type === 'success') {
				isAddModalOpen = false;
				addName = '';
				addPrice = '';
				toastService.trigger('Product added successfully!', 'success');
				await update();
			} else if (result.type === 'failure') {
				const errorMsg = (result.data as Record<string, unknown>)?.simpleError as string || 'Failed to add product.';
				toastService.trigger(errorMsg, 'error');
			}
		};
	};

	// ── Manager Bulk-Add Modal State ───────────────────────────────────────────
	let isBulkModalOpen = $state(false);
	let bulkProducts = $state<{ name: string; price: string }[]>([
		{ name: '', price: '' },
		{ name: '', price: '' },
		{ name: '', price: '' }
	]);
	let isBulkSaving = $state(false);

	function openBulkAddModal() {
		bulkProducts = [
			{ name: '', price: '' },
			{ name: '', price: '' },
			{ name: '', price: '' }
		];
		isBulkModalOpen = true;
	}

	function closeBulkModal() {
		isBulkModalOpen = false;
	}

	function addBulkRow() {
		bulkProducts.push({ name: '', price: '' });
	}

	function removeBulkRow(index: number) {
		if (bulkProducts.length > 1) {
			bulkProducts.splice(index, 1);
		}
	}

	function clearBulkRows() {
		bulkProducts = [{ name: '', price: '' }];
	}

	function hasValidBulkProducts(): boolean {
		return bulkProducts.some(p => p.name.trim() !== '' && p.price !== '' && parseFloat(p.price) > 0);
	}

	// Handle form result for createBulk reactively
	$effect(() => {
		if (form?.bulkSuccess) {
			toastService.trigger('Bulk products added successfully!', 'success');
			isBulkModalOpen = false;
			bulkProducts = [
				{ name: '', price: '' },
				{ name: '', price: '' },
				{ name: '', price: '' }
			];
		} else if (form?.bulkError) {
			toastService.trigger(form.bulkError as string, 'error');
		}
	});

	const handleBulkSubmit: SubmitFunction = () => {
		isBulkSaving = true;
		return async ({ result, update }) => {
			isBulkSaving = false;
			if (result.type === 'success') {
				isBulkModalOpen = false;
				bulkProducts = [
					{ name: '', price: '' },
					{ name: '', price: '' },
					{ name: '', price: '' }
				];
				toastService.trigger('Bulk products added successfully!', 'success');
				await update();
			} else if (result.type === 'failure') {
				const errorMsg = (result.data as Record<string, unknown>)?.bulkError as string || 'Failed to add products.';
				toastService.trigger(errorMsg, 'error');
			}
		};
	};

	// ── Manager Edit Modal State ──────────────────────────────────────────────
	let isEditModalOpen = $state(false);
	let editProductId = $state('');
	let editName = $state('');
	let editPrice = $state('');
	let isSavingEdit = $state(false);

	function openEditModal(product: Product) {
		editProductId = product.id;
		editName = product.name;
		editPrice = product.price.toString();
		isEditModalOpen = true;
	}

	function closeEditModal() {
		isEditModalOpen = false;
		editProductId = '';
		editName = '';
		editPrice = '';
	}

	// Handle form result for updateSimple reactively
	$effect(() => {
		if (form?.editSuccess) {
			toastService.trigger('Product updated successfully!', 'success');
			isEditModalOpen = false;
			editProductId = '';
			editName = '';
			editPrice = '';
		} else if (form?.editError) {
			toastService.trigger(form.editError as string, 'error');
		}
	});

	const handleEditSubmit: SubmitFunction = () => {
		isSavingEdit = true;
		return async ({ result, update }) => {
			isSavingEdit = false;
			if (result.type === 'success') {
				isEditModalOpen = false;
				editProductId = '';
				editName = '';
				editPrice = '';
				toastService.trigger('Product updated successfully!', 'success');
				await update();
			} else if (result.type === 'failure') {
				const errorMsg = (result.data as Record<string, unknown>)?.editError as string || 'Failed to update product.';
				toastService.trigger(errorMsg, 'error');
			}
		};
	};

	// ── Archive Modal State ────────────────────────────────────────────────────
	let isArchiveOpen = $state(false);
	let productToArchive = $state<Product | null>(null);
	let isArchiving = $state(false);

	function openArchiveDialog(product: Product) {
		productToArchive = product;
		isArchiveOpen = true;
	}

	const handleArchiveEnhance: SubmitFunction = () => {
		isArchiving = true;
		return async ({ result, update }) => {
			isArchiving = false;
			isArchiveOpen = false;
			productToArchive = null;

			if (result.type === 'success') {
				toastService.trigger('Product archived successfully!', 'success');
				await update();
			} else if (result.type === 'failure') {
				const errorMsg = (result.data as Record<string, unknown>)?.error as string || 'Failed to archive product';
				toastService.trigger(errorMsg, 'error');
			}
		};
	};

	// ── Delete Modal State ─────────────────────────────────────────────────────
	let isDeleteOpen = $state(false);
	let productToDelete = $state<Product | null>(null);
	let isDeleting = $state(false);

	function openDeleteDialog(product: Product) {
		productToDelete = product;
		isDeleteOpen = true;
	}

	const handleDeleteEnhance: SubmitFunction = () => {
		isDeleting = true;
		return async ({ result, update }) => {
			isDeleting = false;
			isDeleteOpen = false;
			productToDelete = null;

			if (result.type === 'success') {
				toastService.trigger('Product deleted successfully!', 'success');
				await update();
			} else if (result.type === 'failure') {
				const errorMsg = (result.data as Record<string, unknown>)?.error as string || 'Failed to delete product';
				toastService.trigger(errorMsg, 'error');
			}
		};
	};

	// ── Admin Table setup ──────────────────────────────────────────────────────
	const columns = [
		{ id: 'image', header: 'Image' },
		{ accessorKey: 'sku', header: 'SKU' },
		{ accessorKey: 'barcode', header: 'Barcode' },
		{ accessorKey: 'name', header: 'Product Name' },
		{ accessorKey: 'category_name', header: 'Category' },
		{ accessorKey: 'price', header: 'Price' },
		{ accessorKey: 'status', header: 'Status' },
		{ accessorKey: 'created_at', header: 'Created Date' },
		{ id: 'actions', header: 'Actions' }
	];

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
			data: data.products as Product[],
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

	// Navigation handlers
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

		params.set('page', '1');
		goto(`?${params.toString()}`, { keepFocus: true });
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

	// Pagination parameters
	const totalCount = $derived(data.totalCount);
	const currentPage = $derived(data.page);
	const limit = $derived(data.limit);
	const totalPages = $derived(Math.ceil(totalCount / limit) || 1);
	const fromEntry = $derived(totalCount === 0 ? 0 : (currentPage - 1) * limit + 1);
	const toEntry = $derived(Math.min(currentPage * limit, totalCount));
</script>

<svelte:head>
	<title>Products - Inventra Inventory Management</title>
	<meta
		name="description"
		content="View, search, filter, sort and manage product records and safety stocks."
	/>
</svelte:head>

<!-- ═══════════════════════════════════════════════════════════════════════════
     INVENTORY MANAGER — Simplified Experience
     ═══════════════════════════════════════════════════════════════════════ -->
{#if isManager}
<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-black tracking-tight">My Products</h2>
			<p class="text-sm text-muted-foreground">Add new products or manage your existing items.</p>
		</div>
		<div class="flex flex-wrap gap-2.5">
			<button
				type="button"
				onclick={openBulkAddModal}
				id="manager-bulk-add-btn"
				class="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition-all hover:bg-muted hover:shadow-md active:scale-95 cursor-pointer"
			>
				<Database class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
				Bulk Add
			</button>
			<button
				type="button"
				onclick={openAddModal}
				id="manager-add-product-btn"
				class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-md active:scale-95 cursor-pointer"
			>
				<Plus class="h-5 w-5" aria-hidden="true" />
				Add Product
			</button>
		</div>
	</div>

	<!-- Search (name only for managers) -->
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
		<div class="ml-auto text-xs font-semibold text-muted-foreground hidden sm:block">
			<span class="text-foreground text-sm font-bold bg-muted/50 px-2.5 py-1.5 rounded-lg border border-border/40"
				>{totalCount}</span
			> products
		</div>
	</form>

	<!-- Simplified Products Table -->
	<div class="relative overflow-hidden rounded-xl border border-border/40 bg-card/65 backdrop-blur-md shadow-sm">
		{#if navigating && navigating.to}
			<div class="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
				<div class="flex flex-col items-center gap-2 rounded-xl bg-card border border-border/80 p-5 shadow-2xl">
					<Loader2 class="h-6 w-6 animate-spin text-primary" />
					<span class="text-xs font-bold text-muted-foreground">Loading...</span>
				</div>
			</div>
		{/if}

		<table class="w-full text-left border-collapse" aria-label="Product list">
			<thead>
				<tr class="bg-muted/40 border-b border-border/40">
					<th class="p-4 text-sm font-bold text-foreground tracking-wide" scope="col">Product Name</th>
					<th class="p-4 text-sm font-bold text-foreground tracking-wide" scope="col">Selling Price</th>
					<th class="p-4 text-sm font-bold text-foreground tracking-wide text-right" scope="col">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-border/30">
				{#if data.products.length > 0}
					{#each data.products as product (product.id)}
						<tr class="hover:bg-muted/20 transition-colors">
							<!-- Product Name -->
							<td class="p-4">
								<div class="flex items-center gap-3">
									<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/40">
										<Package class="h-4 w-4 text-muted-foreground/70" aria-hidden="true" />
									</div>
									<span class="font-bold text-sm text-foreground leading-tight">{product.name}</span>
								</div>
							</td>
							<!-- Selling Price (₱) -->
							<td class="p-4">
								<span class="text-lg font-black text-emerald-500">{phpFormat(product.price)}</span>
							</td>

							<!-- Actions -->
							<td class="p-4 text-right">
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
											onclick={() => openEditModal(product)}
											class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted focus:bg-muted cursor-pointer text-foreground"
										>
											<Edit2 class="h-4 w-4 text-muted-foreground" />
											Edit Product
										</DropdownMenu.Item>

										{#if product.status !== 'archived'}
											<DropdownMenu.Separator class="bg-border/50 my-1" />

											<DropdownMenu.Item
												onclick={() => openArchiveDialog(product)}
												class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
											>
												<Archive class="h-4 w-4 text-destructive/85" />
												Archive Product
											</DropdownMenu.Item>
										{/if}

										<DropdownMenu.Separator class="bg-border/50 my-1" />

										<DropdownMenu.Item
											onclick={() => openDeleteDialog(product)}
											class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
										>
											<Trash2 class="h-4 w-4 text-destructive/85" />
											Delete Product
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan={4} class="h-56 text-center">
							<div class="flex flex-col items-center justify-center space-y-4">
								<div class="rounded-2xl bg-muted/40 p-5 border border-border/20 text-muted-foreground shadow-inner">
									<ShoppingBag class="h-8 w-8 text-muted-foreground/70" />
								</div>
								<div class="space-y-1">
									<h3 class="text-base font-bold">No products yet</h3>
									<p class="text-sm text-muted-foreground">Click "Add Product" to add your first item.</p>
								</div>
								<button
									type="button"
									onclick={openAddModal}
									class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors"
								>
									<Plus class="h-4 w-4" />
									Add Product
								</button>
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
				of <span class="text-foreground font-bold">{totalCount}</span> products
			</div>

			<div class="flex items-center gap-1.5 self-end sm:self-auto">
				<Button
					variant="outline"
					size="sm"
					onclick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage <= 1}
					class="h-9 font-bold border-border/60 hover:bg-muted cursor-pointer active:scale-95 disabled:scale-100 disabled:opacity-50"
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
					class="h-9 font-bold border-border/60 hover:bg-muted cursor-pointer active:scale-95 disabled:scale-100 disabled:opacity-50"
				>
					Next
				</Button>
			</div>
		</div>
	{/if}
</div>

<!-- ── Manager Quick-Add Product Modal ───────────────────────────────────── -->
{#if isAddModalOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="add-product-modal-title"
	>
		<div class="w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-2xl animate-in zoom-in-95 duration-200">
			<!-- Modal Header -->
			<div class="flex items-center justify-between p-6 border-b border-border/40">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
						<ShoppingBag class="h-5 w-5 text-primary" aria-hidden="true" />
					</div>
					<div>
						<h3 id="add-product-modal-title" class="text-lg font-black tracking-tight">Add New Product</h3>
						<p class="text-xs text-muted-foreground">Fill in the details below</p>
					</div>
				</div>
				<button
					type="button"
					onclick={closeAddModal}
					class="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
					aria-label="Close modal"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- Modal Form -->
			<form
				method="POST"
				action="?/createSimple"
				use:enhance={handleSimpleSubmit}
				class="p-6 space-y-5"
			>
				<!-- Product Name -->
				<div class="space-y-2">
					<label for="add-product-name" class="block text-sm font-bold text-foreground">
						Product Name <span class="text-destructive">*</span>
					</label>
					<input
						id="add-product-name"
						name="name"
						type="text"
						bind:value={addName}
						placeholder="e.g. Coke 1.5L, Cornbeef Purefoods..."
						required
						class="w-full h-12 rounded-xl border border-border/60 bg-background/50 px-4 text-base font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
					/>
				</div>

				<!-- Selling Price -->
				<div class="space-y-2">
					<label for="add-product-price" class="block text-sm font-bold text-foreground">
						Selling Price (₱) <span class="text-destructive">*</span>
					</label>
					<div class="relative">
						<span class="absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-muted-foreground select-none">₱</span>
						<input
							id="add-product-price"
							name="price"
							type="number"
							bind:value={addPrice}
							min="0"
							step="any"
							placeholder="0.00"
							required
							class="w-full h-12 rounded-xl border border-border/60 bg-background/50 pl-9 pr-4 text-base font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
						/>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex gap-3 pt-2">
					<button
						type="button"
						onclick={closeAddModal}
						disabled={isAdding}
						class="flex-1 h-12 rounded-xl border border-border/60 bg-muted/30 text-sm font-bold text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isAdding || !addName.trim() || !addPrice}
						class="flex-1 h-12 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
					>
						{#if isAdding}
							<Loader2 class="h-4 w-4 animate-spin" aria-hidden="true" />
							Saving...
						{:else}
							<Plus class="h-4 w-4" aria-hidden="true" />
							Save Product
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ── Manager Bulk-Add Product Modal ───────────────────────────────────── -->
{#if isBulkModalOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="bulk-product-modal-title"
	>
		<div class="w-full max-w-2xl rounded-2xl border border-border/60 bg-card shadow-2xl animate-in zoom-in-95 duration-200">
			<!-- Modal Header -->
			<div class="flex items-center justify-between p-6 border-b border-border/40">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
						<Database class="h-5 w-5 text-primary" aria-hidden="true" />
					</div>
					<div>
						<h3 id="bulk-product-modal-title" class="text-lg font-black tracking-tight">Bulk Add Products</h3>
						<p class="text-xs text-muted-foreground">Add multiple products at once. Initial stock defaults to 10.</p>
					</div>
				</div>
				<button
					type="button"
					onclick={closeBulkModal}
					class="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
					aria-label="Close modal"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- Modal Form -->
			<form
				method="POST"
				action="?/createBulk"
				use:enhance={handleBulkSubmit}
				class="p-6 space-y-4"
			>
				<!-- Excel-like Grid -->
				<div class="border border-border/40 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-background/30">
					<table class="w-full text-left border-collapse text-sm">
						<thead>
							<tr class="bg-muted/65 border-b border-border/40">
								<th class="p-3 font-bold text-xs w-12 text-center text-muted-foreground select-none">#</th>
								<th class="p-3 font-bold text-xs text-muted-foreground">Product Name *</th>
								<th class="p-3 font-bold text-xs text-muted-foreground w-48">Price (₱) *</th>
								<th class="p-3 font-bold text-xs text-center text-muted-foreground w-12 select-none"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border/30">
							{#each bulkProducts as row, i (i)}
								<tr class="hover:bg-muted/10 transition-colors">
									<!-- Index -->
									<td class="p-2 text-center font-mono text-xs text-muted-foreground select-none">
										{i + 1}
									</td>
									<!-- Product Name -->
									<td class="p-2">
										<input
											type="text"
											bind:value={row.name}
											placeholder="e.g. Coke 1.5L, Cornbeef..."
											required={i === 0}
											class="w-full h-10 px-3 rounded-xl border border-border/60 bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
										/>
									</td>
									<!-- Selling Price -->
									<td class="p-2">
										<div class="relative">
											<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground select-none">₱</span>
											<input
												type="number"
												bind:value={row.price}
												min="0"
												step="any"
												placeholder="0.00"
												required={i === 0}
												class="w-full h-10 pl-7 pr-3 rounded-xl border border-border/60 bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
											/>
										</div>
									</td>
									<!-- Action Delete -->
									<td class="p-2 text-center">
										<button
											type="button"
											onclick={() => removeBulkRow(i)}
											disabled={bulkProducts.length <= 1}
											class="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
											aria-label="Remove row"
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Grid Toolbar -->
				<div class="flex justify-between items-center">
					<button
						type="button"
						onclick={addBulkRow}
						class="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/50 px-3.5 py-2 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
					>
						<Plus class="h-3.5 w-3.5" />
						Add Row
					</button>

					<button
						type="button"
						onclick={clearBulkRows}
						class="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 transition-colors cursor-pointer"
					>
						Clear All
					</button>
				</div>

				<input type="hidden" name="productsJson" value={JSON.stringify(bulkProducts)} />

				<!-- Actions -->
				<div class="flex gap-3 pt-4 border-t border-border/40">
					<button
						type="button"
						onclick={closeBulkModal}
						disabled={isBulkSaving}
						class="flex-1 h-12 rounded-xl border border-border/60 bg-muted/30 text-sm font-bold text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isBulkSaving || !hasValidBulkProducts()}
						class="flex-1 h-12 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
					>
						{#if isBulkSaving}
							<Loader2 class="h-4 w-4 animate-spin" aria-hidden="true" />
							Saving Products...
						{:else}
							<Plus class="h-4 w-4" aria-hidden="true" />
							Save Products
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ── Manager Edit Product Modal ───────────────────────────────────────── -->
{#if isEditModalOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="edit-product-modal-title"
	>
		<div class="w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-2xl animate-in zoom-in-95 duration-200">
			<!-- Modal Header -->
			<div class="flex items-center justify-between p-6 border-b border-border/40">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
						<Edit2 class="h-5 w-5 text-primary" aria-hidden="true" />
					</div>
					<div>
						<h3 id="edit-product-modal-title" class="text-lg font-black tracking-tight">Edit Product</h3>
						<p class="text-xs text-muted-foreground">Modify the details below</p>
					</div>
				</div>
				<button
					type="button"
					onclick={closeEditModal}
					class="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
					aria-label="Close modal"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- Modal Form -->
			<form
				method="POST"
				action="?/updateSimple"
				use:enhance={handleEditSubmit}
				class="p-6 space-y-5"
			>
				<input type="hidden" name="id" value={editProductId} />

				<!-- Product Name -->
				<div class="space-y-2">
					<label for="edit-product-name" class="block text-sm font-bold text-foreground">
						Product Name <span class="text-destructive">*</span>
					</label>
					<input
						id="edit-product-name"
						name="name"
						type="text"
						bind:value={editName}
						placeholder="e.g. Coke 1.5L, Cornbeef Purefoods..."
						required
						class="w-full h-12 rounded-xl border border-border/60 bg-background/50 px-4 text-base font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
					/>
				</div>

				<!-- Selling Price -->
				<div class="space-y-2">
					<label for="edit-product-price" class="block text-sm font-bold text-foreground">
						Selling Price (₱) <span class="text-destructive">*</span>
					</label>
					<div class="relative">
						<span class="absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-muted-foreground select-none">₱</span>
						<input
							id="edit-product-price"
							name="price"
							type="number"
							bind:value={editPrice}
							min="0"
							step="any"
							placeholder="0.00"
							required
							class="w-full h-12 rounded-xl border border-border/60 bg-background/50 pl-9 pr-4 text-base font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
						/>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex gap-3 pt-2">
					<button
						type="button"
						onclick={closeEditModal}
						disabled={isSavingEdit}
						class="flex-1 h-12 rounded-xl border border-border/60 bg-muted/30 text-sm font-bold text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSavingEdit || !editName.trim() || !editPrice}
						class="flex-1 h-12 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
					>
						{#if isSavingEdit}
							<Loader2 class="h-4 w-4 animate-spin" aria-hidden="true" />
							Saving...
						{:else}
							<Save class="h-4 w-4" aria-hidden="true" />
							Save Changes
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ═══════════════════════════════════════════════════════════════════════════
     VIEWER — Simplified View-Only Experience
     ═══════════════════════════════════════════════════════════════════════ -->
{:else if isViewer}
<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-black tracking-tight">Products & Prices</h2>
			<p class="text-sm text-muted-foreground">View and track configured product prices.</p>
		</div>
	</div>

	<!-- Search (name only) -->
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
		<div class="ml-auto text-xs font-semibold text-muted-foreground hidden sm:block">
			<span class="text-foreground text-sm font-bold bg-muted/50 px-2.5 py-1.5 rounded-lg border border-border/40"
				>{totalCount}</span
			> products
		</div>
	</form>

	<!-- Simplified View-Only Products Table -->
	<div class="relative overflow-hidden rounded-xl border border-border/40 bg-card/65 backdrop-blur-md shadow-sm">
		{#if navigating && navigating.to}
			<div class="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
				<div class="flex flex-col items-center gap-2 rounded-xl bg-card border border-border/80 p-5 shadow-2xl">
					<Loader2 class="h-6 w-6 animate-spin text-primary" />
					<span class="text-xs font-bold text-muted-foreground">Loading...</span>
				</div>
			</div>
		{/if}

		<table class="w-full text-left border-collapse" aria-label="Product price list">
			<thead>
				<tr class="bg-muted/40 border-b border-border/40">
					<th class="p-4 text-sm font-bold text-foreground tracking-wide" scope="col">Product Name</th>
					<th class="p-4 text-sm font-bold text-foreground tracking-wide" scope="col">Selling Price</th>
					<th class="p-4 text-sm font-bold text-foreground tracking-wide text-right" scope="col">Details</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-border/30">
				{#if data.products.length > 0}
					{#each data.products as product (product.id)}
						<tr class="hover:bg-muted/20 transition-colors">
							<!-- Product Name -->
							<td class="p-4">
								<div class="flex items-center gap-3">
									<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/40">
										<Package class="h-4 w-4 text-muted-foreground/70" aria-hidden="true" />
									</div>
									<span class="font-bold text-sm text-foreground leading-tight">{product.name}</span>
								</div>
							</td>
							<!-- Selling Price (₱) -->
							<td class="p-4">
								<span class="text-lg font-black text-emerald-500">{phpFormat(product.price)}</span>
							</td>

							<!-- View Details Link -->
							<td class="p-4 text-right">
								<a
									href="/products/{product.id}"
									class="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary/45 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
									aria-label="View details of {product.name}"
								>
									<Eye class="h-3.5 w-3.5" aria-hidden="true" />
									View Details
								</a>
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan={3} class="h-56 text-center">
							<div class="flex flex-col items-center justify-center space-y-4">
								<div class="rounded-2xl bg-muted/40 p-5 border border-border/20 text-muted-foreground shadow-inner">
									<ShoppingBag class="h-8 w-8 text-muted-foreground/70" />
								</div>
								<div class="space-y-1">
									<h3 class="text-base font-bold">No products yet</h3>
									<p class="text-sm text-muted-foreground">No products registered in the catalog.</p>
								</div>
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
				of <span class="text-foreground font-bold">{totalCount}</span> products
			</div>

			<div class="flex items-center gap-1.5 self-end sm:self-auto">
				<Button
					variant="outline"
					size="sm"
					onclick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage <= 1}
					class="h-9 font-bold border-border/60 hover:bg-muted cursor-pointer active:scale-95 disabled:scale-100 disabled:opacity-50"
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
					class="h-9 font-bold border-border/60 hover:bg-muted cursor-pointer active:scale-95 disabled:scale-100 disabled:opacity-50"
				>
					Next
				</Button>
			</div>
		</div>
	{/if}
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     ADMIN — Full Experience (unchanged)
     ═══════════════════════════════════════════════════════════════════════ -->
{:else}
<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-black tracking-tight">Products</h2>
			<p class="text-sm text-muted-foreground">
				Manage system product inventory and master catalogs.
			</p>
		</div>

		{#if !isViewer}
			<Button
				href="/products/create"
				class="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shrink-0 cursor-pointer shadow-sm shadow-primary/15"
			>
				<Plus class="mr-2 h-4.5 w-4.5" />
				Add Product
			</Button>
		{/if}
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
					placeholder="Search SKU, barcode, name..."
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
					<option value="active">Active</option>
					<option value="inactive">Inactive</option>
					<option value="archived">Archived</option>
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
			Total Products: <span
				class="text-foreground text-sm font-bold bg-muted/50 px-2.5 py-1 rounded-lg border border-border/40"
				>{totalCount}</span
			>
		</div>
	</div>

	<!-- Products Table Container -->
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
								{#if ['name', 'sku', 'price', 'created_at'].includes(header.column.id)}
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
				{#if data.products.length > 0}
					{#each table.getRowModel().rows as row (row.original.id)}
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
													alt={row.original.name}
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
									{:else if cell.column.id === 'name'}
										<span class="font-bold text-foreground block tracking-wide"
											>{cell.getValue()}</span
										>
									{:else if cell.column.id === 'category_name'}
										<span class="text-muted-foreground text-xs font-semibold"
											>{cell.getValue() || '—'}</span
										>
									{:else if cell.column.id === 'price'}
										<span class="font-bold text-foreground"
											>${Number(cell.getValue()).toFixed(2)}</span
										>
									{:else if cell.column.id === 'status'}
										{#if cell.getValue() === 'active'}
											<Badge
												class="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/15 font-bold text-[10px] uppercase"
											>
												Active
											</Badge>
										{:else if cell.getValue() === 'inactive'}
											<Badge
												class="bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/15 font-bold text-[10px] uppercase"
											>
												Inactive
											</Badge>
										{:else}
											<Badge
												class="bg-muted text-muted-foreground border border-border hover:bg-muted font-bold text-[10px] uppercase"
											>
												Archived
											</Badge>
										{/if}
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
													class="rounded-lg hover:bg-muted focus:bg-muted cursor-pointer p-0 text-foreground"
												>
													<a
														href="/products/{row.original.id}"
														class="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
													>
														<Eye class="h-4 w-4 text-muted-foreground" />
														View Details
													</a>
												</DropdownMenu.Item>

												{#if !isViewer}
													<DropdownMenu.Item
														class="rounded-lg hover:bg-muted focus:bg-muted cursor-pointer p-0 text-foreground"
													>
														<a
															href="/products/{row.original.id}/edit"
															class="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
														>
															<Edit2 class="h-4 w-4 text-muted-foreground" />
															Edit Product
														</a>
													</DropdownMenu.Item>

													{#if row.original.status !== 'archived'}
														<DropdownMenu.Separator class="bg-border/50 my-1" />

														<DropdownMenu.Item
															onclick={() => openArchiveDialog(row.original)}
															class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
														>
															<Archive class="h-4 w-4 text-destructive/85" />
															Archive Product
														</DropdownMenu.Item>
													{/if}

													<DropdownMenu.Separator class="bg-border/50 my-1" />

													<DropdownMenu.Item
														onclick={() => openDeleteDialog(row.original)}
														class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
													>
														<Trash2 class="h-4 w-4 text-destructive/85" />
														Delete Product
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
								<h3 class="text-base font-bold">No products found</h3>
								<p class="text-xs text-muted-foreground max-w-xs leading-relaxed">
									{#if data.search || data.categoryId !== 'all' || data.status !== 'all'}
										No results found matching your filters. Reset filters or search criteria.
									{:else}
										There are no product catalog items defined. Click below to add one.
									{/if}
								</p>
								{#if !isViewer && !data.search && data.categoryId === 'all' && data.status === 'all'}
									<Button
										href="/products/create"
										size="sm"
										class="bg-primary text-primary-foreground font-bold cursor-pointer mt-1"
									>
										<Plus class="mr-1.5 h-4 w-4" />
										Create Product
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
				of <span class="text-foreground font-bold">{totalCount}</span> products
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

<!-- Product Archive Confirmation Dialog (shared for both roles) -->
<AlertDialog.Root bind:open={isArchiveOpen}>
	<AlertDialog.Content class="border-destructive/20 bg-card p-6 shadow-2xl backdrop-blur-xl">
		<AlertDialog.Header>
			<AlertDialog.Title
				class="text-xl font-bold tracking-tight text-destructive flex items-center gap-2"
			>
				Archive Product
			</AlertDialog.Title>
			<AlertDialog.Description class="text-sm leading-relaxed">
				Are you sure you want to archive product
				<strong
					class="text-foreground font-black bg-muted px-1.5 py-0.5 rounded border border-border/30"
				>
					{productToArchive?.name}
				</strong>?
				<br /><br />
				Archived products will remain in the database but cannot receive stock movements or be dispatched.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<AlertDialog.Footer class="border-t border-border/40 pt-4 flex gap-2 justify-end">
			<AlertDialog.Cancel
				variant="outline"
				class="font-bold cursor-pointer border-border/60 hover:bg-muted"
				disabled={isArchiving}
			>
				Cancel
			</AlertDialog.Cancel>

			<form method="POST" action="?/archiveProduct" use:enhance={handleArchiveEnhance}>
				<input type="hidden" name="id" value={productToArchive?.id} />
				<Button
					type="submit"
					variant="destructive"
					class="font-bold cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-2"
					disabled={isArchiving}
				>
					{#if isArchiving}
						<Loader2 class="h-4 w-4 animate-spin" />
						Archiving...
					{:else}
						Yes, Archive
					{/if}
				</Button>
			</form>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Product Delete Confirmation Dialog (shared for both roles) -->
<AlertDialog.Root bind:open={isDeleteOpen}>
	<AlertDialog.Content class="border-destructive/20 bg-card p-6 shadow-2xl backdrop-blur-xl">
		<AlertDialog.Header>
			<AlertDialog.Title
				class="text-xl font-bold tracking-tight text-destructive flex items-center gap-2"
			>
				Delete Product
			</AlertDialog.Title>
			<AlertDialog.Description class="text-sm leading-relaxed">
				Are you sure you want to permanently delete product
				<strong
					class="text-foreground font-black bg-muted px-1.5 py-0.5 rounded border border-border/30"
				>
					{productToDelete?.name}
				</strong>?
				<br /><br />
				This action is irreversible. It will delete the product, its current inventory, and all associated transactions.
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

			<form method="POST" action="?/deleteProduct" use:enhance={handleDeleteEnhance}>
				<input type="hidden" name="id" value={productToDelete?.id} />
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
						Yes, Delete
					{/if}
				</Button>
			</form>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
