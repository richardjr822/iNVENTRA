import { supabase } from '$lib/server/supabase';
import type { AuditLog, AuditLogWithUser } from '$lib/types/audit-log';

export class AuditRepository {
	async create(data: {
		user_id: string | null;
		action: string;
		entity: string;
		entity_id: string | null;
		old_data?: any;
		new_data?: any;
	}): Promise<AuditLog> {
		const { data: inserted, error } = await supabase
			.from('audit_logs')
			.insert({
				user_id: data.user_id,
				action: data.action,
				entity: data.entity,
				entity_id: data.entity_id,
				old_data: data.old_data || null,
				new_data: data.new_data || null,
				created_at: new Date().toISOString()
			})
			.select()
			.single();

		if (error) {
			console.error('Supabase error in AuditRepository.create:', error);
			throw new Error(`Failed to create audit log: ${error.message}`);
		}

		return inserted as AuditLog;
	}

	async findAll(options?: {
		search?: string;
		userId?: string;
		action?: string;
		startDate?: string;
		endDate?: string;
		page?: number;
		limit?: number;
	}): Promise<{ logs: AuditLogWithUser[]; totalCount: number }> {
		const search = options?.search?.trim() || '';
		const userId = options?.userId;
		const action = options?.action;
		const startDate = options?.startDate;
		const endDate = options?.endDate;
		const page = options?.page || 1;
		const limit = options?.limit || 10;
		const from = (page - 1) * limit;
		const to = from + limit - 1;

		let query = supabase.from('audit_logs').select(
			`
				*,
				users (
					username,
					full_name
				)
			`,
			{ count: 'exact' }
		);

		// Apply search (filters action or entity)
		if (search) {
			query = query.or(`action.ilike.%${search}%,entity.ilike.%${search}%`);
		}

		// Apply user filter
		if (userId && userId !== 'all') {
			query = query.eq('user_id', userId);
		}

		// Apply action filter
		if (action && action !== 'all') {
			query = query.eq('action', action);
		}

		// Apply date filters
		if (startDate) {
			query = query.gte('created_at', startDate);
		}
		if (endDate) {
			// Include the whole end day
			const endDateTime = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`;
			query = query.lte('created_at', endDateTime);
		}

		// Default sort by created_at desc
		query = query.order('created_at', { ascending: false });

		// Pagination
		query = query.range(from, to);

		const { data, error, count } = await query;

		if (error) {
			console.error('Supabase error in AuditRepository.findAll:', error);
			throw new Error(`Database query failed: ${error.message}`);
		}

		return {
			logs: (data as AuditLogWithUser[]) || [],
			totalCount: count || 0
		};
	}
}

export const auditRepository = new AuditRepository();
