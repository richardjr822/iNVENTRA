import { supabase } from '$lib/server/supabase';
import type {
	Product,
	CreateProductInput,
	UpdateProductInput,
	ProductVariant
} from '$lib/types';

export class ProductRepository {
	async findAll(options?: {
		search?: string;
		sortBy?: 'name' | 'sku' | 'price' | 'created_at';
		sortOrder?: 'asc' | 'desc';
		page?: number;
		limit?: number;
	}): Promise<{ products: Product[]; totalCount: number }> {
		const search = options?.search?.trim() || '';
		const sortBy = options?.sortBy || 'name';
		const sortOrder = options?.sortOrder || 'asc';
		const page = options?.page || 1;
		const limit = options?.limit || 10;
		const from = (page - 1) * limit;
		const to = from + limit - 1;

		let query = supabase.from('products').select(
			`
				*,
				product_variants (*)
				`,
			{ count: 'exact' }
		);

		// Apply status filter to exclude archived by default if status is not specified
		query = query.neq('status', 'archived');

		// Apply search filter
		if (search) {
			query = query.ilike('name', `%${search}%`);
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
			product_variants: { id: string; product_id: string; quantity: number; price: number }[] | null;
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
			category_name: null,
			quantity: 0,
			variants: (p.product_variants || [])
				.map((v) => ({
					id: v.id,
					product_id: v.product_id,
					quantity: Number(v.quantity),
					price: Number(v.price)
				}))
				.sort((a, b) => a.quantity - b.quantity)
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
				product_variants (*)
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
			product_variants: { id: string; product_id: string; quantity: number; price: number }[] | null;
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
			category_name: null,
			quantity: 0,
			variants: (p.product_variants || [])
				.map((v) => ({
					id: v.id,
					product_id: v.product_id,
					quantity: Number(v.quantity),
					price: Number(v.price)
				}))
				.sort((a, b) => a.quantity - b.quantity)
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
		const generatedSku = productData.sku || `PROD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
		const basePrice = productData.variants[0]?.price ?? 0;

		// Insert product
		const { data: product, error: pError } = await supabase
			.from('products')
			.insert({
				id: productData.id, // Support pre-generated ID
				category_id: null,
				sku: generatedSku,
				barcode: productData.barcode?.trim() || null,
				name: productData.name.trim(),
				description: productData.description?.trim() || null,
				price: basePrice,
				image_url: productData.image_url || null,
				status: productData.status,
				created_by: createdBy
			})
			.select()
			.single();

		if (pError) {
			console.error('Supabase error in ProductRepository.create (products):', pError);
			throw new Error(`Database operation failed: ${pError.message}`);
		}

		// Insert product variants
		const variantsToInsert = productData.variants.map((v) => ({
			product_id: product.id,
			quantity: v.quantity,
			price: v.price
		}));

		const { error: vError } = await supabase
			.from('product_variants')
			.insert(variantsToInsert);

		if (vError) {
			console.error('Supabase error in ProductRepository.create (product_variants):', vError);
			// Roll back the product insertion to maintain integrity
			await supabase.from('products').delete().eq('id', product.id);
			throw new Error(`Failed to initialize variants for product: ${vError.message}`);
		}

		// Insert dummy/initial inventory record so other database queries/views don't fail
		await supabase.from('inventory').insert({
			product_id: product.id,
			quantity: 0
		}).select();

		return {
			...product,
			price: Number(product.price),
			category_name: null,
			quantity: 0,
			variants: productData.variants.map((v) => ({
				product_id: product.id,
				quantity: v.quantity,
				price: v.price
			})).sort((a, b) => a.quantity - b.quantity)
		};
	}

	async update(id: string, productData: UpdateProductInput): Promise<Product> {
		const basePrice = productData.variants[0]?.price ?? 0;

		const { data, error } = await supabase
			.from('products')
			.update({
				name: productData.name.trim(),
				description: productData.description?.trim() || null,
				price: basePrice,
				image_url: productData.image_url || null,
				status: productData.status,
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Supabase error in ProductRepository.update:', error);
			throw new Error(`Database operation failed: ${error.message}`);
		}

		// Delete old variants
		const { error: delError } = await supabase
			.from('product_variants')
			.delete()
			.eq('product_id', id);

		if (delError) {
			console.error('Supabase error deleting product_variants:', delError);
			throw new Error(`Failed to update variants: ${delError.message}`);
		}

		// Insert new variants
		const variantsToInsert = productData.variants.map((v) => ({
			product_id: id,
			quantity: v.quantity,
			price: v.price
		}));

		const { error: insError } = await supabase
			.from('product_variants')
			.insert(variantsToInsert);

		if (insError) {
			console.error('Supabase error inserting product_variants:', insError);
			throw new Error(`Failed to insert variants: ${insError.message}`);
		}

		return {
			...data,
			price: Number(data.price),
			variants: productData.variants.map((v) => ({
				product_id: id,
				quantity: v.quantity,
				price: v.price
			})).sort((a, b) => a.quantity - b.quantity)
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

	async delete(id: string): Promise<void> {
		// Clean up any historical inventory records
		await supabase.from('inventory_transactions').delete().eq('product_id', id);
		await supabase.from('inventory').delete().eq('product_id', id);
		await supabase.from('product_variants').delete().eq('product_id', id);

		const { error: pError } = await supabase
			.from('products')
			.delete()
			.eq('id', id);

		if (pError) {
			console.error('Supabase error deleting product:', pError);
			throw new Error(`Failed to delete product: ${pError.message}`);
		}
	}
}

export const productRepository = new ProductRepository();

