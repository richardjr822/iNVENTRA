import { sql } from '$lib/server/db';
import { supabase } from '$lib/server/supabase';
import type { Product } from '$lib/types/product';
import type {
	Inventory,
	InventoryTransaction,
	InventoryTransactionType,
	InventoryOverviewItem,
	InventoryUpdateOptions
} from '$lib/types/inventory';

export class InventoryRepository {
	async findAll(options?: {
		search?: string;
		categoryId?: string;
		status?: string;
		sortBy?: 'name' | 'sku' | 'quantity' | 'updated_at';
		sortOrder?: 'asc' | 'desc';
		page?: number;
		limit?: number;
	}): Promise<{ items: InventoryOverviewItem[]; totalCount: number }> {
		const search = options?.search?.trim() || '';
		const categoryId = options?.categoryId;
		const status = options?.status;
		const sortBy = options?.sortBy || 'name';
		const sortOrder = options?.sortOrder || 'asc';
		const page = options?.page || 1;
		const limit = options?.limit || 10;
		const offset = (page - 1) * limit;

		// Build WHERE clauses dynamically
		const conditions: string[] = [];
		const params: (string | number)[] = [];

		if (search) {
			const searchPattern = `%${search}%`;
			params.push(searchPattern);
			conditions.push(
				`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`
			);
		}

		if (categoryId && categoryId !== 'all') {
			params.push(categoryId);
			conditions.push(`p.category_id = $${params.length}`);
		}

		if (status && status !== 'all') {
			params.push(status);
			conditions.push(`p.status = $${params.length}`);
		}

		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

		// Map sortBy fields to actual columns
		let orderByColumn = 'p.name';
		if (sortBy === 'sku') orderByColumn = 'p.sku';
		if (sortBy === 'quantity') orderByColumn = 'COALESCE(i.quantity, 0)';
		if (sortBy === 'updated_at') orderByColumn = 'COALESCE(i.updated_at, p.created_at)';

		// Query count
		const countQueryStr = `
			SELECT COUNT(*) as count
			FROM products p
			LEFT JOIN inventory i ON p.id = i.product_id
			${whereClause}
		`;

		const countResult = await sql.unsafe(countQueryStr, params);
		const totalCount = parseInt(countResult[0]?.count || '0');

		// Query data
		const dataQueryStr = `
			SELECT 
				p.id as product_id,
				p.name as product_name,
				p.sku,
				p.barcode,
				p.image_url,
				p.status,
				c.name as category_name,
				COALESCE(i.quantity, 0) as quantity,
				COALESCE(i.updated_at, p.created_at) as updated_at
			FROM products p
			LEFT JOIN inventory i ON p.id = i.product_id
			LEFT JOIN categories c ON p.category_id = c.id
			${whereClause}
			ORDER BY ${orderByColumn} ${sortOrder === 'desc' ? 'DESC' : 'ASC'}
			LIMIT $${params.length + 1} OFFSET $${params.length + 2}
		`;

		const dataResult = await sql.unsafe(dataQueryStr, [...params, limit, offset]);

		const items: InventoryOverviewItem[] = dataResult.map((row) => ({
			product_id: row.product_id,
			product_name: row.product_name,
			sku: row.sku,
			barcode: row.barcode,
			image_url: row.image_url,
			quantity: Number(row.quantity),
			updated_at: new Date(row.updated_at).toISOString(),
			status: row.status as 'active' | 'inactive' | 'archived',
			category_name: row.category_name
		}));

		return {
			items,
			totalCount
		};
	}

	async findSelectableProducts(): Promise<
		{ id: string; name: string; sku: string; barcode: string | null }[]
	> {
		const data = await sql`
			SELECT id, name, sku, barcode
			FROM products
			WHERE status != 'archived'
			ORDER BY name ASC;
		`;
		return data.map((row) => ({
			id: row.id,
			name: row.name,
			sku: row.sku,
			barcode: row.barcode
		}));
	}

