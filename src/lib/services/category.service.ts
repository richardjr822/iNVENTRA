import { categoryRepository } from '$lib/repositories/category.repository';
import { createCategorySchema, updateCategorySchema } from '$lib/validations/category.schema';
import type { Category } from '$lib/types/category';
import { auditService } from '$lib/services/audit.service';

export class CategoryService {
	async getCategories(options?: {
		search?: string;
		sortBy?: 'name' | 'created_at';
		sortOrder?: 'asc' | 'desc';
		page?: number;
		limit?: number;
	}): Promise<{ categories: Category[]; totalCount: number }> {
		try {
			return await categoryRepository.findAll(options);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to load categories: ${msg}`, { cause: error });
		}
	}

	async getCategoryById(id: string): Promise<Category> {
		if (!id) throw new Error('Category ID is required');

		try {
			const category = await categoryRepository.findById(id);
			if (!category) {
				throw new Error('CATEGORY_NOT_FOUND');
			}
			return category;
		} catch (error: unknown) {
			if (error instanceof Error && error.message === 'CATEGORY_NOT_FOUND') {
				throw error;
			}
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to retrieve category: ${msg}`, { cause: error });
		}
	}

	async createCategory(
		data: { name: string; description?: string },
		userId: string | null = null
	): Promise<Category> {
		// Business validation using Zod
		const validationResult = createCategorySchema.safeParse(data);
		if (!validationResult.success) {
			throw new Error(`VALIDATION_FAILED: ${validationResult.error.issues[0].message}`);
		}

		const { name, description } = validationResult.data;

		// Check name uniqueness (Case-sensitive check or standard case-insensitive.
		// Since PostgreSQL unique index can be case sensitive, let's look up by exact name first)
		const existing = await categoryRepository.findByName(name);
		if (existing) {
			throw new Error('DUPLICATE_NAME');
		}

		try {
			const category = await categoryRepository.create(name, description);
			await auditService.log({
				userId,
				action: 'Create Category',
				entity: 'categories',
				entityId: category.id,
				oldData: null,
				newData: category
			});
			return category;
		} catch (error: unknown) {
			if (error instanceof Error && error.message === 'DUPLICATE_NAME') {
				throw error;
			}
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to create category: ${msg}`, { cause: error });
		}
	}

	async updateCategory(
		id: string,
		data: { name: string; description?: string },
		userId: string | null = null
	): Promise<Category> {
		// Business validation using Zod
		const validationResult = updateCategorySchema.safeParse({ ...data, id });
		if (!validationResult.success) {
			throw new Error(`VALIDATION_FAILED: ${validationResult.error.issues[0].message}`);
		}

		const { name, description } = validationResult.data;

		// Verify category exists
		const existingCategory = await categoryRepository.findById(id);
		if (!existingCategory) {
			throw new Error('CATEGORY_NOT_FOUND');
		}

		// Verify name uniqueness if changed
		const existingName = await categoryRepository.findByName(name);
		if (existingName && existingName.id !== id) {
			throw new Error('DUPLICATE_NAME');
		}

		try {
			const updatedCategory = await categoryRepository.update(id, name, description);
			await auditService.log({
				userId,
				action: 'Update Category',
				entity: 'categories',
				entityId: updatedCategory.id,
				oldData: existingCategory,
				newData: updatedCategory
			});
			return updatedCategory;
		} catch (error: unknown) {
			if (error instanceof Error && error.message === 'DUPLICATE_NAME') {
				throw error;
			}
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to update category: ${msg}`, { cause: error });
		}
	}

	async deleteCategory(id: string, userId: string | null = null): Promise<void> {
		if (!id) throw new Error('Category ID is required');

		// Verify category exists
		const existingCategory = await categoryRepository.findById(id);
		if (!existingCategory) {
			throw new Error('CATEGORY_NOT_FOUND');
		}

		try {
			await categoryRepository.delete(id);
			await auditService.log({
				userId,
				action: 'Delete Category',
				entity: 'categories',
				entityId: id,
				oldData: existingCategory,
				newData: null
			});
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to delete category: ${msg}`, { cause: error });
		}
	}
}

export const categoryService = new CategoryService();
