import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { inventoryService } from '$lib/services/inventory.service';
import { inventoryRepository } from '$lib/repositories/inventory.repository';
import { stockOutSchema } from '$lib/validations/inventory.schema';

export const load: PageServerLoad = async ({ parent, url }) => {
	const parentData = await parent();
	const user = parentData.user;

	// Guard: Viewers are not allowed to make transactions
	if (user.role === 'viewer') {
		throw redirect(303, '/inventory?error=unauthorized_role');
	}

	try {
		// Load all non-archived products with their current quantities
		const { items } = await inventoryRepository.findAll({
			limit: 1000,
			status: 'active' // load active first, wait, active and inactive can receive stock, archived cannot.
		});

		// In active and inactive can receive stock, let's load all non-archived items.
		// We can get them by querying items and filtering out archived status.
		const selectableItems = items.filter((i) => i.status !== 'archived');
		const preselectedProductId = url.searchParams.get('productId') || '';

		return {
			user,
			products: selectableItems,
			preselectedProductId
		};
	} catch (err: unknown) {
		console.error('Error loading stock out page:', err);
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
		const validationResult = stockOutSchema.safeParse(values);
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
			await inventoryService.stockOut(validationResult.data, sessionUser.id);
		} catch (err: unknown) {
			console.error('Error executing stock out transaction:', err);
			const message = err instanceof Error ? err.message : String(err);

			if (message === 'INSUFFICIENT_STOCK') {
				return fail(400, {
					errors: {
						quantity: 'Current stock is insufficient to satisfy the requested quantity.'
					},
					values
				});
			}

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

		throw redirect(303, '/inventory?toast=stock_out_success');
	}
};
