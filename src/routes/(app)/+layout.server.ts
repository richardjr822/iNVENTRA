import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Guard: Ensure user is authenticated
	if (!locals.user) {
		const redirectUrl = `/login?redirectTo=${encodeURIComponent(url.pathname)}`;
		throw redirect(303, redirectUrl);
	}

	// Expose the authenticated session user
	return {
		user: locals.user
	};
};
