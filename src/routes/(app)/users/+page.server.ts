import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { userService } from '$lib/services/user.service';
import { resetPasswordSchema } from '$lib/validations/password.schema';

export const load: PageServerLoad = async ({ parent, url }) => {
	const parentData = await parent();
	const sessionUser = parentData.user;

	// Guard: Admin only
	if (!sessionUser || sessionUser.role !== 'admin') {
		throw redirect(303, '/dashboard?error=unauthorized_role');
	}

	const search = url.searchParams.get('q') || '';
	const role = url.searchParams.get('role') || 'all';
	const status = url.searchParams.get('status') || 'all';
	const pageParam = url.searchParams.get('page');
	const page = pageParam ? Math.max(1, parseInt(pageParam) || 1) : 1;

	const sortByParam = url.searchParams.get('sortBy');
	const validSortFields = ['username', 'full_name', 'created_at'];
	const sortBy = validSortFields.includes(sortByParam || '')
		? (sortByParam as 'username' | 'full_name' | 'created_at')
		: 'username';

	const sortOrderParam = url.searchParams.get('sortOrder');
	const sortOrder = sortOrderParam === 'desc' ? 'desc' : 'asc';

	const limit = 10;

	try {
		const { users, totalCount } = await userService.getUsers({
			search,
			role,
			status,
			sortBy,
			sortOrder,
			page,
			limit
		});

		return {
			user: sessionUser,
			users,
			totalCount,
			search,
			role,
			status,
			page,
			limit,
			sortBy,
			sortOrder
		};
	} catch (err: unknown) {
		console.error('Error loading users page:', err);
		const message = err instanceof Error ? err.message : String(err);
		return {
			user: sessionUser,
			users: [],
			totalCount: 0,
			search,
			role,
			status,
			page,
			limit,
			sortBy,
			sortOrder,
			error: message
		};
	}
};

export const actions: Actions = {
	toggleStatus: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (!sessionUser || sessionUser.role !== 'admin') {
			return fail(403, { error: 'Access Denied: Admin role required.' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const isActiveStr = formData.get('isActive')?.toString();

		if (!id) {
			return fail(400, { error: 'User ID is required' });
		}

		const isActive = isActiveStr === 'true';

		if (id === sessionUser.id && !isActive) {
			return fail(400, { error: 'Self-deactivation is prevented for security reasons.' });
		}

		try {
			const existingUser = await userService.getUserById(id);
			await userService.updateUser(
				id,
				{
					full_name: existingUser.full_name,
					role: existingUser.role,
					is_active: isActive
				},
				sessionUser.id
			);
			return { success: true };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { error: message || 'Failed to update user status.' });
		}
	},

	resetPassword: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (!sessionUser || sessionUser.role !== 'admin') {
			return fail(403, { error: 'Access Denied: Admin role required.' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const password = formData.get('password')?.toString() || '';
		const confirmPassword = formData.get('confirmPassword')?.toString() || '';

		if (!id) {
			return fail(400, { error: 'User ID is required' });
		}

		// Validation using resetPasswordSchema
		const validationResult = resetPasswordSchema.safeParse({ password, confirmPassword });
		if (!validationResult.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of validationResult.error.issues) {
				const path = issue.path[0]?.toString();
				if (path) {
					fieldErrors[path] = issue.message;
				}
			}
			return fail(400, { errors: fieldErrors });
		}

		try {
			await userService.resetPassword(id, { password, confirmPassword }, sessionUser.id);
			return { success: true };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { error: message || 'Failed to reset user password.' });
		}
	}
};
