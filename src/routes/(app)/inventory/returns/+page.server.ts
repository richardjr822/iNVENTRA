import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { inventoryService } from '$lib/services/inventory.service';
import { returnsSchema } from '$lib/validations/inventory.schema';

export const load: PageServerLoad = async ({ parent, url }) => {
	const parentData = await parent();
	const user = parentData.user;

	// Guard: Viewers are not allowed to make transactions
	if (user.role === 'viewer') {
		throw redirect(303, '/inventory?error=unauthorized_role');
	}

	try {
		const products = await inventoryService.getSelectableProducts();
		const preselectedProductId = url.searchParams.get('productId') || '';

		return {
			user,
			products,
			preselectedProductId
		};
	} catch (err: unknown) {
		console.error('Error loading returns page:', err);
		throw redirect(303, '/inventory?error=loading_failed');
	}
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (
			!sessionUser ||
			(sessionUser.role !== 'admin' && sessionUser.role !== 'inventory_manager')
		) {
			throw redirect(303, '/inventory?error=unauthorized_role');
		}

		const formData = await request.formData();
		const product_id = formData.get('product_id')?.toString() || '';
		const quantityStr = formData.get('quantity')?.toString() || '';
		const remarks = formData.get('remarks')?.toString() || '';

		const quantity = quantityStr ? Number(quantityStr) : NaN;
		const values = {
			product_id,
			quantity: isNaN(quantity) ? quantityStr : quantity,
			remarks: remarks || null
		};

		// Validate input schema
		const validationResult = returnsSchema.safeParse(values);
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
			await inventoryService.recordReturn(validationResult.data, sessionUser.id);
		} catch (err: unknown) {
			console.error('Error logging returns:', err);
			const message = err instanceof Error ? err.message : String(err);

			if (message === 'PRODUCT_ARCHIVED') {
				return fail(400, {
					errors: {
						product_id: 'This product is archived and cannot receive stock movements.'
					},
					values
				});
			}

			return fail(500, {
				error: message || 'Failed to complete transaction.',
				values
			});
		}

		throw redirect(303, '/inventory?toast=returns_success');
	}
};
