import { productRepository } from '$lib/repositories/product.repository';
import { createProductSchema, updateProductSchema } from '$lib/validations/product.schema';
import type {
	Product,
	CreateProductInput,
	UpdateProductInput
} from '$lib/types';
import { auditService } from '$lib/services/audit.service';

export class ProductService {
	async getProducts(options?: {
		search?: string;
		sortBy?: 'name' | 'sku' | 'price' | 'created_at';
		sortOrder?: 'asc' | 'desc';
		page?: number;
		limit?: number;
	}): Promise<{ products: Product[]; totalCount: number }> {
		try {
			return await productRepository.findAll(options);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to load products: ${msg}`, { cause: error });
		}
	}

	async getProductById(id: string): Promise<Product> {
		if (!id) throw new Error('Product ID is required');

		try {
			const product = await productRepository.findById(id);
			if (!product) {
				throw new Error('PRODUCT_NOT_FOUND');
			}
			return product;
		} catch (error: unknown) {
			if (error instanceof Error && error.message === 'PRODUCT_NOT_FOUND') {
				throw error;
			}
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to retrieve product: ${msg}`, { cause: error });
		}
	}

	async createProduct(
		data: CreateProductInput & { id?: string },
		createdBy: string | null
	): Promise<Product> {
		// Business validation using Zod
		const validationResult = createProductSchema.safeParse(data);
		if (!validationResult.success) {
			throw new Error(`VALIDATION_FAILED: ${validationResult.error.issues[0].message}`);
		}

		const validatedData = validationResult.data;

		try {
			const product = await productRepository.create(
				{
					id: data.id, // Support pre-generated ID
					...validatedData
				},
				createdBy
			);
			await auditService.log({
				userId: createdBy,
				action: 'Create Product',
				entity: 'products',
				entityId: product.id,
				oldData: null,
				newData: product
			});
			return product;
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to create product: ${msg}`, { cause: error });
		}
	}

	async updateProduct(id: string, data: UpdateProductInput, userId: string | null = null): Promise<Product> {
		// Business validation using Zod
		const validationResult = updateProductSchema.safeParse({ id, ...data });
		if (!validationResult.success) {
			throw new Error(`VALIDATION_FAILED: ${validationResult.error.issues[0].message}`);
		}

		const validatedData = validationResult.data;

		// Verify product exists
		const existingProduct = await productRepository.findById(id);
		if (!existingProduct) {
			throw new Error('PRODUCT_NOT_FOUND');
		}

		try {
			const updatedProduct = await productRepository.update(id, validatedData);
			await auditService.log({
				userId,
				action: 'Update Product',
				entity: 'products',
				entityId: updatedProduct.id,
				oldData: existingProduct,
				newData: updatedProduct
			});
			return updatedProduct;
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to update product: ${msg}`, { cause: error });
		}
	}

	async archiveProduct(id: string, userId: string | null = null): Promise<void> {
		if (!id) throw new Error('Product ID is required');

		// Verify product exists
		const existingProduct = await productRepository.findById(id);
		if (!existingProduct) {
			throw new Error('PRODUCT_NOT_FOUND');
		}

		try {
			await productRepository.archive(id);
			const archivedProduct = await productRepository.findById(id);
			await auditService.log({
				userId,
				action: 'Archive Product',
				entity: 'products',
				entityId: id,
				oldData: existingProduct,
				newData: archivedProduct
			});
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to archive product: ${msg}`, { cause: error });
		}
	}

	async getProductTransactions(productId: string): Promise<any[]> {
		return [];
	}

	async checkStockMovementAllowed(productId: string): Promise<boolean> {
		return true;
	}

	async deleteProduct(id: string, userId: string | null = null): Promise<void> {
		if (!id) throw new Error('Product ID is required');

		const existingProduct = await productRepository.findById(id);
		if (!existingProduct) {
			throw new Error('PRODUCT_NOT_FOUND');
		}

		try {
			await productRepository.delete(id);
			await auditService.log({
				userId,
				action: 'Delete Product',
				entity: 'products',
				entityId: id,
				oldData: existingProduct,
				newData: null
			});
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to delete product: ${msg}`, { cause: error });
		}
	}
}

export const productService = new ProductService();

