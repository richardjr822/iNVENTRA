import { auditRepository } from '$lib/repositories/audit.repository';
import type { AuditLog, AuditLogWithUser } from '$lib/types/audit-log';

export class AuditService {
	async log(options: {
		userId: string | null;
		action: string;
		entity: string;
		entityId: string | null;
		oldData?: any;
		newData?: any;
	}): Promise<AuditLog | null> {
		try {
			return await auditRepository.create({
				user_id: options.userId,
				action: options.action,
				entity: options.entity,
				entity_id: options.entityId,
				old_data: options.oldData,
				new_data: options.newData
			});
		} catch (error) {
			console.error('AuditService error: Failed to record audit log', error);
			// Fail-safe: Audit logging should not crash the main workflow
			return null;
		}
	}

	async getLogs(options?: {
		search?: string;
		userId?: string;
		action?: string;
		startDate?: string;
		endDate?: string;
		page?: number;
		limit?: number;
	}): Promise<{ logs: AuditLogWithUser[]; totalCount: number }> {
		try {
			return await auditRepository.findAll(options);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to load audit logs: ${msg}`, { cause: error });
		}
	}
}

export const auditService = new AuditService();
