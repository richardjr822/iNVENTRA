<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { toastService } from '$lib/services/toast.svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import {
		Package,
		Tags,
		AlertTriangle,
		TrendingUp,
		DollarSign,
		Shield,
		Plus,
		Minus,
		XCircle,
		Database
	} from '@lucide/svelte';

	// SvelteKit layout page data prop containing user info and stats
	let { data } = $props();
	const user = $derived(data.user);

	// Role detection
	const isManager = $derived(user.role === 'inventory_manager');

	// ── PHP Peso formatter ─────────────────────────────────────────────────────
	function phpFormat(n: number): string {
		return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	const totalProducts = $derived(data.totalProducts ?? 0);
	const categoriesCount = $derived(data.categoriesCount ?? 0);
	const currentInventoryValue = $derived(data.currentInventoryValue ?? 0);
	const lowStockAlerts = $derived(data.lowStockAlerts ?? 0);
	const outOfStockCount = $derived(data.outOfStockCount ?? 0);
	const products = $derived(data.products || []);
	const chartData = $derived(data.chartData || []);

	// Action Permissions based on authenticated user roles
	const canManageInventory = $derived(user.role === 'admin' || user.role === 'inventory_manager');

	// Toast notification callback on form actions execution
	const handleStockAction: SubmitFunction = () => {
		return async ({ result }) => {
			if (result.type === 'success') {
				const msg = (result.data as any)?.message || 'Transaction executed successfully!';
				toastService.trigger(msg, 'success');
			} else if (result.type === 'failure') {
				const err = (result.data as any)?.error || 'Transaction failed.';
				toastService.trigger(err, 'error');
			}
		};
	};

	// SVG Line Chart coordinates calculation for stock movement trends
	const margin = { top: 20, right: 30, bottom: 30, left: 45 };
	const width = 600;
	const height = 240;

	const quantities = $derived(chartData.map((d) => d.quantity));
	const minVal = $derived(Math.min(0, ...quantities));
	const maxVal = $derived(Math.max(10, Math.ceil(Math.max(...quantities) * 1.15)));

	const points = $derived.by(() => {
		if (chartData.length === 0) return [];
		const xStep =
			(width - margin.left - margin.right) / (chartData.length > 1 ? chartData.length - 1 : 1);
		const yHeight = height - margin.top - margin.bottom;

		return chartData.map((d, index) => {
			const x = margin.left + index * xStep;
			const y = margin.top + yHeight - ((d.quantity - minVal) / (maxVal - minVal)) * yHeight;
			return { x, y, quantity: d.quantity, date: d.date };
		});
	});

	const linePath = $derived.by(() => {
		if (points.length === 0) return '';
		return points.reduce((path, p, i) => {
			return i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
		}, '');
	});

	const areaPath = $derived.by(() => {
		if (points.length === 0) return '';
		const yHeight = height - margin.top - margin.bottom;
		const bottomY = margin.top + yHeight;
		const first = points[0];
		const last = points[points.length - 1];
		return `${linePath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
	});

	const gridLines = $derived.by(() => {
		const lines = [];
		const yHeight = height - margin.top - margin.bottom;
		const step = (maxVal - minVal) / 4;
		for (let i = 0; i <= 4; i++) {
			const val = Math.round(minVal + i * step);
			const y = margin.top + yHeight - ((val - minVal) / (maxVal - minVal)) * yHeight;
			lines.push({ y, label: val });
		}
		return lines;
	});

	// Role description config
	const roleDetails = $derived(
		{
			admin: {
				name: 'Administrator',
				color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30'
			},
			inventory_manager: {
				name: 'Inventory Manager',
				color: 'bg-amber-500/10 text-amber-500 border-amber-500/30'
			},
			viewer: {
				name: 'Guest Viewer',
				color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
			}
		}[user.role]
	);
</script>

<svelte:head>
	<title>Dashboard - Inventra Inventory Management</title>
	<meta
		name="description"
		content="System overview with KPI metrics, stock health indicators, and quick inventory operations."
	/>
</svelte:head>

<!-- Welcome banner card -->
<div
	class="mb-8 flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/45 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:bg-card/25"
>
	<div class="space-y-1">
		<h2 class="text-2xl font-black tracking-tight">{isManager ? 'Store Dashboard' : 'System Dashboard'}</h2>
		<p class="text-sm text-muted-foreground">
			Welcome back, <strong class="text-foreground">{user.fullName}</strong>. You have logged in
			with <strong class="text-foreground">{roleDetails.name}</strong> access levels.
		</p>
	</div>

	<div
		class="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-2 text-xs font-semibold text-indigo-500 w-fit"
	>
		<Shield class="h-4 w-4 shrink-0" aria-hidden="true" />
		<span>Authorized permissions enabled for your profile.</span>
	</div>
</div>

{#if isManager}
<!-- Manager KPI Cards (4 focused cards: Products, Value, Low Stock, Out of Stock) -->
<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
	<!-- Total Products -->
	<Card.Root
		class="border-border/40 bg-card/60 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
	>
		<Card.Header class="flex flex-row items-center justify-between pb-2">
			<Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
			<div class="text-3xl font-black tracking-tight">{totalProducts}</div>
			<p class="mt-1 text-xs text-muted-foreground">Items in your store</p>
		</Card.Content>
	</Card.Root>

	<!-- Inventory Value (₱) -->
	<Card.Root
		class="border-border/40 bg-card/60 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
	>
		<Card.Header class="flex flex-row items-center justify-between pb-2">
			<Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Inventory Value
			</Card.Title>
			<div
				class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"
				aria-hidden="true"
			>
				<TrendingUp class="h-4 w-4" />
			</div>
		</Card.Header>
		<Card.Content>
			<div class="text-2xl font-black tracking-tight text-emerald-500">
				{phpFormat(currentInventoryValue)}
			</div>
			<p class="mt-1 text-xs text-muted-foreground">Total stock value</p>
		</Card.Content>
	</Card.Root>

	<!-- Low Stock Items -->
	<Card.Root
		class="border-border/40 bg-card/60 shadow-sm backdrop-blur-sm border-l-4 border-l-amber-500 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
	>
		<Card.Header class="flex flex-row items-center justify-between pb-2">
			<Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Low Stock Items
			</Card.Title>
			<div
				class="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500"
				aria-hidden="true"
			>
				<AlertTriangle class="h-4 w-4" />
			</div>
		</Card.Header>
		<Card.Content>
			<div class="text-3xl font-black tracking-tight text-amber-500">{lowStockAlerts}</div>
			<p class="mt-1 text-xs text-muted-foreground">Need restocking soon</p>
		</Card.Content>
	</Card.Root>

	<!-- Out of Stock Items -->
	<Card.Root
		class="border-border/40 bg-card/60 shadow-sm backdrop-blur-sm border-l-4 border-l-destructive transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
	>
		<Card.Header class="flex flex-row items-center justify-between pb-2">
			<Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Out of Stock
			</Card.Title>
			<div
				class="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
				aria-hidden="true"
			>
				<XCircle class="h-4 w-4" />
			</div>
		</Card.Header>
		<Card.Content>
			<div class="text-3xl font-black tracking-tight text-destructive">{outOfStockCount}</div>
			<p class="mt-1 text-xs text-muted-foreground">Need restocking urgently</p>
		</Card.Content>
	</Card.Root>
</div>
{:else}
<!-- KPI Cards Grid (shadcn Cards) -->
<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
	<!-- Total Products -->
	<Card.Root
		class="border-border/40 bg-card/60 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
	>
		<Card.Header class="flex flex-row items-center justify-between pb-2">
			<Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Total SKUs
			</Card.Title>
			<div
				class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500"
				aria-hidden="true"
			>
				<Package class="h-4 w-4" />
			</div>
		</Card.Header>
		<Card.Content>
			<div class="text-3xl font-black tracking-tight">{totalProducts}</div>
			<p class="mt-1 text-xs text-muted-foreground">Active inventory catalog products</p>
		</Card.Content>
	</Card.Root>

	<!-- Total Categories -->
	<Card.Root
		class="border-border/40 bg-card/60 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
	>
		<Card.Header class="flex flex-row items-center justify-between pb-2">
			<Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Total Categories
			</Card.Title>
			<div
				class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"
				aria-hidden="true"
			>
				<Tags class="h-4 w-4" />
			</div>
		</Card.Header>
		<Card.Content>
			<div class="text-3xl font-black tracking-tight">{categoriesCount}</div>
			<p class="mt-1 text-xs text-muted-foreground">Unique departments structured</p>
		</Card.Content>
	</Card.Root>

	<!-- Current Inventory Value -->
	<Card.Root
		class="border-border/40 bg-card/60 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
	>
		<Card.Header class="flex flex-row items-center justify-between pb-2">
			<Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Inventory Value
			</Card.Title>
			<div
				class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"
				aria-hidden="true"
			>
				<DollarSign class="h-4 w-4" />
			</div>
		</Card.Header>
		<Card.Content>
			<div class="text-3xl font-black tracking-tight text-emerald-500">
				${currentInventoryValue.toLocaleString('en-US', {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2
				})}
			</div>
			<p class="mt-1 text-xs text-muted-foreground">Asset value based on cost price</p>
		</Card.Content>
	</Card.Root>

	<!-- Low Stock Items -->
	<Card.Root
		class="border-border/40 bg-card/60 shadow-sm backdrop-blur-sm border-l-4 border-l-amber-500 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
	>
		<Card.Header class="flex flex-row items-center justify-between pb-2">
			<Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Low Stock Alerts
			</Card.Title>
			<div
				class="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500"
				aria-hidden="true"
			>
				<AlertTriangle class="h-4 w-4" />
			</div>
		</Card.Header>
		<Card.Content>
			<div class="text-3xl font-black tracking-tight text-amber-500">{lowStockAlerts}</div>
			<p class="mt-1 text-xs text-muted-foreground">Items below threshold safety limit</p>
		</Card.Content>
	</Card.Root>
</div>
{/if}

<!-- 30-Day Stock Movement Trend Chart (Visual Database Insights) -->
<Card.Root class="border-border/40 bg-card/60 shadow-sm backdrop-blur-sm mb-8">
	<Card.Header class="pb-2 flex flex-row items-center justify-between">
		<div>
			<Card.Title class="text-lg font-bold">System Stock Movement trends</Card.Title>
			<Card.Description class="text-sm">Daily net transaction volume over the last 30 days.</Card.Description>
		</div>
		<div
			class="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-inner"
		>
			<TrendingUp class="h-4 w-4" />
			<span>Running Volume</span>
		</div>
	</Card.Header>
	<Card.Content class="pt-4">
		{#if chartData.length > 0 && chartData[0].quantity !== 0}
			<div class="w-full h-[240px] select-none">
				<svg viewBox="0 0 {width} {height}" class="w-full h-full text-card-foreground">
					<defs>
						<!-- Area gradient -->
						<linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
							<stop
								offset="0%"
								stop-color="var(--color-emerald-500, #10b981)"
								stop-opacity="0.25"
							/>
							<stop
								offset="100%"
								stop-color="var(--color-emerald-500, #10b981)"
								stop-opacity="0.0"
							/>
						</linearGradient>
						<!-- Line gradient -->
						<linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
							<stop offset="0%" stop-color="var(--color-emerald-500, #10b981)" />
							<stop offset="100%" stop-color="var(--color-teal-500, #14b8a6)" />
						</linearGradient>
					</defs>

					<!-- Y-Axis Gridlines & labels -->
					{#each gridLines as line (line.label)}
						<line
							x1={margin.left}
							y1={line.y}
							x2={width - margin.right}
							y2={line.y}
							stroke="currentColor"
							stroke-opacity="0.1"
							stroke-width="1"
						/>
						<text
							x={margin.left - 8}
							y={line.y + 4}
							text-anchor="end"
							class="fill-muted-foreground font-mono font-bold text-[10px]"
						>
							{line.label}
						</text>
					{/each}

					<!-- Area underneath line -->
					{#if areaPath}
						<path d={areaPath} fill="url(#areaGrad)" />
					{/if}

					<!-- Connection Line -->
					{#if linePath}
						<path
							d={linePath}
							fill="none"
							stroke="url(#lineGrad)"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					{/if}

					<!-- Data Point Dots -->
					{#each points as pt (pt.x + '_' + pt.quantity)}
						<circle
							cx={pt.x}
							cy={pt.y}
							r="3.5"
							fill="var(--color-card, #1c1917)"
							stroke="var(--color-emerald-500, #10b981)"
							stroke-width="2"
						/>
					{/each}

					<!-- X-Axis Labels (Timeline) -->
					{#if points.length > 0}
						<text
							x={points[0].x}
							y={height - 8}
							text-anchor="start"
							class="fill-muted-foreground font-semibold text-[9px]"
						>
							{points[0].date}
						</text>

						{#if points.length > 2}
							{@const midIdx = Math.floor(points.length / 2)}
							<text
								x={points[midIdx].x}
								y={height - 8}
								text-anchor="middle"
								class="fill-muted-foreground font-semibold text-[9px]"
							>
								{points[midIdx].date}
							</text>
						{/if}

						{#if points.length > 1}
							<text
								x={points[points.length - 1].x}
								y={height - 8}
								text-anchor="end"
								class="fill-muted-foreground font-semibold text-[9px]"
							>
								{points[points.length - 1].date}
							</text>
						{/if}
					{/if}
				</svg>
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
				<TrendingUp class="h-10 w-10 text-muted-foreground/45 mb-2" />
				<span class="text-xs font-semibold">No stock movement recorded in the last 30 days.</span>
			</div>
		{/if}
	</Card.Content>
</Card.Root>

{#if products.length === 0}
	<!-- Production Ready empty state handler -->
	<div class="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border/60 bg-card/45 shadow-sm dark:bg-card/25">
		<Package class="h-12 w-12 text-muted-foreground/60 mb-4" />
		<h3 class="text-lg font-bold text-foreground">No Catalog Products Registered</h3>
		<p class="text-sm text-muted-foreground max-w-sm mt-1">
			Get started by adding products to your catalog to view stock levels, track inventory values, and record transactions.
		</p>
		{#if canManageInventory}
			<Button href="/products" class="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shrink-0">
				<Plus class="h-4 w-4 mr-2" /> Manage Products
			</Button>
		{/if}
	</div>
{:else}
	<!-- Manager Main Section: Stock health + Quick ops -->
	{#if isManager}
	<div class="grid gap-6 md:grid-cols-3">
		<!-- Left: Stock health bars -->
		<Card.Root class="border-border/40 bg-card/60 shadow-sm md:col-span-1">
			<Card.Header>
				<Card.Title class="text-lg font-bold">Stock Levels</Card.Title>
				<Card.Description>Current stock for each product.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-5">
				{#each products as product (product.id)}
					<div class="space-y-1.5">
						<div class="flex items-center justify-between text-xs">
							<span class="font-bold truncate max-w-[130px]">{product.name}</span>
							<div class="flex items-center gap-1.5 shrink-0">
								<span class="font-mono">{product.stock} Units</span>
								{#if product.stock === 0}
									<span
										class="rounded bg-destructive/10 px-1 text-[8px] font-black text-destructive uppercase border border-destructive/20"
										>EMPTY</span
									>
								{:else if product.stock < product.minStock}
									<span
										class="rounded bg-amber-500/10 px-1 text-[8px] font-black text-amber-500 uppercase border border-amber-500/20"
										>LOW</span
									>
								{:else}
									<span
										class="rounded bg-emerald-500/10 px-1 text-[8px] font-black text-emerald-500 uppercase border border-emerald-500/20"
										>OK</span
									>
								{/if}
							</div>
						</div>

						<div class="h-2 w-full rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={product.stock} aria-valuemin={0} aria-valuemax={120} aria-label="{product.name} stock level">
							<div
								class="h-full rounded-full transition-all duration-500 {product.stock === 0
									? 'bg-gradient-to-r from-destructive to-destructive/70'
									: product.stock < product.minStock
										? 'bg-gradient-to-r from-amber-500 to-amber-600'
										: 'bg-gradient-to-r from-emerald-500 to-emerald-600'}"
								style="width: {Math.min(100, (product.stock / 120) * 100)}%"
							></div>
						</div>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>

		<!-- Right: Quick stock actions (simplified, no SKU column) -->
		<Card.Root class="border-border/40 bg-card/60 shadow-sm md:col-span-2">
			<Card.Header>
				<Card.Title class="text-lg font-bold">Quick Stock Actions</Card.Title>
				<Card.Description>Add or remove stock for any product.</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="overflow-x-auto rounded-xl border border-border/50">
					<table class="w-full text-left border-collapse text-sm" aria-label="Quick stock operations">
						<thead>
							<tr class="border-b border-border bg-muted/30">
								<th class="p-3 font-semibold text-xs" scope="col">Product Name</th>
								<th class="p-3 font-semibold text-xs text-center" scope="col">In Stock</th>
								<th class="p-3 font-semibold text-xs text-right" scope="col">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border/50">
							{#each products as product (product.id)}
								<tr class="hover:bg-muted/10 transition-colors">
									<td class="p-3 font-semibold text-sm">{product.name}</td>
									<td class="p-3 text-center text-xs">
										<span
											class="font-bold {product.stock === 0
												? 'text-destructive font-extrabold'
												: product.stock < product.minStock
													? 'text-amber-500 font-extrabold'
													: ''}"
										>
											{product.stock}
										</span>
									</td>
									<td class="p-3 text-right">
										<div class="inline-flex gap-1.5">
											<!-- Add Stock Form Action -->
											<form method="POST" action="?/stockIn" use:enhance={handleStockAction} class="inline">
												<input type="hidden" name="productId" value={product.id} />
												<Button
													type="submit"
													variant="outline"
													size="sm"
													class="h-8 px-3 flex items-center gap-1 hover:border-emerald-500/40 hover:text-emerald-500 cursor-pointer text-xs font-bold"
													aria-label="Add stock for {product.name}"
												>
													<Plus class="h-3 w-3" aria-hidden="true" />
													Add Stock
												</Button>
											</form>

											<!-- Remove Stock Form Action -->
											<form method="POST" action="?/stockOut" use:enhance={handleStockAction} class="inline">
												<input type="hidden" name="productId" value={product.id} />
												<Button
													type="submit"
													variant="outline"
													size="sm"
													class="h-8 px-3 flex items-center gap-1 hover:border-destructive/40 hover:text-destructive cursor-pointer text-xs font-bold"
													aria-label="Remove stock for {product.name}"
												>
													<Minus class="h-3 w-3" aria-hidden="true" />
													Remove
												</Button>
											</form>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="mt-3 text-xs text-muted-foreground text-center">
					Go to <a href="/inventory" class="text-primary font-bold hover:underline">Inventory</a> for full stock management.
				</p>
			</Card.Content>
		</Card.Root>
	</div>
	{:else}
	<!-- ADMIN / VIEWER layout -->
	<div class="grid gap-6 md:grid-cols-3">
		<!-- Left layout: Low Stock alerts indicator -->
		<Card.Root class="border-border/40 bg-card/60 shadow-sm md:col-span-1">
			<Card.Header>
				<Card.Title class="text-lg font-bold">Stock safety health</Card.Title>
				<Card.Description>Physical stock distribution levels.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-5">
				{#each products as product (product.id)}
					<div class="space-y-1.5">
						<div class="flex items-center justify-between text-xs">
							<span class="font-bold truncate max-w-[130px]">{product.name}</span>
							<div class="flex items-center gap-1.5 shrink-0">
								<span class="font-mono">{product.stock} Units</span>
								{#if product.stock < product.minStock}
									<span
										class="rounded bg-amber-500/10 px-1 text-[8px] font-black text-amber-500 uppercase border border-amber-500/20"
										>LOW</span
									>
								{:else}
									<span
										class="rounded bg-emerald-500/10 px-1 text-[8px] font-black text-emerald-500 uppercase border border-emerald-500/20"
										>OK</span
									>
								{/if}
							</div>
						</div>

						<!-- CSS progress bar -->
						<div class="h-2 w-full rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={product.stock} aria-valuemin={0} aria-valuemax={120} aria-label="{product.name} stock level">
							<div
								class="h-full rounded-full transition-all duration-500 {product.stock <
								product.minStock
									? 'bg-gradient-to-r from-amber-500 to-amber-600'
									: 'bg-gradient-to-r from-emerald-500 to-emerald-600'}"
								style="width: {Math.min(100, (product.stock / 120) * 100)}%"
							></div>
						</div>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>

		<!-- Right layout: Stock Action quick access -->
		<Card.Root class="border-border/40 bg-card/60 shadow-sm md:col-span-2">
			<Card.Header>
				<Card.Title class="text-lg font-bold">Interactive Inventory Operations</Card.Title>
				<Card.Description>Simulate receiving or dispatching inventory items directly.</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="overflow-x-auto rounded-xl border border-border/50">
					<table class="w-full text-left border-collapse text-sm" aria-label="Quick inventory operations">
						<thead>
							<tr class="border-b border-border bg-muted/30">
								<th class="p-3 font-semibold text-xs" scope="col">SKU</th>
								<th class="p-3 font-semibold text-xs" scope="col">Product</th>
								<th class="p-3 font-semibold text-xs text-center" scope="col">In Stock</th>
								<th class="p-3 font-semibold text-xs text-right" scope="col">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border/50">
							{#each products as product (product.id)}
								<tr class="hover:bg-muted/10 transition-colors">
									<td class="p-3 font-mono text-xs text-muted-foreground">{product.sku}</td>
									<td class="p-3 font-semibold text-xs">{product.name}</td>
									<td class="p-3 text-center text-xs">
										<span
											class="font-bold {product.stock < product.minStock
												? 'text-amber-500 font-extrabold'
												: ''}"
										>
											{product.stock}
										</span>
									</td>
									<td class="p-3 text-right">
										<div class="inline-flex gap-1.5">
											<!-- Stock In Action Form -->
											<form method="POST" action="?/stockIn" use:enhance={handleStockAction} class="inline">
												<input type="hidden" name="productId" value={product.id} />
												<Button
													type="submit"
													variant="outline"
													size="sm"
													disabled={!canManageInventory}
													class="h-7 px-2 flex items-center gap-1 hover:border-emerald-500/40 hover:text-emerald-500 cursor-pointer disabled:opacity-40"
													aria-label="Stock In for {product.name}"
												>
													<Plus class="h-3 w-3" aria-hidden="true" />
													<span class="text-xs">Add</span>
												</Button>
											</form>

											<!-- Stock Out Action Form -->
											<form method="POST" action="?/stockOut" use:enhance={handleStockAction} class="inline">
												<input type="hidden" name="productId" value={product.id} />
												<Button
													type="submit"
													variant="outline"
													size="sm"
													disabled={!canManageInventory}
													class="h-7 px-2 flex items-center gap-1 hover:border-destructive/40 hover:text-destructive cursor-pointer disabled:opacity-40"
													aria-label="Stock Out for {product.name}"
												>
													<Minus class="h-3 w-3" aria-hidden="true" />
													<span class="text-xs">Remove</span>
												</Button>
											</form>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
	{/if}
{/if}
