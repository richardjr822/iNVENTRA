export interface Category {
	id: string;
	name: string;
	description: string | null;
	created_at: string;
}

export interface CreateCategoryInput {
	name: string;
	description?: string;
}

export interface UpdateCategoryInput {
	id: string;
	name: string;
	description?: string;
}
