import { redirect, type Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
	// Extract the user details from the secure session cookie if present
	const sessionUser = getSession(event.cookies);
	event.locals.user = sessionUser;

	const pathname = event.url.pathname;

	// 1. Root route redirect logic
	if (pathname === '/') {
		if (sessionUser) {
			throw redirect(303, '/dashboard');
		} else {
			throw redirect(303, '/login');
		}
	}

	// 2. Redirect authenticated users away from the login page
	if (pathname === '/login') {
		if (sessionUser) {
			throw redirect(303, '/dashboard');
		}
	}

	// 3. Route protection for dashboard paths
	if (pathname.startsWith('/dashboard')) {
		if (!sessionUser) {
			// Redirect to login while preserving the intended destination
			throw redirect(303, `/login?redirectTo=${encodeURIComponent(pathname)}`);
		}

		// Centralized Role-Based Access Control (RBAC) middleware checks
		if (pathname.startsWith('/dashboard/users') || pathname.startsWith('/dashboard/settings')) {
			if (sessionUser.role !== 'admin') {
				// Redirect unauthorized users to dashboard with a query flag
				throw redirect(303, '/dashboard?error=unauthorized_role');
			}
		}
	}

	const response = await resolve(event);
	return response;
};
