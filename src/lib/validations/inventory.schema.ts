import { z } from 'zod';

export const stockInSchema = z.object({
	product_id: z.string().uuid('Please select a valid product'),
	quantity: z.coerce.number().int().positive('Quantity must be greater than zero'),
	remarks: z.string().trim().max(500, 'Remarks cannot exceed 500 characters').optional().nullable()
});

export const stockOutSchema = z.object({
	product_id: z.string().uuid('Please select a valid product'),
	quantity: z.coerce.number().int().positive('Quantity must be greater than zero'),
	remarks: z.string().trim().max(500, 'Remarks cannot exceed 500 characters').optional().nullable()
});

export const adjustmentSchema = z.object({
	product_id: z.string().uuid('Please select a valid product'),
	new_quantity: z.coerce.number().int().min(0, 'Quantity cannot be negative'),
	remarks: z
		.string()
		.trim()
		.min(1, 'Reason is required')
		.max(500, 'Reason cannot exceed 500 characters')
});

export const damagedSchema = z.object({
	product_id: z.string().uuid('Please select a valid product'),
	quantity: z.coerce.number().int().positive('Quantity must be greater than zero'),
	remarks: z.string().trim().max(500, 'Remarks cannot exceed 500 characters').optional().nullable()
});

export const returnsSchema = z.object({
	product_id: z.string().uuid('Please select a valid product'),
	quantity: z.coerce.number().int().positive('Quantity must be greater than zero'),
	remarks: z.string().trim().max(500, 'Remarks cannot exceed 500 characters').optional().nullable()
});
