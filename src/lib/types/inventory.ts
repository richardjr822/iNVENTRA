export type InventoryTransactionType =
	| 'STOCK_IN'
	| 'STOCK_OUT'
	| 'ADJUSTMENT'
	| 'DAMAGED'
	| 'RETURN';

export interface Inventory {
	id: string;
	product_id: string;
	quantity: number;
	updated_at: string;
}

export interface InventoryTransaction {
	id: string;
	product_id: string;
	transaction_type: InventoryTransactionType;
	quantity: number;
	remarks: string | null;
	created_by: string | null;
	created_at: string;

	// Join fields
	product_name?: string;
	product_sku?: string;
	product_barcode?: string | null;
	user_full_name?: string | null;
}

export interface InventoryOverviewItem {
	product_id: string;
	product_name: string;
	sku: string;
	barcode: string | null;
	image_url: string | null;
	quantity: number;
	updated_at: string;
	status: 'active' | 'inactive' | 'archived';
	category_name?: string | null;
}

export interface InventoryUpdateOptions {
	productId: string;
	userId: string | null;
	transactionType: InventoryTransactionType;
	quantity?: number; // Used for delta updates (STOCK_IN, STOCK_OUT, DAMAGED, RETURN)
	newQuantity?: number; // Used for absolute adjustments (ADJUSTMENT)
	remarks: string | null;
}
