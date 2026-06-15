import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { userService } from '$lib/services/user.service';
import { updateUserSchema } from '$lib/validations/user.schema';

export const load: PageServerLoad = async ({ parent, params }) => {
	const parentData = await parent();
	const sessionUser = parentData.user;

	// Guard: Admin only
	if (!sessionUser || sessionUser.role !== 'admin') {
		throw redirect(303, '/dashboard?error=unauthorized_role');
	}

	const id = params.id;
	if (!id) {
		throw redirect(303, '/users?error=invalid_id');
	}

	try {
		const targetUser = await userService.getUserById(id);
		return {
			user: sessionUser,
			targetUser
		};
	} catch (err: unknown) {
		console.error('Error loading user for edit:', err);
		throw redirect(303, '/users?error=user_not_found');
	}
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const sessionUser = locals.user;
		if (!sessionUser || sessionUser.role !== 'admin') {
			throw redirect(303, '/dashboard?error=unauthorized_role');
		}

		const id = params.id;
		if (!id) {
			return fail(400, { error: 'User ID is required' });
		}

		const formData = await request.formData();
		const full_name = formData.get('full_name')?.toString() || '';
		const role = formData.get('role')?.toString() || '';
		const is_active = formData.get('is_active')?.toString() === 'true';

		const values = {
			full_name,
			role,
			is_active
		};

		// Validate
		const validationResult = updateUserSchema.safeParse(values);
		if (!validationResult.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of validationResult.error.issues) {
				const path = issue.path[0]?.toString();
				if (path) {
					fieldErrors[path] = issue.message;
				}
			}
			return fail(400, { errors: fieldErrors, values });
		}

		try {
			await userService.updateUser(id, validationResult.data, sessionUser.id);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);

			if (message === 'CANNOT_DEACTIVATE_SELF') {
				return fail(400, {
					error: 'You cannot deactivate your own administrative account.',
					values
				});
			}

			if (message === 'USER_NOT_FOUND') {
				return fail(404, {
					error: 'The user account could not be found.',
					values
				});
			}

			return fail(500, {
				error: message || 'An unexpected error occurred. Please try again.',
				values
			});
		}

		throw redirect(303, '/users?toast=updated');
	}
};
