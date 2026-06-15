import { z } from 'zod';

export const createCategorySchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Category name is required')
		.max(100, 'Category name must be 100 characters or less'),
	description: z
		.string()
		.trim()
		.max(500, 'Description must be 500 characters or less')
		.optional()
		.or(z.literal(''))
});

export type CreateCategorySchema = typeof createCategorySchema;
export type CreateCategoryInput = z.infer<CreateCategorySchema>;

export const updateCategorySchema = createCategorySchema.extend({
	id: z.string().uuid('Invalid category ID')
});

export type UpdateCategorySchema = typeof updateCategorySchema;
export type UpdateCategoryInput = z.infer<UpdateCategorySchema>;
