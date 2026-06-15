import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { inventoryService } from '$lib/services/inventory.service';

export const load: PageServerLoad = async ({ parent, params }) => {
	const parentData = await parent();
	const user = parentData.user;
	const productId = params.productId;

	if (!productId) {
		throw redirect(303, '/inventory?error=missing_product_id');
	}

	try {
		const { product, inventory, recentTransactions, chartData } =
			await inventoryService.getInventoryDetail(productId);

		return {
			user,
			product,
			inventory,
			recentTransactions,
			chartData
		};
	} catch (err: unknown) {
		console.error(`Error loading inventory detail page for product ${productId}:`, err);
		throw redirect(303, '/inventory?error=loading_failed');
	}
};
