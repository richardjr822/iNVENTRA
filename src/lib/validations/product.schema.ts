import { z } from 'zod';

export const createProductSchema = z.object({
	sku: z.string().trim().min(1, 'SKU is required').max(50, 'SKU must be 50 characters or less'),
	barcode: z
		.string()
		.trim()
		.max(50, 'Barcode must be 50 characters or less')
		.optional()
		.nullable()
		.or(z.literal(''))
		.transform((val) => (val === '' || val === undefined ? null : val)),
	name: z
		.string()
		.trim()
		.min(1, 'Product name is required')
		.max(255, 'Product name must be 255 characters or less'),
	price: z
		.number({ message: 'Price is required and must be a number' })
		.positive('Price must be greater than 0'),
	category_id: z
		.string()
		.trim()
		.uuid('Invalid category ID selection')
		.min(1, 'Category is required'),
	description: z
		.string()
		.trim()
		.max(1000, 'Description must be 1000 characters or less')
		.optional()
		.nullable()
		.or(z.literal(''))
		.transform((val) => (val === '' || val === undefined ? null : val)),
	status: z.enum(['active', 'inactive'], {
		message: 'Status must be Active or Inactive'
	}),
	image_url: z
		.string()
		.trim()
		.url('Invalid image URL format')
		.optional()
		.nullable()
		.or(z.literal(''))
		.transform((val) => (val === '' || val === undefined ? null : val))
});

export type CreateProductSchema = typeof createProductSchema;
export type CreateProductInput = z.infer<CreateProductSchema>;

export const updateProductSchema = createProductSchema.extend({
	id: z.string().uuid('Invalid product ID'),
	status: z.enum(['active', 'inactive', 'archived'], {
		message: 'Status must be Active, Inactive, or Archived'
	})
});

export type UpdateProductSchema = typeof updateProductSchema;
export type UpdateProductInput = z.infer<UpdateProductSchema>;
