import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { productService } from '$lib/services/product.service';
import { createProductSchema } from '$lib/validations/product.schema';
import { z } from 'zod';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const user = parentData.user;

	// Guard: Only Managers (admin or inventory_manager) are allowed to access the creation form
	if (user.role === 'viewer') {
		throw redirect(303, '/products?error=unauthorized_role');
	}

	return {
		user
	};
};

// Schema for validating array of products
const bulkProductSchema = z.array(createProductSchema).min(1, 'At least one product is required');

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (
			!sessionUser ||
			(sessionUser.role !== 'admin' && sessionUser.role !== 'inventory_manager')
		) {
			throw redirect(303, '/products?error=unauthorized_role');
		}

		const formData = await request.formData();
		const productsJson = formData.get('productsJson')?.toString() || '';

		let productsData: any[] = [];
		try {
			productsData = JSON.parse(productsJson);
		} catch (e) {
			return fail(400, { error: 'Invalid products data format.' });
		}

		// Pre-process: parse base price and build a single variant [quantity: 1, price: price]
		const processedProducts = productsData.map((prod) => {
			const priceVal = prod.price === '' || prod.price === undefined ? NaN : Number(prod.price);
			return {
				name: prod.name,
				description: null,
				status: 'active',
				image_url: null,
				variants: [
					{
						quantity: 1,
						price: priceVal
					}
				]
			};
		});

		// Server-side Zod validation
		const validationResult = bulkProductSchema.safeParse(processedProducts);
		if (!validationResult.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of validationResult.error.issues) {
				const path = issue.path; // e.g. [0, 'name'] or [0, 'variants', 0, 'price']
				const productIdx = path[0];
				const fieldName = path[1];

				if (typeof productIdx === 'number') {
					const prefix = `products.${productIdx}`;
					if (fieldName === 'variants') {
						fieldErrors[`${prefix}.price`] = 'Price must be 0 or greater';
					} else if (typeof fieldName === 'string') {
						fieldErrors[`${prefix}.${fieldName}`] = issue.message;
					}
				} else {
					fieldErrors['general'] = issue.message;
				}
			}
			return fail(400, { errors: fieldErrors, values: productsData });
		}

		const validatedProducts = validationResult.data;

		try {
			// Save products one by one
			for (const product of validatedProducts) {
				const productId = crypto.randomUUID();
				await productService.createProduct(
					{
						id: productId,
						...product
					},
					sessionUser.id
				);
			}
		} catch (err: unknown) {
			console.error('Error creating bulk products:', err);
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, {
				error: message || 'An unexpected database error occurred. Please try again.',
				values: productsData
			});
		}

		// Success -> Redirect to products list with toast triggers
		throw redirect(303, '/products?toast=bulk_created');
	}
};
