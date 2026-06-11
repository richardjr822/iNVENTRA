import crypto from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import type { SessionUser } from '$lib/types';
import { env } from '$env/dynamic/private';

// Dynamically read the SESSION_SECRET or fallback to a default for development
const SECRET = env.SESSION_SECRET || 'a_very_long_and_secure_default_secret_for_inventra_dev_123!';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

const COOKIE_NAME = 'inventra_session';

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(data: string): string {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
	let encrypted = cipher.update(data, 'utf8', 'hex');
	encrypted += cipher.final('hex');
	const tag = cipher.getAuthTag();
	
	// Format: iv:ciphertext:tag
	return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(encryptedData: string): string | null {
	try {
		const parts = encryptedData.split(':');
		if (parts.length !== 3) return null;
		
		const iv = Buffer.from(parts[0], 'hex');
		const encrypted = parts[1];
		const tag = Buffer.from(parts[2], 'hex');
		
		const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
		decipher.setAuthTag(tag);
		
		let decrypted = decipher.update(encrypted, 'hex', 'utf8');
		decrypted += decipher.final('utf8');
		return decrypted;
	} catch (err) {
		console.error('Failed to decrypt session cookie:', err);
		return null;
	}
}

/**
 * Sets the secure session cookie with the user's details
 */
export function setSession(cookies: Cookies, user: SessionUser): void {
	const sessionData = JSON.stringify(user);
	const encrypted = encrypt(sessionData);
	
	// Create secure HTTP-only cookie
	cookies.set(COOKIE_NAME, encrypted, {
		httpOnly: true,
		secure: true, // secure on all secure contexts (including localhost)
		sameSite: 'lax',
		path: '/',
		maxAge: 60 * 60 * 24 // 24 hours
	});
}

/**
 * Retrieves and validates the user session from the cookies
 */
export function getSession(cookies: Cookies): SessionUser | null {
	const cookieValue = cookies.get(COOKIE_NAME);
	if (!cookieValue) return null;
	
	const decrypted = decrypt(cookieValue);
	if (!decrypted) return null;
	
	try {
		return JSON.parse(decrypted) as SessionUser;
	} catch {
		return null;
	}
}

/**
 * Clears the session cookie
 */
export function deleteSession(cookies: Cookies): void {
	cookies.delete(COOKIE_NAME, { path: '/' });
}
