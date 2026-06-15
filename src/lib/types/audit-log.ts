export interface AuditLog {
	id: string;
	user_id: string | null;
	action: string;
	entity: string;
	entity_id: string | null;
	old_data: any | null;
	new_data: any | null;
	created_at: string;
}

export interface AuditLogWithUser extends AuditLog {
	users: {
		username: string;
		full_name: string;
	} | null;
}
