import { supabase } from '$lib/server/supabase';
import type {
	Product,
	InventoryTransaction,
	InventoryTransactionType,
	CreateProductInput,
	UpdateProductInput
} from '$lib/types';

export class ProductRepository {
	async findAll(options?: {
		search?: string;
		categoryId?: string;
		status?: string;
		sortBy?: 'name' | 'sku' | 'price' | 'created_at';
		sortOrder?: 'asc' | 'desc';
		page?: number;
		limit?: number;
	}): Promise<{ products: Product[]; totalCount: number }> {
		const search = options?.search?.trim() || '';
		const categoryId = options?.categoryId;
		const status = options?.status;
		const sortBy = options?.sortBy || 'name';
		const sortOrder = options?.sortOrder || 'asc';
		const page = options?.page || 1;
		const limit = options?.limit || 10;
		const from = (page - 1) * limit;
		const to = from + limit - 1;

		let query = supabase.from('products').select(
			`
				*,
				categories (name),
				inventory (quantity)
				`,
			{ count: 'exact' }
		);

		// Apply filters
		if (search) {
			const searchPattern = `%${search}%`;
			query = query.or(
				`sku.ilike.${searchPattern},barcode.ilike.${searchPattern},name.ilike.${searchPattern}`
			);
		}

		if (categoryId && categoryId !== 'all') {
			query = query.eq('category_id', categoryId);
		}

		if (status && status !== 'all') {
			query = query.eq('status', status);
		}

		// Apply sorting
		query = query.order(sortBy, { ascending: sortOrder === 'asc' });

		// Apply pagination
		query = query.range(from, to);

		const { data, error, count } = await query;

		if (error) {
			console.error('Supabase error in ProductRepository.findAll:', error);
			throw new Error(`Database query failed: ${error.message}`);
		}

		type SupabaseProductRow = {
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
			categories: { name: string } | null;
			inventory: { quantity: number }[] | null;
		};

		const products: Product[] = ((data as unknown as SupabaseProductRow[]) || []).map((p) => ({
			id: p.id,
			category_id: p.category_id,
			sku: p.sku,
			barcode: p.barcode,
			name: p.name,
			description: p.description,
			price: Number(p.price),
			image_url: p.image_url,
			status: p.status,
			created_by: p.created_by,
			created_at: p.created_at,
			updated_at: p.updated_at,
			category_name: p.categories?.name || null,
			quantity: p.inventory?.[0]?.quantity ?? 0
		}));

		return {
			products,
			totalCount: count || 0
		};
	}

	async findById(id: string): Promise<Product | null> {
		const { data, error } = await supabase
			.from('products')
			.select(
				`
				*,
				categories (name),
				inventory (quantity)
				`
			)
			.eq('id', id)
			.maybeSingle();

		if (error) {
			console.error('Supabase error in ProductRepository.findById:', error);
			throw new Error(`Database query failed: ${error.message}`);
		}

		if (!data) return null;

		type SupabaseProductSingleRow = {
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
			categories: { name: string } | null;
			inventory: { quantity: number }[] | null;
		};

		const p = data as unknown as SupabaseProductSingleRow;

		return {
			id: p.id,
			category_id: p.category_id,
			sku: p.sku,
			barcode: p.barcode,
			name: p.name,
			description: p.description,
			price: Number(p.price),
			image_url: p.image_url,
			status: p.status,
			created_by: p.created_by,
			created_at: p.created_at,
			updated_at: p.updated_at,
			category_name: p.categories?.name || null,
			quantity: p.inventory?.[0]?.quantity ?? 0
		};
	}

	async findBySku(sku: string): Promise<Product | null> {
		const { data, error } = await supabase
			.from('products')
			.select('*')
			.eq('sku', sku.trim())
			.maybeSingle();

		if (error) {
			console.error('Supabase error in ProductRepository.findBySku:', error);
			throw new Error(`Database query failed: ${error.message}`);
		}

		return data as Product | null;
	}

