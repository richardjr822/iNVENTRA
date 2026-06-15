import { inventoryRepository } from '$lib/repositories/inventory.repository';
import { productRepository } from '$lib/repositories/product.repository';
import {
	stockInSchema,
	stockOutSchema,
	adjustmentSchema,
	damagedSchema,
	returnsSchema
} from '$lib/validations/inventory.schema';
import type { InventoryOverviewItem, InventoryTransaction } from '$lib/types/inventory';

export class InventoryService {
	async getStockOverview(options?: {
		search?: string;
		categoryId?: string;
		status?: string;
		sortBy?: 'name' | 'sku' | 'quantity' | 'updated_at';
		sortOrder?: 'asc' | 'desc';
		page?: number;
		limit?: number;
	}): Promise<{ items: InventoryOverviewItem[]; totalCount: number; lowStockThreshold: number }> {
		try {
			const data = await inventoryRepository.findAll(options);
			const lowStockThreshold = await inventoryRepository.getLowStockThreshold();
			return {
				...data,
				lowStockThreshold
			};
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to load stock overview: ${msg}`, { cause: error });
		}
	}

	async getSelectableProducts(): Promise<
		{ id: string; name: string; sku: string; barcode: string | null }[]
	> {
		try {
			return await inventoryRepository.findSelectableProducts();
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to retrieve products for inventory selection: ${msg}`, {
				cause: error
			});
		}
	}

	async getTransactions(options?: {
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
		try {
			return await inventoryRepository.findTransactions(options);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to load transaction history: ${msg}`, { cause: error });
		}
	}

	async getInventoryDetail(productId: string) {
		if (!productId) throw new Error('Product ID is required');

		try {
			return await inventoryRepository.getInventoryDetail(productId);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to retrieve inventory details: ${msg}`, { cause: error });
		}
	}

	async stockIn(
		data: { product_id: string; quantity: number; remarks?: string | null },
		userId: string | null
	): Promise<void> {
		const parsed = stockInSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error(`VALIDATION_FAILED: ${parsed.error.issues[0].message}`);
		}

		await this.checkProductNotArchived(parsed.data.product_id);

		try {
			await inventoryRepository.updateStock({
				productId: parsed.data.product_id,
				userId,
				transactionType: 'STOCK_IN',
				quantity: parsed.data.quantity,
				remarks: parsed.data.remarks || null
			});
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Stock In transaction failed: ${msg}`, { cause: error });
		}
	}

	async stockOut(
		data: { product_id: string; quantity: number; remarks?: string | null },
		userId: string | null
	): Promise<void> {
		const parsed = stockOutSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error(`VALIDATION_FAILED: ${parsed.error.issues[0].message}`);
		}

		const productId = parsed.data.product_id;
		const reqQty = parsed.data.quantity;

		// Business Rule: Ensure stock level does not become negative
		const details = await inventoryRepository.getInventoryDetail(productId);
		if (details.product.status === 'archived') {
			throw new Error('PRODUCT_ARCHIVED');
		}

		if (details.inventory.quantity < reqQty) {
			throw new Error('INSUFFICIENT_STOCK');
		}

		try {
			await inventoryRepository.updateStock({
				productId,
				userId,
				transactionType: 'STOCK_OUT',
				quantity: reqQty,
				remarks: parsed.data.remarks || null
			});
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			if (msg === 'INSUFFICIENT_STOCK') throw error;
			throw new Error(`Stock Out transaction failed: ${msg}`, { cause: error });
		}
	}

	async adjustStock(
		data: { product_id: string; new_quantity: number; remarks: string },
		userId: string | null
	): Promise<void> {
		const parsed = adjustmentSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error(`VALIDATION_FAILED: ${parsed.error.issues[0].message}`);
		}

		await this.checkProductNotArchived(parsed.data.product_id);

		try {
			await inventoryRepository.updateStock({
				productId: parsed.data.product_id,
				userId,
				transactionType: 'ADJUSTMENT',
				newQuantity: parsed.data.new_quantity,
				remarks: parsed.data.remarks
			});
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Adjustment transaction failed: ${msg}`, { cause: error });
		}
	}

	async recordDamaged(
		data: { product_id: string; quantity: number; remarks?: string | null },
		userId: string | null
	): Promise<void> {
		const parsed = damagedSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error(`VALIDATION_FAILED: ${parsed.error.issues[0].message}`);
		}

		const productId = parsed.data.product_id;
		const reqQty = parsed.data.quantity;

		// Business Rule: Verify stock level and status
		const details = await inventoryRepository.getInventoryDetail(productId);
		if (details.product.status === 'archived') {
			throw new Error('PRODUCT_ARCHIVED');
		}

		if (details.inventory.quantity < reqQty) {
			throw new Error('INSUFFICIENT_STOCK');
		}

		try {
			await inventoryRepository.updateStock({
				productId,
				userId,
				transactionType: 'DAMAGED',
				quantity: reqQty,
				remarks: parsed.data.remarks || null
			});
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			if (msg === 'INSUFFICIENT_STOCK') throw error;
			throw new Error(`Damaged record transaction failed: ${msg}`, { cause: error });
		}
	}

	async recordReturn(
		data: { product_id: string; quantity: number; remarks?: string | null },
		userId: string | null
	): Promise<void> {
		const parsed = returnsSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error(`VALIDATION_FAILED: ${parsed.error.issues[0].message}`);
		}

		await this.checkProductNotArchived(parsed.data.product_id);

		try {
			await inventoryRepository.updateStock({
				productId: parsed.data.product_id,
				userId,
				transactionType: 'RETURN',
				quantity: parsed.data.quantity,
				remarks: parsed.data.remarks || null
			});
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Return transaction failed: ${msg}`, { cause: error });
		}
	}

	async getAllUsers(): Promise<{ id: string; fullName: string }[]> {
		try {
			return await inventoryRepository.findAllUsers();
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to load users: ${msg}`, { cause: error });
		}
	}

	private async checkProductNotArchived(productId: string): Promise<void> {
		const product = await productRepository.findById(productId);
		if (!product) {
			throw new Error('PRODUCT_NOT_FOUND');
		}
		if (product.status === 'archived') {
			throw new Error('PRODUCT_ARCHIVED');
		}
	}
}

export const inventoryService = new InventoryService();
