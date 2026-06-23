<script lang="ts">
	import type { SessionUser } from '$lib/types';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { LogOut, User as UserIcon, Settings, LogIn } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	let { user }: { user: SessionUser } = $props();

	// Compute initials for the avatar placeholder
	const initials = $derived(
		user.fullName
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	);

	// Get role badge class
	const roleColorClass = $derived(
		user.role === 'admin'
			? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30'
			: user.role === 'inventory_manager'
				? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
				: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
	);

	const roleLabel = $derived(
		user.role === 'admin'
			? 'Administrator'
			: user.role === 'inventory_manager'
				? 'Manager'
				: 'Viewer'
	);

	// Logout confirmation dialog state
	let isLogoutOpen = $state(false);
	let isLoggingOut = $state(false);

	async function confirmLogout() {
		isLoggingOut = true;
		await goto('/logout');
	}
</script>

<!-- Logout Confirmation Dialog -->
<AlertDialog.Root bind:open={isLogoutOpen}>
	<AlertDialog.Content class="border-border/50 bg-card p-6 shadow-2xl backdrop-blur-xl">
		<AlertDialog.Header>
			<AlertDialog.Title class="flex items-center gap-2 text-xl font-bold tracking-tight">
				<LogIn class="h-5 w-5 text-destructive" aria-hidden="true" />
				Confirm Logout
			</AlertDialog.Title>
			<AlertDialog.Description class="text-sm leading-relaxed">
				Are you sure you want to log out of Inventra? Your session will be ended and you will be
				redirected to the login page.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<AlertDialog.Footer class="flex gap-2 justify-end border-t border-border/40 pt-4">
			<AlertDialog.Cancel
				variant="outline"
				class="font-bold cursor-pointer border-border/60 hover:bg-muted"
				disabled={isLoggingOut}
			>
				Cancel
			</AlertDialog.Cancel>
			<Button
				variant="destructive"
				onclick={confirmLogout}
				disabled={isLoggingOut}
				class="font-bold cursor-pointer flex items-center gap-2"
			>
				{#if isLoggingOut}
					<span
						class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
						aria-hidden="true"
					></span>
					Logging out...
				{:else}
					<LogOut class="h-4 w-4" aria-hidden="true" />
					Logout
				{/if}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				class="relative flex h-10 items-center gap-3 rounded-xl px-2.5 text-left hover:bg-muted/60 focus-visible:ring-emerald-500/50 cursor-pointer"
				aria-label="Open user menu for {user.fullName}"
			>
				<div
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-emerald-500 text-xs font-bold text-primary-foreground shadow-sm"
					aria-hidden="true"
				>
					{initials}
				</div>
				<div class="hidden flex-col text-left sm:flex max-w-[140px]">
					<span class="truncate text-sm font-bold leading-none text-foreground">{user.fullName}</span>
					<span class="truncate text-[10px] text-muted-foreground mt-0.5 leading-none"
						>@{user.username}</span
					>
				</div>
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>

	<DropdownMenu.Content
		align="end"
		class="w-56 rounded-xl border-border/50 bg-card/90 shadow-lg backdrop-blur-md"
	>
		<DropdownMenu.Label class="font-normal">
			<div class="flex flex-col space-y-1 p-1">
				<p class="text-sm font-bold leading-none">{user.fullName}</p>
				<p class="text-xs text-muted-foreground leading-none mt-0.5">@{user.username}</p>
				<div class="mt-2.5">
					<span
						class="inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider {roleColorClass}"
					>
						{roleLabel}
					</span>
				</div>
			</div>
		</DropdownMenu.Label>

		<DropdownMenu.Separator class="bg-border/60" />

		<DropdownMenu.Group>
			<DropdownMenu.Item class="rounded-lg hover:bg-muted focus:bg-muted cursor-pointer">
				<UserIcon class="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
				<span>My Profile</span>
			</DropdownMenu.Item>
			{#if user.role === 'admin'}
				<DropdownMenu.Item class="rounded-lg hover:bg-muted focus:bg-muted cursor-pointer p-0">
					<a href="/settings" class="flex w-full items-center px-2 py-1.5">
						<Settings class="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
						<span>Settings</span>
					</a>
				</DropdownMenu.Item>
			{/if}
		</DropdownMenu.Group>

		<DropdownMenu.Separator class="bg-border/60" />

		<DropdownMenu.Item
			onclick={() => (isLogoutOpen = true)}
			class="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
		>
			<LogOut class="mr-2 h-4 w-4" aria-hidden="true" />
			<span>Log Out</span>
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
