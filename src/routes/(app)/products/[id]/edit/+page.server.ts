import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { productService } from '$lib/services/product.service';
import { updateProductSchema } from '$lib/validations/product.schema';

export const load: PageServerLoad = async ({ parent, params }) => {
	const parentData = await parent();
	const user = parentData.user;

	// Guard: Viewers are not allowed to edit products
	if (user.role === 'viewer') {
		throw redirect(303, '/products?error=unauthorized_role');
	}

	const id = params.id;
	if (!id) {
		throw redirect(303, '/products?error=invalid_id');
	}

	try {
		const product = await productService.getProductById(id);

		return {
			user,
			product
		};
	} catch (err: unknown) {
		console.error('Error loading product edit page:', err);
		if (err instanceof Error && err.message === 'PRODUCT_NOT_FOUND') {
			throw redirect(303, '/products?error=product_not_found');
		}
		throw redirect(303, '/products?error=loading_failed');
	}
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const sessionUser = locals.user;
		if (
			!sessionUser ||
			(sessionUser.role !== 'admin' && sessionUser.role !== 'inventory_manager')
		) {
			throw redirect(303, '/products?error=unauthorized_role');
		}

		const id = params.id;
		if (!id) {
			return fail(400, { error: 'Product ID is required.' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString() || '';
		const description = formData.get('description')?.toString() || '';
		const status = formData.get('status')?.toString() || '';
		const image_url = formData.get('image_url')?.toString() || '';
		const variantsJson = formData.get('variantsJson')?.toString() || '';

		let variants: { quantity: number; price: number }[] = [];
		try {
			const parsed = JSON.parse(variantsJson);
			if (Array.isArray(parsed)) {
				variants = parsed.map((v) => ({
					quantity: v.quantity === '' || v.quantity === undefined ? NaN : Number(v.quantity),
					price: v.price === '' || v.price === undefined ? NaN : Number(v.price)
				}));
			}
		} catch (e) {
			return fail(400, { error: 'Invalid variants data format.' });
		}

		const values = {
			name,
			description: description || null,
			status,
			image_url: image_url || null,
			variants
		};

		// Perform server-side validation using Zod
		const validationResult = updateProductSchema.safeParse({ id, ...values });
		if (!validationResult.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of validationResult.error.issues) {
				const path = issue.path[0]?.toString();
				if (path && path !== 'id') {
					if (issue.path[0] === 'variants') {
						fieldErrors['variants'] = issue.message;
					} else {
						fieldErrors[path] = issue.message;
					}
				}
			}
			return fail(400, { errors: fieldErrors, values });
		}

		try {
			await productService.updateProduct(id, validationResult.data, sessionUser.id);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);

			if (message === 'PRODUCT_NOT_FOUND') {
				return fail(404, {
					error: 'Product could not be found. It may have been deleted or archived.',
					values
				});
			}

			return fail(500, {
				error: message || 'An unexpected database error occurred. Please try again.',
				values
			});
		}

		// Success -> Redirect to catalog listing
		throw redirect(303, '/products?toast=updated');
	}
};
