<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ArrowLeft,
		Edit2,
		Package,
		Calendar,
		Info,
		Layers
	} from '@lucide/svelte';

	let { data } = $props();
	const product = $derived(data.product);
	const user = $derived(data.user);

	// Role-based action detection
	const isManager = $derived(user.role === 'admin' || user.role === 'inventory_manager');

	// Peso formatter
	function phpFormat(n: number): string {
		return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	// Format date
	function formatFullDate(dateStr: string): string {
		try {
			return new Date(dateStr).toLocaleString(undefined, {
				weekday: 'short',
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return dateStr;
		}
	}
</script>

<svelte:head>
	<title>{product.name} - Product Details - Price Monitoring System</title>
	<meta
		name="description"
		content="View product information and configured quantity-price variants."
	/>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
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

		{#if isManager && product.status !== 'archived'}
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
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<!-- Left side: Photo card -->
		<div class="md:col-span-1">
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
							<span class="text-xs font-bold">No Photo</span>
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
			</Card.Root>
		</div>

		<!-- Right side: Specifications Profile & Variant List -->
		<div class="md:col-span-2 space-y-6">
			<!-- Profile specifications card -->
			<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md shadow-lg">
				<Card.Header>
					<Card.Title class="text-lg font-bold">Product Profile</Card.Title>
					<Card.Description class="text-sm">General specifications and price details.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="grid grid-cols-3 items-center border-b border-border/30 pb-3">
						<span class="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
							<Package class="h-4 w-4 shrink-0" /> Product Name
						</span>
						<span class="col-span-2 text-sm font-black text-foreground">{product.name}</span>
					</div>

					<div class="grid grid-cols-3 items-center border-b border-border/30 pb-3">
						<span class="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
							<Calendar class="h-4 w-4 shrink-0" /> Last Updated
						</span>
						<span class="col-span-2 text-xs font-mono text-muted-foreground">
							{formatFullDate(product.updated_at)}
						</span>
					</div>

					{#if product.description}
						<div class="space-y-2 pt-1">
							<span class="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
								<Info class="h-4 w-4 shrink-0" /> Product Description
							</span>
							<p
								class="text-sm text-foreground leading-relaxed bg-background/40 border border-border/40 p-4 rounded-xl whitespace-pre-wrap min-h-[60px]"
							>
								{product.description}
							</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Variants pricing card -->
			<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md shadow-lg">
				<Card.Header class="pb-2">
					<div class="flex items-center gap-2">
						<Layers class="h-5 w-5 text-emerald-500" />
						<Card.Title class="text-lg font-bold">Quantity Price Variants</Card.Title>
					</div>
					<Card.Description class="text-sm">Configured selling prices for quantity batches.</Card.Description>
				</Card.Header>
				<Card.Content class="pt-4">
					<div class="border border-border/40 rounded-xl overflow-hidden bg-background/25">
						<table class="w-full text-left border-collapse text-sm" aria-label="Product quantity price variants overview">
							<thead>
								<tr class="border-b border-border bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
									<th class="p-3">Quantity</th>
									<th class="p-3 text-right">Price</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border/30">
								{#each product.variants || [] as variant}
									<tr class="hover:bg-muted/10 transition-colors">
										<td class="p-3 font-semibold text-foreground">
											{variant.quantity} {variant.quantity === 1 ? 'piece' : 'pieces'}
										</td>
										<td class="p-3 text-right">
											<span class="text-base font-black text-emerald-500">{phpFormat(variant.price)}</span>
										</td>
									</tr>
								{:else}
									<tr>
										<td colspan="2" class="p-4 text-center text-xs font-semibold text-muted-foreground italic">
											No quantity price variants configured.
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