	async findTransactions(options?: {
		search?: string;
		transactionType?: string;
		productId?: string;
		userId?: string;
		startDate?: string;
		endDate?: string;
		page?: number;
		limit?: number;
		sortBy?: 'created_at' | 'quantity' | 'product_name' | 'transaction_type';
		sortOrder?: 'asc' | 'desc';
	}): Promise<{ transactions: InventoryTransaction[]; totalCount: number }> {
		const search = options?.search?.trim() || '';
		const transactionType = options?.transactionType;
		const productId = options?.productId;
		const userId = options?.userId;
		const startDate = options?.startDate;
		const endDate = options?.endDate;
		const page = options?.page || 1;
		const limit = options?.limit || 10;
		const offset = (page - 1) * limit;
		const sortBy = options?.sortBy || 'created_at';
		const sortOrder = options?.sortOrder || 'desc';

		const conditions: string[] = [];
		const params: (string | number)[] = [];

		if (search) {
			const searchPattern = `%${search}%`;
			params.push(searchPattern);
			conditions.push(
				`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length} OR t.remarks ILIKE $${params.length})`
			);
		}

		if (transactionType && transactionType !== 'all') {
			params.push(transactionType);
			conditions.push(`t.transaction_type = $${params.length}`);
		}

		if (productId && productId !== 'all') {
			params.push(productId);
			conditions.push(`t.product_id = $${params.length}`);
		}

		if (userId && userId !== 'all') {
			params.push(userId);
			conditions.push(`t.created_by = $${params.length}`);
		}

		if (startDate) {
			params.push(startDate);
			conditions.push(`t.created_at >= $${params.length}`);
		}

		if (endDate) {
			params.push(`${endDate} 23:59:59`);
			conditions.push(`t.created_at <= $${params.length}`);
		}

		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

		let orderByColumn = 't.created_at';
		if (sortBy === 'quantity') orderByColumn = 'ABS(t.quantity)';
		if (sortBy === 'product_name') orderByColumn = 'p.name';
		if (sortBy === 'transaction_type') orderByColumn = 't.transaction_type';

		const countQueryStr = `
			SELECT COUNT(*) as count
			FROM inventory_transactions t
			JOIN products p ON t.product_id = p.id
			${whereClause}
		`;

		const countResult = await sql.unsafe(countQueryStr, params);
		const totalCount = parseInt(countResult[0]?.count || '0');

		const dataQueryStr = `
			SELECT 
				t.id,
				t.product_id,
				t.transaction_type,
				t.quantity,
				t.remarks,
				t.created_by,
				t.created_at,
				p.name as product_name,
				p.sku as product_sku,
				p.barcode as product_barcode,
				u.full_name as user_full_name
			FROM inventory_transactions t
			JOIN products p ON t.product_id = p.id
			LEFT JOIN users u ON t.created_by = u.id
			${whereClause}
			ORDER BY ${orderByColumn} ${sortOrder === 'desc' ? 'DESC' : 'ASC'}
			LIMIT $${params.length + 1} OFFSET $${params.length + 2}
		`;

		const dataResult = await sql.unsafe(dataQueryStr, [...params, limit, offset]);

		const transactions: InventoryTransaction[] = dataResult.map((row) => ({
			id: row.id,
			product_id: row.product_id,
			transaction_type: row.transaction_type as InventoryTransactionType,
			quantity: Number(row.quantity),
			remarks: row.remarks,
			created_by: row.created_by,
			created_at: new Date(row.created_at).toISOString(),
			product_name: row.product_name,
			product_sku: row.product_sku,
			product_barcode: row.product_barcode,
			user_full_name: row.user_full_name
		}));

		return {
			transactions,
			totalCount
		};
	}

	async getInventoryDetail(productId: string): Promise<{
		product: Product;
		inventory: Inventory;
		recentTransactions: InventoryTransaction[];
		chartData: { date: string; quantity: number }[];
	}> {
		// 1. Get product from standard REST (ensuring consistency with repositories)
		const { data: pData, error: pError } = await supabase
			.from('products')
			.select('*, categories (name)')
			.eq('id', productId)
			.maybeSingle();

		if (pError || !pData) {
			throw new Error('PRODUCT_NOT_FOUND');
		}

		const product: Product = {
			id: pData.id,
			category_id: pData.category_id,
			sku: pData.sku,
			barcode: pData.barcode,
			name: pData.name,
			description: pData.description,
			price: Number(pData.price),
			image_url: pData.image_url,
			status: pData.status,
			created_by: pData.created_by,
			created_at: pData.created_at,
			updated_at: pData.updated_at,
			category_name: pData.categories?.name || null
		};

		// 2. Get inventory
		const [invRow] = await sql`
			SELECT * FROM inventory WHERE product_id = ${productId};
		`;
		if (!invRow) {
			throw new Error('INVENTORY_RECORD_NOT_FOUND');
		}

		const inventory: Inventory = {
			id: invRow.id,
			product_id: invRow.product_id,
			quantity: Number(invRow.quantity),
			updated_at: new Date(invRow.updated_at).toISOString()
		};

		// 3. Get recent 20 transactions
		const transactionsData = await sql`
			SELECT 
				t.id,
				t.product_id,
				t.transaction_type,
				t.quantity,
				t.remarks,
				t.created_by,
				t.created_at,
				u.full_name as user_full_name
			FROM inventory_transactions t
			LEFT JOIN users u ON t.created_by = u.id
			WHERE t.product_id = ${productId}
			ORDER BY t.created_at DESC
			LIMIT 20;
		`;

		const recentTransactions: InventoryTransaction[] = transactionsData.map((row) => ({
			id: row.id,
			product_id: row.product_id,
			transaction_type: row.transaction_type as InventoryTransactionType,
			quantity: Number(row.quantity),
			remarks: row.remarks,
			created_by: row.created_by,
			created_at: new Date(row.created_at).toISOString(),
			user_full_name: row.user_full_name
		}));

		// 4. Calculate stock movement chart data
		// Query all historical transactions to build sequential stock values over time
		const allTransactions = await sql`
			SELECT quantity, created_at
			FROM inventory_transactions
			WHERE product_id = ${productId}
			ORDER BY created_at ASC;
		`;

		let runningQty = 0;
		const chartData = allTransactions.map((tx) => {
			runningQty += Number(tx.quantity);
			return {
				date: new Date(tx.created_at).toLocaleDateString(undefined, {
					month: 'short',
					day: 'numeric'
				}),
				quantity: runningQty
			};
		});

		// Fallback for products with no transactions
		if (chartData.length === 0) {
			chartData.push({
				date: new Date(product.created_at).toLocaleDateString(undefined, {
					month: 'short',
					day: 'numeric'
				}),
				quantity: 0
			});
		}

		return {
			product,
			inventory,
			recentTransactions,
			chartData
		};
	}

