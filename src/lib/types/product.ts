export interface ProductVariant {
	id?: string;
	product_id?: string;
	quantity: number;
	price: number;
}

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
	variants?: ProductVariant[];
}

export interface CreateProductInput {
	id?: string;
	category_id?: string | null;
	sku?: string;
	barcode?: string | null;
	name: string;
	description?: string | null;
	price?: number;
	image_url?: string | null;
	status: 'active' | 'inactive';
	variants: { quantity: number; price: number }[];
}

export interface UpdateProductInput {
	name: string;
	description?: string | null;
	image_url?: string | null;
	status: 'active' | 'inactive' | 'archived';
	variants: { quantity: number; price: number }[];
}

