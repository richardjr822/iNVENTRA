import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is missing.');
}

export const sql = postgres(DATABASE_URL, {
	max: 10,
	idle_timeout: 20,
	connect_timeout: 10
});
