<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		ArrowLeft,
		ArrowUpRight,
		ArrowDownLeft,
		Package,
		Database,
		TrendingUp,
		AlertTriangle,
		SlidersHorizontal
	} from '@lucide/svelte';

	let { data } = $props();

	const isViewer = $derived(data.user.role === 'viewer');
	const product = $derived(data.product);
	const inventory = $derived(data.inventory);
	const recentTransactions = $derived(data.recentTransactions);

	// Custom SVG Line Chart coordinates calculation
	const chartData = $derived(data.chartData || []);

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
			// Scale Y (invert since SVG 0,0 is top-left)
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

	// Gridlines helper
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
</script>

<svelte:head>
	<title>{product.name} - Inventory Details - Inventra</title>
	<meta
		name="description"
		content="View details, current quantities, and transaction ledger logs for {product.name}."
	/>
</svelte:head>

<div class="space-y-6">
	<!-- Breadcrumbs and Action Toolbar -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-1">
			<a
				href="/inventory"
				class="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
			>
				<ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
				Back to Inventory
			</a>
			<h2 class="text-2xl font-black tracking-tight">{product.name}</h2>
			<p class="text-sm text-muted-foreground font-mono">SKU: {product.sku}</p>
		</div>

		{#if !isViewer && product.status !== 'archived'}
			<div class="flex flex-wrap gap-1.5 shrink-0">
				<Button
					href="/inventory/stock-in?productId={product.id}"
					class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shrink-0 cursor-pointer shadow-sm"
				>
					<ArrowUpRight class="mr-1 h-3.5 w-3.5" />
					Stock In
				</Button>
				<Button
					href="/inventory/stock-out?productId={product.id}"
					class="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 shrink-0 cursor-pointer shadow-sm"
				>
					<ArrowDownLeft class="mr-1 h-3.5 w-3.5" />
					Stock Out
				</Button>
				<Button
					href="/inventory/adjustment?productId={product.id}"
					variant="secondary"
					class="border border-border/60 hover:bg-muted font-bold text-xs h-9 shrink-0 cursor-pointer"
				>
					<SlidersHorizontal class="mr-1 h-3.5 w-3.5" />
					Adjust Count
				</Button>
				<Button
					href="/inventory/damaged?productId={product.id}"
					variant="outline"
					class="border-amber-500/30 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10 hover:text-amber-500 font-bold text-xs h-9 shrink-0 cursor-pointer"
				>
					<AlertTriangle class="mr-1 h-3.5 w-3.5" />
					Log Damaged
				</Button>
			</div>
		{/if}
	</div>

	<!-- Main details grid -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Left column: product summary card -->
		<div class="lg:col-span-1 space-y-6">
			<!-- Product Information Summary -->
			<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md shadow-sm">
				<Card.Header class="pb-4">
					<Card.Title class="text-lg font-bold">Catalog Record</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<!-- Product Image -->
					<div
						class="flex h-36 w-full items-center justify-center rounded-xl border border-border/40 bg-muted/30 overflow-hidden shadow-inner"
					>
						{#if product.image_url}
							<img src={product.image_url} alt={product.name} class="h-full w-full object-cover" />
						{:else}
							<Package class="h-10 w-10 text-muted-foreground/50" />
						{/if}
					</div>

					<div
						class="space-y-3 divide-y divide-border/30 pt-2 text-xs font-semibold text-muted-foreground"
					>
						<div class="flex justify-between items-center py-2">
							<span>Barcode:</span>
							<span class="text-foreground font-mono">{product.barcode || '—'}</span>
						</div>
						<div class="flex justify-between items-center py-2">
							<span>Category:</span>
							<span class="text-foreground">{product.category_name || '—'}</span>
						</div>
						<div class="flex justify-between items-center py-2">
							<span>Selling Price:</span>
							<span class="text-foreground font-bold">${product.price.toFixed(2)}</span>
						</div>
						<div class="flex justify-between items-center py-2">
							<span>Catalog Status:</span>
							{#if product.status === 'active'}
								<Badge
									class="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/15 font-bold text-[9px] uppercase tracking-wider"
								>
									Active
								</Badge>
							{:else if product.status === 'inactive'}
								<Badge
									class="bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/15 font-bold text-[9px] uppercase tracking-wider"
								>
									Inactive
								</Badge>
							{:else}
								<Badge
									class="bg-muted text-muted-foreground border border-border font-bold text-[9px] uppercase tracking-wider"
								>
									Archived
								</Badge>
							{/if}
						</div>
					</div>

					{#if product.description}
						<div class="pt-3 border-t border-border/30 space-y-1">
							<h4 class="text-xs font-bold text-foreground">Product Description</h4>
							<p class="text-[11px] text-muted-foreground leading-relaxed">{product.description}</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Warehouse KPI Stats Card -->
			<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md shadow-sm">
				<Card.Content class="p-6">
					<div class="flex items-center justify-between">
						<div class="space-y-1">
							<p class="text-xs font-bold text-muted-foreground uppercase tracking-wider">
								Current Quantity
							</p>
							<h3 class="text-3xl font-black tracking-tight text-foreground">
								{inventory.quantity}
								<span class="text-sm font-semibold text-muted-foreground">Units</span>
							</h3>
						</div>
						<div
							class="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-500"
						>
							<Database class="h-6 w-6" />
						</div>
					</div>

					<div
						class="mt-4 pt-4 border-t border-border/20 flex items-center justify-between text-[11px] text-muted-foreground font-semibold"
					>
						<span>Last Stock Movement:</span>
						<span class="text-foreground font-mono">
							{new Date(inventory.updated_at).toLocaleDateString(undefined, {
								month: 'short',
								day: 'numeric',
								hour: '2-digit',
								minute: '2-digit'
							})}
						</span>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Right column: stock movements chart & ledger -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Historical stock movement chart -->
			<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md shadow-sm">
				<Card.Header class="pb-2 flex flex-row items-center justify-between">
					<div>
						<Card.Title class="text-lg font-bold">Stock Movement Area</Card.Title>
						<Card.Description class="text-sm"
							>Historical physical count trajectory.</Card.Description
						>
					</div>
					<div
						class="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-inner"
					>
						<TrendingUp class="h-4 w-4" />
						<span>Running Balance</span>
					</div>
				</Card.Header>
				<Card.Content class="pt-4">
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
								<!-- First label -->
								<text
									x={points[0].x}
									y={height - 8}
									text-anchor="start"
									class="fill-muted-foreground font-semibold text-[9px]"
								>
									{points[0].date}
								</text>

								<!-- Middle label (if enough points) -->
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

								<!-- Last label -->
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
				</Card.Content>
			</Card.Root>

			<!-- Recent 20 Transactions Ledger -->
			<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md shadow-sm">
				<Card.Header class="pb-2">
					<Card.Title class="text-lg font-bold">Ledger Log</Card.Title>
					<Card.Description class="text-sm"
						>Last 20 transaction records of stock movement.</Card.Description
					>
				</Card.Header>
				<Card.Content class="pt-2">
					<div class="overflow-x-auto rounded-xl border border-border/40">
						<Table.Root>
							<Table.Header>
								<Table.Row
									class="hover:bg-transparent bg-muted/40 border-b border-border/40 text-xs"
								>
									<Table.Head class="font-bold text-foreground py-2.5">Date & Time</Table.Head>
									<Table.Head class="font-bold text-foreground py-2.5">Type</Table.Head>
									<Table.Head class="font-bold text-foreground py-2.5">Quantity</Table.Head>
									<Table.Head class="font-bold text-foreground py-2.5"
										>Remarks / Reference</Table.Head
									>
									<Table.Head class="font-bold text-foreground py-2.5">Performed By</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#if recentTransactions.length > 0}
									{#each recentTransactions as tx (tx.id)}
										<Table.Row
											class="hover:bg-muted/10 border-b border-border/30 transition-colors text-xs"
										>
											<!-- Date -->
											<Table.Cell class="py-2.5 font-mono text-muted-foreground">
												{new Date(tx.created_at).toLocaleString(undefined, {
													month: 'short',
													day: 'numeric',
													hour: '2-digit',
													minute: '2-digit'
												})}
											</Table.Cell>
											<!-- Type Badge -->
											<Table.Cell class="py-2.5">
												{#if tx.transaction_type === 'STOCK_IN'}
													<Badge
														class="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/15 font-bold text-[8px] py-0.2 uppercase"
													>
														STOCK IN
													</Badge>
												{:else if tx.transaction_type === 'STOCK_OUT'}
													<Badge
														class="bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/15 font-bold text-[8px] py-0.2 uppercase"
													>
														STOCK OUT
													</Badge>
												{:else if tx.transaction_type === 'ADJUSTMENT'}
													<Badge
														class="bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/15 font-bold text-[8px] py-0.2 uppercase"
													>
														ADJUST
													</Badge>
												{:else if tx.transaction_type === 'DAMAGED'}
													<Badge
														class="bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/15 font-bold text-[8px] py-0.2 uppercase"
													>
														DAMAGE
													</Badge>
												{:else if tx.transaction_type === 'RETURN'}
													<Badge
														class="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/15 font-bold text-[8px] py-0.2 uppercase"
													>
														RETURN
													</Badge>
												{/if}
											</Table.Cell>
											<!-- Quantity -->
											<Table.Cell class="py-2.5">
												<span
													class="font-black"
													class:text-emerald-500={tx.quantity > 0}
													class:text-rose-500={tx.quantity < 0}
												>
													{tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
												</span>
											</Table.Cell>
											<!-- Remarks -->
											<Table.Cell
												class="py-2.5 italic text-muted-foreground truncate max-w-[150px]"
												title={tx.remarks || ''}
											>
												{tx.remarks || '—'}
											</Table.Cell>
											<!-- User -->
											<Table.Cell class="py-2.5 font-bold text-foreground">
												@{tx.user_full_name || 'system'}
											</Table.Cell>
										</Table.Row>
									{/each}
								{:else}
									<Table.Row>
										<Table.Cell
											colspan={5}
											class="h-24 text-center text-muted-foreground italic text-xs"
										>
											No transaction movements recorded for this product.
										</Table.Cell>
									</Table.Row>
								{/if}
							</Table.Body>
						</Table.Root>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
