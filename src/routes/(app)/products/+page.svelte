<script lang="ts">
	import { page, navigating } from '$app/state';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { SubmitFunction } from './$types';
	import { toastService } from '$lib/services/toast.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Search,
		Plus,
		Eye,
		Edit2,
		Loader2,
		Package,
		X,
		ShoppingBag,
		Trash2,
		Calendar,
		LayoutGrid,
		List
	} from '@lucide/svelte';
	import type { Product } from '$lib/types';

	let { data } = $props();

	// Role-based detection (Admins & Inventory Managers are "Managers" in Price Monitoring)
	const isManager = $derived(data.user.role === 'admin' || data.user.role === 'inventory_manager');
	const isViewer = $derived(data.user.role === 'viewer');

	// Peso formatter
	function phpFormat(n: number): string {
		return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	// Search state
	let searchQuery = $state('');
	let viewMode = $state<'grid' | 'list'>('grid');

	// Sync local search query state with URL search param
	$effect(() => {
		searchQuery = data.search;
	});

	// Debounced search application
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

	// Delete Modal State
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

		params.set('page', '1');
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	function handlePageChange(newPage: number) {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('page', newPage.toString());
		goto(`?${params.toString()}`);
	}

	// Format updated at date
	function formatRelativeTime(dateStr: string): string {
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString(undefined, {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch {
			return dateStr;
		}
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
	<title>Products Catalog - Price Monitoring System</title>
	<meta
		name="description"
		content="Monitor and manage product lists and quantity-price variants."
	/>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-black tracking-tight">Products Catalog</h2>
			<p class="text-sm text-muted-foreground">Monitor variants and coordinate selling prices.</p>
		</div>
		{#if isManager}
			<div class="flex flex-wrap gap-2.5">
				<Button
					href="/products/create"
					class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-md active:scale-95 cursor-pointer"
				>
					<Plus class="h-5 w-5" aria-hidden="true" />
					Add Product
				</Button>
			</div>
		{/if}
	</div>

	<!-- Search box -->
	<form
		onsubmit={handleSearch}
		class="flex items-center gap-2 bg-card/40 border border-border/40 p-4 rounded-xl backdrop-blur-sm"
	>
		<div class="relative flex-grow max-w-md">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				type="text"
				placeholder="Search products by name..."
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

		<!-- View Switcher Toggle -->
		<div class="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 p-1 rounded-xl shrink-0">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={() => viewMode = 'grid'}
				class="h-8 px-2.5 sm:px-3 font-semibold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 transition-all {viewMode === 'grid' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-neutral-200/30 dark:hover:bg-neutral-800/30'}"
				aria-label="Grid View"
			>
				<LayoutGrid class="h-3.5 w-3.5" />
				<span class="hidden sm:inline">Grid</span>
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={() => viewMode = 'list'}
				class="h-8 px-2.5 sm:px-3 font-semibold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 transition-all {viewMode === 'list' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-neutral-200/30 dark:hover:bg-neutral-800/30'}"
				aria-label="List View"
			>
				<List class="h-3.5 w-3.5" />
				<span class="hidden sm:inline">List</span>
			</Button>
		</div>

		<div class="ml-auto text-xs font-semibold text-muted-foreground hidden sm:block">
			<span class="text-foreground text-sm font-bold bg-muted/50 px-2.5 py-1.5 rounded-lg border border-border/40"
				>{totalCount}</span
			> products
		</div>
	</form>

	<!-- Products Card Grid -->
	<div class="relative min-h-[300px]">
		{#if navigating && navigating.to}
			<div class="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
				<div class="flex flex-col items-center gap-2 rounded-xl bg-card border border-border/80 p-5 shadow-2xl">
					<Loader2 class="h-6 w-6 animate-spin text-primary" />
					<span class="text-xs font-bold text-muted-foreground">Loading catalog...</span>
				</div>
			</div>
		{/if}

		{#if data.products.length > 0}
			{#if viewMode === 'grid'}
				<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each data.products as product (product.id)}
						<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md overflow-hidden flex flex-col justify-between hover:shadow-lg transition-shadow duration-200">
							<div>
								<!-- Product Image / Placeholder -->
								<div class="aspect-video relative bg-muted/30 border-b border-border/40 flex items-center justify-center overflow-hidden">
									{#if product.image_url}
										<img src={product.image_url} alt={product.name} class="h-full w-full object-cover" />
									{:else}
										<div class="flex flex-col items-center gap-1.5 text-muted-foreground/60 select-none">
											<Package class="h-10 w-10" />
											<span class="text-[10px] font-bold">No Photo</span>
										</div>
									{/if}

									<!-- Status Indicator (top right) -->
									<div class="absolute top-2.5 right-2.5">
										{#if product.status === 'active'}
											<Badge class="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-[9px] uppercase tracking-wider py-0.5 px-2">
												Active
											</Badge>
										{:else}
											<Badge class="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold text-[9px] uppercase tracking-wider py-0.5 px-2">
												Inactive
											</Badge>
										{/if}
									</div>
								</div>

								<!-- Content -->
								<div class="p-4 space-y-4">
									<div>
										<h3 class="font-extrabold text-base text-foreground line-clamp-1" title={product.name}>
											{product.name}
										</h3>
										<p class="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-semibold">
											<Calendar class="h-3 w-3" />
											<span>Updated {formatRelativeTime(product.updated_at)}</span>
										</p>
									</div>

									<!-- Variants list/table -->
									<div class="space-y-2">
										<h4 class="text-[10px] font-black uppercase tracking-wider text-muted-foreground/75">Quantity Price points</h4>
										<div class="border border-border/40 rounded-lg overflow-hidden bg-background/25">
											<div class="divide-y divide-border/30">
												{#each product.variants || [] as variant}
													<div class="flex items-center justify-between px-3 py-1.5 text-xs">
														<span class="text-muted-foreground font-semibold">
															{variant.quantity} {variant.quantity === 1 ? 'piece' : 'pieces'}
														</span>
														<span class="font-extrabold text-emerald-500">
															{phpFormat(variant.price)}
														</span>
													</div>
												{:else}
													<div class="p-3 text-center text-xs text-muted-foreground italic font-semibold">
														No variants set.
													</div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							</div>

							<!-- Card Footer / Actions -->
							<div class="p-4 border-t border-border/35 bg-muted/10 flex items-center gap-2 justify-end">
								<Button
									href="/products/{product.id}"
									variant="ghost"
									size="sm"
									class="h-8 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1.5"
								>
									<Eye class="h-3.5 w-3.5" />
									<span>Details</span>
								</Button>

								{#if isManager}
									<Button
										href="/products/{product.id}/edit"
										variant="outline"
										size="sm"
										class="h-8 text-xs font-bold border-border/50 hover:bg-muted cursor-pointer flex items-center gap-1.5"
									>
										<Edit2 class="h-3.5 w-3.5 text-muted-foreground" />
										<span>Edit</span>
									</Button>

									<Button
										onclick={() => openDeleteDialog(product)}
										variant="outline"
										size="sm"
										class="h-8 text-xs font-bold border-border/50 hover:border-destructive/40 hover:bg-destructive/10 text-destructive cursor-pointer flex items-center gap-1.5"
									>
										<Trash2 class="h-3.5 w-3.5" />
										<span>Delete</span>
									</Button>
								{/if}
							</div>
						</Card.Root>
					{/each}
				</div>
			{:else}
				<!-- List View (Tabled list view with no picture) -->
				<div class="border border-neutral-200 dark:border-neutral-800 bg-card rounded-2xl overflow-hidden shadow-sm">
					<div class="overflow-x-auto">
						<table class="w-full border-collapse text-left">
							<thead>
								<tr class="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/10 text-xs font-bold text-muted-foreground tracking-wider uppercase">
									<th class="px-6 py-4 font-extrabold">Product Name</th>
									<th class="px-6 py-4 font-extrabold w-[120px]">Status</th>
									<th class="px-6 py-4 font-extrabold">Selling Prices</th>
									<th class="px-6 py-4 font-extrabold w-[150px]">Updated At</th>
									<th class="px-6 py-4 font-extrabold w-[220px] text-right">Actions</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
								{#each data.products as product (product.id)}
									<tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 transition-colors">
										<!-- Product Name -->
										<td class="px-6 py-4">
											<div class="font-extrabold text-foreground text-base leading-tight">
												{product.name}
											</div>
										</td>

										<!-- Status -->
										<td class="px-6 py-4">
											{#if product.status === 'active'}
												<Badge class="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-[9px] uppercase tracking-wider py-0.5 px-2">
													Active
												</Badge>
											{:else}
												<Badge class="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold text-[9px] uppercase tracking-wider py-0.5 px-2">
													Inactive
												</Badge>
											{/if}
										</td>

										<!-- Selling Prices (horizontal variants list or clean badged list) -->
										<td class="px-6 py-4">
											<div class="flex flex-wrap gap-2">
												{#each product.variants || [] as variant}
													<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-background text-xs">
														<span class="text-muted-foreground font-semibold">
															{variant.quantity} {variant.quantity === 1 ? 'pc' : 'pcs'}
														</span>
														<span class="text-muted-foreground">•</span>
														<span class="font-bold text-emerald-600 dark:text-emerald-400">
															{phpFormat(variant.price)}
														</span>
													</span>
												{:else}
													<span class="text-xs text-muted-foreground italic font-semibold">
														No variants set
													</span>
												{/each}
											</div>
										</td>

										<!-- Updated At -->
										<td class="px-6 py-4 text-xs font-semibold text-muted-foreground whitespace-nowrap">
											{formatRelativeTime(product.updated_at)}
										</td>

										<!-- Actions (Table cell actions) -->
										<td class="px-6 py-4 text-right whitespace-nowrap">
											<div class="inline-flex items-center gap-1.5">
												<Button
													href="/products/{product.id}"
													variant="ghost"
													size="sm"
													class="h-8 px-2.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
												>
													<Eye class="h-3.5 w-3.5" />
													<span>Details</span>
												</Button>

												{#if isManager}
													<Button
														href="/products/{product.id}/edit"
														variant="outline"
														size="sm"
														class="h-8 px-2.5 text-xs font-bold border-border/50 hover:bg-muted cursor-pointer flex items-center gap-1"
													>
														<Edit2 class="h-3.5 w-3.5 text-muted-foreground" />
														<span>Edit</span>
													</Button>

													<Button
														onclick={() => openDeleteDialog(product)}
														variant="outline"
														size="sm"
														class="h-8 px-2.5 text-xs font-bold border-border/50 hover:border-destructive/40 hover:bg-destructive/10 text-destructive cursor-pointer flex items-center gap-1"
													>
														<Trash2 class="h-3.5 w-3.5" />
														<span>Delete</span>
													</Button>
												{/if}
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		{:else}
			<div class="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border/60 bg-card/45 shadow-sm min-h-[300px]">
				<ShoppingBag class="h-12 w-12 text-muted-foreground/60 mb-4" />
				<h3 class="text-lg font-bold text-foreground">No Catalog Products Registered</h3>
				<p class="text-sm text-muted-foreground max-w-sm mt-1">
					Try a different search query or add a new product price profile to begin.
				</p>
				{#if isManager}
					<Button href="/products/create" class="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shrink-0 shadow-sm cursor-pointer">
						<Plus class="h-4 w-4 mr-2" /> Add Product
					</Button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Pagination controls -->
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

<!-- ── Delete Confirmation Dialog ────────────────────────────────────────── -->
<AlertDialog.Root bind:open={isDeleteOpen}>
	<AlertDialog.Content class="border-border/60 bg-card">
		<AlertDialog.Header>
			<AlertDialog.Title class="text-lg font-bold">Are you absolutely sure?</AlertDialog.Title>
			<AlertDialog.Description class="text-sm">
				This action cannot be undone. This will permanently delete the product "{productToDelete?.name}" and all of its associated quantity-price variants.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isDeleting} class="border-border/60 font-semibold hover:bg-muted cursor-pointer">Cancel</AlertDialog.Cancel>
			<form method="POST" action="?/deleteProduct" use:enhance={handleDeleteEnhance}>
				<input type="hidden" name="id" value={productToDelete?.id} />
				<AlertDialog.Action
					type="submit"
					disabled={isDeleting}
					class="bg-destructive text-destructive-foreground hover:bg-destructive/95 font-bold cursor-pointer flex items-center justify-center min-w-[120px]"
				>
					{#if isDeleting}
						<Loader2 class="h-4 w-4 animate-spin mr-1.5" />
						Deleting...
					{:else}
						Delete Product
					{/if}
				</AlertDialog.Action>
			</form>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
