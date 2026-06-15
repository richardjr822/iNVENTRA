<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from './$types';
	import { updateCategorySchema } from '$lib/validations/category.schema';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ArrowLeft, Loader2, Save } from '@lucide/svelte';

	let { data, form } = $props();

	let loading = $state(false);
	let errors = $state<Record<string, string>>({});

	// Initialize inputs pre-filled with existing category data
	let name = $state('');
	let description = $state('');

	// Sync category fields reactively to avoid capturing warnings
	$effect(() => {
		name = data.category.name;
		description = data.category.description || '';
	});

	// Client-side validations
	function validate() {
		const result = updateCategorySchema.safeParse({ id: data.category.id, name, description });
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
		// Run client-side validation first
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

	// Reset validation error state reactively once user fixes input
	$effect(() => {
		if (name && errors.name) {
			const res = updateCategorySchema.safeParse({ id: data.category.id, name, description });
			if (res.success || !res.error.issues.some((i) => i.path[0] === 'name')) {
				delete errors.name;
			}
		}
		if (description && errors.description) {
			const res = updateCategorySchema.safeParse({ id: data.category.id, name, description });
			if (res.success || !res.error.issues.some((i) => i.path[0] === 'description')) {
				delete errors.description;
			}
		}
	});

	// Sync server validation failure responses
	$effect(() => {
		if (form?.errors) {
			errors = { ...form.errors };
		}
	});
</script>

<svelte:head>
	<title>Edit Category - Inventra Inventory Management</title>
	<meta name="description" content="Update Category details and descriptions." />
</svelte:head>

<div class="max-w-2xl mx-auto space-y-6">
	<!-- Navigation back breadcrumb -->
	<div>
		<a
			href="/categories"
			class="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
		>
			<ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
			Back to Categories
		</a>
	</div>

	<!-- Header titles -->
	<div>
		<h2 class="text-2xl font-black tracking-tight">Edit Category</h2>
		<p class="text-sm text-muted-foreground">Modify physical product taxonomy grouping.</p>
	</div>

	<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md shadow-xl">
		<Card.Header class="pb-4">
			<Card.Title class="text-lg font-bold">Category Details</Card.Title>
			<Card.Description class="text-sm"
				>Pre-filled category settings. Save changes to update inventory taxonomy.</Card.Description
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

			<form method="POST" use:enhance={handleSubmit} class="space-y-5">
				<!-- Category Name Field -->
				<div class="space-y-2">
					<Label for="name" class="text-sm font-bold tracking-wide flex items-center gap-1">
						Category Name <span class="text-destructive font-black">*</span>
					</Label>
					<Input
						id="name"
						name="name"
						type="text"
						placeholder="e.g., Office Supplies, Electronics"
						bind:value={name}
						disabled={loading}
						aria-invalid={errors.name ? 'true' : 'false'}
						aria-describedby={errors.name ? 'name-error' : undefined}
						class="h-10 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 bg-background/50 border-border/60"
						required
					/>
					{#if errors.name}
						<p
							id="name-error"
							class="text-xs font-semibold text-destructive animate-in fade-in slide-in-from-top-1 duration-150"
						>
							{errors.name}
						</p>
					{/if}
				</div>

				<!-- Description Field -->
				<div class="space-y-2">
					<Label for="description" class="text-sm font-bold tracking-wide">Description</Label>
					<textarea
						id="description"
						name="description"
						rows="4"
						placeholder="Optional notes or details summarizing this category's catalog content..."
						bind:value={description}
						disabled={loading}
						aria-invalid={errors.description ? 'true' : 'false'}
						aria-describedby={errors.description ? 'description-error' : undefined}
						class="flex min-h-[100px] w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
					></textarea>

					<div
						class="flex justify-between items-center text-[10px] font-bold text-muted-foreground/85 px-0.5"
					>
						<span>Maximum 500 characters</span>
						<span class={description.length > 500 ? 'text-destructive' : ''}>
							{description.length}/500
						</span>
					</div>
					{#if errors.description}
						<p
							id="description-error"
							class="text-xs font-semibold text-destructive animate-in fade-in slide-in-from-top-1 duration-150"
						>
							{errors.description}
						</p>
					{/if}
				</div>

				<!-- Action Controls -->
				<div class="flex items-center justify-end gap-3 border-t border-border/40 pt-5">
					<Button
						type="button"
						variant="outline"
						href="/categories"
						disabled={loading}
						class="font-bold border-border/60 hover:bg-muted cursor-pointer"
					>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={loading}
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
