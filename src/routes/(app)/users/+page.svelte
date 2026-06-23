<script lang="ts">
	import { page, navigating } from '$app/state';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { SubmitFunction } from './$types';
	import { toastService } from '$lib/services/toast.svelte';
	import { createTable, getCoreRowModel } from '@tanstack/table-core';
	import type { User } from '$lib/types/user';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Search,
		Plus,
		MoreHorizontal,
		KeyRound,
		Edit2,
		UserCheck,
		UserX,
		Loader2,
		ChevronUp,
		ChevronDown,
		ChevronsUpDown,
		Users,
		X,
		Copy,
		Check,
		Sparkles
	} from '@lucide/svelte';

	let { data } = $props();

	// Search & Filter state
	let searchQuery = $state('');
	let roleFilter = $state('all');
	let statusFilter = $state('all');

	// Sync local search & filter state with URL changes
	$effect(() => {
		searchQuery = data.search;
		roleFilter = data.role;
		statusFilter = data.status;
	});

	// Reset Password Dialog state
	let isResetOpen = $state(false);
	let userToReset = $state<User | null>(null);
	let newPassword = $state('');
	let confirmPassword = $state('');
	let isSubmittingReset = $state(false);
	let resetErrors = $state<Record<string, string>>({});
	let copiedPassword = $state(false);

	// Status Toggle Modal state
	let isToggleOpen = $state(false);
	let userToToggle = $state<User | null>(null);
	let isTogglingStatus = $state(false);

	// TanStack Table columns structure definition
	const columns = [
		{ accessorKey: 'username', header: 'Username' },
		{ accessorKey: 'full_name', header: 'Full Name' },
		{ accessorKey: 'role', header: 'Role' },
		{ accessorKey: 'is_active', header: 'Status' },
		{ accessorKey: 'created_at', header: 'Created Date' },
		{ id: 'actions', header: 'Actions' }
	];

	let tableState: any = $state({
		columnPinning: { left: [], right: [] },
		columnVisibility: {},
		columnOrder: [],
		columnFilters: [],
		globalFilter: null,
		sorting: [],
		expanded: {},
		grouping: [],
		pagination: { pageIndex: 0, pageSize: 10 },
		rowSelection: {}
	});

	$effect(() => {
		tableState.pagination.pageIndex = data.page - 1;
		tableState.pagination.pageSize = data.limit;
	});

	let table = $derived(
		createTable({
			data: data.users as User[],
			columns,
			getCoreRowModel: getCoreRowModel(),
			manualPagination: true,
			manualSorting: true,
			manualFiltering: true,
			state: tableState,
			onStateChange: (updater: any) => {
				if (typeof updater === 'function') {
					tableState = updater(tableState);
				} else {
					tableState = updater;
				}
			},
			renderFallbackValue: (val: unknown) => val
		})
	);

	// Controls handlers
	function handleSearch(e: Event) {
		e.preventDefault();
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (searchQuery.trim()) {
			params.set('q', searchQuery.trim());
		} else {
			params.delete('q');
		}
		params.set('page', '1'); // Reset to page 1 on new search query
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	function handleClearSearch() {
		searchQuery = '';
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.delete('q');
		params.set('page', '1');
		goto(`?${params.toString()}`);
	}

	function handleFilterChange(key: 'role' | 'status', value: string) {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (value && value !== 'all') {
			params.set(key, value);
		} else {
			params.delete(key);
		}
		params.set('page', '1'); // Reset pagination
		goto(`?${params.toString()}`);
	}

	function handleSort(columnId: string) {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		const currentSort = params.get('sortBy');
		const currentOrder = params.get('sortOrder');

		let newOrder = 'asc';
		if (currentSort === columnId) {
			newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
		} else if (columnId === 'created_at') {
			newOrder = 'desc'; // Default created date to descending
		}

		params.set('sortBy', columnId);
		params.set('sortOrder', newOrder);
		goto(`?${params.toString()}`);
	}

	function handlePageChange(newPage: number) {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('page', newPage.toString());
		goto(`?${params.toString()}`);
	}

	// Password reset helpers
	function openResetDialog(user: User) {
		userToReset = user;
		newPassword = '';
		confirmPassword = '';
		resetErrors = {};
		copiedPassword = false;
		isResetOpen = true;
	}

	function generatePassword() {
		const length = 12;
		const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
		let retVal = '';
		for (let i = 0, n = charset.length; i < length; ++i) {
			retVal += charset.charAt(Math.floor(Math.random() * n));
		}
		newPassword = retVal;
		confirmPassword = retVal;
		copiedPassword = false;
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(newPassword);
			copiedPassword = true;
			toastService.trigger('Password copied to clipboard!', 'success');
			setTimeout(() => {
				copiedPassword = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy password:', err);
		}
	}

	const handleResetEnhance: SubmitFunction = () => {
		isSubmittingReset = true;
		resetErrors = {};
		return async ({ result, update }) => {
			isSubmittingReset = false;
			if (result.type === 'success') {
				toastService.trigger('Password reset successfully!', 'success');
				isResetOpen = false;
				userToReset = null;
				await update();
			} else if (result.type === 'failure') {
				const actionData = result.data as any;
				if (actionData?.errors) {
					resetErrors = actionData.errors;
				} else {
					const errorMsg = actionData?.error || 'Failed to reset password';
					toastService.trigger(errorMsg, 'error');
				}
			}
		};
	};

	// Toggle status helpers
	function openToggleDialog(user: User) {
		userToToggle = user;
		isToggleOpen = true;
	}

	const handleToggleEnhance: SubmitFunction = () => {
		isTogglingStatus = true;
		return async ({ result, update }) => {
			isTogglingStatus = false;
			isToggleOpen = false;
			userToToggle = null;

			if (result.type === 'success') {
				toastService.trigger('User status updated successfully!', 'success');
				await update();
			} else if (result.type === 'failure') {
				const actionData = result.data as any;
				const errorMsg = actionData?.error || 'Failed to update user status';
				toastService.trigger(errorMsg, 'error');
			}
		};
	};

	// Pagination parameters
	const totalCount = $derived(data.totalCount);
	const currentPage = $derived(data.page);
	const limit = $derived(data.limit);
	const totalPages = $derived(Math.ceil(totalCount / limit) || 1);
	const fromEntry = $derived(totalCount === 0 ? 0 : (currentPage - 1) * limit + 1);
	const toEntry = $derived(Math.min(currentPage * limit, totalCount));

	// Role & status formatting helpers
	function getRoleLabel(role: string) {
		if (role === 'admin') return 'Admin';
		if (role === 'inventory_manager') return 'Inventory Manager';
		if (role === 'viewer') return 'Viewer';
		return role;
	}

	function getRoleBadgeVariant(role: string) {
		if (role === 'admin') return 'destructive';
		if (role === 'inventory_manager') return 'default';
		return 'secondary';
	}
</script>

<svelte:head>
	<title>User Management - Inventra Admin</title>
	<meta name="description" content="View, create, edit and manage Inventra user profiles and authorization roles." />
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-black tracking-tight">User Management</h2>
			<p class="text-sm text-muted-foreground">Manage user accounts, roles, access permissions, and reset credentials.</p>
		</div>

		<Button
			href="/users/create"
			class="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shrink-0 cursor-pointer shadow-sm shadow-primary/15"
		>
			<Plus class="mr-2 h-4.5 w-4.5" />
			Create User
		</Button>
	</div>

	<!-- Controls: Search, Filters & Counters -->
	<div
		class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-card/40 border border-border/40 p-4 rounded-xl backdrop-blur-sm"
	>
		<div class="flex flex-col gap-3 sm:flex-row w-full lg:max-w-4xl">
			<!-- Search bar -->
			<form onsubmit={handleSearch} class="flex items-center gap-2 w-full sm:max-w-md">
				<div class="relative w-full">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Search by username or full name..."
						bind:value={searchQuery}
						class="pl-9 pr-9 h-10 w-full focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 bg-background/50 border-border/60"
					/>
					{#if searchQuery}
						<button
							type="button"
							onclick={handleClearSearch}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
							aria-label="Clear search"
						>
							<X class="h-4 w-4" />
						</button>
					{/if}
				</div>
				<Button
					type="submit"
					variant="secondary"
					class="h-10 px-4 font-bold cursor-pointer border border-border/60 shrink-0"
				>
					Search
				</Button>
			</form>

			<!-- Role Filter Dropdown -->
			<div class="flex items-center gap-2 shrink-0">
				<span class="text-xs font-semibold text-muted-foreground whitespace-nowrap">Role:</span>
				<select
					bind:value={roleFilter}
					onchange={() => handleFilterChange('role', roleFilter)}
					class="h-10 rounded-lg border border-border/60 bg-background/50 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 cursor-pointer font-medium text-foreground transition-all duration-150"
				>
					<option value="all">All Roles</option>
					<option value="admin">Admin</option>
					<option value="inventory_manager">Inventory Manager</option>
					<option value="viewer">Viewer</option>
				</select>
			</div>

			<!-- Status Filter Dropdown -->
			<div class="flex items-center gap-2 shrink-0">
				<span class="text-xs font-semibold text-muted-foreground whitespace-nowrap">Status:</span>
				<select
					bind:value={statusFilter}
					onchange={() => handleFilterChange('status', statusFilter)}
					class="h-10 rounded-lg border border-border/60 bg-background/50 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 cursor-pointer font-medium text-foreground transition-all duration-150"
				>
					<option value="all">All Statuses</option>
					<option value="active">Active Only</option>
					<option value="inactive">Inactive Only</option>
				</select>
			</div>
		</div>

		<div class="text-xs font-semibold text-muted-foreground self-start lg:self-center shrink-0">
			Total Users: <span
				class="text-foreground text-sm font-bold bg-muted/50 px-2.5 py-1 rounded-lg border border-border/40"
				>{totalCount}</span
			>
		</div>
	</div>

	<!-- Users Table -->
	<div
		class="relative overflow-hidden rounded-xl border border-border/40 bg-card/65 backdrop-blur-md shadow-sm"
	>
		<!-- Navigation Overlay -->
		{#if navigating && navigating.to}
			<div
				class="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px] transition-opacity duration-300"
			>
				<div
					class="flex flex-col items-center gap-2 rounded-xl bg-card border border-border/80 p-5 shadow-2xl"
				>
					<Loader2 class="h-6 w-6 animate-spin text-primary" />
					<span class="text-xs font-bold text-muted-foreground">Loading fresh users...</span>
				</div>
			</div>
		{/if}

		<Table.Root>
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<Table.Row class="hover:bg-transparent bg-muted/40 border-b border-border/40">
						{#each headerGroup.headers as header (header.id)}
							<Table.Head class="font-bold text-foreground py-3">
								{#if header.column.id === 'username' || header.column.id === 'full_name' || header.column.id === 'created_at'}
									<button
										type="button"
										onclick={() => handleSort(header.column.id)}
										class="flex items-center gap-1.5 hover:text-foreground font-bold tracking-wide cursor-pointer transition-colors"
										aria-label="Sort by {header.column.columnDef.header}"
									>
										<span>{header.column.columnDef.header}</span>
										{#if data.sortBy === header.column.id}
											{#if data.sortOrder === 'asc'}
												<ChevronUp class="h-4 w-4 text-primary" />
											{:else}
												<ChevronDown class="h-4 w-4 text-primary" />
											{/if}
										{:else}
											<ChevronsUpDown class="h-3.5 w-3.5 text-muted-foreground/40" />
										{/if}
									</button>
								{:else}
									{header.column.columnDef.header}
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>

			<Table.Body>
				{#if data.users.length > 0}
					{#each table.getRowModel().rows as row (row.original.id)}
						<Table.Row class="hover:bg-muted/30 border-b border-border/30 transition-colors">
							{#each row.getVisibleCells() as cell (cell.id)}
								<Table.Cell class="py-3">
									{#if cell.column.id === 'username'}
										<span class="font-black text-foreground block tracking-wide">{cell.getValue()}</span>
									{:else if cell.column.id === 'full_name'}
										<span class="text-foreground text-sm font-semibold">{cell.getValue()}</span>
									{:else if cell.column.id === 'role'}
										<Badge variant={getRoleBadgeVariant(cell.getValue() as string)} class="font-bold">
											{getRoleLabel(cell.getValue() as string)}
										</Badge>
									{:else if cell.column.id === 'is_active'}
										{#if cell.getValue()}
											<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
												Active
											</span>
										{:else}
											<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border/50">
												Inactive
											</span>
										{/if}
									{:else if cell.column.id === 'created_at'}
										<span class="text-muted-foreground font-mono text-xs block">
											{new Date(cell.getValue() as string).toLocaleDateString(undefined, {
												year: 'numeric',
												month: 'short',
												day: 'numeric'
											})}
										</span>
									{:else if cell.column.id === 'actions'}
										<DropdownMenu.Root>
											<DropdownMenu.Trigger>
												{#snippet child({ props })}
													<Button
														{...props}
														variant="ghost"
														size="icon"
														class="h-8 w-8 p-0 hover:bg-muted cursor-pointer"
													>
														<MoreHorizontal class="h-4 w-4" />
														<span class="sr-only">Open menu</span>
													</Button>
												{/snippet}
											</DropdownMenu.Trigger>

											<DropdownMenu.Content align="end" class="border-border/60 bg-card p-1">
												<!-- Edit details -->
												<DropdownMenu.Item class="rounded-lg hover:bg-muted focus:bg-muted cursor-pointer p-0 text-foreground">
													<a
														href="/users/{row.original.id}/edit"
														class="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
													>
														<Edit2 class="h-4 w-4 text-muted-foreground" />
														Edit Details
													</a>
												</DropdownMenu.Item>

												<!-- Reset password -->
												<DropdownMenu.Item
													onclick={() => openResetDialog(row.original)}
													class="flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted rounded-lg cursor-pointer"
												>
													<KeyRound class="h-4 w-4 text-muted-foreground" />
													Reset Password
												</DropdownMenu.Item>

												<DropdownMenu.Separator class="bg-border/50 my-1" />

												<!-- Status toggle -->
												{#if row.original.id !== data.user.id}
													<DropdownMenu.Item
														onclick={() => openToggleDialog(row.original)}
														class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer {row.original.is_active ? 'text-destructive hover:bg-destructive/10' : 'text-emerald-500 hover:bg-emerald-500/10'}"
													>
														{#if row.original.is_active}
															<UserX class="h-4 w-4 text-destructive/80" />
															Deactivate User
														{:else}
															<UserCheck class="h-4 w-4 text-emerald-500/80" />
															Activate User
														{/if}
													</DropdownMenu.Item>
												{:else}
													<DropdownMenu.Item
														disabled
														class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground/50 rounded-lg cursor-not-allowed"
													>
														<UserX class="h-4 w-4 text-muted-foreground/30" />
														Deactivate (Self)
													</DropdownMenu.Item>
												{/if}
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									{/if}
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="h-56 text-center">
							<div class="flex flex-col items-center justify-center space-y-3">
								<div
									class="rounded-2xl bg-muted/40 p-4 border border-border/20 text-muted-foreground shadow-inner"
								>
									<Users class="h-7 w-7 text-muted-foreground/80" />
								</div>
								<h3 class="text-base font-bold">No users found</h3>
								<p class="text-xs text-muted-foreground max-w-xs leading-relaxed">
									{#if data.search || data.role !== 'all' || data.status !== 'all'}
										No user profiles match the selected filters. Clear filters and try again.
									{:else}
										There are no user profiles configured in the system.
									{/if}
								</p>
								{#if data.search || data.role !== 'all' || data.status !== 'all'}
									<Button
										onclick={() => {
											searchQuery = '';
											roleFilter = 'all';
											statusFilter = 'all';
											goto('?');
										}}
										size="sm"
										variant="outline"
										class="font-bold border-border/60 hover:bg-muted cursor-pointer"
									>
										Clear All Filters
									</Button>
								{/if}
							</div>
						</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- Pagination Footer -->
	{#if totalCount > 0}
		<div
			class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border/40 pt-4 text-xs font-semibold text-muted-foreground"
		>
			<div>
				Showing <span class="text-foreground font-bold">{fromEntry}</span> to
				<span class="text-foreground font-bold">{toEntry}</span>
				of <span class="text-foreground font-bold">{totalCount}</span> users
			</div>

			<div class="flex items-center gap-1.5 self-end sm:self-auto">
				<Button
					variant="outline"
					size="sm"
					onclick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage <= 1}
					class="h-8 font-bold border-border/60 hover:bg-muted cursor-pointer active:scale-95 disabled:scale-100 disabled:opacity-50"
				>
					Previous
				</Button>

				<div class="flex items-center gap-1">
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNum (pageNum)}
						{#if pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1}
							<Button
								variant={currentPage === pageNum ? 'default' : 'outline'}
								size="sm"
								onclick={() => handlePageChange(pageNum)}
								class="h-8 w-8 font-bold p-0 cursor-pointer {currentPage === pageNum
									? 'bg-primary text-primary-foreground border-primary shadow-sm'
									: 'border-border/60 hover:bg-muted'}"
							>
								{pageNum}
							</Button>
						{:else if pageNum === 2 || pageNum === totalPages - 1}
							<span class="text-muted-foreground/60 px-1 font-bold">...</span>
						{/if}
					{/each}
				</div>

				<Button
					variant="outline"
					size="sm"
					onclick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage >= totalPages}
					class="h-8 font-bold border-border/60 hover:bg-muted cursor-pointer active:scale-95 disabled:scale-100 disabled:opacity-50"
				>
					Next
				</Button>
			</div>
		</div>
	{/if}
</div>

<!-- Password Reset Dialog -->
<Dialog.Root bind:open={isResetOpen}>
	<Dialog.Content class="sm:max-w-[450px] border-border/50 bg-card p-6 shadow-2xl backdrop-blur-xl">
		<Dialog.Header>
			<Dialog.Title class="text-xl font-bold tracking-tight">Reset Password</Dialog.Title>
			<Dialog.Description class="text-sm">
				Reset password credentials for
				<strong class="text-foreground font-black bg-muted px-1 py-0.5 rounded border border-border/30">
					{userToReset?.username}
				</strong>.
			</Dialog.Description>
		</Dialog.Header>

		<form method="POST" action="?/resetPassword" use:enhance={handleResetEnhance} class="space-y-4 py-3">
			<input type="hidden" name="id" value={userToReset?.id} />

			<!-- Generate password helper button -->
			<div class="flex justify-end">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onclick={generatePassword}
					class="text-xs font-bold border-border/60 hover:bg-muted cursor-pointer flex items-center gap-1.5"
				>
					<Sparkles class="h-3.5 w-3.5 text-primary" />
					Auto-Generate Secure Password
				</Button>
			</div>

			<!-- Password fields -->
			<div class="space-y-2">
				<Label for="password" class="text-sm font-bold text-foreground">New Password</Label>
				<div class="relative">
					<Input
						id="password"
						name="password"
						type="text"
						bind:value={newPassword}
						placeholder="Minimum 8 characters"
						class="w-full focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 pr-10 border-border/60"
					/>
					{#if newPassword}
						<button
							type="button"
							onclick={copyToClipboard}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
							title="Copy to clipboard"
						>
							{#if copiedPassword}
								<Check class="h-4 w-4 text-emerald-500 animate-scale-up" />
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</button>
					{/if}
				</div>
				{#if resetErrors.password}
					<p class="text-xs font-bold text-destructive">{resetErrors.password}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="confirmPassword" class="text-sm font-bold text-foreground">Confirm New Password</Label>
				<Input
					id="confirmPassword"
					name="confirmPassword"
					type="password"
					bind:value={confirmPassword}
					placeholder="Re-enter the new password"
					class="w-full focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 border-border/60"
				/>
				{#if resetErrors.confirmPassword}
					<p class="text-xs font-bold text-destructive">{resetErrors.confirmPassword}</p>
				{/if}
			</div>

			<Dialog.Footer class="border-t border-border/40 pt-4 flex gap-2 sm:justify-end">
				<Button
					type="button"
					variant="outline"
					onclick={() => (isResetOpen = false)}
					class="font-bold border-border/60 hover:bg-muted cursor-pointer"
					disabled={isSubmittingReset}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					class="font-bold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
					disabled={isSubmittingReset}
				>
					{#if isSubmittingReset}
						<Loader2 class="h-4 w-4 animate-spin" />
						Saving...
					{:else}
						Save Password
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Status Toggle Alert Dialog -->
<AlertDialog.Root bind:open={isToggleOpen}>
	<AlertDialog.Content class="border-border/50 bg-card p-6 shadow-2xl backdrop-blur-xl">
		<AlertDialog.Header>
			<AlertDialog.Title class="text-xl font-bold tracking-tight flex items-center gap-2">
				{#if userToToggle?.is_active}
					Deactivate User Account?
				{:else}
					Activate User Account?
				{/if}
			</AlertDialog.Title>
			<AlertDialog.Description class="text-sm leading-relaxed">
				{#if userToToggle?.is_active}
					This will soft-disable the account for 
					<strong class="text-foreground font-black bg-muted px-1.5 py-0.5 rounded border border-border/30">
						{userToToggle?.username}
					</strong>.
					The user will be blocked from logging into Inventra, but their historical data and audit trails will remain preserved.
				{:else}
					This will re-enable the user account for
					<strong class="text-foreground font-black bg-muted px-1.5 py-0.5 rounded border border-border/30">
						{userToToggle?.username}
					</strong>.
					The user will regain immediate access to log in with their existing credentials.
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>

		<AlertDialog.Footer class="border-t border-border/40 pt-4 flex gap-2 justify-end">
			<AlertDialog.Cancel
				variant="outline"
				class="font-bold cursor-pointer border-border/60 hover:bg-muted"
				disabled={isTogglingStatus}
			>
				Cancel
			</AlertDialog.Cancel>

			<form method="POST" action="?/toggleStatus" use:enhance={handleToggleEnhance}>
				<input type="hidden" name="id" value={userToToggle?.id} />
				<input type="hidden" name="isActive" value={userToToggle?.is_active ? 'false' : 'true'} />
				<Button
					type="submit"
					variant={userToToggle?.is_active ? 'destructive' : 'default'}
					class="font-bold cursor-pointer flex items-center gap-2"
					disabled={isTogglingStatus}
				>
					{#if isTogglingStatus}
						<Loader2 class="h-4 w-4 animate-spin" />
						Updating...
					{:else if userToToggle?.is_active}
						Yes, Deactivate User
					{:else}
						Yes, Activate User
					{/if}
				</Button>
			</form>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
