import type { PageServerLoad } from './$types';
import { inventoryService } from '$lib/services/inventory.service';
import { categoryService } from '$lib/services/category.service';

export const load: PageServerLoad = async ({ parent, url }) => {
	const parentData = await parent();
	const user = parentData.user;

	// Viewers, inventory_managers, and admins can view the inventory catalog list
	const search = url.searchParams.get('q') || '';
	const categoryId = url.searchParams.get('categoryId') || 'all';
	const status = url.searchParams.get('status') || 'all';
	const pageParam = url.searchParams.get('page');
	const page = pageParam ? Math.max(1, parseInt(pageParam) || 1) : 1;

	const sortByParam = url.searchParams.get('sortBy');
	const validSortFields = ['name', 'sku', 'quantity', 'updated_at'];
	const sortBy = validSortFields.includes(sortByParam || '')
		? (sortByParam as 'name' | 'sku' | 'quantity' | 'updated_at')
		: 'name';

	const sortOrderParam = url.searchParams.get('sortOrder');
	const sortOrder = sortOrderParam === 'desc' ? 'desc' : 'asc';

	const limit = 10;

	try {
		// Load inventory overview items
		const { items, totalCount, lowStockThreshold } = await inventoryService.getStockOverview({
			search,
			categoryId,
			status,
			sortBy,
			sortOrder,
			page,
			limit
		});

		// Load category list for filtering dropdown
		const { categories } = await categoryService.getCategories({
			limit: 100,
			sortBy: 'name',
			sortOrder: 'asc'
		});

		return {
			user,
			items,
			categories,
			totalCount,
			lowStockThreshold,
			search,
			categoryId,
			status,
			page,
			limit,
			sortBy,
			sortOrder
		};
	} catch (err: unknown) {
		console.error('Error loading inventory list page:', err);
		const message = err instanceof Error ? err.message : String(err);
		return {
			user,
			items: [],
			categories: [],
			totalCount: 0,
			lowStockThreshold: 10,
			search,
			categoryId,
			status,
			page,
			limit,
			sortBy,
			sortOrder,
			error: message
		};
	}
};
