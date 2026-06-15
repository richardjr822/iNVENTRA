<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ArrowLeft,
		Edit2,
		Package,
		TrendingUp,
		FileText,
		Calendar,
		User,
		Info,
		PlusCircle,
		MinusCircle
	} from '@lucide/svelte';

	let { data } = $props();
	const product = $derived(data.product);
	const transactions = $derived(data.transactions);
	const user = $derived(data.user);

	// Derived stock safety status properties
	const stockQty = $derived(product.quantity || 0);
	const stockStatus = $derived(() => {
		if (stockQty <= 0) {
			return {
				label: 'Out of Stock',
				bg: 'bg-red-500/10 text-red-500 border-red-500/20',
				dot: 'bg-red-500'
			};
		} else if (stockQty <= 10) {
			return {
				label: 'Low Stock',
				bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
				dot: 'bg-amber-500'
			};
		} else {
			return {
				label: 'In Stock',
				bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
				dot: 'bg-emerald-500'
			};
		}
	});

	const isViewer = $derived(user.role === 'viewer');
</script>

<svelte:head>
	<title>{product.name} - Product Details - Inventra</title>
	<meta
		name="description"
		content="View product catalog profile, pricing, identifiers, current stock safety status, and historical ledger transactions."
	/>
</svelte:head>

