import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteSession } from '$lib/server/session';

export const load: PageServerLoad = async ({ cookies }) => {
	// Clear the session cookie
	deleteSession(cookies);
	// Redirect back to login
	throw redirect(303, '/login');
};

export const actions: Actions = {
	default: async ({ cookies }) => {
		// Clear session cookie on form submit
		deleteSession(cookies);
		// Redirect back to login
		throw redirect(303, '/login');
	}
};
