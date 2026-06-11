import bcrypt from 'bcryptjs';
import { supabase } from './supabase';
import type { User } from '$lib/types';

/**
 * Fetches an active user from the database by username.
 * If the user does not exist, is not active, or a database error occurs, returns null.
 */
export async function getUserByUsername(username: string): Promise<User | null> {
	try {
		const { data, error } = await supabase
			.from('users')
			.select('*')
			.eq('username', username)
			.single();

		if (error || !data) {
			// Fail silently or log error for debugging
			if (error && error.code !== 'PGRST116') {
				console.error('Supabase error finding user:', error);
			}
			return null;
		}

		return data as User;
	} catch (err) {
		console.error('Database query exception in getUserByUsername:', err);
		return null;
	}
}

/**
 * Compares a raw password string against a bcrypt password hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	try {
		return await bcrypt.compare(password, hash);
	} catch (err) {
		console.error('Bcrypt comparison failed:', err);
		return false;
	}
}
