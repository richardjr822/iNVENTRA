import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { productService } from '$lib/services/product.service';
import { categoryService } from '$lib/services/category.service';
import { categoryRepository } from '$lib/repositories/category.repository';
import { productRepository } from '$lib/repositories/product.repository';

export const load: PageServerLoad = async ({ parent, url }) => {
	const parentData = await parent();
	const user = parentData.user;

	// Viewers, inventory_managers, and admins can view the catalog list
	const search = url.searchParams.get('q') || '';
	const categoryId = url.searchParams.get('categoryId') || 'all';
	const status = url.searchParams.get('status') || 'all';
	const pageParam = url.searchParams.get('page');
	const page = pageParam ? Math.max(1, parseInt(pageParam) || 1) : 1;

	const sortByParam = url.searchParams.get('sortBy');
	const validSortFields = ['name', 'sku', 'price', 'created_at'];
	const sortBy = validSortFields.includes(sortByParam || '')
		? (sortByParam as 'name' | 'sku' | 'price' | 'created_at')
		: 'name';

	const sortOrderParam = url.searchParams.get('sortOrder');
	const sortOrder = sortOrderParam === 'desc' ? 'desc' : 'asc';

	const limit = 10;

	try {
		// Load products
		const { products, totalCount } = await productService.getProducts({
			search,
			categoryId,
			status,
			sortBy,
			sortOrder,
			page,
			limit
		});

		// Load category list for filtering dropdown
		const { categories } = await categoryService.getCategories({
			limit: 100,
			sortBy: 'name',
			sortOrder: 'asc'
		});

		return {
			user,
			products,
			categories,
			totalCount,
			search,
			categoryId,
			status,
			page,
			limit,
			sortBy,
			sortOrder
		};
	} catch (err: unknown) {
		console.error('Error loading products list page:', err);
		const message = err instanceof Error ? err.message : String(err);
		return {
			user,
			products: [],
			categories: [],
			totalCount: 0,
			search,
			categoryId,
			status,
			page,
			limit,
			sortBy,
			sortOrder,
			error: message
		};
	}
};

