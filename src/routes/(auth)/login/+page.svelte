<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Boxes, KeyRound, Loader2, User } from '@lucide/svelte';

	// Svelte 5 runes for props and client-side states
	let { form } = $props();

	let loading = $state(false);

	// SvelteKit form action submission enhancer
	const handleEnhance: SubmitFunction = () => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			await update();
		};
	};
</script>

<svelte:head>
	<title>Login - Inventra Inventory Management</title>
	<meta
		name="description"
		content="Access the Inventra admin dashboard and manage your inventory, products, and users."
	/>
</svelte:head>

<!-- Premium modern SaaS style background -->
<div
	class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4 md:p-8"
>
	<!-- Background grid overlay -->
	<div
		class="absolute inset-0 -z-20 bg-[linear-gradient(to_right,rgba(120,119,198,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.05)_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)]"
	></div>

	<!-- Background glow blobs -->
	<div class="absolute inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -top-[40%] left-[20%] h-[60%] w-[60%] rounded-full bg-primary/10 blur-[120px] dark:bg-primary/5"
		></div>
		<div
			class="absolute -bottom-[40%] right-[20%] h-[60%] w-[60%] rounded-full bg-emerald-500/10 blur-[120px] dark:bg-emerald-500/5"
		></div>
	</div>

	<div class="w-full max-w-md space-y-6">
		<!-- Logo Section -->
		<div class="flex flex-col items-center space-y-2 text-center">
			<div
				class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-emerald-500 text-primary-foreground shadow-lg shadow-emerald-500/10"
			>
				<Boxes class="h-6 w-6" />
			</div>
			<div class="space-y-1">
				<h1
					class="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
				>
					Inventra
				</h1>
				<p class="text-sm font-medium text-muted-foreground">Secure Inventory Management Portal</p>
			</div>
		</div>

		<!-- Login Card -->
		<Card.Root
			class="border-border/50 bg-card/60 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:shadow-emerald-500/5 dark:bg-card/40"
		>
			<Card.Header class="space-y-1 pb-4">
				<Card.Title class="text-xl font-bold tracking-tight">Sign In</Card.Title>
				<Card.Description class="text-sm">
					Enter your username and password to access your account.
				</Card.Description>
			</Card.Header>

			<Card.Content>
				<form method="POST" use:enhance={handleEnhance} class="space-y-4">
					<!-- Authentication General Error -->
					{#if form?.error}
						<div
							class="rounded-lg bg-destructive/15 p-3 text-sm font-medium text-destructive border border-destructive/25 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
							role="alert"
						>
							<span class="inline-block h-2 w-2 rounded-full bg-destructive animate-pulse"></span>
							{form.error}
						</div>
					{/if}

					<!-- Username Field -->
					<div class="space-y-2">
						<Label
							for="username"
							class="text-sm font-semibold tracking-wide flex items-center gap-1.5"
						>
							<User class="h-3.5 w-3.5 text-muted-foreground" />
							Username
						</Label>
						<div class="relative">
							<Input
								id="username"
								name="username"
								type="text"
								placeholder="Enter username"
								required
								value={form?.values?.username ?? ''}
								disabled={loading}
								aria-invalid={form?.errors?.username ? 'true' : 'false'}
								aria-describedby={form?.errors?.username ? 'username-error' : undefined}
								class="h-10 pl-3 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500"
								autocomplete="username"
							/>
						</div>
						{#if form?.errors?.username}
							<p
								id="username-error"
								class="text-xs font-semibold text-destructive animate-in fade-in slide-in-from-top-1 duration-150"
							>
								{form.errors.username}
							</p>
						{/if}
					</div>

					<!-- Password Field -->
					<div class="space-y-2">
						<Label
							for="password"
							class="text-sm font-semibold tracking-wide flex items-center gap-1.5"
						>
							<KeyRound class="h-3.5 w-3.5 text-muted-foreground" />
							Password
						</Label>
						<div class="relative">
							<Input
								id="password"
								name="password"
								type="password"
								placeholder="Enter password"
								required
								disabled={loading}
								aria-invalid={form?.errors?.password ? 'true' : 'false'}
								aria-describedby={form?.errors?.password ? 'password-error' : undefined}
								class="h-10 pl-3 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500"
								autocomplete="current-password"
							/>
						</div>
						{#if form?.errors?.password}
							<p
								id="password-error"
								class="text-xs font-semibold text-destructive animate-in fade-in slide-in-from-top-1 duration-150"
							>
								{form.errors.password}
							</p>
						{/if}
					</div>

					<!-- Login Button -->
					<Button
						type="submit"
						disabled={loading}
						class="w-full h-10 font-bold bg-primary hover:bg-primary/95 text-primary-foreground tracking-wide transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
					>
						{#if loading}
							<Loader2 class="h-4 w-4 animate-spin text-primary-foreground" />
							<span>Signing in...</span>
						{:else}
							<span>Sign In</span>
						{/if}
					</Button>
				</form>
			</Card.Content>

			<Card.Footer
				class="flex flex-col items-center justify-center border-t border-border/50 py-3 text-center bg-muted/30 rounded-b-xl"
			>
				<p class="text-xs font-medium text-muted-foreground">
					Inventra Admin Portal. Unauthorized access is prohibited.
				</p>
			</Card.Footer>
		</Card.Root>
	</div>
</div>
