import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { productService } from '$lib/services/product.service';
import { categoryService } from '$lib/services/category.service';
import { createProductSchema } from '$lib/validations/product.schema';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const user = parentData.user;

	// Guard: Viewers are not allowed to access the creation form
	if (user.role === 'viewer') {
		throw redirect(303, '/products?error=unauthorized_role');
	}

	// Guard: Inventory managers use the quick-add modal on the products list
	if (user.role === 'inventory_manager') {
		throw redirect(303, '/products');
	}

	try {
		// Get categories list for selection
		const { categories } = await categoryService.getCategories({
			limit: 100,
			sortBy: 'name',
			sortOrder: 'asc'
		});

		// Pre-generate UUID for the new product (enables file upload progress using this ID)
		const productId = crypto.randomUUID();

		return {
			user,
			categories,
			productId
		};
	} catch (err: unknown) {
		console.error('Error loading product creation page:', err);
		throw redirect(303, '/products?error=loading_failed');
	}
};

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
		const id = formData.get('id')?.toString() || '';
		const sku = formData.get('sku')?.toString() || '';
		const barcode = formData.get('barcode')?.toString() || '';
		const name = formData.get('name')?.toString() || '';
		const category_id = formData.get('category_id')?.toString() || '';
		const description = formData.get('description')?.toString() || '';
		const priceStr = formData.get('price')?.toString() || '';
		const status = formData.get('status')?.toString() || '';
		const image_url = formData.get('image_url')?.toString() || '';

		const price = priceStr ? Number(priceStr) : NaN;
		const values = {
			sku,
			barcode: barcode || null,
			name,
			category_id,
			description: description || null,
			price: isNaN(price) ? priceStr : price,
			status,
			image_url: image_url || null
		};

		// Perform server-side validation using Zod
		const validationResult = createProductSchema.safeParse(values);
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
			await productService.createProduct(
				{
					id, // Pass pre-generated ID
					...validationResult.data
				},
				sessionUser.id
			);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);

			if (message === 'DUPLICATE_SKU') {
				return fail(400, {
					errors: {
						sku: 'SKU must be unique. A product with this SKU already exists.'
					},
					values
				});
			}

			if (message === 'DUPLICATE_BARCODE') {
				return fail(400, {
					errors: {
						barcode: 'Barcode must be unique. A product with this barcode already exists.'
					},
					values
				});
			}

			return fail(500, {
				error: message || 'An unexpected database error occurred. Please try again.',
				values
			});
		}

		// Success -> Redirect to catalog listing
		throw redirect(303, '/products?toast=created');
	}
};
