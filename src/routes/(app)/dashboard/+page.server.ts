import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { sql } from '$lib/server/db';
import { inventoryService } from '$lib/services/inventory.service';
import { inventoryRepository } from '$lib/repositories/inventory.repository';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const user = parentData.user;

	try {
		// 1. Get safety threshold setting
		const lowStockThreshold = await inventoryRepository.getLowStockThreshold();

		// 2. Query dashboard counts/aggregates, active products list, and transaction trend in parallel
		const [aggregatesResult, productsRows, chartRows] = await Promise.all([
			sql`
				SELECT 
					COUNT(*)::int as total_products,
					COUNT(DISTINCT category_id)::int as categories_count,
					COALESCE(SUM(p.price * COALESCE(i.quantity, 0)), 0)::float as inventory_value,
					COUNT(CASE WHEN COALESCE(i.quantity, 0) < ${lowStockThreshold} THEN 1 END)::int as low_stock_alerts,
					COUNT(CASE WHEN COALESCE(i.quantity, 0) = 0 THEN 1 END)::int as out_of_stock_count
				FROM products p
				LEFT JOIN inventory i ON p.id = i.product_id
				WHERE p.status != 'archived';
			`,
			sql`
				SELECT 
					p.id, 
					p.name, 
					p.sku, 
					c.name as category, 
					COALESCE(i.quantity, 0)::int as stock, 
					p.price::float as price
				FROM products p
				LEFT JOIN inventory i ON p.id = i.product_id
				LEFT JOIN categories c ON p.category_id = c.id
				WHERE p.status != 'archived'
				ORDER BY COALESCE(i.quantity, 0) ASC, p.name ASC
				LIMIT 50;
			`,
			sql`
				SELECT 
					TO_CHAR(DATE(created_at), 'Mon DD') as date, 
					SUM(quantity)::int as quantity,
					DATE(created_at) as raw_date
				FROM inventory_transactions 
				WHERE created_at >= NOW() - INTERVAL '30 days'
				GROUP BY DATE(created_at), TO_CHAR(DATE(created_at), 'Mon DD')
				ORDER BY raw_date ASC;
			`
		]);

		const aggregates = aggregatesResult[0] || {
			total_products: 0,
			categories_count: 0,
			inventory_value: 0,
			low_stock_alerts: 0,
			out_of_stock_count: 0
		};

		const products = productsRows.map((row) => ({
			id: row.id,
			name: row.name,
			sku: row.sku,
			category: row.category || 'Uncategorized',
			stock: Number(row.stock),
			minStock: lowStockThreshold,
			price: Number(row.price)
		}));

		let chartData = chartRows.map((row) => ({
			date: row.date,
			quantity: Number(row.quantity)
		}));

		// Fallback if no transaction data exists
		if (chartData.length === 0) {
			chartData = [
				{
					date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
					quantity: 0
				}
			];
		}

		return {
			user,
			totalProducts: aggregates.total_products || 0,
			categoriesCount: aggregates.categories_count || 0,
			currentInventoryValue: aggregates.inventory_value || 0,
			lowStockAlerts: aggregates.low_stock_alerts || 0,
			outOfStockCount: aggregates.out_of_stock_count || 0,
			products,
			chartData
		};
	} catch (err: unknown) {
		console.error('Error loading dashboard page data:', err);
		const message = err instanceof Error ? err.message : String(err);
		return {
			user,
			totalProducts: 0,
			categoriesCount: 0,
			currentInventoryValue: 0,
			lowStockAlerts: 0,
			outOfStockCount: 0,
			products: [],
			chartData: [
				{
					date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
					quantity: 0
				}
			],
			error: message
		};
	}
};

export const actions: Actions = {
	stockIn: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (
			!sessionUser ||
			(sessionUser.role !== 'admin' && sessionUser.role !== 'inventory_manager')
		) {
			return fail(403, { error: 'Access Denied: Viewers cannot perform transactions.' });
		}

		const formData = await request.formData();
		const productId = formData.get('productId')?.toString();

		if (!productId) {
			return fail(400, { error: 'Product ID is required.' });
		}

		try {
			await inventoryService.stockIn(
				{
					product_id: productId,
					quantity: 10,
					remarks: 'Dashboard Quick Stock In'
				},
				sessionUser.id
			);
			return { success: true, message: 'Stock In (+10) successful!' };
		} catch (err: unknown) {
			console.error('Error in dashboard stockIn action:', err);
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { error: message || 'Failed to execute transaction.' });
		}
	},

	stockOut: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (
			!sessionUser ||
			(sessionUser.role !== 'admin' && sessionUser.role !== 'inventory_manager')
		) {
			return fail(403, { error: 'Access Denied: Viewers cannot perform transactions.' });
		}

		const formData = await request.formData();
		const productId = formData.get('productId')?.toString();

		if (!productId) {
			return fail(400, { error: 'Product ID is required.' });
		}

		try {
			await inventoryService.stockOut(
				{
					product_id: productId,
					quantity: 5,
					remarks: 'Dashboard Quick Stock Out'
				},
				sessionUser.id
			);
			return { success: true, message: 'Stock Out (-5) successful!' };
		} catch (err: unknown) {
			console.error('Error in dashboard stockOut action:', err);
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { error: message || 'Failed to execute transaction.' });
		}
	}
};
