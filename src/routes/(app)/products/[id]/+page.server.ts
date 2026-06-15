import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { productService } from '$lib/services/product.service';

export const load: PageServerLoad = async ({ parent, params }) => {
	const parentData = await parent();
	const user = parentData.user;

	const id = params.id;
	if (!id) {
		throw redirect(303, '/products?error=invalid_id');
	}

	try {
		// Fetch product details (includes joined category_name and current stock quantity)
		const product = await productService.getProductById(id);

		// Fetch recent inventory transactions (includes user full name)
		const transactions = await productService.getProductTransactions(id);

		return {
			user,
			product,
			transactions
		};
	} catch (err: unknown) {
		console.error('Error loading product details page:', err);
		if (err instanceof Error && err.message === 'PRODUCT_NOT_FOUND') {
			throw redirect(303, '/products?error=product_not_found');
		}
		throw redirect(303, '/products?error=loading_failed');
	}
};
