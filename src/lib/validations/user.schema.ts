import { z } from 'zod';

export const createUserSchema = z
	.object({
		username: z
			.string()
			.min(3, { message: 'Username must be between 3 and 50 characters' })
			.max(50, { message: 'Username must be between 3 and 50 characters' })
			.regex(/^[a-zA-Z0-9_-]+$/, {
				message: 'Username can only contain alphanumeric characters, underscores, and hyphens'
			})
			.trim(),
		full_name: z
			.string()
			.min(1, { message: 'Full name is required' })
			.max(100, { message: 'Full name must not exceed 100 characters' })
			.trim(),
		password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
		confirmPassword: z.string(),
		role: z.enum(['admin', 'inventory_manager', 'viewer'], {
			message: 'Invalid role selection'
		}),
		is_active: z.coerce.boolean()
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	});

export const updateUserSchema = z.object({
	full_name: z
		.string()
		.min(1, { message: 'Full name is required' })
		.max(100, { message: 'Full name must not exceed 100 characters' })
		.trim(),
	role: z.enum(['admin', 'inventory_manager', 'viewer'], {
		message: 'Invalid role selection'
	}),
	is_active: z.coerce.boolean()
});
