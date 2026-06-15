import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteSession } from '$lib/server/session';
import { auditService } from '$lib/services/audit.service';

export const load: PageServerLoad = async ({ cookies, locals }) => {
	const user = locals.user;
	if (user) {
		await auditService.log({
			userId: user.id,
			action: 'Logout',
			entity: 'users',
			entityId: user.id,
			oldData: null,
			newData: {
				username: user.username,
				role: user.role
			}
		});
	}

	// Clear the session cookie
	deleteSession(cookies);
	// Redirect back to login
	throw redirect(303, '/login');
};

export const actions: Actions = {
	default: async ({ cookies, locals }) => {
		const user = locals.user;
		if (user) {
			await auditService.log({
				userId: user.id,
				action: 'Logout',
				entity: 'users',
				entityId: user.id,
				oldData: null,
				newData: {
					username: user.username,
					role: user.role
				}
			});
		}

		// Clear session cookie on form submit
		deleteSession(cookies);
		// Redirect back to login
		throw redirect(303, '/login');
	}
};

