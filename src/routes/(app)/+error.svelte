<script lang="ts">
	import { page } from '$app/state';
	import { Home, RefreshCw, AlertTriangle, ShieldX, Lock, ServerCrash, ArrowLeft } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	const statusConfig = $derived(
		page.status === 404
			? {
					icon: AlertTriangle,
					iconBg: 'bg-amber-500/10',
					iconColor: 'text-amber-500',
					borderColor: 'border-amber-500/20',
					code: '404',
					title: 'Page Not Found',
					description:
						'The page you are looking for does not exist. It may have been moved, deleted, or the URL may be incorrect.',
					showRefresh: false
				}
			: page.status === 401
				? {
						icon: Lock,
						iconBg: 'bg-indigo-500/10',
						iconColor: 'text-indigo-500',
						borderColor: 'border-indigo-500/20',
						code: '401',
						title: 'Authentication Required',
						description: 'Your session may have expired. Please log in again to continue.',
						showRefresh: false
					}
				: page.status === 403
					? {
							icon: ShieldX,
							iconBg: 'bg-destructive/10',
							iconColor: 'text-destructive',
							borderColor: 'border-destructive/20',
							code: '403',
							title: 'Access Forbidden',
							description:
								'You do not have permission to view this page. Contact your administrator if you believe this is a mistake.',
							showRefresh: false
						}
					: {
							icon: ServerCrash,
							iconBg: 'bg-destructive/10',
							iconColor: 'text-destructive',
							borderColor: 'border-destructive/20',
							code: page.status?.toString() || '500',
							title: 'Something Went Wrong',
							description:
								'An unexpected error occurred. Please try refreshing the page. If the issue persists, contact your system administrator.',
							showRefresh: true
						}
	);

	const { icon: Icon, ...config } = $derived(statusConfig);
</script>

<svelte:head>
	<title>{config.code} — {config.title} | Inventra</title>
</svelte:head>

<!-- Inline error page — renders inside the app shell (sidebar + header visible) -->
<div class="flex min-h-[60vh] flex-col items-center justify-center py-12 text-center">
	<!-- Status card -->
	<div
		class="flex w-full max-w-md flex-col items-center rounded-2xl border {config.borderColor} bg-card/60 p-8 shadow-sm backdrop-blur-sm"
	>
		<!-- Icon -->
		<div
			class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/30 {config.iconBg} shadow-inner"
		>
			<Icon class="h-8 w-8 {config.iconColor}" aria-hidden="true" />
		</div>

		<!-- Code badge -->
		<span
			class="mb-3 rounded-full border border-border/40 bg-muted/50 px-3 py-1 font-mono text-xs font-black tracking-widest text-muted-foreground uppercase"
		>
			Error {config.code}
		</span>

		<!-- Title -->
		<h1 class="mb-2 text-2xl font-black tracking-tight text-foreground">
			{config.title}
		</h1>

		<!-- Description -->
		<p class="mb-6 text-sm leading-relaxed text-muted-foreground">
			{config.description}
		</p>

		<!-- Error detail if available -->
		{#if page.error?.message && page.error.message !== config.title}
			<div
				class="mb-6 w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-left"
			>
				<p class="text-xs font-mono text-muted-foreground break-words">
					<span class="font-bold text-foreground">Details: </span>{page.error.message}
				</p>
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex flex-wrap items-center justify-center gap-2">
			<Button
				href="/dashboard"
				class="font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
			>
				<Home class="mr-2 h-4 w-4" aria-hidden="true" />
				Return to Dashboard
			</Button>

			{#if config.showRefresh}
				<Button
					variant="outline"
					onclick={() => window.location.reload()}
					class="font-bold border-border/60 hover:bg-muted cursor-pointer"
				>
					<RefreshCw class="mr-2 h-4 w-4" aria-hidden="true" />
					Retry
				</Button>
			{/if}
		</div>
	</div>
</div>
