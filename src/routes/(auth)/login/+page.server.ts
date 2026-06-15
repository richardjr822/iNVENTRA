import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loginSchema } from '$lib/validations/login.schema';
import { getUserByUsername, verifyPassword } from '$lib/server/auth';
import { setSession } from '$lib/server/session';
import { auditService } from '$lib/services/audit.service';

export const load: PageServerLoad = async ({ locals }) => {
	// If the user is already authenticated, redirect them to the dashboard
	if (locals.user) {
		throw redirect(303, '/dashboard');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		// 1. Zod schema validation
		const result = loginSchema.safeParse({ username, password });

		if (!result.success) {
			const fieldErrors = result.error.flatten().fieldErrors;
			return fail(400, {
				success: false,
				errors: {
					username: fieldErrors.username?.[0] || null,
					password: fieldErrors.password?.[0] || null
				},
				values: {
					username: typeof username === 'string' ? username : ''
				}
			});
		}

		const { username: validUsername, password: validPassword } = result.data;

		// 2. Lookup user by username
		const user = await getUserByUsername(validUsername);
		if (!user) {
			// Return a generic error message to prevent username enumeration
			return fail(400, {
				success: false,
				error: 'Invalid username or password',
				values: { username: validUsername }
			});
		}

		// 3. Reject inactive users
		if (!user.is_active) {
			return fail(400, {
				success: false,
				error: 'Invalid username or password',
				values: { username: validUsername }
			});
		}

		// 4. Compare passwords with bcrypt
		const isPasswordValid = await verifyPassword(validPassword, user.password_hash);
		if (!isPasswordValid) {
			// Return a generic error message to prevent username enumeration
			return fail(400, {
				success: false,
				error: 'Invalid username or password',
				values: { username: validUsername }
			});
		}

		// 5. Create secure HTTP-only session cookie
		setSession(cookies, {
			id: user.id,
			username: user.username,
			fullName: user.full_name,
			role: user.role
		});

		// 5b. Log successful login
		await auditService.log({
			userId: user.id,
			action: 'Login',
			entity: 'users',
			entityId: user.id,
			oldData: null,
			newData: {
				username: user.username,
				role: user.role
			}
		});

		// 6. Handle post-login redirection
		const redirectTo = url.searchParams.get('redirectTo');
		if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
			throw redirect(303, redirectTo);
		}

		throw redirect(303, '/dashboard');
	}
};

