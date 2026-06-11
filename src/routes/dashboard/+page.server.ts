import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// event.locals.user is guaranteed to be populated by hooks.server.ts protection middleware
	return {
		user: locals.user!
	};
};
