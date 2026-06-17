import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { categoryService } from '$lib/services/category.service';
 
export const load: PageServerLoad = async ({ parent, url }) => {
	const parentData = await parent();
	const user = parentData.user;
 
	// Guard: Viewers are not allowed to view categories page
	if (user.role === 'viewer') {
		throw redirect(303, '/dashboard?error=unauthorized_role');
	}

	// Viewer, inventory_manager, and admin are all permitted to view this list page

	const search = url.searchParams.get('q') || '';
	const pageParam = url.searchParams.get('page');
	const page = pageParam ? Math.max(1, parseInt(pageParam) || 1) : 1;

	const sortByParam = url.searchParams.get('sortBy');
	const sortBy = sortByParam === 'created_at' ? 'created_at' : 'name';

	const sortOrderParam = url.searchParams.get('sortOrder');
	const sortOrder =
		sortOrderParam === 'desc'
			? 'desc'
			: sortOrderParam === 'asc'
				? 'asc'
				: sortBy === 'created_at'
					? 'desc'
					: 'asc';

	const limit = 10;

	try {
		const { categories, totalCount } = await categoryService.getCategories({
			search,
			sortBy,
			sortOrder,
			page,
			limit
		});

		return {
			user,
			categories,
			totalCount,
			search,
			page,
			limit,
			sortBy,
			sortOrder
		};
	} catch (err: unknown) {
		console.error('Error loading categories server-side:', err);
		const message = err instanceof Error ? err.message : String(err);
		return {
			user,
			categories: [],
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
	deleteCategory: async ({ request, locals }) => {
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
			return fail(400, { error: 'Category ID is required' });
		}

		try {
			await categoryService.deleteCategory(id, sessionUser.id);
			return { success: true };
		} catch (err: unknown) {
			console.error('Error deleting category in action:', err);
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { error: message || 'Failed to delete category' });
		}
	}
};
