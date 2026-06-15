<script lang="ts">
	import { page } from '$app/state';
	import { Home, RefreshCw, AlertTriangle, ShieldX, Lock, ServerCrash } from '@lucide/svelte';

	const statusConfig = $derived(
		page.status === 404
			? {
					icon: AlertTriangle,
					iconBg: 'bg-amber-500/10',
					iconColor: 'text-amber-500',
					code: '404',
					title: 'Page Not Found',
					description:
						'The page you are looking for does not exist. It may have been moved, deleted, or you may have typed an incorrect URL.',
					showRefresh: false
				}
			: page.status === 401
				? {
						icon: Lock,
						iconBg: 'bg-indigo-500/10',
						iconColor: 'text-indigo-500',
						code: '401',
						title: 'Authentication Required',
						description:
							'You must be logged in to access this page. Please sign in with your Inventra credentials.',
						showRefresh: false
					}
				: page.status === 403
					? {
							icon: ShieldX,
							iconBg: 'bg-destructive/10',
							iconColor: 'text-destructive',
							code: '403',
							title: 'Access Forbidden',
							description:
								'You do not have the required permissions to view this page. Please contact your administrator if you believe this is an error.',
							showRefresh: false
						}
					: {
							icon: ServerCrash,
							iconBg: 'bg-destructive/10',
							iconColor: 'text-destructive',
							code: page.status?.toString() || '500',
							title: 'Internal Server Error',
							description:
								'Something went wrong on our end. Our team has been notified. Please try again in a moment or return to the dashboard.',
							showRefresh: true
						}
	);

	const { icon: Icon, ...config } = $derived(statusConfig);
</script>

<svelte:head>
	<title>{config.code} — {config.title} | Inventra</title>
</svelte:head>

<!-- Full page error layout (used when outside the app shell) -->
<div
	class="relative flex min-h-screen flex-col items-center justify-center bg-background text-foreground"
>
	<!-- Background grid -->
	<div
		class="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(120,119,198,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.025)_1px,transparent_1px)] bg-[size:40px_40px]"
		aria-hidden="true"
	></div>

	<!-- Content -->
	<div class="flex w-full max-w-lg flex-col items-center px-6 text-center">
		<!-- Status icon -->
		<div
			class="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border/40 {config.iconBg} shadow-inner"
		>
			<Icon class="h-9 w-9 {config.iconColor}" aria-hidden="true" />
		</div>

		<!-- Error code -->
		<p class="mb-2 font-mono text-sm font-bold tracking-widest text-muted-foreground uppercase">
			Error {config.code}
		</p>

		<!-- Title -->
		<h1 class="mb-3 text-3xl font-black tracking-tight text-foreground">
			{config.title}
		</h1>

		<!-- Description -->
		<p class="mb-8 text-sm leading-relaxed text-muted-foreground max-w-sm">
			{config.description}
		</p>

		<!-- Error message from SvelteKit -->
		{#if page.error?.message && page.error.message !== config.title}
			<div
				class="mb-6 w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-left"
			>
				<p class="text-xs font-mono text-muted-foreground">
					<span class="font-bold text-foreground">Details:</span>
					{page.error.message}
				</p>
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex flex-wrap items-center justify-center gap-3">
			<a
				href="/dashboard"
				class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<Home class="h-4 w-4" aria-hidden="true" />
				Return to Dashboard
			</a>

			{#if config.showRefresh}
				<button
					type="button"
					onclick={() => window.location.reload()}
					class="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-5 py-2.5 text-sm font-bold text-foreground transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
				>
					<RefreshCw class="h-4 w-4" aria-hidden="true" />
					Try Again
				</button>
			{/if}
		</div>

		<!-- Branding -->
		<div class="mt-12 flex items-center gap-2 text-xs text-muted-foreground/60">
			<span class="font-black tracking-wider">Inventra</span>
			<span>·</span>
			<span>Inventory Management System</span>
		</div>
	</div>
</div>
