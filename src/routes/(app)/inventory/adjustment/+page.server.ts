import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { inventoryService } from '$lib/services/inventory.service';
import { inventoryRepository } from '$lib/repositories/inventory.repository';
import { adjustmentSchema } from '$lib/validations/inventory.schema';

export const load: PageServerLoad = async ({ parent, url }) => {
	const parentData = await parent();
	const user = parentData.user;

	// Guard: Viewers are not allowed to make transactions
	if (user.role === 'viewer') {
		throw redirect(303, '/inventory?error=unauthorized_role');
	}

	try {
		// Load non-archived products with current quantities for calculation
		const { items } = await inventoryRepository.findAll({
			limit: 1000
		});

		const selectableItems = items.filter((i) => i.status !== 'archived');
		const preselectedProductId = url.searchParams.get('productId') || '';

		return {
			user,
			products: selectableItems,
			preselectedProductId
		};
	} catch (err: unknown) {
		console.error('Error loading adjustment page:', err);
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
		const newQuantityStr = formData.get('new_quantity')?.toString() || '';
		const remarks = formData.get('remarks')?.toString() || '';

		const newQuantity = newQuantityStr ? Number(newQuantityStr) : NaN;
		const values = {
			product_id,
			new_quantity: isNaN(newQuantity) ? newQuantityStr : newQuantity,
			remarks: remarks || ''
		};

		// Validate input schema
		const validationResult = adjustmentSchema.safeParse(values);
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
			await inventoryService.adjustStock(
				{
					product_id: validationResult.data.product_id,
					new_quantity: validationResult.data.new_quantity,
					remarks: validationResult.data.remarks
				},
				sessionUser.id
			);
		} catch (err: unknown) {
			console.error('Error executing stock adjustment:', err);
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

		throw redirect(303, '/inventory?toast=adjustment_success');
	}
};
