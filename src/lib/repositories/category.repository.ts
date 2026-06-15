import { supabase } from '$lib/server/supabase';
import type { Category } from '$lib/types/category';

export class CategoryRepository {
	async findAll(options?: {
		search?: string;
		sortBy?: 'name' | 'created_at';
		sortOrder?: 'asc' | 'desc';
		page?: number;
		limit?: number;
	}): Promise<{ categories: Category[]; totalCount: number }> {
		const search = options?.search?.trim() || '';
		const sortBy = options?.sortBy || 'name';
		const sortOrder = options?.sortOrder || 'asc';
		const page = options?.page || 1;
		const limit = options?.limit || 10;
		const from = (page - 1) * limit;
		const to = from + limit - 1;

		let query = supabase.from('categories').select('*', { count: 'exact' });

		if (search) {
			query = query.ilike('name', `%${search}%`);
		}

		query = query.order(sortBy, { ascending: sortOrder === 'asc' });

		// Apply pagination
		query = query.range(from, to);

		const { data, error, count } = await query;

		if (error) {
			console.error('Supabase error in CategoryRepository.findAll:', error);
			throw new Error(`Database query failed: ${error.message}`);
		}

		return {
			categories: (data as Category[]) || [],
			totalCount: count || 0
		};
	}

	async findById(id: string): Promise<Category | null> {
		const { data, error } = await supabase
			.from('categories')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error) {
			console.error('Supabase error in CategoryRepository.findById:', error);
			throw new Error(`Database query failed: ${error.message}`);
		}

		return data as Category | null;
	}

	async findByName(name: string): Promise<Category | null> {
		const { data, error } = await supabase
			.from('categories')
			.select('*')
			.eq('name', name.trim())
			.maybeSingle();

		if (error) {
			console.error('Supabase error in CategoryRepository.findByName:', error);
			throw new Error(`Database query failed: ${error.message}`);
		}

		return data as Category | null;
	}

	async create(name: string, description?: string | null): Promise<Category> {
		const { data, error } = await supabase
			.from('categories')
			.insert({
				name: name.trim(),
				description: description?.trim() || null
			})
			.select()
			.single();

		if (error) {
			console.error('Supabase error in CategoryRepository.create:', error);
			if (error.code === '23505') {
				throw new Error('DUPLICATE_NAME');
			}
			throw new Error(`Database operation failed: ${error.message}`);
		}

		return data as Category;
	}

	async update(id: string, name: string, description?: string | null): Promise<Category> {
		const { data, error } = await supabase
			.from('categories')
			.update({
				name: name.trim(),
				description: description?.trim() || null
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Supabase error in CategoryRepository.update:', error);
			if (error.code === '23505') {
				throw new Error('DUPLICATE_NAME');
			}
			throw new Error(`Database operation failed: ${error.message}`);
		}

		return data as Category;
	}

	async delete(id: string): Promise<void> {
		const { error } = await supabase.from('categories').delete().eq('id', id);

		if (error) {
			console.error('Supabase error in CategoryRepository.delete:', error);
			throw new Error(`Database operation failed: ${error.message}`);
		}
	}
}

export const categoryRepository = new CategoryRepository();
