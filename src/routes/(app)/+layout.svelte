<script lang="ts">
	import { page } from '$app/state';
	import AppSidebar from '$lib/components/layout/AppSidebar.svelte';
	import AppHeader from '$lib/components/layout/AppHeader.svelte';
	import CommandPalette from '$lib/components/search/CommandPalette.svelte';
	import { CheckCircle2, XCircle, Info, AlertTriangle, X } from '@lucide/svelte';

	import { toastService } from '$lib/services/toast.svelte';

	let { data, children } = $props();
	const user = $derived(data.user);

	// Mobile sidebar toggle state
	let mobileOpen = $state(false);

	// Trigger toasts reactively if URL search params carry them
	$effect(() => {
		const toastParam = page.url.searchParams.get('toast');
		const errorParam = page.url.searchParams.get('error');
		const msgParam = page.url.searchParams.get('message');

		if (toastParam === 'created') {
			toastService.trigger('Category created successfully!', 'success');
		} else if (toastParam === 'updated') {
			toastService.trigger('Category updated successfully!', 'success');
		} else if (toastParam === 'deleted') {
			toastService.trigger('Category deleted successfully!', 'success');
		} else if (errorParam === 'unauthorized_role') {
			toastService.trigger(
				'Access Denied: You do not have permissions to access that section.',
				'error'
			);
		} else if (errorParam) {
			toastService.trigger(msgParam || 'An error occurred.', 'error');
		}

		if (toastParam || errorParam) {
			// Clean URL parameters to prevent repeated toasts on reload
			try {
				const cleanUrl = new URL(page.url);
				cleanUrl.searchParams.delete('toast');
				cleanUrl.searchParams.delete('error');
				cleanUrl.searchParams.delete('message');
				window.history.replaceState({}, '', cleanUrl.toString());
			} catch {
				// Safely ignore history API failures in SSR context
			}
		}
	});

	// Toast type config
	const toastConfig = $derived(
		toastService.type === 'success'
			? {
					border: 'border-emerald-500/30',
					icon: CheckCircle2,
					iconBg: 'bg-emerald-500/10',
					iconColor: 'text-emerald-500',
					bar: 'bg-emerald-500'
				}
			: toastService.type === 'error'
				? {
						border: 'border-destructive/30',
						icon: XCircle,
						iconBg: 'bg-destructive/10',
						iconColor: 'text-destructive',
						bar: 'bg-destructive'
					}
				: toastService.type === 'warning'
					? {
							border: 'border-amber-500/30',
							icon: AlertTriangle,
							iconBg: 'bg-amber-500/10',
							iconColor: 'text-amber-500',
							bar: 'bg-amber-500'
						}
					: {
							border: 'border-indigo-500/30',
							icon: Info,
							iconBg: 'bg-indigo-500/10',
							iconColor: 'text-indigo-500',
							bar: 'bg-indigo-500'
						}
	);
</script>

<div class="relative min-h-screen overflow-x-hidden bg-background text-foreground transition-colors duration-300">
	<!-- Background grid overlay -->
	<div
		class="absolute inset-0 -z-20 bg-[linear-gradient(to_right,rgba(120,119,198,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.02)_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.008)_1px,transparent_1px)]"
	></div>

	<!-- Background glow blobs -->
	<div class="absolute inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -top-[10%] left-[20%] h-[30%] w-[30%] rounded-full bg-primary/5 blur-[120px] dark:bg-primary/3"
		></div>
		<div
			class="absolute -bottom-[10%] right-[20%] h-[30%] w-[30%] rounded-full bg-emerald-500/5 blur-[120px] dark:bg-emerald-500/3"
		></div>
	</div>

	<!-- Sidebar component (Desktop fixed + Mobile drawer Sheet overlay inside) -->
	<AppSidebar {user} bind:mobileOpen />

	<!-- Layout Content offsets right to make room for fixed desktop sidebar -->
	<div class="flex min-h-screen flex-col lg:ml-64 min-w-0">
		<!-- Top header -->
		<AppHeader {user} bind:mobileOpen />

		<!-- Active router page viewport rendering -->
		<main
			id="main-content"
			class="flex-grow animate-in fade-in p-4 duration-300 sm:p-6 lg:p-8"
			tabindex="-1"
		>
			{@render children()}
		</main>
	</div>
</div>

<!-- Global Command Palette (Ctrl+K) -->
<CommandPalette {user} />

<!-- Global Toast Notification -->
{#if toastService.show}
	{@const config = toastConfig}
	{@const Icon = config.icon}
	<div
		class="fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col overflow-hidden rounded-xl border shadow-2xl animate-in slide-in-from-bottom-5 duration-300 bg-card {config.border}"
		role={toastService.type === 'error' ? 'alert' : 'status'}
		aria-live={toastService.type === 'error' ? 'assertive' : 'polite'}
		aria-atomic="true"
	>
		<!-- Toast body -->
		<div class="flex items-start gap-3 p-4">
			<!-- Icon -->
			<div class="mt-0.5 shrink-0 rounded-full p-1 {config.iconBg}">
				<Icon class="h-4 w-4 {config.iconColor}" aria-hidden="true" />
			</div>

			<!-- Content -->
			<div class="min-w-0 flex-1">
				{#if toastService.title}
					<p class="text-sm font-black tracking-wide text-foreground">{toastService.title}</p>
					<p class="mt-0.5 text-xs text-muted-foreground leading-relaxed">{toastService.message}</p>
				{:else}
					<p class="text-sm font-semibold tracking-wide text-foreground">{toastService.message}</p>
				{/if}
			</div>

			<!-- Close button -->
			<button
				type="button"
				onclick={() => toastService.dismiss()}
				class="ml-1 shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
				aria-label="Dismiss notification"
			>
				<X class="h-3.5 w-3.5" aria-hidden="true" />
			</button>
		</div>

		<!-- Auto-dismiss progress bar -->
		<div class="h-0.5 w-full bg-muted/40">
			<div
				class="h-full transition-none {config.bar}"
				style="width: {toastService.progress}%"
				aria-hidden="true"
			></div>
		</div>
	</div>
{/if}
