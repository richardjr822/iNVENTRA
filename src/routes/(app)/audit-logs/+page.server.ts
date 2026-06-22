import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { auditService } from '$lib/services/audit.service';
import { userRepository } from '$lib/repositories/user.repository';

export const load: PageServerLoad = async ({ parent, url }) => {
	const parentData = await parent();
	const sessionUser = parentData.user;

	// Guard: Admin only
	if (!sessionUser || sessionUser.role !== 'admin') {
		throw redirect(303, '/dashboard?error=unauthorized_role');
	}

	const search = url.searchParams.get('q') || '';
	const userId = url.searchParams.get('userId') || 'all';
	const action = url.searchParams.get('action') || 'all';
	const startDate = url.searchParams.get('startDate') || '';
	const endDate = url.searchParams.get('endDate') || '';
	const pageParam = url.searchParams.get('page');
	const page = pageParam ? Math.max(1, parseInt(pageParam) || 1) : 1;

	const limit = 15; // Display 15 audit logs per page

	try {
		// Fetch logs and users in parallel
		const [{ logs, totalCount }, { users }] = await Promise.all([
			auditService.getLogs({
				search,
				userId,
				action,
				startDate,
				endDate,
				page,
				limit
			}),
			userRepository.findAll({ limit: 1000 })
		]);

		return {
			user: sessionUser,
			logs,
			totalCount,
			usersList: users.map((u) => ({ id: u.id, username: u.username, fullName: u.full_name })),
			search,
			userId,
			action,
			startDate,
			endDate,
			page,
			limit
		};
	} catch (err: unknown) {
		console.error('Error loading audit logs page:', err);
		const message = err instanceof Error ? err.message : String(err);
		return {
			user: sessionUser,
			logs: [],
			totalCount: 0,
			usersList: [],
			search,
			userId,
			action,
			startDate,
			endDate,
			page,
			limit,
			error: message
		};
	}
};
