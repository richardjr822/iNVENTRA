import { z } from 'zod';

export const createProductSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Product name is required')
		.max(255, 'Product name must be 255 characters or less'),
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
		.transform((val) => (val === '' || val === undefined ? null : val)),
	variants: z
		.array(
			z.object({
				quantity: z
					.number({ message: 'Quantity is required' })
					.int('Quantity must be an integer')
					.positive('Quantity must be greater than 0'),
				price: z
					.number({ message: 'Price is required' })
					.min(0, 'Price must be 0 or greater')
			})
		)
		.min(1, 'At least one quantity-price variant is required')
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

