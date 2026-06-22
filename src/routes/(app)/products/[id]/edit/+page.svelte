<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ArrowLeft, Loader2, Save, Upload, Plus, Trash2 } from '@lucide/svelte';
	import { toastService } from '$lib/services/toast.svelte';

	let { data, form } = $props();
	const product = $derived(data.product);

	let loading = $state(false);
	let errors = $state<Record<string, string>>({});

	// References for focus
	let nameInputRef = $state<HTMLInputElement | null>(null);
	let fileInputRef = $state<HTMLInputElement | null>(null);

	// Initialize inputs
	let name = $state(product.name);
	let description = $state(product.description || '');
	let status = $state<'active' | 'inactive' | 'archived'>(product.status);
	let imageUrl = $state<string | null>(product.image_url);

	// Initialize price variants
	let variants = $state<{ quantity: string; price: string }[]>(
		product.variants && product.variants.length > 0
			? product.variants.map((v) => ({
					quantity: String(v.quantity),
					price: String(v.price)
				}))
			: [{ quantity: '1', price: '' }]
	);

	// Image upload variables
	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let imageError = $state<string | null>(null);

	// Variant operations
	function addVariant() {
		variants.push({ quantity: '', price: '' });
	}

	function removeVariant(index: number) {
		if (variants.length > 1) {
			variants.splice(index, 1);
		}
	}

	// Client-side validations
	function validate() {
		const localErrors: Record<string, string> = {};

		if (!name.trim()) {
			localErrors.name = 'Please enter a product name.';
			errors = localErrors;
			setTimeout(() => nameInputRef?.focus(), 50);
			return false;
		}

		if (variants.length === 0) {
			localErrors.variants = 'Please add at least one price option.';
			errors = localErrors;
			return false;
		}

		const quantitiesSeen = new Set<number>();
		for (let i = 0; i < variants.length; i++) {
			const v = variants[i];
			const qNum = parseInt(v.quantity);
			const pNum = parseFloat(v.price);

			if (!v.quantity || isNaN(qNum) || qNum <= 0) {
				localErrors.variants = `Please enter a valid quantity for price option #${i + 1}.`;
				errors = localErrors;
				return false;
			}

			if (quantitiesSeen.has(qNum)) {
				localErrors.variants = `You have set the price for ${qNum} quantity more than once.`;
				errors = localErrors;
				return false;
			}
			quantitiesSeen.add(qNum);

			if (!v.price || isNaN(pNum) || pNum < 0) {
				localErrors.variants = 'Please enter a price.';
				errors = localErrors;
				return false;
			}
		}

		errors = localErrors;
		return true;
	}

	const handleSubmit: SubmitFunction = ({ cancel }) => {
		const isValid = validate();
		if (!isValid) {
			cancel();
			return;
		}

		if (isUploading) {
			toastService.trigger('Please wait for photo upload to finish.', 'info');
			cancel();
			return;
		}

		loading = true;
		return async ({ update }) => {
			loading = false;
			await update();
		};
	};

	// Reset error state on updates
	$effect(() => {
		if (name && errors.name) delete errors.name;
		if (variants.length > 0 && errors.variants) delete errors.variants;
	});

	// Sync server responses
	$effect(() => {
		if (form?.errors) {
			errors = { ...form.errors };
		}
		if (form?.values) {
			name = form.values.name || '';
			description = form.values.description || '';
			status = (form.values.status as 'active' | 'inactive' | 'archived') || 'active';
			imageUrl = form.values.image_url || null;
			if (form.values.variants) {
				variants = form.values.variants.map((v: any) => ({
					quantity: String(v.quantity),
					price: String(v.price)
				}));
			}
		}
	});

	// File upload logic
	function handleFileUpload(file: File) {
		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
		const maxSize = 5 * 1024 * 1024; // 5 MB

		imageError = null;

		if (!allowedTypes.includes(file.type)) {
			imageError = 'Format must be JPG, JPEG, PNG, or WEBP.';
			return;
		}

		if (file.size > maxSize) {
			imageError = 'File size is too big. Use 5 MB or less.';
			return;
		}

		isUploading = true;
		uploadProgress = 0;

		const xhr = new XMLHttpRequest();
		const formData = new FormData();
		formData.append('file', file);
		formData.append('productId', product.id);

		xhr.upload.addEventListener('progress', (event) => {
			if (event.lengthComputable) {
				uploadProgress = Math.round((event.loaded / event.total) * 100);
			}
		});

		xhr.addEventListener('load', () => {
			isUploading = false;
			if (xhr.status === 200) {
				try {
					const res = JSON.parse(xhr.responseText);
					imageUrl = res.imageUrl;
					imageError = null;
				} catch {
					imageError = 'Failed to load photo preview.';
				}
			} else {
				try {
					const res = JSON.parse(xhr.responseText);
					imageError = res.message || 'Failed to upload photo.';
				} catch {
					imageError = 'Failed to upload photo.';
				}
			}
		});

		xhr.addEventListener('error', () => {
			isUploading = false;
			imageError = 'Network error during upload.';
		});

		xhr.open('POST', '/api/products/upload');
		xhr.send(formData);
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			handleFileUpload(target.files[0]);
		}
	}

	function handleBrowseClick() {
		fileInputRef?.click();
	}

	function handleRemoveImage() {
		imageUrl = null;
		imageError = null;
		if (fileInputRef) fileInputRef.value = '';
	}
