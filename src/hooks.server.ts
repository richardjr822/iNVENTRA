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

	// 3. Redirect obsolete inventory-related routes to the dashboard
	if (
		pathname.startsWith('/inventory') ||
		pathname.startsWith('/categories') ||
		pathname.startsWith('/reports')
	) {
		throw redirect(303, '/dashboard');
	}

	const response = await resolve(event);
	return response;

};
