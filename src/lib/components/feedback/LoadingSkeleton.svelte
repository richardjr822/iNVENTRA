<script lang="ts">
	interface Props {
		/** Number of skeleton rows to show (for table variant) */
		rows?: number;
		/** Skeleton variant */
		variant?: 'table' | 'cards' | 'form' | 'detail';
		/** Number of columns for table variant */
		columns?: number;
		/** Number of cards for cards variant */
		cards?: number;
		/** Additional class */
		class?: string;
	}

	let {
		rows = 5,
		variant = 'table',
		columns = 5,
		cards = 4,
		class: className = ''
	}: Props = $props();
</script>

{#if variant === 'table'}
	<!-- Table skeleton -->
	<div class="w-full overflow-hidden {className}" aria-busy="true" aria-label="Loading table data">
		<!-- Header row -->
		<div class="flex items-center gap-4 border-b border-border/40 bg-muted/40 px-4 py-3">
			{#each Array(columns) as _, i (i)}
				<div
					class="h-4 rounded-md bg-muted animate-pulse {i === 0 ? 'w-8' : i === 1 ? 'w-24' : i === columns - 1 ? 'w-16' : 'flex-1'}"
				></div>
			{/each}
		</div>

		<!-- Body rows -->
		{#each Array(rows) as _, rowIdx (rowIdx)}
			<div
				class="flex items-center gap-4 border-b border-border/30 px-4 py-3.5 transition-colors"
				style="animation-delay: {rowIdx * 50}ms"
			>
				{#each Array(columns) as _, colIdx (colIdx)}
					<div
						class="h-3.5 rounded-md bg-muted/70 animate-pulse {colIdx === 0
							? 'w-10'
							: colIdx === 1
								? 'w-28'
								: colIdx === columns - 1
									? 'w-8'
									: 'flex-1'}"
						style="animation-delay: {(rowIdx * columns + colIdx) * 30}ms"
					></div>
				{/each}
			</div>
		{/each}
	</div>
{:else if variant === 'cards'}
	<!-- KPI / Cards skeleton -->
	<div
		class="grid gap-4 {cards === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : cards === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} {className}"
		aria-busy="true"
		aria-label="Loading cards"
	>
		{#each Array(cards) as _, i (i)}
			<div
				class="rounded-xl border border-border/40 bg-card/60 p-5 space-y-3 animate-pulse"
				style="animation-delay: {i * 80}ms"
			>
				<div class="flex items-center justify-between">
					<div class="h-3 w-20 rounded-md bg-muted/70"></div>
					<div class="h-7 w-7 rounded-lg bg-muted/70"></div>
				</div>
				<div class="h-8 w-16 rounded-md bg-muted/70"></div>
				<div class="h-3 w-32 rounded-md bg-muted/50"></div>
			</div>
		{/each}
	</div>
{:else if variant === 'form'}
	<!-- Form skeleton -->
	<div class="space-y-5 {className}" aria-busy="true" aria-label="Loading form">
		{#each Array(rows) as _, i (i)}
			<div class="space-y-2" style="animation-delay: {i * 60}ms">
				<div class="h-3.5 w-24 rounded-md bg-muted/70 animate-pulse"></div>
				<div class="h-10 w-full rounded-xl bg-muted/50 animate-pulse"></div>
			</div>
		{/each}
		<div class="flex justify-end pt-2">
			<div class="h-10 w-28 rounded-xl bg-muted/70 animate-pulse"></div>
		</div>
	</div>
{:else if variant === 'detail'}
	<!-- Detail view skeleton (key-value pairs) -->
	<div class="space-y-4 {className}" aria-busy="true" aria-label="Loading details">
		{#each Array(rows) as _, i (i)}
			<div
				class="grid grid-cols-3 items-start gap-4 border-b border-border/40 pb-3"
				style="animation-delay: {i * 50}ms"
			>
				<div class="h-3.5 w-20 rounded-md bg-muted/70 animate-pulse"></div>
				<div class="col-span-2 h-3.5 w-32 rounded-md bg-muted/50 animate-pulse"></div>
			</div>
		{/each}
	</div>
{/if}
