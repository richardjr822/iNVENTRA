<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from './$types';
	import { updateProductSchema } from '$lib/validations/product.schema';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ArrowLeft, Loader2, Save, Upload } from '@lucide/svelte';
	import { toastService } from '$lib/services/toast.svelte';

	let { data, form } = $props();
	const product = $derived(data.product);

	let loading = $state(false);
	let errors = $state<Record<string, string>>({});

	// Form reactive inputs, prefilled with loaded product details
	let sku = $state(product.sku || '');
	let barcode = $state(product.barcode || '');
	let name = $state(product.name || '');
	let category_id = $state(product.category_id || '');
	let description = $state(product.description || '');
	let price = $state(String(product.price) || '');
	let status = $state<'active' | 'inactive' | 'archived'>(product.status || 'active');
	let imageUrl = $state<string | null>(product.image_url || null);

	// Image upload progress variables
	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let imageError = $state<string | null>(null);
	let dragActive = $state(false);
	let fileInputRef = $state<HTMLInputElement | null>(null);

	// Client-side validations
	function validate() {
		const result = updateProductSchema.safeParse({
			id: product.id,
			sku,
			barcode: barcode || null,
			name,
			category_id,
			description: description || null,
			price: price === '' ? undefined : Number(price),
			status,
			image_url: imageUrl || null
		});

		if (!result.success) {
			const localErrors: Record<string, string> = {};
			for (const issue of result.error.issues) {
				const path = issue.path[0]?.toString();
				if (path && path !== 'id') {
					localErrors[path] = issue.message;
				}
			}
			errors = localErrors;
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

		if (isUploading) {
			toastService.trigger('Please wait for the image upload to complete.', 'info');
			cancel();
			return;
		}

		loading = true;
		return async ({ update }) => {
			loading = false;
			await update();
		};
	};

	// Reset validation error state once user types
	$effect(() => {
		if (sku && errors.sku) delete errors.sku;
		if (name && errors.name) delete errors.name;
		if (category_id && errors.category_id) delete errors.category_id;
		if (price && errors.price) delete errors.price;
	});

	// Sync server validation failure responses
	$effect(() => {
		if (form?.errors) {
			errors = { ...form.errors };
		}
		if (form?.values) {
			sku = form.values.sku || '';
			barcode = form.values.barcode || '';
			name = form.values.name || '';
			category_id = form.values.category_id || '';
			description = form.values.description || '';
			price = form.values.price !== undefined ? String(form.values.price) : '';
			status = (form.values.status as 'active' | 'inactive' | 'archived') || 'active';
			imageUrl = form.values.image_url || null;
		}
	});

	// AJAX file uploading progress logic
	function handleFileUpload(file: File) {
		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
		const maxSize = 5 * 1024 * 1024; // 5 MB

		imageError = null;

		if (!allowedTypes.includes(file.type)) {
			imageError = 'File format must be JPG, JPEG, PNG, or WEBP.';
			return;
		}

		if (file.size > maxSize) {
			imageError = 'File size must be 5 MB or less.';
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
					// Add cache buster query string to force re-render updated preview instantly
					imageUrl = `${res.imageUrl}?t=${Date.now()}`;
					imageError = null;
				} catch {
					imageError = 'Failed to process file response.';
				}
			} else {
				try {
					const res = JSON.parse(xhr.responseText);
					imageError = res.message || 'Failed to upload image.';
				} catch {
					imageError = 'Server upload failed.';
				}
			}
		});

		xhr.addEventListener('error', () => {
			isUploading = false;
			imageError = 'Network error occurred during image upload.';
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

	function handleDrag(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === 'dragenter' || e.type === 'dragover') {
			dragActive = true;
		} else if (e.type === 'dragleave') {
			dragActive = false;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragActive = false;

		if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
			handleFileUpload(e.dataTransfer.files[0]);
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
	<title>Edit Product - {product.name} - Inventra</title>
	<meta
		name="description"
		content="Modify details, pricing, categories, status, and replace product image catalog."
	/>
</svelte:head>

<div class="max-w-3xl mx-auto space-y-6">
	<!-- Navigation back breadcrumb -->
	<div>
		<a
			href="/products"
			class="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
		>
			<ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
			Back to Products
		</a>
	</div>

	<!-- Header titles -->
	<div>
		<h2 class="text-2xl font-black tracking-tight">Edit Product</h2>
		<p class="text-sm text-muted-foreground">
			Modify specified product properties and save updates.
		</p>
	</div>

	<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md shadow-xl">
		<Card.Header class="pb-4">
			<Card.Title class="text-lg font-bold">Edit Product Parameters</Card.Title>
			<Card.Description class="text-sm"
				>Update fields, status tags, description notes, or replace catalog image files.</Card.Description
			>
		</Card.Header>

		<Card.Content>
			<!-- Action failures message feedback -->
			{#if form?.error}
				<div
					class="mb-5 rounded-lg bg-destructive/15 p-3.5 text-sm font-medium text-destructive border border-destructive/25 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200"
					role="alert"
				>
					<span class="h-2 w-2 rounded-full bg-destructive animate-pulse"></span>
					{form.error}
				</div>
			{/if}

			<form method="POST" use:enhance={handleSubmit} class="space-y-6">
				<!-- Hidden product ID and image references -->
				<input type="hidden" name="image_url" value={imageUrl || ''} />

				<!-- 1. Product Image Drag & Drop Dropzone Box -->
				<div class="space-y-2">
					<Label class="text-sm font-bold tracking-wide">Product Image</Label>

					<div
						role="button"
						tabindex="0"
						class="relative flex flex-col items-center justify-center min-h-[160px] rounded-xl border border-dashed p-6 transition-colors duration-200 outline-none
						{dragActive
							? 'border-primary bg-primary/5'
							: 'border-border/60 bg-background/30 hover:bg-background/50 hover:border-muted-foreground/40'}
						{imageUrl ? 'border-solid border-border/40' : ''}"
						ondragenter={handleDrag}
						ondragover={handleDrag}
						ondragleave={handleDrag}
						ondrop={handleDrop}
						onclick={handleBrowseClick}
						onkeydown={(e) => e.key === 'Enter' && handleBrowseClick()}
						aria-label="Upload product image"
					>
						<input
							type="file"
							bind:this={fileInputRef}
							class="hidden"
							accept="image/jpeg, image/jpg, image/png, image/webp"
							onchange={handleFileSelect}
							disabled={isUploading}
						/>

						{#if imageUrl}
							<!-- Image preview box -->
							<div class="flex flex-col sm:flex-row items-center gap-5 w-full">
								<div
									class="relative h-28 w-28 rounded-lg border border-border/40 overflow-hidden bg-muted shadow-sm shrink-0"
								>
									<img src={imageUrl} alt="Uploaded preview" class="h-full w-full object-cover" />
								</div>
								<div class="text-left space-y-1.5 flex-grow">
									<p class="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
										<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
										Active Catalog Image
									</p>
									<p
										class="text-[10px] text-muted-foreground font-mono truncate max-w-sm"
										title={imageUrl}
									>
										{imageUrl}
									</p>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onclick={(e) => {
											e.stopPropagation();
											handleRemoveImage();
										}}
										class="h-7 text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive border-border/60 cursor-pointer"
									>
										Delete Image
									</Button>
								</div>
							</div>
						{:else if isUploading}
							<!-- Progress bar display -->
							<div class="flex flex-col items-center justify-center space-y-3 w-full max-w-xs">
								<Loader2 class="h-6 w-6 animate-spin text-primary" />
								<div
									class="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/45"
								>
									<div
										class="bg-primary h-full rounded-full transition-all duration-150"
										style="width: {uploadProgress}%"
									></div>
								</div>
								<p class="text-[10px] font-bold text-muted-foreground tracking-wide">
									Uploading: {uploadProgress}% Completed
								</p>
							</div>
						{:else}
							<!-- Drag and Drop Placeholder -->
							<div class="text-center space-y-2 cursor-pointer">
								<div
									class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted/80 text-muted-foreground border border-border/50"
								>
									<Upload class="h-5 w-5 text-muted-foreground" />
								</div>
								<div class="space-y-1">
									<p class="text-xs font-bold text-foreground">
										Drag & drop a new product image to replace, or <span
											class="text-primary hover:underline">browse</span
										>
									</p>
									<p class="text-[10px] text-muted-foreground font-medium">
										Supports JPG, JPEG, PNG, WEBP (Max size: 5 MB)
									</p>
								</div>
							</div>
						{/if}
					</div>

					{#if imageError}
						<p
							class="text-xs font-semibold text-destructive animate-in fade-in slide-in-from-top-1 duration-150"
						>
							{imageError}
						</p>
					{/if}
				</div>

				<!-- Form Fields Rows -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- Product SKU Field (Keep editable but highlight it is unique) -->
					<div class="space-y-2">
						<Label for="sku" class="text-sm font-bold tracking-wide flex items-center gap-1">
							SKU <span class="text-destructive font-black">*</span>
						</Label>
						<Input
							id="sku"
							name="sku"
							type="text"
							placeholder="e.g., ELEC-MOU-001"
							bind:value={sku}
							disabled={loading}
							aria-invalid={errors.sku ? 'true' : 'false'}
							class="h-10 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 bg-background/50 border-border/60"
							required
						/>
						{#if errors.sku}
							<p class="text-xs font-semibold text-destructive">
								{errors.sku}
							</p>
						{/if}
					</div>

					<!-- Barcode Field -->
					<div class="space-y-2">
						<Label for="barcode" class="text-sm font-bold tracking-wide">Barcode</Label>
						<Input
							id="barcode"
							name="barcode"
							type="text"
							placeholder="e.g., 690123456789"
							bind:value={barcode}
							disabled={loading}
							aria-invalid={errors.barcode ? 'true' : 'false'}
							class="h-10 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 bg-background/50 border-border/60"
						/>
						{#if errors.barcode}
							<p class="text-xs font-semibold text-destructive">
								{errors.barcode}
							</p>
						{/if}
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<!-- Product Name Field -->
					<div class="space-y-2 md:col-span-2">
						<Label for="name" class="text-sm font-bold tracking-wide flex items-center gap-1">
							Product Name <span class="text-destructive font-black">*</span>
						</Label>
						<Input
							id="name"
							name="name"
							type="text"
							placeholder="e.g., Logitech Wireless MX Master 3S"
							bind:value={name}
							disabled={loading}
							aria-invalid={errors.name ? 'true' : 'false'}
							class="h-10 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 bg-background/50 border-border/60"
							required
						/>
						{#if errors.name}
							<p class="text-xs font-semibold text-destructive">
								{errors.name}
							</p>
						{/if}
					</div>

					<!-- Category Selector Field -->
					<div class="space-y-2">
						<Label
							for="category_id"
							class="text-sm font-bold tracking-wide flex items-center gap-1"
						>
							Category <span class="text-destructive font-black">*</span>
						</Label>
						<select
							id="category_id"
							name="category_id"
							bind:value={category_id}
							disabled={loading}
							aria-invalid={errors.category_id ? 'true' : 'false'}
							class="flex h-10 w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
							required
						>
							<option value="" disabled>Select category...</option>
							{#each data.categories as cat (cat.id)}
								<option value={cat.id}>{cat.name}</option>
							{/each}
						</select>
						{#if errors.category_id}
							<p class="text-xs font-semibold text-destructive">
								{errors.category_id}
							</p>
						{/if}
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<!-- Product Price Field -->
					<div class="space-y-2 md:col-span-2">
						<Label for="price" class="text-sm font-bold tracking-wide flex items-center gap-1">
							Selling Price ($) <span class="text-destructive font-black">*</span>
						</Label>
						<Input
							id="price"
							name="price"
							type="number"
							step="any"
							min="0"
							placeholder="e.g., 99.99"
							bind:value={price}
							disabled={loading}
							aria-invalid={errors.price ? 'true' : 'false'}
							class="h-10 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 bg-background/50 border-border/60"
							required
						/>
						{#if errors.price}
							<p class="text-xs font-semibold text-destructive">
								{errors.price}
							</p>
						{/if}
					</div>

					<!-- Status Field -->
					<div class="space-y-2">
						<Label for="status" class="text-sm font-bold tracking-wide flex items-center gap-1">
							Status <span class="text-destructive font-black">*</span>
						</Label>
						<select
							id="status"
							name="status"
							bind:value={status}
							disabled={loading}
							class="flex h-10 w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
							required
						>
							<option value="active">Active</option>
							<option value="inactive">Inactive</option>
							<option value="archived">Archived</option>
						</select>
					</div>
				</div>

				<!-- Description Field -->
				<div class="space-y-2">
					<Label for="description" class="text-sm font-bold tracking-wide">Description</Label>
					<textarea
						id="description"
						name="description"
						rows="4"
						placeholder="Add description details summarizing specifications, warranties, or inventory remarks..."
						bind:value={description}
						disabled={loading}
						aria-invalid={errors.description ? 'true' : 'false'}
						class="flex min-h-[100px] w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
					></textarea>
					<div
						class="flex justify-between items-center text-[10px] font-bold text-muted-foreground/85 px-0.5"
					>
						<span>Maximum 1000 characters</span>
						<span class={description.length > 1000 ? 'text-destructive' : ''}>
							{description.length}/1000
						</span>
					</div>
					{#if errors.description}
						<p class="text-xs font-semibold text-destructive">
							{errors.description}
						</p>
					{/if}
				</div>

				<!-- Action Controls -->
				<div class="flex items-center justify-end gap-3 border-t border-border/40 pt-5">
					<Button
						type="button"
						variant="outline"
						href="/products"
						disabled={loading}
						class="font-bold border-border/60 hover:bg-muted cursor-pointer"
					>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={loading || isUploading}
						class="font-bold bg-primary hover:bg-primary/95 text-primary-foreground tracking-wide transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:scale-100 disabled:opacity-50"
					>
						{#if loading}
							<Loader2 class="h-4 w-4 animate-spin" />
							<span>Saving Changes...</span>
						{:else}
							<Save class="h-4 w-4" />
							<span>Save Changes</span>
						{/if}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
