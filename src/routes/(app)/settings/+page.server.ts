import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	// Wait for layout auth check
	const parentData = await parent();
	const user = parentData.user;

	// Guard: Only admin is allowed here
	if (user.role !== 'admin') {
		throw redirect(303, '/dashboard?error=unauthorized_role');
	}

	return {};
};
