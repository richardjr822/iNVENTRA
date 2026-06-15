import { z } from 'zod';

export const loginSchema = z.object({
	username: z
		.string()
		.trim()
		.min(1, 'Username is required')
		.min(3, 'Username must be at least 3 characters')
		.max(50, 'Username must be less than 50 characters')
		.regex(
			/^[a-zA-Z0-9_-]+$/,
			'Username can only contain alphanumeric characters, underscores, and hyphens'
		),
	password: z
		.string()
		.min(1, 'Password is required')
		.min(6, 'Password must be at least 6 characters')
		.max(100, 'Password must be less than 100 characters')
});

export type LoginSchema = typeof loginSchema;
export type LoginInput = z.infer<LoginSchema>;
