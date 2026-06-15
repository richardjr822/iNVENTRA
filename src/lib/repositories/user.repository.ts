import { supabase } from '$lib/server/supabase';
import type { User, UserRole } from '$lib/types/user';

export class UserRepository {
	async findAll(options?: {
		search?: string;
		role?: string;
		status?: string;
		sortBy?: 'username' | 'full_name' | 'created_at';
		sortOrder?: 'asc' | 'desc';
		page?: number;
		limit?: number;
	}): Promise<{ users: User[]; totalCount: number }> {
		const search = options?.search?.trim() || '';
		const role = options?.role;
		const status = options?.status;
		const sortBy = options?.sortBy || 'username';
		const sortOrder = options?.sortOrder || 'asc';
		const page = options?.page || 1;
		const limit = options?.limit || 10;
		const from = (page - 1) * limit;
		const to = from + limit - 1;

		let query = supabase.from('users').select('*', { count: 'exact' });

		if (search) {
			query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);
		}

		if (role && role !== 'all') {
			query = query.eq('role', role);
		}

		if (status && status !== 'all') {
			const isActiveBool = status === 'active';
			query = query.eq('is_active', isActiveBool);
		}

		query = query.order(sortBy, { ascending: sortOrder === 'asc' });

		// Apply pagination
		query = query.range(from, to);

		const { data, error, count } = await query;

		if (error) {
			console.error('Supabase error in UserRepository.findAll:', error);
			throw new Error(`Database query failed: ${error.message}`);
		}

		return {
			users: (data as User[]) || [],
			totalCount: count || 0
		};
	}

	async findById(id: string): Promise<User | null> {
		const { data, error } = await supabase
			.from('users')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error) {
			console.error('Supabase error in UserRepository.findById:', error);
			throw new Error(`Database query failed: ${error.message}`);
		}

		return data as User | null;
	}

	async findByUsername(username: string): Promise<User | null> {
		const { data, error } = await supabase
			.from('users')
			.select('*')
			.eq('username', username.trim())
			.maybeSingle();

		if (error) {
			console.error('Supabase error in UserRepository.findByUsername:', error);
			throw new Error(`Database query failed: ${error.message}`);
		}

		return data as User | null;
	}

	async create(userData: {
		username: string;
		passwordHash: string;
		fullName: string;
		role: UserRole;
		isActive: boolean;
	}): Promise<User> {
		const { data, error } = await supabase
			.from('users')
			.insert({
				username: userData.username.trim(),
				password_hash: userData.passwordHash,
				full_name: userData.fullName.trim(),
				role: userData.role,
				is_active: userData.isActive,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.select()
			.single();

		if (error) {
			console.error('Supabase error in UserRepository.create:', error);
			if (error.code === '23505') {
				throw new Error('DUPLICATE_USERNAME');
			}
			throw new Error(`Database operation failed: ${error.message}`);
		}

		return data as User;
	}

	async update(
		id: string,
		userData: {
			fullName: string;
			role: UserRole;
			isActive: boolean;
		}
	): Promise<User> {
		const { data, error } = await supabase
			.from('users')
			.update({
				full_name: userData.fullName.trim(),
				role: userData.role,
				is_active: userData.isActive,
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Supabase error in UserRepository.update:', error);
			throw new Error(`Database operation failed: ${error.message}`);
		}

		return data as User;
	}

	async updatePassword(id: string, passwordHash: string): Promise<void> {
		const { error } = await supabase
			.from('users')
			.update({
				password_hash: passwordHash,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			console.error('Supabase error in UserRepository.updatePassword:', error);
			throw new Error(`Database operation failed: ${error.message}`);
		}
	}
}

export const userRepository = new UserRepository();