</script>

<svelte:head>
	<title>Edit Product - Price Monitoring System</title>
</svelte:head>

<div class="max-w-xl mx-auto space-y-6 pb-20">
	<!-- Navigation back -->
	<div>
		<a
			href="/products/{product.id}"
			class="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
		>
			<ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
			Back to Details
		</a>
	</div>

	<!-- Title Header -->
	<div>
		<h2 class="text-2xl font-black tracking-tight">Edit Product</h2>
		<p class="text-sm text-muted-foreground">
			Modify pricing variants and update product photo information.
		</p>
	</div>

	<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md shadow-xl overflow-hidden">
		<Card.Content class="p-6 relative">
			<!-- Action failures message feedback -->
			{#if form?.error}
				<div
					class="mb-6 rounded-xl bg-destructive/15 p-4 text-sm font-medium text-destructive border border-destructive/25 flex items-center gap-2.5"
					role="alert"
				>
					<span class="h-2 w-2 rounded-full bg-destructive animate-pulse"></span>
					{form.error}
				</div>
			{/if}

			<form method="POST" use:enhance={handleSubmit} class="space-y-6">
				<!-- Hidden inputs -->
				<input type="hidden" name="image_url" value={imageUrl || ''} />
				<input type="hidden" name="variantsJson" value={JSON.stringify(variants)} />
				<input type="hidden" name="description" value={description} />
				<input type="hidden" name="status" value={status} />

				<!-- 1. Product Name -->
				<div class="space-y-2">
					<Label for="name" class="text-base font-extrabold tracking-wide">Product Name</Label>
					<Input
						id="name"
						name="name"
						type="text"
						placeholder="e.g. Coca Cola, Purefoods Corned Beef"
						bind:value={name}
						bind:ref={nameInputRef}
						disabled={loading}
						class="h-14 text-base focus-visible:ring-emerald-500/50 bg-background border-border/50 {errors.name ? 'border-destructive ring-1 ring-destructive' : ''}"
						required
					/>
					{#if errors.name}
						<p class="text-xs font-bold text-destructive">
							{errors.name}
						</p>
					{/if}
				</div>

				<!-- 3. Product Photo Upload (Choose Photo Button) -->
				<div class="space-y-2 pt-2">
					<Label class="text-base font-extrabold tracking-wide">📷 Product Photo (Optional)</Label>

					<div class="flex flex-col sm:flex-row sm:items-center gap-4">
						<input
							type="file"
							bind:this={fileInputRef}
							class="hidden"
							accept="image/jpeg, image/jpg, image/png, image/webp"
							onchange={handleFileSelect}
							disabled={isUploading || loading}
						/>

						<Button
							type="button"
							variant="outline"
							onclick={handleBrowseClick}
							disabled={isUploading || loading}
							class="h-14 px-6 font-bold border-border/60 text-sm hover:bg-muted active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 min-w-[150px]"
						>
							{#if isUploading}
								<Loader2 class="h-4 w-4 animate-spin text-primary" />
								<span>Uploading...</span>
							{:else}
								<span>Choose Photo</span>
							{/if}
						</Button>

						{#if imageUrl}
							<!-- Simple image preview with deletion -->
							<div class="flex items-center gap-3">
								<div class="h-14 w-14 rounded-xl overflow-hidden border border-border/40 bg-muted shrink-0">
									<img src={imageUrl} alt="Preview" class="h-full w-full object-cover" />
								</div>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onclick={handleRemoveImage}
									class="h-8 text-xs font-bold text-destructive hover:bg-destructive/10 cursor-pointer"
								>
									Remove
								</Button>
							</div>
						{/if}
					</div>

					{#if imageError}
						<p class="text-xs font-semibold text-destructive mt-1">
							{imageError}
						</p>
					{/if}
				</div>

				<!-- 4. Prices (Stacked Variants Card UI) -->
				<div class="space-y-4 pt-4 border-t border-border/30">
					<div>
						<h3 class="text-base font-extrabold tracking-wide">Prices</h3>
						<p class="text-xs text-muted-foreground mt-0.5">Add the quantity and price of your product.</p>
						<p class="text-[10px] text-muted-foreground italic mt-0.5">Examples: 1 piece = ₱5, 3 pieces = ₱10</p>
					</div>

					{#if errors.variants}
						<div class="p-3 text-xs font-bold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
							{errors.variants}
						</div>
					{/if}

					<div class="space-y-3">
						{#each variants as variant, i (i)}
							<div class="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-background/25">
								<div class="flex-grow grid grid-cols-2 gap-4">
									<!-- Quantity -->
									<div class="space-y-1.5">
										<Label class="text-xs font-bold text-muted-foreground tracking-wide">Quantity</Label>
										<Input
											type="number"
											bind:value={variant.quantity}
											min="1"
											step="1"
											placeholder="e.g. 1"
											disabled={loading}
											required
											class="h-12 text-base focus-visible:ring-emerald-500/50 bg-background border-border/50"
											aria-label="Quantity"
										/>
									</div>

									<!-- Price -->
									<div class="space-y-1.5">
										<Label class="text-xs font-bold text-muted-foreground tracking-wide">Price (₱)</Label>
										<div class="relative">
											<span class="absolute left-3 top-1/2 -translate-y-1/2 text-base font-black text-muted-foreground/60 select-none">₱</span>
											<Input
												type="number"
												bind:value={variant.price}
												min="0"
												step="any"
												placeholder="0.00"
												disabled={loading}
												required
												class="h-12 pl-7 text-base focus-visible:ring-emerald-500/50 bg-background border-border/50"
												aria-label="Price"
											/>
										</div>
									</div>
								</div>

								<!-- Delete Row Action -->
								{#if variants.length > 1}
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onclick={() => removeVariant(i)}
										disabled={loading}
										class="h-11 w-11 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl shrink-0 mt-6 cursor-pointer flex items-center justify-center"
										aria-label="Remove variant"
									>
										<Trash2 class="h-5 w-5" />
									</Button>
								{/if}
							</div>
						{/each}
					</div>

					<Button
						type="button"
						variant="outline"
						onclick={addVariant}
						disabled={loading}
						class="w-full h-14 border-dashed border-2 border-border/60 hover:bg-muted font-bold text-sm cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all mt-2"
					>
						<Plus class="h-4.5 w-4.5" />
						<span>+ Add Price Option</span>
					</Button>
				</div>

				<!-- 5. Save Button (Sticky Footer) -->
				<div class="sticky bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-border/40 p-4 -mx-6 -mb-6 mt-8 flex justify-end gap-3 z-10">
					<Button
						type="button"
						variant="outline"
						href="/products/{product.id}"
						disabled={loading}
						class="h-14 px-6 font-bold border-border/60 hover:bg-muted cursor-pointer text-base rounded-xl active:scale-95"
					>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={loading || isUploading}
						class="h-14 px-8 font-bold bg-green-600 hover:bg-green-700 text-white tracking-wide transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 rounded-xl flex-grow sm:flex-grow-0"
					>
						{#if loading}
							<Loader2 class="h-5 w-5 animate-spin" />
							<span>Saving...</span>
						{:else}
							<Save class="h-5 w-5" />
							<span>Save Changes</span>
						{/if}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
