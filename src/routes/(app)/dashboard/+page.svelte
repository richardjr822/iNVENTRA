<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Package, TrendingUp, Shield, Layers, Clock, ArrowRight } from '@lucide/svelte';

	let { data } = $props();
	const user = $derived(data.user);

	// Derived metrics
	const totalProducts = $derived(data.totalProducts ?? 0);
	const totalVariants = $derived(data.totalVariants ?? 0);
	const recentlyUpdated = $derived(data.recentlyUpdated || []);

	// Peso formatter
	function phpFormat(n: number): string {
		return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	// Format updated at date
	function formatRelativeTime(dateStr: string): string {
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return dateStr;
		}
	}

	// Role details
	const roleDetails = $derived(
		{
			admin: {
				name: 'Administrator',
				color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30'
			},
			inventory_manager: {
				name: 'Price Manager',
				color: 'bg-amber-500/10 text-amber-500 border-amber-500/30'
			},
			viewer: {
				name: 'Guest Viewer',
				color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
			}
		}[user.role] || { name: 'User', color: 'bg-muted text-muted-foreground border-border' }
	);
</script>

<svelte:head>
	<title>Dashboard - Price Monitoring System</title>
	<meta
		name="description"
		content="System dashboard showing total products, quantity variants, and price catalog metrics."
	/>
</svelte:head>

<!-- Welcome banner card -->
<div
	class="mb-8 flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/45 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:bg-card/25"
>
	<div class="space-y-1">
		<h2 class="text-2xl font-black tracking-tight">Price Dashboard</h2>
		<p class="text-sm text-muted-foreground">
			Welcome back, <strong class="text-foreground">{user.fullName}</strong>. You have logged in
			with <strong class="text-foreground">{roleDetails.name}</strong> access levels.
		</p>
	</div>

	<div
		class="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-2 text-xs font-semibold text-indigo-500 w-fit"
	>
		<Shield class="h-4 w-4 shrink-0" aria-hidden="true" />
		<span>Authorized price monitoring permissions active.</span>
	</div>
</div>

<!-- KPI Cards Grid -->
<div class="grid gap-6 sm:grid-cols-2 mb-8">
	<!-- Total Products -->
	<Card.Root
		class="border-border/40 bg-card/60 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
	>
		<Card.Header class="flex flex-row items-center justify-between pb-2">
			<Card.Title class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
				Total Products
			</Card.Title>
			<div
				class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500"
				aria-hidden="true"
			>
				<Package class="h-4 w-4" />
			</div>
		</Card.Header>
		<Card.Content>
			<div class="text-4xl font-black tracking-tight">{totalProducts}</div>
			<p class="mt-1 text-xs text-muted-foreground">Active products in your price catalog</p>
		</Card.Content>
	</Card.Root>

	<!-- Total Quantity Variants -->
	<Card.Root
		class="border-border/40 bg-card/60 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
	>
		<Card.Header class="flex flex-row items-center justify-between pb-2">
			<Card.Title class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
				Total Price Variants
			</Card.Title>
			<div
				class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"
				aria-hidden="true"
			>
				<Layers class="h-4 w-4" />
			</div>
		</Card.Header>
		<Card.Content>
			<div class="text-4xl font-black tracking-tight text-emerald-500">{totalVariants}</div>
			<p class="mt-1 text-xs text-muted-foreground">Configured quantity-price variant combinations</p>
		</Card.Content>
	</Card.Root>
</div>

<!-- Main content panel -->
<div class="grid gap-6 lg:grid-cols-3">
	<!-- Recently Updated Products List (2 cols) -->
	<Card.Root class="border-border/40 bg-card/60 shadow-sm lg:col-span-2">
		<Card.Header class="pb-2 flex flex-row items-center justify-between">
			<div>
				<Card.Title class="text-lg font-bold">Recently Updated Products</Card.Title>
				<Card.Description class="text-sm">Latest product price adjustments.</Card.Description>
			</div>
			<div
				class="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/20"
			>
				<Clock class="h-3.5 w-3.5" />
				<span>Live Tracker</span>
			</div>
		</Card.Header>
		<Card.Content class="pt-4">
			{#if recentlyUpdated.length > 0}
				<div class="space-y-4">
					{#each recentlyUpdated as product (product.id)}
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-background/30 backdrop-blur-sm">
							<!-- Left details -->
							<div class="flex items-center gap-3">
								<div class="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-border/40 bg-muted flex items-center justify-center">
									{#if product.image_url}
										<img src={product.image_url} alt={product.name} class="h-full w-full object-cover" />
									{:else}
										<Package class="h-5 w-5 text-muted-foreground" />
									{/if}
								</div>
								<div>
									<h4 class="font-bold text-sm text-foreground">{product.name}</h4>
									<p class="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
										<span>Last updated:</span>
										<span class="font-mono">{formatRelativeTime(product.updated_at)}</span>
									</p>
								</div>
							</div>

							<!-- Right variants list -->
							<div class="flex flex-wrap gap-1.5 max-w-md justify-end sm:self-center">
								{#each product.variants as variant}
									<span class="inline-flex items-center rounded-lg border border-border/50 bg-background/50 px-2 py-1 text-xs font-semibold text-foreground">
										{variant.quantity} {variant.quantity === 1 ? 'pc' : 'pcs'} = <strong class="text-emerald-500 ml-1">{phpFormat(variant.price)}</strong>
									</span>
								{:else}
									<span class="text-xs text-muted-foreground font-semibold italic">No variants configured</span>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
					<Package class="h-10 w-10 text-muted-foreground/45 mb-2" />
					<span class="text-xs font-semibold">No products registered in the system yet.</span>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Quick Actions & Links (1 col) -->
	<Card.Root class="border-border/40 bg-card/60 shadow-sm lg:col-span-1 flex flex-col justify-between">
		<Card.Header>
			<Card.Title class="text-lg font-bold">Quick Actions</Card.Title>
			<Card.Description class="text-sm">Manage products and price points.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4 flex-grow">
			<div class="space-y-3">
				<Button
					href="/products"
					variant="default"
					class="w-full h-11 font-bold tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all"
				>
					<span>View Products Catalog</span>
					<ArrowRight class="h-4 w-4" />
				</Button>

				{#if user.role !== 'viewer'}
					<Button
						href="/products/create"
						variant="outline"
						class="w-full h-11 font-bold border-border/60 hover:bg-muted cursor-pointer active:scale-95 transition-all"
					>
						<span>Add New Product</span>
					</Button>
				{/if}
			</div>

			<div class="rounded-xl border border-border/40 p-4 bg-muted/10 space-y-2 mt-4 text-left">
				<h4 class="font-bold text-xs uppercase tracking-wider text-muted-foreground">System Guidelines</h4>
				<ul class="list-disc list-inside text-xs text-muted-foreground/90 space-y-1.5 leading-relaxed">
					<li>Products must have at least one variant.</li>
					<li>Add variants inside the Product form.</li>
					<li>Pricing updates instantly for all managers.</li>
				</ul>
			</div>
		</Card.Content>
	</Card.Root>
</div>