export const actions: Actions = {
	archiveProduct: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (
			!sessionUser ||
			(sessionUser.role !== 'admin' && sessionUser.role !== 'inventory_manager')
		) {
			return fail(403, {
				error: 'Access Denied: You do not have permissions to perform this action.'
			});
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Product ID is required.' });
		}

		try {
			await productService.archiveProduct(id, sessionUser.id);
			return { success: true };
		} catch (err: unknown) {
			console.error('Error archiving product in action:', err);
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { error: message || 'Failed to archive product.' });
		}
	},

	deleteProduct: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (
			!sessionUser ||
			(sessionUser.role !== 'admin' && sessionUser.role !== 'inventory_manager')
		) {
			return fail(403, {
				error: 'Access Denied: You do not have permissions to perform this action.'
			});
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Product ID is required.' });
		}

		try {
			await productService.deleteProduct(id, sessionUser.id);
			return { success: true };
		} catch (err: unknown) {
			console.error('Error deleting product in action:', err);
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { error: message || 'Failed to delete product.' });
		}
	},

	// Simplified product creation for inventory_manager role
	// Only requires name + price; auto-assigns category, SKU, and status
	createSimple: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (!sessionUser || sessionUser.role !== 'inventory_manager') {
			return fail(403, {
				error: 'Access Denied: Only Inventory Managers can use this action.'
			});
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim() || '';
		const priceStr = formData.get('price')?.toString() || '';
		const price = parseFloat(priceStr);

		// Basic validation
		if (!name) {
			return fail(400, { simpleError: 'Product name is required.' });
		}
		if (isNaN(price) || price <= 0) {
			return fail(400, { simpleError: 'A valid selling price is required.' });
		}

		// Resolve (or create) the "Tinda" category
		let tindaCategory = await categoryRepository.findByName('Tinda');
		if (!tindaCategory) {
			// Create Tinda category if it doesn't exist yet
			tindaCategory = await categoryRepository.create('Tinda', 'Default category for retail store products');
		}

		// Auto-generate a unique SKU so the DB unique constraint is satisfied
		const autoSku = `TINDA-${Date.now()}`;

		// Ensure SKU is truly unique (extremely unlikely collision but defensive)
		const existing = await productRepository.findBySku(autoSku);
		if (existing) {
			return fail(500, { simpleError: 'Failed to generate unique SKU. Please try again.' });
		}

		try {
			await productService.createProduct(
				{
					sku: autoSku,
					name,
					price,
					category_id: tindaCategory.id,
					status: 'active',
					barcode: null,
					description: null,
					image_url: null
				},
				sessionUser.id,
				10
			);
			return { simpleSuccess: true };
		} catch (err: unknown) {
			console.error('Error in createSimple product action:', err);
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { simpleError: message || 'Failed to create product. Please try again.' });
		}
	},

	createBulk: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (!sessionUser || sessionUser.role !== 'inventory_manager') {
			return fail(403, {
				bulkError: 'Access Denied: Only Inventory Managers can perform this action.'
			});
		}

		const formData = await request.formData();
		const productsJson = formData.get('productsJson')?.toString() || '';
		
		let items: { name: string; price: string }[] = [];
		try {
			items = JSON.parse(productsJson);
		} catch (e) {
			return fail(400, { bulkError: 'Invalid product data format.' });
		}

		// Filter out any completely blank rows
		const validItems = items.filter(item => item.name && item.name.trim() !== '');

		if (validItems.length === 0) {
			return fail(400, { bulkError: 'Please provide at least one product name.' });
		}

		// Validate each item
		for (const item of validItems) {
			const price = parseFloat(item.price);
			if (!item.name.trim()) {
				return fail(400, { bulkError: 'All products must have a name.' });
			}
			if (isNaN(price) || price <= 0) {
				return fail(400, { bulkError: `Product "${item.name}" must have a valid selling price greater than 0.` });
			}
		}

		// Resolve (or create) the "Tinda" category
		let tindaCategory = await categoryRepository.findByName('Tinda');
		if (!tindaCategory) {
			tindaCategory = await categoryRepository.create('Tinda', 'Default category for retail store products');
		}

		// Create products
		try {
			for (let i = 0; i < validItems.length; i++) {
				const item = validItems[i];
				const price = parseFloat(item.price);
				const autoSku = `TINDA-${Date.now()}-${i}`; // Append index to avoid SKU collision

				await productService.createProduct(
					{
						sku: autoSku,
						name: item.name.trim(),
						price,
						category_id: tindaCategory.id,
						status: 'active',
						barcode: null,
						description: null,
						image_url: null
					},
					sessionUser.id,
					10 // Default stock to 10
				);
			}

			return { bulkSuccess: true };
		} catch (err: unknown) {
			console.error('Error in createBulk product action:', err);
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { bulkError: message || 'Failed to create products. Please try again.' });
		}
	},

	updateSimple: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (!sessionUser || sessionUser.role !== 'inventory_manager') {
			return fail(403, {
				editError: 'Access Denied: Only Inventory Managers can perform this action.'
			});
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString() || '';
		const name = formData.get('name')?.toString().trim() || '';
		const priceStr = formData.get('price')?.toString() || '';
		const price = parseFloat(priceStr);

		if (!id) {
			return fail(400, { editError: 'Product ID is required.' });
		}
		if (!name) {
			return fail(400, { editError: 'Product name is required.' });
		}
		if (isNaN(price) || price <= 0) {
			return fail(400, { editError: 'A valid selling price is required.' });
		}

		try {
			// Retrieve existing product details to retain non-simple metadata
			const existingProduct = await productService.getProductById(id);

			let categoryId = existingProduct.category_id;
			if (!categoryId) {
				const tindaCategory = await categoryRepository.findByName('Tinda') || 
					await categoryRepository.create('Tinda', 'Default category for retail store products');
				categoryId = tindaCategory.id;
			}

			await productService.updateProduct(
				id,
				{
					sku: existingProduct.sku,
					name,
					price,
					category_id: categoryId,
					status: existingProduct.status,
					barcode: existingProduct.barcode,
					description: existingProduct.description,
					image_url: existingProduct.image_url
				},
				sessionUser.id
			);

			return { editSuccess: true };
		} catch (err: unknown) {
			console.error('Error in updateSimple product action:', err);
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { editError: message || 'Failed to update product. Please try again.' });
		}
	}
};
