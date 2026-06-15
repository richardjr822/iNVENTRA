import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { productImageService } from '$lib/storage/product-image.service';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Authentication Guard
	const sessionUser = locals.user;
	if (!sessionUser) {
		return json(
			{ error: 'UNAUTHORIZED', message: 'You must be logged in to upload images.' },
			{ status: 401 }
		);
	}

	// Authorization Guard: Viewers cannot create or edit products (and thus cannot upload images)
	if (sessionUser.role === 'viewer') {
		return json(
			{ error: 'FORBIDDEN', message: 'Viewer accounts cannot perform image uploads.' },
			{ status: 403 }
		);
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const productId = formData.get('productId') as string | null;

		if (!file) {
			return json(
				{ error: 'MISSING_FILE', message: 'No image file was provided.' },
				{ status: 400 }
			);
		}

		if (!productId) {
			return json(
				{ error: 'MISSING_PRODUCT_ID', message: 'Product ID is required.' },
				{ status: 400 }
			);
		}

		// Perform upload via storage service
		const imageUrl = await productImageService.uploadImage(productId, file);

		return json({ imageUrl });
	} catch (err: unknown) {
		console.error('Error in API upload handler:', err);
		const msg = err instanceof Error ? err.message : String(err);

		if (msg === 'INVALID_FILE_TYPE') {
			return json(
				{
					error: 'INVALID_FILE_TYPE',
					message: 'Allowed file formats are JPG, JPEG, PNG, or WEBP.'
				},
				{ status: 400 }
			);
		}

		if (msg === 'FILE_TOO_LARGE') {
			return json(
				{
					error: 'FILE_TOO_LARGE',
					message: 'File size exceeds the maximum limit of 5 MB.'
				},
				{ status: 400 }
			);
		}

		return json(
			{
				error: 'UPLOAD_FAILED',
				message: msg || 'An unexpected error occurred during file upload.'
			},
			{ status: 500 }
		);
	}
};