	async updateStock(options: InventoryUpdateOptions): Promise<void> {
		const { productId, userId, transactionType, quantity, newQuantity, remarks } = options;

		await sql.begin(async (tx) => {
			// 1. Get the current inventory row (FOR UPDATE locks this row to prevent race conditions)
			const [currentInv] = await tx`
				SELECT id, quantity 
				FROM inventory 
				WHERE product_id = ${productId} 
				FOR UPDATE;
			`;

			if (!currentInv) {
				throw new Error('INVENTORY_RECORD_NOT_FOUND');
			}

			// 2. Check product status
			const [product] = await tx`
				SELECT status 
				FROM products 
				WHERE id = ${productId};
			`;

			if (!product) {
				throw new Error('PRODUCT_NOT_FOUND');
			}

			if (product.status === 'archived') {
				throw new Error('PRODUCT_ARCHIVED');
			}

			const oldQty = currentInv.quantity;
			let quantityChange = 0;
			let targetQty: number;

			if (transactionType === 'ADJUSTMENT') {
				if (newQuantity === undefined || newQuantity < 0) {
					throw new Error('VALIDATION_FAILED: Invalid new quantity for adjustment');
				}
				targetQty = newQuantity;
				quantityChange = newQuantity - oldQty;
			} else {
				if (quantity === undefined || quantity <= 0) {
					throw new Error('VALIDATION_FAILED: Quantity must be greater than zero');
				}

				if (transactionType === 'STOCK_IN' || transactionType === 'RETURN') {
					quantityChange = quantity;
				} else if (transactionType === 'STOCK_OUT' || transactionType === 'DAMAGED') {
					quantityChange = -quantity;
				}
				targetQty = oldQty + quantityChange;
			}

			if (targetQty < 0) {
				throw new Error('INSUFFICIENT_STOCK');
			}

			// 3. Update inventory quantity
			await tx`
				UPDATE inventory 
				SET quantity = ${targetQty}, updated_at = NOW() 
				WHERE product_id = ${productId};
			`;

			// 4. Create inventory transaction record
			await tx`
				INSERT INTO inventory_transactions (
					product_id, 
					transaction_type, 
					quantity, 
					remarks, 
					created_by, 
					created_at
				) VALUES (
					${productId}, 
					${transactionType}, 
					${quantityChange}, 
					${remarks || null}, 
					${userId || null}, 
					NOW()
				);
			`;

			// 5. Create audit log record
			await tx`
				INSERT INTO audit_logs (
					user_id, 
					action, 
					entity, 
					entity_id, 
					old_data, 
					new_data, 
					created_at
				) VALUES (
					${userId || null}, 
					${transactionType}, 
					'inventory', 
					${currentInv.id}, 
					${JSON.stringify({ quantity: oldQty })}, 
					${JSON.stringify({ quantity: targetQty })}, 
					NOW()
				);
			`;
		});
	}

	async getLowStockThreshold(): Promise<number> {
		try {
			const [setting] = await sql`
				SELECT setting_value 
				FROM settings 
				WHERE setting_key = 'low_stock_threshold'
				LIMIT 1;
			`;
			if (!setting) return 10; // Default safety threshold

			const val = parseInt(setting.setting_value);
			return isNaN(val) ? 10 : val;
		} catch {
			return 10;
		}
	}

	async findAllUsers(): Promise<{ id: string; fullName: string }[]> {
		const data = await sql`
			SELECT id, full_name
			FROM users
			ORDER BY full_name ASC;
		`;
		return data.map((row) => ({
			id: row.id,
			fullName: row.full_name
		}));
	}
}

export const inventoryRepository = new InventoryRepository();
