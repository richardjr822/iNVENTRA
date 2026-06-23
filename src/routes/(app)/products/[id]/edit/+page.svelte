<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ArrowLeft, Loader2, Save, Upload, Plus, Trash2, Camera } from '@lucide/svelte';
	import { toastService } from '$lib/services/toast.svelte';

	let { data, form } = $props();
	const product = $derived(data.product);

	let loading = $state(false);
	let errors = $state<Record<string, string>>({});

	// References for focus
	let nameInputRef = $state<HTMLInputElement | null>(null);
	let fileInputRef = $state<HTMLInputElement | null>(null);
	let cameraInputRef = $state<HTMLInputElement | null>(null);

	// Initialize inputs
	let name = $state(product.name);
	let description = $state(product.description || '');
	let status = $state<'active' | 'inactive' | 'archived'>(product.status);
	let imageUrl = $state<string | null>(product.image_url);

	// Initialize price variants
	let variants = $state<{ quantity: string; price: string }[]>(
		product.variants && product.variants.length > 0
			? product.variants.map((v: any) => ({
					quantity: String(v.quantity),
					price: String(v.price)
				}))
			: [{ quantity: '1', price: '' }]
	);

	// Image upload variables
	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let imageError = $state<string | null>(null);

	// Derived list of valid variants for Live Preview
	let previewVariants = $derived(
		variants
			.map((v) => {
				const qNum = parseInt(v.quantity);
				const pNum = parseFloat(v.price);
				return { qNum, pNum, isValid: !isNaN(qNum) && qNum > 0 && !isNaN(pNum) && pNum >= 0 };
			})
			.filter((v) => v.isValid)
	);

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
				localErrors.variants = `Please enter a price for price option #${i + 1}.`;
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

	function handleCameraClick() {
		cameraInputRef?.click();
	}

	function handleCameraSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			handleFileUpload(target.files[0]);
		}
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

