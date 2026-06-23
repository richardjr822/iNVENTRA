<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		ArrowLeft,
		Loader2,
		Save,
		Trash2,
		Layers,
		PlusCircle
	} from '@lucide/svelte';
	import { toastService } from '$lib/services/toast.svelte';

	let { form } = $props();

	let loading = $state(false);
	let errors = $state<Record<string, string>>({});

	// Bulk products list — Name + Price only
	let products = $state<Array<{ name: string; price: string }>>([
		{ name: '', price: '' }
	]);

	function addProductRow() {
		products.push({ name: '', price: '' });
	}

	function removeProductRow(index: number) {
		if (products.length > 1) {
			products.splice(index, 1);
		}
	}

	// Client-side validation
	function validate(): boolean {
		const localErrors: Record<string, string> = {};
		let isValid = true;

		products.forEach((prod, i) => {
			if (!prod.name.trim()) {
				localErrors[`products.${i}.name`] = 'Product name is required.';
				isValid = false;
			} else if (prod.name.length > 255) {
				localErrors[`products.${i}.name`] = 'Max 255 characters.';
				isValid = false;
			}

			const p = parseFloat(prod.price);
			if (prod.price === '' || isNaN(p) || p < 0) {
				localErrors[`products.${i}.price`] = 'Enter a valid price (≥ 0).';
				isValid = false;
			}
		});

		errors = localErrors;
		return isValid;
	}

	const handleSubmit: SubmitFunction = ({ cancel }) => {
		if (!validate()) {
			toastService.trigger('Please fix the highlighted errors.', 'error');
			cancel();
			return;
		}

		loading = true;
		return async ({ update }) => {
			loading = false;
			await update();
		};
	};

	// Clear errors reactively
	$effect(() => {
		products.forEach((prod, i) => {
			if (prod.name && errors[`products.${i}.name`]) delete errors[`products.${i}.name`];
			if (prod.price && errors[`products.${i}.price`]) delete errors[`products.${i}.price`];
		});
	});

	// Sync server error responses
	$effect(() => {
		if (form?.errors) errors = { ...form.errors };
		if (form?.values) {
			products = form.values.map((p: any) => ({
				name: p.name || '',
				price: p.price !== undefined ? String(p.price) : ''
			}));
		}
	});

	// JSON for hidden input
	const serializedProducts = $derived(
		JSON.stringify(products.map((p) => ({ name: p.name, price: p.price })))
	);
</script>

<svelte:head>
	<title>Bulk Add Products - Price Monitoring System</title>
</svelte:head>

