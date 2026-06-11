<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { 
		Boxes, 
		LogOut, 
		Moon, 
		Sun, 
		User as UserIcon, 
		Shield, 
		Package, 
		TrendingUp, 
		AlertTriangle, 
		FolderOpen, 
		Plus, 
		Minus, 
		UserCheck, 
		Settings, 
		FileText, 
		History,
		CheckCircle2,
		XCircle
	} from '@lucide/svelte';
	import { onMount } from 'svelte';

	// Retrieve user data injected by +page.server.ts load function
	let { data } = $props();
	const user = $derived(data.user);

	// Active tab state
	let activeTab = $state('overview');
	let isDark = $state(false);
	let mounted = $state(false);

	// Alert Notification toast state
	let toast = $state<{ show: boolean; message: string; type: 'success' | 'info' | 'error' }>({
		show: false,
		message: '',
		type: 'success'
	});

	function showToast(message: string, type: 'success' | 'info' | 'error' = 'success') {
		toast.message = message;
		toast.type = type;
		toast.show = true;
		setTimeout(() => {
			toast.show = false;
		}, 3500);
	}

	onMount(() => {
		mounted = true;
		isDark = document.documentElement.classList.contains('dark');
		
		// Initialize audit logs safely after mount to avoid capture warnings
		auditLogs = [
			{ id: 'l1', timestamp: 'Just Now', action: 'User logged in', user: user.username, ip: '192.168.1.10' },
			{ id: 'l2', timestamp: '10 mins ago', action: 'Product PAP-001 stock alert', user: 'system', ip: 'localhost' },
			{ id: 'l3', timestamp: '1 hour ago', action: 'Altered role checks constraint', user: 'postgres', ip: 'supabase.co' }
		];
		
		// If direct unauthorized role access occurred, show warning
		const errorFlag = page.url.searchParams.get('error');
		if (errorFlag === 'unauthorized_role') {
			showToast('Access Denied: You do not have permission to view that section.', 'error');
		}
	});

	function toggleTheme() {
		isDark = !isDark;
		if (isDark) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}

	// Interactive mock database (stored in Svelte 5 state for live reactions)
	let products = $state([
		{ id: '1', name: 'Premium Office Copy Paper', sku: 'PAP-001', category: 'Office Supplies', stock: 45, minStock: 50 },
		{ id: '2', name: 'LaserJet Black Toner Cartridge', sku: 'TON-902', category: 'Office Supplies', stock: 12, minStock: 5 },
		{ id: '3', name: 'Ergonomic Wireless Mouse', sku: 'MOU-402', category: 'Electronics', stock: 85, minStock: 20 },
		{ id: '4', name: 'Ultra-Wide 4K IPS Monitor', sku: 'MON-880', category: 'Electronics', stock: 3, minStock: 8 },
		{ id: '5', name: 'Noise-Cancelling USB Headset', sku: 'AUD-301', category: 'Electronics', stock: 25, minStock: 10 }
	]);

	let mockUsers = $state([
		{ id: 'u1', username: 'admin', fullName: 'System Administrator', role: 'admin', isActive: true },
		{ id: 'u2', username: 'manager', fullName: 'Inventory Manager', role: 'inventory_manager', isActive: true },
		{ id: 'u3', username: 'viewer', fullName: 'Guest Viewer', role: 'viewer', isActive: true },
		{ id: 'u4', username: 'inactive', fullName: 'Inactive User', role: 'viewer', isActive: false }
	]);

	interface AuditLog {
		id: string;
		timestamp: string;
		action: string;
		user: string;
		ip: string;
	}

	let auditLogs = $state<AuditLog[]>([]);

	// Derived metrics computed reactively using Svelte 5 state references
	const totalProducts = $derived(products.length);
	const lowStockAlerts = $derived(products.filter(p => p.stock < p.minStock).length);
	const totalStock = $derived(products.reduce((acc, p) => acc + p.stock, 0));
	const categoriesCount = $derived(new Set(products.map(p => p.category)).size);

	// Action Permissions based on authenticated user roles
	const canManageProducts = $derived(user.role === 'admin' || user.role === 'inventory_manager');
	const canManageInventory = $derived(user.role === 'admin' || user.role === 'inventory_manager');
	const canManageUsers = $derived(user.role === 'admin');
	const canAccessSettings = $derived(user.role === 'admin');

	// Inventory operations functions
	function stockIn(productId: string) {
		if (!canManageInventory) {
			showToast('Action Denied: Viewers cannot perform transactions.', 'error');
			return;
		}
		const prod = products.find(p => p.id === productId);
		if (prod) {
			prod.stock += 10;
			showToast(`Stock In (+10) successful for: ${prod.name}`);
			auditLogs.unshift({
				id: Math.random().toString(),
				timestamp: 'Just Now',
				action: `Stocked in 10 items of ${prod.sku} (New: ${prod.stock})`,
				user: user.username,
				ip: '127.0.0.1'
			});
		}
	}

	function stockOut(productId: string) {
		if (!canManageInventory) {
			showToast('Action Denied: Viewers cannot perform transactions.', 'error');
			return;
		}
		const prod = products.find(p => p.id === productId);
		if (prod) {
			if (prod.stock < 5) {
				showToast('Transaction Failed: Insufficient stock remaining.', 'error');
				return;
			}
			prod.stock -= 5;
			showToast(`Stock Out (-5) successful for: ${prod.name}`, 'info');
			auditLogs.unshift({
				id: Math.random().toString(),
				timestamp: 'Just Now',
				action: `Stocked out 5 items of ${prod.sku} (New: ${prod.stock})`,
				user: user.username,
				ip: '127.0.0.1'
			});
		}
	}

	function toggleUserActive(userId: string) {
		if (!canManageUsers) {
			showToast('Action Denied: Only Administrators can edit users.', 'error');
			return;
		}
		const u = mockUsers.find(userItem => userItem.id === userId);
		if (u) {
			u.isActive = !u.isActive;
			showToast(`User ${u.username} status updated to: ${u.isActive ? 'Active' : 'Inactive'}`);
			auditLogs.unshift({
				id: Math.random().toString(),
				timestamp: 'Just Now',
				action: `Toggled user ${u.username} state to ${u.isActive ? 'Active' : 'Inactive'}`,
				user: user.username,
				ip: '127.0.0.1'
			});
		}
	}

	// Role description badges configurations
	const roleDetails = $derived({
		admin: { name: 'Administrator', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' },
		inventory_manager: { name: 'Inventory Manager', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
		viewer: { name: 'Guest Viewer', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' }
	}[user.role]);
</script>

<svelte:head>
	<title>Dashboard - Inventra Inventory Management</title>
</svelte:head>

<div class="relative min-h-screen bg-background text-foreground transition-colors duration-300">
	<!-- Background grid overlay -->
	<div class="absolute inset-0 -z-20 bg-[linear-gradient(to_right,rgba(120,119,198,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.025)_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)]"></div>
	
	<!-- Top Navigation Header -->
	<header class="sticky top-0 z-40 border-b border-border/60 bg-card/65 backdrop-blur-md dark:bg-card/45">
		<div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
			<!-- Logo -->
			<div class="flex items-center gap-2">
				<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-emerald-500 text-primary-foreground shadow-md">
					<Boxes class="h-4.5 w-4.5" />
				</div>
				<span class="text-xl font-black tracking-wider bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
					Inventra
				</span>
			</div>

			<!-- User session badge, Theme toggle & Logout -->
			<div class="flex items-center gap-3">
				<div class="hidden items-center gap-2.5 rounded-full border border-border/80 bg-muted/40 px-3 py-1 sm:flex">
					<UserIcon class="h-4 w-4 text-muted-foreground" />
					<div class="flex flex-col text-left">
						<span class="text-xs font-bold leading-tight">{user.fullName}</span>
						<span class="text-[10px] text-muted-foreground leading-none">@{user.username}</span>
					</div>
					<span class="inline-flex items-center rounded-full border px-2 py-0.2 text-[9px] font-black uppercase tracking-wider {roleDetails.color}">
						{roleDetails.name}
					</span>
				</div>

				<!-- Theme toggle -->
				{#if mounted}
					<Button
						variant="outline"
						size="icon"
						onclick={toggleTheme}
						aria-label="Toggle theme"
						class="rounded-full shadow-sm hover:bg-muted"
					>
						{#if isDark}
							<Sun class="h-[1.1rem] w-[1.1rem] text-amber-500" />
						{:else}
							<Moon class="h-[1.1rem] w-[1.1rem] text-slate-700" />
						{/if}
					</Button>
				{/if}

				<!-- Logout Action via GET redirect to logout endpoint -->
				<a href="/logout" class="inline-flex">
					<Button
						variant="outline"
						size="icon"
						aria-label="Log Out"
						class="rounded-full shadow-sm border-destructive/25 text-destructive/80 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
					>
						<LogOut class="h-[1.1rem] w-[1.1rem]" />
					</Button>
				</a>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Role permission header notification -->
		<div class="mb-8 flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/45 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:bg-card/25">
			<div class="space-y-1">
				<h2 class="text-2xl font-black tracking-tight">System Dashboard</h2>
				<p class="text-sm text-muted-foreground">
					Welcome back, <strong class="text-foreground">{user.fullName}</strong>. You have logged in successfully with <strong class="text-foreground">{roleDetails.name}</strong> access levels.
				</p>
			</div>
			
			<div class="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-2 text-xs font-semibold text-indigo-500">
				<Shield class="h-4 w-4 shrink-0" />
				<span>Authorized permissions enabled for your profile.</span>
			</div>
		</div>

		<!-- Overview Cards Grid (Reactively updates when Svelte state changes) -->
		<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Total Products -->
			<Card.Root class="border-border/40 bg-card/60 shadow-sm backdrop-blur-sm">
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total SKUs</Card.Title>
					<Package class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-3xl font-black tracking-tight">{totalProducts}</div>
					<p class="mt-1 text-xs text-muted-foreground">Active inventory catalog products</p>
				</Card.Content>
			</Card.Root>

			<!-- Total Stock Items -->
			<Card.Root class="border-border/40 bg-card/60 shadow-sm backdrop-blur-sm">
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Stock</Card.Title>
					<TrendingUp class="h-4 w-4 text-emerald-500" />
				</Card.Header>
				<Card.Content>
					<div class="text-3xl font-black tracking-tight text-emerald-500">{totalStock}</div>
					<p class="mt-1 text-xs text-muted-foreground">Total items in physical custody</p>
				</Card.Content>
			</Card.Root>

			<!-- Low Stock Alerts -->
			<Card.Root class="border-border/40 bg-card/60 shadow-sm backdrop-blur-sm border-l-4 border-l-amber-500">
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Low Stock Alerts</Card.Title>
					<AlertTriangle class="h-4 w-4 text-amber-500" />
				</Card.Header>
				<Card.Content>
					<div class="text-3xl font-black tracking-tight text-amber-500">{lowStockAlerts}</div>
					<p class="mt-1 text-xs text-muted-foreground">Items below threshold level</p>
				</Card.Content>
			</Card.Root>

			<!-- Product Categories -->
			<Card.Root class="border-border/40 bg-card/60 shadow-sm backdrop-blur-sm">
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categories</Card.Title>
					<FolderOpen class="h-4 w-4 text-indigo-500" />
				</Card.Header>
				<Card.Content>
					<div class="text-3xl font-black tracking-tight text-indigo-500">{categoriesCount}</div>
					<p class="mt-1 text-xs text-muted-foreground">Unique departments structured</p>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Dashboard Main Tabs Layout -->
		<div class="grid gap-8 lg:grid-cols-5">
			<!-- Sidebar Tabs Selection -->
			<div class="lg:col-span-1">
				<nav class="flex flex-col gap-1.5" aria-label="Dashboard sections">
					<!-- Overview tab -->
					<button
						onclick={() => activeTab = 'overview'}
						class="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide transition-all border text-left cursor-pointer {activeTab === 'overview' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground'}"
					>
						<TrendingUp class="h-4 w-4" />
						Overview
					</button>

					<!-- Inventory tab -->
					<button
						onclick={() => activeTab = 'inventory'}
						class="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide transition-all border text-left cursor-pointer {activeTab === 'inventory' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground'}"
					>
						<Package class="h-4 w-4" />
						Product Catalog
					</button>

					<!-- Users tab (Only rendered/active if user is administrator) -->
					{#if canManageUsers}
						<button
							onclick={() => activeTab = 'users'}
							class="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide transition-all border text-left cursor-pointer {activeTab === 'users' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground'}"
						>
							<UserIcon class="h-4 w-4" />
							User Management
						</button>
					{/if}

					<!-- Audit logs tab -->
					<button
						onclick={() => activeTab = 'audit'}
						class="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide transition-all border text-left cursor-pointer {activeTab === 'audit' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground'}"
					>
						<History class="h-4 w-4" />
						Audit Logs
					</button>

					<!-- Settings tab -->
					<button
						onclick={() => activeTab = 'settings'}
						class="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide transition-all border text-left cursor-pointer {activeTab === 'settings' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground'}"
					>
						<Settings class="h-4 w-4" />
						System Settings
					</button>
				</nav>
			</div>

			<!-- Tab Contents Display -->
			<div class="lg:col-span-4 space-y-6">
				
				<!-- OVERVIEW TAB -->
				{#if activeTab === 'overview'}
					<Card.Root class="border-border/40 bg-card/60 shadow-sm">
						<Card.Header>
							<Card.Title class="text-lg font-bold">Physical Stock Distribution</Card.Title>
							<Card.Description>Visual percentage metrics of current warehouse space occupation.</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-6">
							<!-- Loop through items and show graphical bar indicators -->
							{#each products as product}
								<div class="space-y-2">
									<div class="flex items-center justify-between text-sm">
										<div class="flex items-center gap-2">
											<span class="font-bold">{product.name}</span>
											<span class="text-xs text-muted-foreground">({product.sku})</span>
										</div>
										<div class="flex items-center gap-2">
											<span class="font-semibold">{product.stock} Units</span>
											{#if product.stock < product.minStock}
												<span class="rounded bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-black text-amber-500 uppercase border border-amber-500/20">LOW</span>
											{:else}
												<span class="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-black text-emerald-500 uppercase border border-emerald-500/20">OK</span>
											{/if}
										</div>
									</div>
									
									<!-- CSS Progress bar indicator -->
									<div class="h-2.5 w-full rounded-full bg-muted overflow-hidden">
										<div 
											class="h-full rounded-full transition-all duration-500 {product.stock < product.minStock ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}"
											style="width: {Math.min(100, (product.stock / 120) * 100)}%"
										></div>
									</div>
								</div>
							{/each}
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- PRODUCT CATALOG TAB -->
				{#if activeTab === 'inventory'}
					<Card.Root class="border-border/40 bg-card/60 shadow-sm">
						<Card.Header class="flex flex-row items-center justify-between space-y-0">
							<div>
								<Card.Title class="text-lg font-bold">Physical Product Catalog</Card.Title>
								<Card.Description>View and manage product items. Admins/Managers can execute stock operations.</Card.Description>
							</div>
						</Card.Header>
						<Card.Content>
							<div class="overflow-x-auto rounded-lg border border-border/50">
								<table class="w-full text-left border-collapse text-sm">
									<thead>
										<tr class="border-b border-border bg-muted/30">
											<th class="p-3 font-semibold">SKU</th>
											<th class="p-3 font-semibold">Product Name</th>
											<th class="p-3 font-semibold">Category</th>
											<th class="p-3 font-semibold text-center">In Stock</th>
											<th class="p-3 font-semibold text-center">Safety Level</th>
											<th class="p-3 font-semibold text-right">Stock Actions</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-border/50">
										{#each products as product}
											<tr class="hover:bg-muted/10 transition-colors">
												<td class="p-3 font-mono text-xs">{product.sku}</td>
												<td class="p-3 font-medium">{product.name}</td>
												<td class="p-3">{product.category}</td>
												<td class="p-3 text-center">
													<span class="font-bold {product.stock < product.minStock ? 'text-amber-500 font-extrabold' : ''}">
														{product.stock}
													</span>
												</td>
												<td class="p-3 text-center text-xs text-muted-foreground">{product.minStock} Units</td>
												<td class="p-3 text-right">
													<div class="inline-flex gap-1.5">
														<!-- Stock In Action -->
														<Button
															variant="outline"
															size="sm"
															disabled={!canManageInventory}
															onclick={() => stockIn(product.id)}
															class="h-8 px-2 flex items-center gap-1 hover:border-emerald-500/40 hover:text-emerald-500 disabled:opacity-50 cursor-pointer"
															title={!canManageInventory ? "Permission denied (Viewer)" : "Restock Item"}
														>
															<Plus class="h-3.5 w-3.5" />
															<span class="hidden sm:inline">Stock In</span>
														</Button>

														<!-- Stock Out Action -->
														<Button
															variant="outline"
															size="sm"
															disabled={!canManageInventory}
															onclick={() => stockOut(product.id)}
															class="h-8 px-2 flex items-center gap-1 hover:border-destructive/40 hover:text-destructive disabled:opacity-50 cursor-pointer"
															title={!canManageInventory ? "Permission denied (Viewer)" : "Deplete Item"}
														>
															<Minus class="h-3.5 w-3.5" />
															<span class="hidden sm:inline">Stock Out</span>
														</Button>
													</div>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- USERS TAB (ONLY VISIBLE TO ADMINS) -->
				{#if activeTab === 'users'}
					<Card.Root class="border-border/40 bg-card/60 shadow-sm border-l-4 border-l-indigo-500">
						<Card.Header>
							<div class="flex items-center gap-2">
								<Shield class="h-5 w-5 text-indigo-500" />
								<Card.Title class="text-lg font-bold">User Accounts Administration</Card.Title>
							</div>
							<Card.Description>Manage permissions, roles, and status of users in Supabase.</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="overflow-x-auto rounded-lg border border-border/50">
								<table class="w-full text-left border-collapse text-sm">
									<thead>
										<tr class="border-b border-border bg-muted/30">
											<th class="p-3 font-semibold">User Details</th>
											<th class="p-3 font-semibold">Username</th>
											<th class="p-3 font-semibold">Role Assigned</th>
											<th class="p-3 font-semibold text-center">Status</th>
											<th class="p-3 font-semibold text-right">Administrative Options</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-border/50">
										{#each mockUsers as mockUser}
											<tr class="hover:bg-muted/10 transition-colors">
												<td class="p-3">
													<div class="font-bold">{mockUser.fullName}</div>
													<div class="text-[10px] text-muted-foreground font-mono">ID: {mockUser.id}</div>
												</td>
												<td class="p-3 font-mono font-bold text-xs">@{mockUser.username}</td>
												<td class="p-3">
													<span class="inline-flex rounded px-1.5 py-0.5 text-xs font-semibold capitalize border {mockUser.role === 'admin' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' : mockUser.role === 'inventory_manager' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'}">
														{mockUser.role.replace('_', ' ')}
													</span>
												</td>
												<td class="p-3 text-center">
													{#if mockUser.isActive}
														<span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-500">
															<CheckCircle2 class="h-3.5 w-3.5" />
															Active
														</span>
													{:else}
														<span class="inline-flex items-center gap-1 text-xs font-bold text-destructive">
															<XCircle class="h-3.5 w-3.5" />
															Inactive
														</span>
													{/if}
												</td>
												<td class="p-3 text-right">
													<Button
														variant="outline"
														size="sm"
														onclick={() => toggleUserActive(mockUser.id)}
														class="h-8 text-xs font-bold hover:bg-muted cursor-pointer"
													>
														{mockUser.isActive ? 'Deactivate' : 'Activate'}
													</Button>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- AUDIT LOGS TAB -->
				{#if activeTab === 'audit'}
					<Card.Root class="border-border/40 bg-card/60 shadow-sm">
						<Card.Header>
							<Card.Title class="text-lg font-bold">Security & Audit Trails</Card.Title>
							<Card.Description>Track modifications, entries, and authentications executed on this system.</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="space-y-3">
								{#each auditLogs as log}
									<div class="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/20 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
										<div class="flex items-center gap-3">
											<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
												<History class="h-4 w-4" />
											</div>
											<div class="space-y-0.5">
												<p class="font-semibold leading-tight">{log.action}</p>
												<p class="text-xs text-muted-foreground">By operator @{log.user} (Source: {log.ip})</p>
											</div>
										</div>
										<span class="text-xs text-muted-foreground font-mono self-end sm:self-center">{log.timestamp}</span>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- SYSTEM SETTINGS TAB -->
				{#if activeTab === 'settings'}
					{#if !canAccessSettings}
						<Card.Root class="border-destructive/20 bg-destructive/5 shadow-sm border-l-4 border-l-destructive">
							<Card.Header>
								<div class="flex items-center gap-2 text-destructive">
									<XCircle class="h-5 w-5" />
									<Card.Title class="text-lg font-bold">Access Forbidden</Card.Title>
								</div>
								<Card.Description class="text-destructive/80">
									Section lock: Your assigned role level ({user.role}) does not allow management of settings.
								</Card.Description>
							</Card.Header>
							<Card.Content>
								<p class="text-sm">
									Please contact the System Administrator if you believe this is in error or to request elevation of rights.
								</p>
							</Card.Content>
						</Card.Root>
					{:else}
						<Card.Root class="border-border/40 bg-card/60 shadow-sm">
							<Card.Header>
								<Card.Title class="text-lg font-bold">Global System Settings</Card.Title>
								<Card.Description>Configure security thresholds, warehouse locations, and integrations.</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-4">
								<div class="rounded-xl border border-border/50 p-4 bg-muted/10 space-y-2">
									<h4 class="font-bold text-sm">Security Rules</h4>
									<p class="text-xs text-muted-foreground">Force HTTP-only cookies verification and session lifetime settings (currently hardcoded to 24 hours).</p>
								</div>
								<div class="rounded-xl border border-border/50 p-4 bg-muted/10 space-y-2">
									<h4 class="font-bold text-sm">Supabase Integration Status</h4>
									<p class="text-xs text-muted-foreground">Direct connection active on standard PostgREST API with service role credentials.</p>
								</div>
								
								<Button 
									onclick={() => showToast('Settings saved successfully (simulated)')}
									class="font-bold cursor-pointer"
								>
									Save System Config
								</Button>
							</Card.Content>
						</Card.Root>
					{/if}
				{/if}

			</div>
		</div>
	</main>
</div>

<!-- Custom slide-in Toast Notification for interactive responses -->
{#if toast.show}
	<div 
		class="fixed bottom-4 right-4 z-50 rounded-xl border p-4 shadow-xl flex items-center gap-3 max-w-sm transition-all duration-300 transform translate-y-0 scale-100 animate-in slide-in-from-bottom-5 
		{toast.type === 'success' ? 'bg-card border-emerald-500/30 text-emerald-500' : toast.type === 'error' ? 'bg-card border-destructive/30 text-destructive' : 'bg-card border-indigo-500/30 text-indigo-500'}"
		role="status"
	>
		<div class="rounded-full p-1 {toast.type === 'success' ? 'bg-emerald-500/10' : toast.type === 'error' ? 'bg-destructive/10' : 'bg-indigo-500/10'}">
			{#if toast.type === 'success'}
				<CheckCircle2 class="h-4.5 w-4.5" />
			{:else if toast.type === 'error'}
				<XCircle class="h-4.5 w-4.5" />
			{:else}
				<History class="h-4.5 w-4.5" />
			{/if}
		</div>
		<p class="text-sm font-semibold tracking-wide text-foreground">{toast.message}</p>
	</div>
{/if}
