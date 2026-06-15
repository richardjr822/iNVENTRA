<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from './$types';
	import { stockOutSchema } from '$lib/validations/inventory.schema';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ArrowLeft, Loader2, ArrowDownLeft } from '@lucide/svelte';

	let { data, form } = $props();

	let loading = $state(false);
	let errors = $state<Record<string, string>>({});

	// Form inputs
	let product_id = $state('');
	let quantity = $state('');
	let remarks = $state('');

	$effect(() => {
		if (data.preselectedProductId) {
			product_id = data.preselectedProductId;
		}
	});

	// Find selected product dynamically
	const selectedProduct = $derived(data.products.find((p) => p.product_id === product_id));

	function validate() {
		const result = stockOutSchema.safeParse({
			product_id,
			quantity: quantity === '' ? undefined : Number(quantity),
			remarks: remarks || null
		});

		if (!result.success) {
			const localErrors: Record<string, string> = {};
			for (const issue of result.error.issues) {
				const path = issue.path[0]?.toString();
				if (path) {
					localErrors[path] = issue.message;
				}
			}
			errors = localErrors;
			return false;
		}

		// Client-side Business Rule: Stock cannot become negative
		if (selectedProduct && Number(quantity) > selectedProduct.quantity) {
			errors.quantity = `Quantity cannot exceed current stock of ${selectedProduct.quantity} units.`;
			return false;
		}

		errors = {};
		return true;
	}

	const handleSubmit: SubmitFunction = ({ cancel }) => {
		const isValid = validate();
		if (!isValid) {
			cancel();
			return;
		}

		loading = true;
		return async ({ update }) => {
			loading = false;
			await update();
		};
	};

	// Reset errors on changes
	$effect(() => {
		if (product_id && errors.product_id) delete errors.product_id;
		if (quantity && errors.quantity) delete errors.quantity;
	});

	// Sync server errors
	$effect(() => {
		if (form?.errors) {
			errors = { ...form.errors };
		}
		if (form?.values) {
			product_id = form.values.product_id || '';
			quantity = form.values.quantity !== undefined ? String(form.values.quantity) : '';
			remarks = form.values.remarks || '';
		}
	});
</script>

<svelte:head>
	<title>Stock Out - Inventra Inventory Management</title>
	<meta name="description" content="Dispatch or remove stock from system products." />
</svelte:head>

<div class="max-w-2xl mx-auto space-y-6">
	<!-- Breadcrumb -->
	<div>
		<a
			href="/inventory"
			class="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
		>
			<ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
			Back to Inventory
		</a>
	</div>

	<!-- Header -->
	<div>
		<h2 class="text-2xl font-black tracking-tight">Stock Out</h2>
		<p class="text-sm text-muted-foreground">
			Record outgoing stock items for dispatches, sales, or distributions.
		</p>
	</div>

	<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md shadow-xl">
		<Card.Header class="pb-4">
			<Card.Title class="text-lg font-bold">Transaction Details</Card.Title>
			<Card.Description class="text-sm">
				Select a product, enter physical quantity to remove, and note the transaction remarks.
			</Card.Description>
		</Card.Header>

		<Card.Content>
			{#if form?.error}
				<div
					class="mb-5 rounded-lg bg-destructive/15 p-3.5 text-sm font-medium text-destructive border border-destructive/25 flex items-center gap-2.5"
					role="alert"
				>
					<span class="h-2 w-2 rounded-full bg-destructive animate-pulse"></span>
					{form.error}
				</div>
			{/if}

			<form method="POST" use:enhance={handleSubmit} class="space-y-5">
				<!-- Product Selector -->
				<div class="space-y-2">
					<Label for="product_id" class="text-sm font-bold tracking-wide flex items-center gap-1">
						Product <span class="text-destructive font-black">*</span>
					</Label>
					<select
						id="product_id"
						name="product_id"
						bind:value={product_id}
						disabled={loading}
						class="flex h-10 w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
						required
					>
						<option value="" disabled selected>Select active product...</option>
						{#each data.products as prod (prod.product_id)}
							<option value={prod.product_id}>
								{prod.product_name} ({prod.sku})
							</option>
						{/each}
					</select>
					{#if errors.product_id}
						<p class="text-xs font-semibold text-destructive">
							{errors.product_id}
						</p>
					{/if}

					<!-- Product Info Preview Card -->
					{#if selectedProduct}
						<div
							class="rounded-xl border border-border/40 p-3 bg-muted/20 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150"
						>
							<p class="text-xs font-bold text-foreground">Selected Item Info:</p>
							<div class="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground font-semibold">
								<div>
									SKU: <span class="text-foreground font-mono font-bold select-all"
										>{selectedProduct.sku}</span
									>
								</div>
								<div>
									Barcode: <span class="text-foreground font-mono"
										>{selectedProduct.barcode || '—'}</span
									>
								</div>
							</div>
							<div
								class="pt-1 border-t border-border/20 text-xs flex justify-between items-center font-bold"
							>
								<span class="text-muted-foreground">Current Stock Quantity:</span>
								<span
									class={selectedProduct.quantity === 0
										? 'text-destructive font-black'
										: 'text-foreground font-black'}
								>
									{selectedProduct.quantity} units
								</span>
							</div>
						</div>
					{/if}
				</div>

				<!-- Quantity Input -->
				<div class="space-y-2">
					<Label for="quantity" class="text-sm font-bold tracking-wide flex items-center gap-1">
						Quantity to Dispatch <span class="text-destructive font-black">*</span>
					</Label>
					<Input
						id="quantity"
						name="quantity"
						type="number"
						min="1"
						placeholder="e.g. 15"
						bind:value={quantity}
						disabled={loading || !product_id}
						class="h-10 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 bg-background/50 border-border/60"
						required
					/>
					{#if errors.quantity}
						<p class="text-xs font-semibold text-destructive">
							{errors.quantity}
						</p>
					{/if}
				</div>

				<!-- Remarks Field -->
				<div class="space-y-2">
					<Label for="remarks" class="text-sm font-bold tracking-wide">Remarks</Label>
					<textarea
						id="remarks"
						name="remarks"
						rows="3"
						placeholder="Reference delivery orders, customer dispatch notes, or internal requests..."
						bind:value={remarks}
						disabled={loading}
						class="flex min-h-[80px] w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
					></textarea>
					<div
						class="flex justify-between items-center text-[10px] font-bold text-muted-foreground/80 px-0.5"
					>
						<span>Maximum 500 characters</span>
						<span class={remarks.length > 500 ? 'text-destructive' : ''}>
							{remarks.length}/500
						</span>
					</div>
					{#if errors.remarks}
						<p class="text-xs font-semibold text-destructive">
							{errors.remarks}
						</p>
					{/if}
				</div>

				<!-- Action Buttons -->
				<div class="flex items-center justify-end gap-3 border-t border-border/40 pt-4">
					<Button
						type="button"
						variant="outline"
						href="/inventory"
						disabled={loading}
						class="font-bold border-border/60 hover:bg-muted cursor-pointer text-xs"
					>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={loading || !product_id}
						class="font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 cursor-pointer text-xs active:scale-95 disabled:scale-100"
					>
						{#if loading}
							<Loader2 class="h-4 w-4 animate-spin" />
							<span>Saving Transaction...</span>
						{:else}
							<ArrowDownLeft class="h-4 w-4" />
							<span>Process Stock Out</span>
						{/if}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
