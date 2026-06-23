import { sql } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const user = parentData.user;

	try {
		// Fetch simple counts and recently updated products
		const [totalProductsResult, totalVariantsResult, recentlyUpdatedResult] = await Promise.all([
			sql`
				SELECT COUNT(*)::int as total
				FROM products
				WHERE status != 'archived';
			`,
			sql`
				SELECT COUNT(*)::int as total
				FROM product_variants;
			`,
			sql`
				SELECT 
					id, 
					name, 
					image_url, 
					updated_at
				FROM products
				WHERE status != 'archived'
				ORDER BY updated_at DESC
				LIMIT 5;
			`
		]);

		const totalProducts = totalProductsResult[0]?.total || 0;
		const totalVariants = totalVariantsResult[0]?.total || 0;

		// Fetch variants for the recently updated products to display them
		const productIds = recentlyUpdatedResult.map((p) => p.id);
		let variantsMap: Record<string, any[]> = {};
		if (productIds.length > 0) {
			const variantsResult = await sql`
				SELECT id, product_id, quantity, price
				FROM product_variants
				WHERE product_id = ANY(${productIds})
				ORDER BY quantity ASC;
			`;
			for (const v of variantsResult) {
				if (!variantsMap[v.product_id]) {
					variantsMap[v.product_id] = [];
				}
				variantsMap[v.product_id].push({
					quantity: Number(v.quantity),
					price: Number(v.price)
				});
			}
		}

		const recentlyUpdated = recentlyUpdatedResult.map((p) => ({
			id: p.id,
			name: p.name,
			image_url: p.image_url,
			updated_at: p.updated_at,
			variants: variantsMap[p.id] || []
		}));

		return {
			user,
			totalProducts,
			totalVariants,
			recentlyUpdated
		};
	} catch (err: unknown) {
		console.error('Error loading dashboard page data:', err);
		const message = err instanceof Error ? err.message : String(err);
		return {
			user,
			totalProducts: 0,
			totalVariants: 0,
			recentlyUpdated: [],
			error: message
		};
	}
};