	async findByBarcode(barcode: string): Promise<Product | null> {
		const { data, error } = await supabase
			.from('products')
			.select('*')
			.eq('barcode', barcode.trim())
			.maybeSingle();

		if (error) {
			console.error('Supabase error in ProductRepository.findByBarcode:', error);
			throw new Error(`Database query failed: ${error.message}`);
		}

		return data as Product | null;
	}

	async create(
		productData: CreateProductInput & { id?: string },
		createdBy: string | null
	): Promise<Product> {
		// Insert product
		const { data: product, error: pError } = await supabase
			.from('products')
			.insert({
				id: productData.id, // Support pre-generated ID
				category_id: productData.category_id,
				sku: productData.sku.trim(),
				barcode: productData.barcode?.trim() || null,
				name: productData.name.trim(),
				description: productData.description?.trim() || null,
				price: productData.price,
				image_url: productData.image_url || null,
				status: productData.status,
				created_by: createdBy
			})
			.select()
			.single();

		if (pError) {
			console.error('Supabase error in ProductRepository.create (products):', pError);
			if (pError.code === '23505') {
				if (pError.message.includes('sku')) {
					throw new Error('DUPLICATE_SKU');
				}
				if (pError.message.includes('barcode')) {
					throw new Error('DUPLICATE_BARCODE');
				}
			}
			throw new Error(`Database operation failed: ${pError.message}`);
		}

		// Insert initial inventory of 0
		const { error: invError } = await supabase.from('inventory').insert({
			product_id: product.id,
			quantity: 0
		});

		if (invError) {
			console.error('Supabase error in ProductRepository.create (inventory):', invError);
			// Roll back the product insertion to maintain integrity
			await supabase.from('products').delete().eq('id', product.id);
			throw new Error(`Failed to initialize inventory for product: ${invError.message}`);
		}

		return {
			...product,
			price: Number(product.price),
			category_name: null,
			quantity: 0
		};
	}

	async update(id: string, productData: UpdateProductInput): Promise<Product> {
		const { data, error } = await supabase
			.from('products')
			.update({
				category_id: productData.category_id,
				sku: productData.sku.trim(),
				barcode: productData.barcode?.trim() || null,
				name: productData.name.trim(),
				description: productData.description?.trim() || null,
				price: productData.price,
				image_url: productData.image_url || null,
				status: productData.status,
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Supabase error in ProductRepository.update:', error);
			if (error.code === '23505') {
				if (error.message.includes('sku')) {
					throw new Error('DUPLICATE_SKU');
				}
				if (error.message.includes('barcode')) {
					throw new Error('DUPLICATE_BARCODE');
				}
			}
			throw new Error(`Database operation failed: ${error.message}`);
		}

		return {
			...data,
			price: Number(data.price)
		} as Product;
	}

	async archive(id: string): Promise<void> {
		const { error } = await supabase
			.from('products')
			.update({
				status: 'archived',
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			console.error('Supabase error in ProductRepository.archive:', error);
			throw new Error(`Database operation failed: ${error.message}`);
		}
	}

	async findTransactionsByProductId(productId: string): Promise<InventoryTransaction[]> {
		const { data, error } = await supabase
			.from('inventory_transactions')
			.select(
				`
				*,
				users (full_name)
				`
			)
			.eq('product_id', productId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Supabase error in ProductRepository.findTransactionsByProductId:', error);
			throw new Error(`Database query failed: ${error.message}`);
		}

		type SupabaseTransactionRow = {
			id: string;
			product_id: string;
			transaction_type: InventoryTransactionType;
			quantity: number;
			remarks: string | null;
			created_by: string | null;
			created_at: string;
			users: { full_name: string } | null;
		};

		return ((data as unknown as SupabaseTransactionRow[]) || []).map((t) => ({
			id: t.id,
			product_id: t.product_id,
			transaction_type: t.transaction_type,
			quantity: t.quantity,
			remarks: t.remarks,
			created_by: t.created_by,
			created_at: t.created_at,
			user_full_name: t.users?.full_name || null
		}));
	}
}

export const productRepository = new ProductRepository();
