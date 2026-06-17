import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db';
 
export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const user = parentData.user;
 
	// Guard: Viewers are not allowed to view reports
	if (user.role === 'viewer') {
		throw redirect(303, '/dashboard?error=unauthorized_role');
	}

	try {
		// 1. Fetch current active products and their stock quantities
		const products = await sql`
			SELECT p.id, p.price::float as price, COALESCE(i.quantity, 0)::int as current_qty
			FROM products p
			LEFT JOIN inventory i ON p.id = i.product_id
			WHERE p.status != 'archived';
		`;

		const totalProducts = products.length;

		// 2. Fetch sum of transaction quantities in the last 30 days grouped by product
		const transactions = await sql`
			SELECT product_id, SUM(quantity)::int as net_qty
			FROM inventory_transactions
			WHERE created_at >= NOW() - INTERVAL '30 days'
			GROUP BY product_id;
		`;

		// Map net quantities to product_id
		const transactionMap = new Map<string, number>();
		for (const row of transactions) {
			transactionMap.set(row.product_id, row.net_qty || 0);
		}

		// 3. Compute current total valuation and valuation 30 days ago
		let currentValuation = 0;
		let valuation30DaysAgo = 0;

		for (const p of products) {
			const price = p.price || 0;
			const currentQty = p.current_qty || 0;
			const netQtyIn30Days = transactionMap.get(p.id) || 0;

			// Historical quantity (ensure it doesn't drop below 0)
			const qty30DaysAgo = Math.max(0, currentQty - netQtyIn30Days);

			currentValuation += price * currentQty;
			valuation30DaysAgo += price * qty30DaysAgo;
		}

		// Compute Valuation Trend Percentage
		let valuationTrendPercent = 0;
		if (valuation30DaysAgo > 0) {
			valuationTrendPercent = ((currentValuation - valuation30DaysAgo) / valuation30DaysAgo) * 100;
		} else if (currentValuation > 0) {
			valuationTrendPercent = 100.0; // Started from 0 value
		}

		// 4. Compute Cost of Goods Sold (COGS) in last 30 days (total value of STOCK_OUT dispatches)
		const [cogsRow] = await sql`
			SELECT COALESCE(SUM(p.price * ABS(t.quantity)), 0)::float as cogs
			FROM inventory_transactions t
			JOIN products p ON t.product_id = p.id
			WHERE t.transaction_type = 'STOCK_OUT' AND t.created_at >= NOW() - INTERVAL '30 days';
		`;
		const cogs = cogsRow?.cogs || 0;

		// Compute Stock Turnover (COGS / Average Inventory)
		const avgInventory = (currentValuation + valuation30DaysAgo) / 2;
		let stockTurnover = 0;
		if (avgInventory > 0) {
			// Annualized turnover = (30-day turnover) * (365 / 30)
			stockTurnover = (cogs / avgInventory) * (365 / 30);
		}

		// Check if there are active transactions at all in the database
		const [txCountRow] = await sql`
			SELECT COUNT(*)::int as count 
			FROM inventory_transactions;
		`;
		const totalTransactions = txCountRow?.count || 0;

		return {
			user,
			hasProducts: totalProducts > 0,
			hasTransactions: totalTransactions > 0,
			currentValuation,
			valuationTrendPercent,
			stockTurnover
		};
	} catch (err: unknown) {
		console.error('Error loading reports page statistics:', err);
		return {
			user,
			hasProducts: false,
			hasTransactions: false,
			currentValuation: 0,
			valuationTrendPercent: 0,
			stockTurnover: 0
		};
	}
};
