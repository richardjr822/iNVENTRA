import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { categoryService } from '$lib/services/category.service';
import { createCategorySchema } from '$lib/validations/category.schema';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const user = parentData.user;

	// Guard: Viewer role is not allowed here
	if (user.role === 'viewer') {
		throw redirect(303, '/categories?error=unauthorized_role');
	}

	return { user };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (
			!sessionUser ||
			(sessionUser.role !== 'admin' && sessionUser.role !== 'inventory_manager')
		) {
			throw redirect(303, '/categories?error=unauthorized_role');
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString() || '';
		const description = formData.get('description')?.toString() || '';

		const values = { name, description };

		// Perform server-side validation using Zod
		const validationResult = createCategorySchema.safeParse(values);
		if (!validationResult.success) {
			// Extract errors
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
			await categoryService.createCategory(
				{
					name: validationResult.data.name,
					description: validationResult.data.description
				},
				sessionUser.id
			);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			if (message === 'DUPLICATE_NAME') {
				return fail(400, {
					errors: {
						name: 'Category name must be unique. A category with this name already exists.'
					},
					values
				});
			}
			return fail(500, {
				error: message || 'An unexpected database error occurred. Please try again.',
				values
			});
		}

		// Successful creation -> Redirect with success flag
		throw redirect(303, '/categories?toast=created');
	}
};
