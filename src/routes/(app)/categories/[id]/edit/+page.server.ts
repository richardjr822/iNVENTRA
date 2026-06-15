import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { categoryService } from '$lib/services/category.service';
import { updateCategorySchema } from '$lib/validations/category.schema';

export const load: PageServerLoad = async ({ parent, params }) => {
	const parentData = await parent();
	const user = parentData.user;

	// Guard: Viewer role is not allowed here
	if (user.role === 'viewer') {
		throw redirect(303, '/categories?error=unauthorized_role');
	}

	const id = params.id;
	if (!id) {
		throw redirect(303, '/categories?error=invalid_id');
	}

	try {
		const category = await categoryService.getCategoryById(id);
		return {
			user,
			category
		};
	} catch (err: unknown) {
		console.error('Error loading category for editing:', err);
		if (err instanceof Error && err.message === 'CATEGORY_NOT_FOUND') {
			throw redirect(303, '/categories?error=category_not_found');
		}
		const message = err instanceof Error ? err.message : String(err);
		throw redirect(303, `/categories?error=db_error&message=${encodeURIComponent(message)}`);
	}
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const sessionUser = locals.user;
		if (
			!sessionUser ||
			(sessionUser.role !== 'admin' && sessionUser.role !== 'inventory_manager')
		) {
			throw redirect(303, '/categories?error=unauthorized_role');
		}

		const id = params.id;
		if (!id) {
			return fail(400, { error: 'Category ID is required' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString() || '';
		const description = formData.get('description')?.toString() || '';

		const values = { name, description };

		// Perform server-side validation using Zod
		const validationResult = updateCategorySchema.safeParse({ id, ...values });
		if (!validationResult.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of validationResult.error.issues) {
				const path = issue.path[0]?.toString();
				if (path && path !== 'id') {
					fieldErrors[path] = issue.message;
				}
			}
			return fail(400, { errors: fieldErrors, values });
		}

		try {
			await categoryService.updateCategory(
				id,
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
			if (message === 'CATEGORY_NOT_FOUND') {
				return fail(404, {
					error: 'Category could not be found. It may have been deleted.',
					values
				});
			}
			return fail(500, {
				error: message || 'An unexpected database error occurred. Please try again.',
				values
			});
		}

		// Successful update -> Redirect with success flag
		throw redirect(303, '/categories?toast=updated');
	}
};
