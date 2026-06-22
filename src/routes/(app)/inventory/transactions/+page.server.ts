import type { PageServerLoad } from './$types';
import { inventoryService } from '$lib/services/inventory.service';

export const load: PageServerLoad = async ({ parent, url }) => {
	const parentData = await parent();
	const user = parentData.user;

	// Viewers, inventory_managers, and admins can view history
	const search = url.searchParams.get('q') || '';
	const transactionType = url.searchParams.get('type') || 'all';
	const productId = url.searchParams.get('productId') || 'all';
	const userId = url.searchParams.get('userId') || 'all';
	const startDate = url.searchParams.get('startDate') || '';
	const endDate = url.searchParams.get('endDate') || '';

	const pageParam = url.searchParams.get('page');
	const page = pageParam ? Math.max(1, parseInt(pageParam) || 1) : 1;

	const sortByParam = url.searchParams.get('sortBy');
	const validSortFields = ['created_at', 'quantity', 'product_name', 'transaction_type'];
	const sortBy = validSortFields.includes(sortByParam || '')
		? (sortByParam as 'created_at' | 'quantity' | 'product_name' | 'transaction_type')
		: 'created_at';

	const sortOrderParam = url.searchParams.get('sortOrder');
	const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';

	const limit = 10;

	try {
		// Load transactions, products, and users in parallel
		const [
			{ transactions, totalCount },
			products,
			users
		] = await Promise.all([
			inventoryService.getTransactions({
				search,
				transactionType,
				productId,
				userId,
				startDate,
				endDate,
				page,
				limit,
				sortBy,
				sortOrder
			}),
			inventoryService.getSelectableProducts(),
			inventoryService.getAllUsers()
		]);

		return {
			user,
			transactions,
			products,
			users,
			totalCount,
			search,
			transactionType,
			productId,
			userId,
			startDate,
			endDate,
			page,
			limit,
			sortBy,
			sortOrder
		};
	} catch (err: unknown) {
		console.error('Error loading transaction history page:', err);
		const message = err instanceof Error ? err.message : String(err);
		return {
			user,
			transactions: [],
			products: [],
			users: [],
			totalCount: 0,
			search,
			transactionType,
			productId,
			userId,
			startDate,
			endDate,
			page,
			limit,
			sortBy,
			sortOrder,
			error: message
		};
	}
};
