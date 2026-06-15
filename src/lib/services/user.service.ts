import bcrypt from 'bcryptjs';
import { userRepository } from '$lib/repositories/user.repository';
import { auditService } from '$lib/services/audit.service';
import { createUserSchema, updateUserSchema } from '$lib/validations/user.schema';
import type { User, UserRole } from '$lib/types/user';

export class UserService {
	async getUsers(options?: {
		search?: string;
		role?: string;
		status?: string;
		sortBy?: 'username' | 'full_name' | 'created_at';
		sortOrder?: 'asc' | 'desc';
		page?: number;
		limit?: number;
	}): Promise<{ users: User[]; totalCount: number }> {
		try {
			return await userRepository.findAll(options);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to load users: ${msg}`, { cause: error });
		}
	}

	async getUserById(id: string): Promise<User> {
		if (!id) throw new Error('User ID is required');

		try {
			const user = await userRepository.findById(id);
			if (!user) {
				throw new Error('USER_NOT_FOUND');
			}
			return user;
		} catch (error) {
			if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
				throw error;
			}
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to retrieve user: ${msg}`, { cause: error });
		}
	}

	async createUser(
		data: any,
		adminUserId: string | null
	): Promise<User> {
		const validationResult = createUserSchema.safeParse(data);
		if (!validationResult.success) {
			throw new Error(`VALIDATION_FAILED: ${validationResult.error.issues[0].message}`);
		}

		const validatedData = validationResult.data;

		// Check unique username
		const existingUser = await userRepository.findByUsername(validatedData.username);
		if (existingUser) {
			throw new Error('DUPLICATE_USERNAME');
		}

		try {
			// Hash password using bcryptjs
			const salt = await bcrypt.genSalt(10);
			const passwordHash = await bcrypt.hash(validatedData.password, salt);

			const newUser = await userRepository.create({
				username: validatedData.username,
				passwordHash,
				fullName: validatedData.full_name,
				role: validatedData.role,
				isActive: validatedData.is_active
			});

			// Create Audit Log
			// Never store passwords in the audit logs
			const auditNewData = {
				id: newUser.id,
				username: newUser.username,
				full_name: newUser.full_name,
				role: newUser.role,
				is_active: newUser.is_active,
				created_at: newUser.created_at
			};

			await auditService.log({
				userId: adminUserId,
				action: 'Create User',
				entity: 'users',
				entityId: newUser.id,
				oldData: null,
				newData: auditNewData
			});

			return newUser;
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			if (msg === 'DUPLICATE_USERNAME') {
				throw error;
			}
			throw new Error(`Failed to create user: ${msg}`, { cause: error });
		}
	}

	async updateUser(
		id: string,
		data: any,
		adminUserId: string | null
	): Promise<User> {
		const validationResult = updateUserSchema.safeParse(data);
		if (!validationResult.success) {
			throw new Error(`VALIDATION_FAILED: ${validationResult.error.issues[0].message}`);
		}

		const validatedData = validationResult.data;

		// Verify user exists
		const existingUser = await userRepository.findById(id);
		if (!existingUser) {
			throw new Error('USER_NOT_FOUND');
		}

		// Security check: Prevent self-deactivation
		if (id === adminUserId && !validatedData.is_active) {
			throw new Error('CANNOT_DEACTIVATE_SELF');
		}

		try {
			const updatedUser = await userRepository.update(id, {
				fullName: validatedData.full_name,
				role: validatedData.role,
				isActive: validatedData.is_active
			});

			// Snapshots for Audit Log (excluding password_hash)
			const oldSnapshot = {
				id: existingUser.id,
				username: existingUser.username,
				full_name: existingUser.full_name,
				role: existingUser.role,
				is_active: existingUser.is_active
			};

			const newSnapshot = {
				id: updatedUser.id,
				username: updatedUser.username,
				full_name: updatedUser.full_name,
				role: updatedUser.role,
				is_active: updatedUser.is_active
			};

			// Determine audit actions: Update User, Activate User, Deactivate User
			let action = 'Update User';
			if (existingUser.is_active !== updatedUser.is_active) {
				action = updatedUser.is_active ? 'Activate User' : 'Deactivate User';
			}

			await auditService.log({
				userId: adminUserId,
				action,
				entity: 'users',
				entityId: updatedUser.id,
				oldData: oldSnapshot,
				newData: newSnapshot
			});

			return updatedUser;
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			if (msg === 'CANNOT_DEACTIVATE_SELF') {
				throw error;
			}
			throw new Error(`Failed to update user: ${msg}`, { cause: error });
		}
	}

	async resetPassword(
		id: string,
		passwordData: { password: any; confirmPassword: any },
		adminUserId: string | null
	): Promise<void> {
		// Verify user exists
		const existingUser = await userRepository.findById(id);
		if (!existingUser) {
			throw new Error('USER_NOT_FOUND');
		}

		try {
			// Hash new password using bcryptjs
			const salt = await bcrypt.genSalt(10);
			const passwordHash = await bcrypt.hash(passwordData.password, salt);

			await userRepository.updatePassword(id, passwordHash);

			// Log action
			await auditService.log({
				userId: adminUserId,
				action: 'Reset Password',
				entity: 'users',
				entityId: id,
				oldData: null,
				newData: {
					id: existingUser.id,
					username: existingUser.username,
					message: 'Password reset completed by admin'
				}
			});
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to reset password: ${msg}`, { cause: error });
		}
	}
}

export const userService = new UserService();
