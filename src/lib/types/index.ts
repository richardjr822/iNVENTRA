export type UserRole = 'admin' | 'inventory_manager' | 'viewer';

export interface User {
	id: string;
	username: string;
	password_hash: string;
	full_name: string;
	role: UserRole;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface SessionUser {
	id: string;
	username: string;
	fullName: string;
	role: UserRole;
}
