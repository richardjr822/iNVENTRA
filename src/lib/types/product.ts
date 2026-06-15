export interface Product {
	id: string;
	category_id: string | null;
	sku: string;
	barcode: string | null;
	name: string;
	description: string | null;
	price: number;
	image_url: string | null;
	status: 'active' | 'inactive' | 'archived';
	created_by: string | null;
	created_at: string;
	updated_at: string;

	// Joined fields for tables/views
	category_name?: string | null;
	quantity?: number; // current stock quantity
}

export interface CreateProductInput {
	id?: string;
	category_id: string;
	sku: string;
	barcode?: string | null;
	name: string;
	description?: string | null;
	price: number;
	image_url?: string | null;
	status: 'active' | 'inactive';
}

export interface UpdateProductInput {
	category_id: string;
	sku: string;
	barcode?: string | null;
	name: string;
	description?: string | null;
	price: number;
	image_url?: string | null;
	status: 'active' | 'inactive' | 'archived';
}
