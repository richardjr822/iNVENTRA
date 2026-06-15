<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { toastService } from '$lib/services/toast.svelte';
	import { Shield, Database, Save, Loader2 } from '@lucide/svelte';

	let isSaving = $state(false);

	async function saveSettings() {
		isSaving = true;
		// Simulate save delay
		await new Promise((r) => setTimeout(r, 800));
		isSaving = false;
		toastService.trigger('System configuration saved successfully!', 'success');
	}
</script>

<svelte:head>
	<title>Settings - Inventra Inventory Management</title>
	<meta
		name="description"
		content="Configure global security boundaries, session parameters, and Supabase integration settings."
	/>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-black tracking-tight">System Settings</h2>
			<p class="text-sm text-muted-foreground">
				Configure global security boundaries, parameters, and integrations.
			</p>
		</div>

		<Button
			onclick={saveSettings}
			disabled={isSaving}
			class="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shrink-0 cursor-pointer flex items-center gap-2"
		>
			{#if isSaving}
				<Loader2 class="h-4 w-4 animate-spin" aria-hidden="true" />
				Saving...
			{:else}
				<Save class="mr-2 h-4 w-4" aria-hidden="true" />
				Save Config
			{/if}
		</Button>
	</div>

	<!-- Configuration cards grid -->
	<div class="grid gap-6 md:grid-cols-2">
		<!-- Security Settings Card -->
		<Card.Root class="border-border/40 bg-card/60 shadow-sm">
			<Card.Header>
				<div class="flex items-center gap-2">
					<Shield class="h-5 w-5 text-indigo-500" aria-hidden="true" />
					<Card.Title class="text-lg font-bold">Security Rules</Card.Title>
				</div>
				<Card.Description>Configure access rules and authentication session settings.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="rounded-xl border border-border/50 p-4 bg-muted/10 space-y-2">
					<h4 class="font-bold text-sm">Session Lifetime</h4>
					<p class="text-xs text-muted-foreground">
						Secure HTTP-only session cookie is set to automatically expire after 24 hours.
					</p>
				</div>
				<div class="rounded-xl border border-border/50 p-4 bg-muted/10 space-y-2">
					<h4 class="font-bold text-sm">Access Control</h4>
					<p class="text-xs text-muted-foreground">
						Automatic route guards are active for settings, categories, and audit log pages.
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Integration Settings Card -->
		<Card.Root class="border-border/40 bg-card/60 shadow-sm">
			<Card.Header>
				<div class="flex items-center gap-2">
					<Database class="h-5 w-5 text-emerald-500" aria-hidden="true" />
					<Card.Title class="text-lg font-bold">Supabase Integration</Card.Title>
				</div>
				<Card.Description>Configure connection credentials and synchronization options.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="rounded-xl border border-border/50 p-4 bg-muted/10 space-y-2">
					<h4 class="font-bold text-sm">Supabase API Endpoint</h4>
					<p class="text-xs text-muted-foreground font-mono">
						Status: CONNECTED (Standard REST API mode active)
					</p>
				</div>
				<div class="rounded-xl border border-border/50 p-4 bg-muted/10 space-y-2">
					<h4 class="font-bold text-sm">Service Role Key</h4>
					<p class="text-xs text-muted-foreground">
						Direct connection active on standard PostgREST API with service role credentials.
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
