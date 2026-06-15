import { supabase } from '$lib/server/supabase';

const BUCKET_NAME = 'product-images';
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class ProductImageService {
	/**
	 * Uploads or replaces a product image in Supabase Storage.
	 * Returns the public URL of the uploaded image.
	 */
	async uploadImage(productId: string, file: File): Promise<string> {
		// Validate file type
		if (!ALLOWED_TYPES.includes(file.type)) {
			throw new Error('INVALID_FILE_TYPE');
		}

		// Validate file size
		if (file.size > MAX_SIZE_BYTES) {
			throw new Error('FILE_TOO_LARGE');
		}

		const filePath = `products/${productId}.jpg`;

		// Upload file to Supabase storage
		const { error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, {
			contentType: file.type,
			upsert: true
		});

		if (error) {
			console.error('Supabase storage upload error:', error);
			throw new Error(`Upload failed: ${error.message}`);
		}

		return this.getPublicUrl(productId);
	}

	/**
	 * Deletes a product image from Supabase Storage.
	 */
	async deleteImage(productId: string): Promise<void> {
		const filePath = `products/${productId}.jpg`;

		const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

		if (error) {
			console.error('Supabase storage delete error:', error);
			throw new Error(`Delete image failed: ${error.message}`);
		}
	}

	/**
	 * Returns the public URL for a product image.
	 */
	getPublicUrl(productId: string): string {
		const filePath = `products/${productId}.jpg`;
		const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

		return data.publicUrl;
	}
}

export const productImageService = new ProductImageService();