<div class="max-w-6xl mx-auto space-y-6">
	<!-- Navigation and Action bar -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<a
				href="/products"
				class="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
			>
				<ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
				Back to Products
			</a>
		</div>

		{#if !isViewer && product.status !== 'archived'}
			<Button
				href="/products/{product.id}/edit"
				class="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shrink-0 cursor-pointer shadow-sm shadow-primary/15"
			>
				<Edit2 class="mr-2 h-4 w-4" />
				Edit Product
			</Button>
		{/if}
	</div>

	<!-- Main Details Grid Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left: Image & Quick KPI Cards -->
		<div class="space-y-6 lg:col-span-1">
			<!-- Image Card -->
			<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md overflow-hidden shadow-lg">
				<div
					class="aspect-square relative flex items-center justify-center bg-muted/30 border-b border-border/40"
				>
					{#if product.image_url}
						<img
							src={product.image_url}
							alt={product.name}
							class="h-full w-full object-cover"
							onerror={(e) => {
								(e.currentTarget as HTMLImageElement).style.display = 'none';
							}}
						/>
					{:else}
						<div class="flex flex-col items-center gap-2 text-muted-foreground/60 select-none">
							<Package class="h-16 w-16" />
							<span class="text-xs font-bold">No Image Provided</span>
						</div>
					{/if}

					<!-- Status Badge Top Right -->
					<div class="absolute top-3 right-3">
						{#if product.status === 'active'}
							<Badge
								class="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-[10px] uppercase"
							>
								Active
							</Badge>
						{:else if product.status === 'inactive'}
							<Badge
								class="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold text-[10px] uppercase"
							>
								Inactive
							</Badge>
						{:else}
							<Badge
								class="bg-muted text-muted-foreground border border-border font-bold text-[10px] uppercase"
							>
								Archived
							</Badge>
						{/if}
					</div>
				</div>

				<Card.Content class="p-5 space-y-4">
					<div>
						<h3 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Product SKU
						</h3>
						<p class="font-mono text-base font-black text-foreground select-all mt-0.5">
							{product.sku}
						</p>
					</div>

					{#if product.barcode}
						<div>
							<h3 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
								Barcode (UPC/EAN)
							</h3>
							<p class="font-mono text-sm font-semibold text-muted-foreground mt-0.5">
								{product.barcode}
							</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Stock Safety Level KPI Card -->
			<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md shadow-md">
				<Card.Header class="pb-2">
					<Card.Title class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
						Stock Safety Level
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="flex items-baseline justify-between">
						<span class="text-4xl font-black tracking-tight">{stockQty}</span>
						<span class="text-xs font-bold text-muted-foreground">Units Available</span>
					</div>

					<div class="flex items-center gap-2 rounded-xl border p-3.5 {stockStatus().bg}">
						<span class="h-2.5 w-2.5 rounded-full {stockStatus().dot} animate-pulse"></span>
						<span class="text-xs font-black uppercase tracking-wider">{stockStatus().label}</span>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Right: Catalog Details & History Ledger -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Product Catalog Specifications Profile -->
			<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md shadow-lg">
				<Card.Header>
					<Card.Title class="text-lg font-bold">Catalog Profile</Card.Title>
					<Card.Description class="text-sm">Specifications and taxonomy details.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-5">
					<div class="grid grid-cols-3 items-center border-b border-border/30 pb-3">
						<span class="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
							<Package class="h-4 w-4 shrink-0" /> Product Name
						</span>
						<span class="col-span-2 text-sm font-black text-foreground">{product.name}</span>
					</div>

					<div class="grid grid-cols-3 items-center border-b border-border/30 pb-3">
						<span class="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
							<Info class="h-4 w-4 shrink-0" /> Category
						</span>
						<span class="col-span-2 text-sm font-bold text-foreground">
							{product.category_name || '—'}
						</span>
					</div>

					<div class="grid grid-cols-3 items-center border-b border-border/30 pb-3">
						<span class="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
							<TrendingUp class="h-4 w-4 shrink-0" /> Unit Price (USD)
						</span>
						<span class="col-span-2 text-sm font-mono font-black text-emerald-500">
							${Number(product.price).toFixed(2)}
						</span>
					</div>

					<div class="grid grid-cols-3 items-center border-b border-border/30 pb-3">
						<span class="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
							<Calendar class="h-4 w-4 shrink-0" /> Created Date
						</span>
						<span class="col-span-2 text-xs font-mono text-muted-foreground">
							{new Date(product.created_at).toLocaleString(undefined, {
								weekday: 'short',
								year: 'numeric',
								month: 'long',
								day: 'numeric',
								hour: '2-digit',
								minute: '2-digit'
							})}
						</span>
					</div>

					<div class="space-y-2">
						<span class="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
							<FileText class="h-4 w-4 shrink-0" /> Product Description
						</span>
						<p
							class="text-sm text-foreground leading-relaxed bg-background/40 border border-border/40 p-4 rounded-xl whitespace-pre-wrap min-h-[80px]"
						>
							{product.description || 'No description provided.'}
						</p>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Historical Stock Transaction Ledger -->
			<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md shadow-lg">
				<Card.Header>
					<Card.Title class="text-lg font-bold">Recent Stock movements</Card.Title>
					<Card.Description class="text-sm"
						>Historical ledger transactions of stock entries and dispatches.</Card.Description
					>
				</Card.Header>
				<Card.Content>
					<div class="overflow-x-auto rounded-xl border border-border/50">
						<table class="w-full text-left border-collapse text-sm">
							<thead>
								<tr class="border-b border-border bg-muted/30">
									<th class="p-3 font-bold text-xs uppercase text-muted-foreground tracking-wider"
										>Date</th
									>
									<th class="p-3 font-bold text-xs uppercase text-muted-foreground tracking-wider"
										>Type</th
									>
									<th
										class="p-3 font-bold text-xs uppercase text-muted-foreground tracking-wider text-right"
										>Qty</th
									>
									<th class="p-3 font-bold text-xs uppercase text-muted-foreground tracking-wider"
										>Logged By</th
									>
									<th class="p-3 font-bold text-xs uppercase text-muted-foreground tracking-wider"
										>Remarks</th
									>
								</tr>
							</thead>
							<tbody class="divide-y divide-border/50">
								{#if transactions.length > 0}
									{#each transactions as tx (tx.id)}
										<tr class="hover:bg-muted/10 transition-colors">
											<!-- Date -->
											<td class="p-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
												{new Date(tx.created_at).toLocaleDateString(undefined, {
													month: 'short',
													day: 'numeric',
													hour: '2-digit',
													minute: '2-digit'
												})}
											</td>

											<!-- Type -->
											<td class="p-3 text-xs">
												{#if tx.transaction_type === 'STOCK_IN' || tx.transaction_type === 'RETURN'}
													<span class="inline-flex items-center gap-1 font-bold text-emerald-500">
														<PlusCircle class="h-3.5 w-3.5" />
														{tx.transaction_type === 'STOCK_IN' ? 'Stock In' : 'Return'}
													</span>
												{:else if tx.transaction_type === 'STOCK_OUT' || tx.transaction_type === 'DAMAGED'}
													<span class="inline-flex items-center gap-1 font-bold text-red-500">
														<MinusCircle class="h-3.5 w-3.5" />
														{tx.transaction_type === 'STOCK_OUT' ? 'Stock Out' : 'Damaged'}
													</span>
												{:else}
													<span class="inline-flex items-center gap-1 font-bold text-blue-500">
														<Info class="h-3.5 w-3.5" /> Adjustment
													</span>
												{/if}
											</td>

											<!-- Qty -->
											<td class="p-3 text-xs font-bold text-right whitespace-nowrap">
												<span
													class={['STOCK_IN', 'RETURN'].includes(tx.transaction_type)
														? 'text-emerald-500'
														: ['STOCK_OUT', 'DAMAGED'].includes(tx.transaction_type)
															? 'text-red-500'
															: 'text-blue-500'}
												>
													{['STOCK_IN', 'RETURN'].includes(tx.transaction_type) ? '+' : ''}
													{['STOCK_OUT', 'DAMAGED'].includes(tx.transaction_type) ? '-' : ''}
													{tx.quantity}
												</span>
											</td>

											<!-- Logged By -->
											<td class="p-3 text-xs text-muted-foreground">
												<span class="inline-flex items-center gap-1 font-semibold text-foreground">
													<User class="h-3.5 w-3.5 text-muted-foreground/60" />
													{tx.user_full_name || 'System'}
												</span>
											</td>

											<!-- Remarks -->
											<td
												class="p-3 text-xs text-muted-foreground truncate max-w-[200px]"
												title={tx.remarks}
											>
												{tx.remarks || '—'}
											</td>
										</tr>
									{/each}
								{:else}
									<tr>
										<td
											colspan="5"
											class="p-8 text-center text-xs font-semibold text-muted-foreground"
										>
											No stock movements logged for this product.
										</td>
									</tr>
								{/if}
							</tbody>
						</table>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
