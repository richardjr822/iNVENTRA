import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { productService } from '$lib/services/product.service';

export const load: PageServerLoad = async ({ parent, url }) => {
	const parentData = await parent();
	const user = parentData.user;

	const search = url.searchParams.get('q') || '';
	const pageParam = url.searchParams.get('page');
	const page = pageParam ? Math.max(1, parseInt(pageParam) || 1) : 1;

	const sortByParam = url.searchParams.get('sortBy');
	const validSortFields = ['name', 'created_at'];
	const sortBy = validSortFields.includes(sortByParam || '')
		? (sortByParam as 'name' | 'created_at')
		: 'name';

	const sortOrderParam = url.searchParams.get('sortOrder');
	const sortOrder = sortOrderParam === 'desc' ? 'desc' : 'asc';

	const limit = 12; // Grid layout with 12 items per page

	try {
		const { products, totalCount } = await productService.getProducts({
			search,
			sortBy,
			sortOrder,
			page,
			limit
		});

		return {
			user,
			products,
			totalCount,
			search,
			page,
			limit,
			sortBy,
			sortOrder
		};
	} catch (err: unknown) {
		console.error('Error loading products list page:', err);
		const message = err instanceof Error ? err.message : String(err);
		return {
			user,
			products: [],
			totalCount: 0,
			search,
			page,
			limit,
			sortBy,
			sortOrder,
			error: message
		};
	}
};

export const actions: Actions = {
	deleteProduct: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (
			!sessionUser ||
			(sessionUser.role !== 'admin' && sessionUser.role !== 'inventory_manager')
		) {
			return fail(403, {
				error: 'Access Denied: You do not have permissions to perform this action.'
			});
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Product ID is required.' });
		}

		try {
			await productService.deleteProduct(id, sessionUser.id);
			return { success: true };
		} catch (err: unknown) {
			console.error('Error deleting product in action:', err);
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { error: message || 'Failed to delete product.' });
		}
	}
};
