import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { userService } from '$lib/services/user.service';
import { createUserSchema } from '$lib/validations/user.schema';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const sessionUser = parentData.user;

	// Guard: Admin only
	if (!sessionUser || sessionUser.role !== 'admin') {
		throw redirect(303, '/dashboard?error=unauthorized_role');
	}

	return { user: sessionUser };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (!sessionUser || sessionUser.role !== 'admin') {
			throw redirect(303, '/dashboard?error=unauthorized_role');
		}

		const formData = await request.formData();
		const username = formData.get('username')?.toString() || '';
		const full_name = formData.get('full_name')?.toString() || '';
		const password = formData.get('password')?.toString() || '';
		const confirmPassword = formData.get('confirmPassword')?.toString() || '';
		const role = formData.get('role')?.toString() || '';
		const is_active = formData.get('is_active')?.toString() === 'true';

		const values = {
			username,
			full_name,
			password,
			confirmPassword,
			role,
			is_active
		};

		// Validation
		const validationResult = createUserSchema.safeParse(values);
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
			await userService.createUser(validationResult.data, sessionUser.id);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);

			if (message === 'DUPLICATE_USERNAME') {
				return fail(400, {
					errors: {
						username: 'Username is already taken by another account.'
					},
					values
				});
			}

			return fail(500, {
				error: message || 'An unexpected error occurred. Please try again.',
				values
			});
		}

		throw redirect(303, '/users?toast=created');
	}
};
