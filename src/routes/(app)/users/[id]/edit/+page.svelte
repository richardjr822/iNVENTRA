<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from './$types';
	import { updateUserSchema } from '$lib/validations/user.schema';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ArrowLeft, Loader2, Save, UserCheck } from '@lucide/svelte';

	let { data, form } = $props();

	let loading = $state(false);
	let errors = $state<Record<string, string>>({});

	// Form inputs reactive states initialized from SvelteKit load data
	let full_name = $state(data.targetUser?.full_name || '');
	let role = $state(data.targetUser?.role || 'viewer');
	let is_active = $state(String(data.targetUser?.is_active ?? true));

	const isEditingSelf = $derived(data.targetUser?.id === data.user?.id);

	// Client-side validations
	function validate() {
		const result = updateUserSchema.safeParse({
			full_name,
			role,
			is_active: is_active === 'true'
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
		if (full_name && errors.full_name) {
			const res = updateUserSchema.safeParse({ full_name, role, is_active: is_active === 'true' });
			if (res.success || !res.error.issues.some((i) => i.path[0] === 'full_name')) {
				delete errors.full_name;
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
	<title>Edit User - Inventra Admin</title>
	<meta name="description" content="Modify full name, role permissions, and active status for an Inventra user account." />
</svelte:head>

<div class="max-w-2xl mx-auto space-y-6">
	<!-- Navigation back -->
	<div>
		<a
			href="/users"
			class="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
		>
			<ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
			Back to Users
		</a>
	</div>

	<!-- Header titles -->
	<div>
		<h2 class="text-2xl font-black tracking-tight">Edit User Profile</h2>
		<p class="text-sm text-muted-foreground">Modify metadata, authorization rules, and status settings for this user.</p>
	</div>

	<Card.Root class="border-border/40 bg-card/65 backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
		<Card.Header class="pb-4">
			<Card.Title class="text-lg font-bold flex items-center gap-2">
				<UserCheck class="h-5 w-5 text-primary" />
				Modify Details
			</Card.Title>
			<Card.Description class="text-sm"
				>Update user configuration parameters below. Username cannot be altered.</Card.Description
			>
		</Card.Header>

		<Card.Content>
			<!-- Action failures message feedback -->
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
				<!-- Username Field (Read Only) -->
				<div class="space-y-2">
					<Label for="username" class="text-sm font-bold tracking-wide text-muted-foreground flex items-center gap-1">
						Username (Cannot be changed)
					</Label>
					<Input
						id="username"
						type="text"
						value={data.targetUser?.username}
						disabled
						class="h-10 bg-muted border-border/40 text-muted-foreground cursor-not-allowed select-none font-bold"
					/>
				</div>

				<!-- Full Name Field -->
				<div class="space-y-2">
					<Label for="full_name" class="text-sm font-bold tracking-wide flex items-center gap-1">
						Full Name <span class="text-destructive font-black">*</span>
					</Label>
					<Input
						id="full_name"
						name="full_name"
						type="text"
						placeholder="e.g., John Doe"
						bind:value={full_name}
						disabled={loading}
						aria-invalid={errors.full_name ? 'true' : 'false'}
						class="h-10 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 bg-background/50 border-border/60"
						required
					/>
					{#if errors.full_name}
						<p class="text-xs font-semibold text-destructive">{errors.full_name}</p>
					{/if}
				</div>

				<!-- Grid for Roles and Statuses -->
				<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
					<!-- Role Field -->
					<div class="space-y-2">
						<Label for="role" class="text-sm font-bold tracking-wide">Role</Label>
						<select
							id="role"
							name="role"
							bind:value={role}
							disabled={loading}
							class="w-full h-10 rounded-xl border border-border/60 bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 cursor-pointer font-medium text-foreground transition-all duration-150"
						>
							<option value="viewer">Viewer (Read Only)</option>
							<option value="inventory_manager">Inventory Manager (Edit Catalog & Stock)</option>
							<option value="admin">Admin (Full Control)</option>
						</select>
						{#if errors.role}
							<p class="text-xs font-semibold text-destructive">{errors.role}</p>
						{/if}
					</div>

					<!-- Status Field -->
					<div class="space-y-2">
						<Label for="is_active" class="text-sm font-bold tracking-wide">Status</Label>
						<select
							id="is_active"
							name="is_active"
							bind:value={is_active}
							disabled={loading || isEditingSelf}
							class="w-full h-10 rounded-xl border border-border/60 bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-medium text-foreground transition-all duration-150 {isEditingSelf ? 'cursor-not-allowed bg-muted text-muted-foreground' : 'cursor-pointer'}"
						>
							<option value="true">Active (Access Allowed)</option>
							<option value="false">Inactive (Access Suspended)</option>
						</select>
						{#if isEditingSelf}
							<p class="text-[10px] font-bold text-amber-500">You cannot deactivate your own account.</p>
						{/if}
						{#if errors.is_active}
							<p class="text-xs font-semibold text-destructive">{errors.is_active}</p>
						{/if}
					</div>
				</div>

				<!-- Action Controls -->
				<div class="flex items-center justify-end gap-3 border-t border-border/40 pt-5">
					<Button
						type="button"
						variant="outline"
						href="/users"
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
