<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { FileText, Download, TrendingUp, DollarSign, Calendar, AlertCircle } from '@lucide/svelte';

	let { data } = $props();
	const isManager = $derived(data.user?.role === 'inventory_manager');
	const hasProducts = $derived(data.hasProducts);
	const hasTransactions = $derived(data.hasTransactions);
	const valuationTrendPercent = $derived(data.valuationTrendPercent ?? 0);
	const stockTurnover = $derived(data.stockTurnover ?? 0);

	// Today's formatted date
	const todayDateStr = $derived(
		new Date().toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);

	// Dynamic generated reports catalog list based on live database existence
	const dynamicReports = $derived([
		{
			id: 'valuation',
			name: 'Current Stock Valuation & Safety Level Report',
			type: 'CSV',
			description: 'Full active catalog items, stock quantities, and asset value calculations.',
			enabled: hasProducts,
			link: '/api/reports/download?type=valuation'
		},
		{
			id: 'ledger',
			name: 'Transaction History & Stock Flow Report',
			type: 'CSV',
			description: 'Audit log of all stock movements (Stock In, Stock Out, Adjustments, Damaged).',
			enabled: hasTransactions,
			link: '/api/reports/download?type=ledger'
		},
		{
			id: 'health',
			name: 'Product Stock Health & Low-Stock Alert Audit',
			type: 'CSV',
			description: 'Comprehensive report highlighting products that have reached or gone below safety threshold levels.',
			enabled: hasProducts,
			link: '/api/reports/download?type=health'
		}
	]);
</script>

<svelte:head>
	<title>Reports - Inventra Inventory Management</title>
	<meta
		name="description"
		content="Export real stock summaries and transaction ledgers from the live Supabase database."
	/>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-black tracking-tight">{isManager ? 'Store Reports' : 'System Reports'}</h2>
			<p class="text-sm text-muted-foreground">
				{isManager ? 'View stock summaries and download reports.' : 'Download safety audits, valuations, and monthly stock trends.'}
			</p>
		</div>

		{#if !isManager}
		<Button
			disabled={!hasProducts}
			class="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shrink-0 cursor-pointer disabled:opacity-40"
		>
			<Calendar class="mr-2 h-4 w-4" />
			Schedule Report
		</Button>
		{/if}
	</div>

	<!-- Analytics Card Overview -->
	<div class="grid gap-4 sm:grid-cols-2">
		<!-- Valuation Trend card -->
		<Card.Root class="border-border/40 bg-card/60 shadow-sm">
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
					>Valuation Trend</Card.Title
				>
			</Card.Header>
			<Card.Content class="flex items-center gap-3">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500"
				>
					<TrendingUp class="h-6 w-6" />
				</div>
				<div>
					<div
						class="text-2xl font-black"
						class:text-emerald-500={valuationTrendPercent >= 0}
						class:text-rose-500={valuationTrendPercent < 0}
					>
						{valuationTrendPercent >= 0 ? '+' : ''}{valuationTrendPercent.toFixed(1)}%
					</div>
					<p class="text-xs text-muted-foreground">Change in asset valuation over last 30 days</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Turnover ratio card -->
		<Card.Root class="border-border/40 bg-card/60 shadow-sm">
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
					>Stock Turnovers</Card.Title
				>
			</Card.Header>
			<Card.Content class="flex items-center gap-3">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500"
				>
					<DollarSign class="h-6 w-6" />
				</div>
				<div>
					<div class="text-2xl font-black">{stockTurnover.toFixed(1)}x</div>
					<p class="text-xs text-muted-foreground">Inventory turnover ratio (annualized)</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Report List Card -->
	<Card.Root class="border-border/40 bg-card/60 shadow-sm">
		<Card.Header>
			<Card.Title class="text-lg font-bold">Generated Reports Catalog</Card.Title>
			<Card.Description>Export live database records as spreadsheets for offline reference.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if !hasProducts}
				<!-- Empty Database State -->
				<div class="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border border-dashed border-border/60 rounded-xl bg-muted/10">
					<AlertCircle class="h-8 w-8 text-muted-foreground/60 mb-2" />
					<p class="text-sm font-semibold">No reports available</p>
					<p class="text-xs text-muted-foreground/80 max-w-sm mt-0.5">
						Populate your catalog and perform inventory transactions to generate analytics reports.
					</p>
				</div>
			{:else}
				<div class="space-y-3.5">
					{#each dynamicReports as rep (rep.id)}
						<div
							class="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30 transition-colors"
							class:opacity-50={!rep.enabled}
						>
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60 text-muted-foreground shadow-sm"
								>
									<FileText class="h-5 w-5" />
								</div>
								<div>
									<h4 class="font-bold text-sm leading-tight text-foreground">{rep.name}</h4>
									<p class="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-xl">
										{rep.description}
									</p>
									<p class="text-[10px] text-muted-foreground/75 font-semibold mt-1">
										Format: {rep.type} • Status: Real-Time Export • Created: {todayDateStr}
									</p>
								</div>
							</div>

							{#if rep.enabled}
								<Button
									href={rep.link}
									variant="outline"
									size="sm"
									class="h-9 shrink-0 flex items-center gap-1.5 border-border/60 hover:bg-muted cursor-pointer font-bold text-xs"
								>
									<Download class="h-3.5 w-3.5" />
									<span>Download {rep.type}</span>
								</Button>
							{:else}
								<Button
									disabled
									variant="outline"
									size="sm"
									class="h-9 shrink-0 flex items-center gap-1.5 opacity-55 border-border/60 font-bold text-xs"
								>
									<AlertCircle class="h-3.5 w-3.5" />
									<span>No Records</span>
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