<div class="max-w-[800px] mx-auto space-y-6 pb-20 px-4">
	<!-- Back link -->
	<div>
		<a
			href="/products"
			class="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
		>
			<ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
			Back to Products
		</a>
	</div>

	<!-- Header -->
	<div class="space-y-1">
		<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
			<Layers class="h-7 w-7 sm:h-8 sm:w-8 text-primary shrink-0" />
			<span>Bulk Add Products</span>
		</h1>
		<p class="text-sm text-muted-foreground font-medium">
			Quickly add multiple products. You can configure quantity-price variants later by editing each product.
		</p>
	</div>

	<!-- Form Card -->
	<Card.Root class="border border-neutral-200 dark:border-neutral-800 bg-card/90 shadow-sm rounded-[16px] overflow-hidden">
		<Card.Content class="p-4 sm:p-6 relative">
			<!-- Server error banner -->
			{#if form?.error}
				<div
					class="mb-5 rounded-xl bg-destructive/15 p-3.5 text-sm font-medium text-destructive border border-destructive/25 flex items-center gap-2.5"
					role="alert"
				>
					<span class="h-2 w-2 rounded-full bg-destructive animate-pulse shrink-0"></span>
					{form.error}
				</div>
			{/if}

			<form method="POST" use:enhance={handleSubmit} class="space-y-5">
				<input type="hidden" name="productsJson" value={serializedProducts} />

				<!-- ── Mobile card list (< md) ──────────────────────────── -->
				<div class="space-y-3 md:hidden">
					{#each products as product, idx (idx)}
						<div
							class="relative border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-neutral-50/30 dark:bg-neutral-900/10 space-y-3 transition-all {errors[`products.${idx}.name`] || errors[`products.${idx}.price`] ? 'border-destructive/40 bg-destructive/5' : ''}"
						>
							<!-- Row number badge + delete -->
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
									Product #{idx + 1}
								</span>
								{#if products.length > 1}
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onclick={() => removeProductRow(idx)}
										disabled={loading}
										class="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
										aria-label="Remove product {idx + 1}"
									>
										<Trash2 class="h-3.5 w-3.5" />
									</Button>
								{/if}
							</div>

							<!-- Product Name -->
							<div class="space-y-1.5">
								<Label for="m-name-{idx}" class="text-xs font-bold text-muted-foreground">Product Name</Label>
								<Input
									id="m-name-{idx}"
									type="text"
									placeholder="e.g. Coca-Cola 1.5L"
									bind:value={product.name}
									disabled={loading}
									required
									class="h-11 text-sm bg-background border-neutral-200 dark:border-neutral-800 focus-visible:ring-emerald-500/50 rounded-lg {errors[`products.${idx}.name`] ? 'border-destructive ring-1 ring-destructive' : ''}"
								/>
								{#if errors[`products.${idx}.name`]}
									<p class="text-[11px] font-semibold text-destructive">{errors[`products.${idx}.name`]}</p>
								{/if}
							</div>

							<!-- Price -->
							<div class="space-y-1.5">
								<Label for="m-price-{idx}" class="text-xs font-bold text-muted-foreground">Price</Label>
								<div class="relative">
									<span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground/60 select-none">₱</span>
									<Input
										id="m-price-{idx}"
										type="number"
										step="any"
										min="0"
										placeholder="0.00"
										bind:value={product.price}
										disabled={loading}
										required
										class="h-11 pl-7 text-sm bg-background border-neutral-200 dark:border-neutral-800 focus-visible:ring-emerald-500/50 rounded-lg {errors[`products.${idx}.price`] ? 'border-destructive ring-1 ring-destructive' : ''}"
									/>
								</div>
								{#if errors[`products.${idx}.price`]}
									<p class="text-[11px] font-semibold text-destructive">{errors[`products.${idx}.price`]}</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				<!-- ── Desktop table (md+) ───────────────────────────────── -->
				<div class="hidden md:block border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-background">
					<table class="w-full border-collapse text-left">
						<thead>
							<tr class="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/10 text-xs font-bold text-muted-foreground uppercase tracking-wider">
								<th class="px-4 py-3 font-extrabold w-[50px] text-center">#</th>
								<th class="px-4 py-3 font-extrabold">Product Name</th>
								<th class="px-4 py-3 font-extrabold w-[220px]">Price</th>
								<th class="px-4 py-3 font-extrabold w-[70px] text-center">Remove</th>
							</tr>
						</thead>
						<tbody>
							{#each products as product, idx (idx)}
								<tr class="hover:bg-neutral-50/30 dark:hover:bg-neutral-900/5 transition-colors border-b border-border/30">
									<td class="px-4 py-3.5 text-center text-sm font-semibold text-muted-foreground">{idx + 1}</td>

									<!-- Product Name -->
									<td class="px-4 py-3.5">
										<Input
											type="text"
											placeholder="e.g. Coca-Cola 1.5L"
											bind:value={product.name}
											disabled={loading}
											required
											class="h-10 text-sm focus-visible:ring-emerald-500/50 bg-background border-neutral-200 dark:border-neutral-800 rounded-lg {errors[`products.${idx}.name`] ? 'border-destructive ring-1 ring-destructive' : ''}"
										/>
										{#if errors[`products.${idx}.name`]}
											<p class="text-[10px] font-semibold text-destructive mt-1">{errors[`products.${idx}.name`]}</p>
										{/if}
									</td>

									<!-- Price -->
									<td class="px-4 py-3.5">
										<div class="relative">
											<span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground/60 select-none">₱</span>
											<Input
												type="number"
												step="any"
												min="0"
												placeholder="0.00"
												bind:value={product.price}
												disabled={loading}
												required
												class="h-10 pl-6 text-sm focus-visible:ring-emerald-500/50 bg-background border-neutral-200 dark:border-neutral-800 rounded-lg {errors[`products.${idx}.price`] ? 'border-destructive ring-1 ring-destructive' : ''}"
											/>
										</div>
										{#if errors[`products.${idx}.price`]}
											<p class="text-[10px] font-semibold text-destructive mt-1">{errors[`products.${idx}.price`]}</p>
										{/if}
									</td>

									<!-- Delete -->
									<td class="px-4 py-3.5 text-center">
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onclick={() => removeProductRow(idx)}
											disabled={products.length <= 1 || loading}
											class="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg border border-transparent hover:border-destructive/20 cursor-pointer"
											aria-label="Remove product row {idx + 1}"
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Add Row -->
				<Button
					type="button"
					variant="outline"
					onclick={addProductRow}
					disabled={loading}
					class="w-full h-12 border-dashed border-2 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/30 font-bold text-sm cursor-pointer flex items-center justify-center gap-1.5 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/50"
				>
					<PlusCircle class="h-5 w-5 text-primary" />
					<span>Add Another Product Row</span>
				</Button>

				<!-- Action footer -->
				<div class="border-t border-neutral-200 dark:border-neutral-800 pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
					<Button
						type="button"
						variant="outline"
						href="/products"
						disabled={loading}
						class="w-full sm:w-auto h-12 sm:h-11 px-5 font-bold border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer text-sm rounded-xl active:scale-95 transition-all text-center"
					>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={loading}
						class="w-full sm:w-auto h-12 sm:h-11 px-6 font-bold bg-emerald-600 hover:bg-emerald-700 text-white tracking-wide transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 rounded-xl"
					>
						{#if loading}
							<Loader2 class="h-4.5 w-4.5 animate-spin" />
							<span>Saving Products...</span>
						{:else}
							<Save class="h-4.5 w-4.5" />
							<span>Save All Products</span>
						{/if}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