<div class="max-w-[700px] mx-auto space-y-6 pb-20 px-4">
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
	<div class="space-y-1">
		<h1 class="text-3xl font-extrabold tracking-tight text-foreground">Edit Product</h1>
		<p class="text-sm text-muted-foreground font-medium">Modify pricing variants and update product information.</p>
	</div>

	<!-- Form Card -->
	<Card.Root class="border border-neutral-200 dark:border-neutral-800 bg-card/90 shadow-sm rounded-[16px] overflow-hidden">
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

				<!-- Product Name Section -->
				<div class="space-y-2">
					<Label for="name" class="text-sm font-semibold text-foreground">Product Name</Label>
					<Input
						id="name"
						name="name"
						type="text"
						placeholder="Enter product name"
						bind:value={name}
						bind:ref={nameInputRef}
						disabled={loading}
						class="h-[52px] text-base px-4 focus-visible:ring-2 focus-visible:ring-emerald-500/50 bg-background border-neutral-200 dark:border-neutral-800 placeholder:text-muted-foreground/60 rounded-xl {errors.name ? 'border-destructive ring-1 ring-destructive' : ''}"
						required
					/>
					{#if errors.name}
						<p class="text-xs font-semibold text-destructive mt-1">
							{errors.name}
						</p>
					{/if}
				</div>

				<!-- Product Photo Section -->
				<div class="space-y-2">
					<Label for="photo-upload-trigger" class="text-sm font-semibold text-foreground">Product Photo (Optional)</Label>

					{#if !imageUrl}
						<div
							class="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 bg-neutral-50/50 dark:bg-neutral-900/10 transition-colors hover:bg-neutral-100/50 dark:hover:bg-neutral-900/30"
						>
							<Upload class="h-6 w-6 text-muted-foreground" />
							<div class="flex flex-col items-center gap-3 w-full">
								<div class="flex flex-wrap items-center justify-center gap-2">
									<Button
										id="photo-upload-trigger"
										type="button"
										variant="outline"
										size="sm"
										onclick={handleBrowseClick}
										disabled={isUploading || loading}
										class="h-9 px-4 font-semibold text-xs border-neutral-200 dark:border-neutral-800 hover:bg-muted active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
									>
										{#if isUploading}
											<Loader2 class="h-4 w-4 animate-spin text-primary" />
											<span>Uploading...</span>
										{:else}
											<Upload class="h-4 w-4" />
											<span>Choose Photo</span>
										{/if}
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onclick={handleCameraClick}
										disabled={isUploading || loading}
										class="h-9 px-4 font-semibold text-xs border-neutral-200 dark:border-neutral-800 hover:bg-muted active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
									>
										<Camera class="h-4 w-4" />
										<span>Take Photo</span>
									</Button>
								</div>
								<p class="text-xs text-muted-foreground">Supported formats: JPG, JPEG, PNG, WEBP (Max 5MB)</p>
							</div>
						</div>
					{:else}
						<div class="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-4 bg-neutral-50/50 dark:bg-neutral-900/10">
							<div class="flex items-center gap-3">
								<div class="h-16 w-16 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-background shrink-0">
									<img src={imageUrl} alt="Product Preview" class="h-full w-full object-cover" />
								</div>
								<div class="space-y-0.5">
									<p class="text-xs font-semibold text-foreground">Product Image</p>
									<p class="text-[11px] text-muted-foreground">Uploaded successfully</p>
								</div>
							</div>
							<div class="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={handleBrowseClick}
									disabled={isUploading || loading}
									class="h-9 text-xs font-semibold hover:bg-muted cursor-pointer flex items-center gap-1.5"
								>
									<Upload class="h-3.5 w-3.5" />
									<span>Choose Photo</span>
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={handleCameraClick}
									disabled={isUploading || loading}
									class="h-9 text-xs font-semibold hover:bg-muted cursor-pointer flex items-center gap-1.5"
								>
									<Camera class="h-3.5 w-3.5" />
									<span>Take Photo</span>
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onclick={handleRemoveImage}
									disabled={loading}
									class="h-9 text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
								>
									Remove
								</Button>
							</div>
						</div>
					{/if}

					<input
						type="file"
						bind:this={fileInputRef}
						class="hidden"
						accept="image/jpeg, image/jpg, image/png, image/webp"
						onchange={handleFileSelect}
						disabled={isUploading || loading}
					/>

					<input
						type="file"
						bind:this={cameraInputRef}
						class="hidden"
						accept="image/*"
						capture="environment"
						onchange={handleCameraSelect}
						disabled={isUploading || loading}
					/>

					{#if imageError}
						<p class="text-xs font-semibold text-destructive mt-1">
							{imageError}
						</p>
					{/if}
				</div>

				<!-- Pricing Section -->
				<div class="space-y-4 pt-6 border-t border-neutral-200 dark:border-neutral-800">
					<div class="space-y-1">
						<h2 class="text-base font-bold text-foreground">Prices</h2>
						<p class="text-xs text-muted-foreground font-medium">Add the quantity and price of your product.</p>
					</div>

					{#if errors.variants}
						<div class="p-3 text-xs font-bold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl" role="alert">
							{errors.variants}
						</div>
					{/if}

					<!-- Container for rows -->
					<div class="bg-neutral-50/50 dark:bg-neutral-900/10 border border-neutral-200/60 dark:border-neutral-800/60 rounded-xl p-4 space-y-4">
						{#each variants as variant, i (i)}
							<div class="flex items-end gap-3">
								<div class="flex-grow grid grid-cols-1 sm:grid-cols-[35%_minmax(0,1fr)] gap-3">
									<!-- Quantity -->
									<div class="space-y-1.5">
										<Label for="quantity-{i}" class="text-xs font-bold text-muted-foreground tracking-wide">Quantity</Label>
										<Input
											id="quantity-{i}"
											type="number"
											bind:value={variant.quantity}
											min="1"
											step="1"
											placeholder="e.g. 1"
											disabled={loading}
											required
											class="h-[48px] text-sm bg-background border-neutral-200 dark:border-neutral-800 focus-visible:ring-2 focus-visible:ring-emerald-500/50"
										/>
									</div>

									<!-- Price -->
									<div class="space-y-1.5">
										<Label for="price-{i}" class="text-xs font-bold text-muted-foreground tracking-wide">Price</Label>
										<div class="relative">
											<span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground/60 select-none">₱</span>
											<Input
												id="price-{i}"
												type="number"
												bind:value={variant.price}
												min="0"
												step="any"
												placeholder="0.00"
												disabled={loading}
												required
												class="h-[48px] pl-7 text-sm bg-background border-neutral-200 dark:border-neutral-800 focus-visible:ring-2 focus-visible:ring-emerald-500/50"
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
										class="h-[48px] w-[48px] text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl shrink-0 cursor-pointer flex items-center justify-center border border-transparent hover:border-destructive/20"
										aria-label="Remove price option {i + 1}"
									>
										<Trash2 class="h-4.5 w-4.5" />
									</Button>
								{/if}
							</div>
						{/each}

						<!-- Add Variant Button -->
						<Button
							type="button"
							variant="outline"
							onclick={addVariant}
							disabled={loading}
							class="w-full h-12 border-dashed border-2 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/30 font-bold text-sm cursor-pointer flex items-center justify-center gap-1.5 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/50"
						>
							<Plus class="h-4 w-4" />
							<span>Add Another Price</span>
						</Button>
					</div>

					<!-- Price Preview section -->
					{#if previewVariants.length > 0}
						<div class="p-4 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/10 border border-neutral-200/60 dark:border-neutral-800/60 space-y-2">
							<h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Price Preview</h4>
							<ul class="space-y-1.5">
								{#each previewVariants as pv}
									<li class="text-sm font-medium text-foreground flex items-center gap-2">
										<span class="font-semibold text-emerald-600 dark:text-emerald-400">
											{pv.qNum} {pv.qNum === 1 ? 'piece' : 'pieces'}
										</span>
										<span class="text-muted-foreground">=</span>
										<span class="font-bold text-foreground">₱{pv.pNum.toFixed(2)}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>

				<!-- Action Footer -->
				<div class="border-t border-neutral-200 dark:border-neutral-800 pt-6 mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
					<Button
						type="button"
						variant="outline"
						href="/products/{product.id}"
						disabled={loading}
						class="w-full sm:w-auto h-12 sm:h-11 px-5 font-bold border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer text-sm rounded-xl active:scale-95 transition-all text-center"
					>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={loading || isUploading}
						class="w-full sm:w-auto h-12 sm:h-11 px-6 font-bold bg-emerald-600 hover:bg-emerald-700 text-white tracking-wide transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 rounded-xl"
					>
						{#if loading}
							<Loader2 class="h-4.5 w-4.5 animate-spin" />
							<span>Saving Product...</span>
						{:else}
							<Save class="h-4.5 w-4.5" />
							<span>Save Changes</span>
						{/if}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
