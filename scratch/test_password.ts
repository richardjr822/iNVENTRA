import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres('postgresql://postgres.ykyqsaoidopacrflimrm:KbfnNZM6vjeoSLRI@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres');

async function main() {
	try {
		const users = await sql`SELECT username, password_hash FROM users;`;
		for (const u of users) {
			const isMatchUsername = await bcrypt.compare(u.username, u.password_hash);
			const isMatchAdmin123 = await bcrypt.compare('admin123', u.password_hash);
			const isMatchPassword = await bcrypt.compare('password', u.password_hash);
			console.log(`User: ${u.username}`);
			console.log(`  matches username? ${isMatchUsername}`);
			console.log(`  matches 'admin123'? ${isMatchAdmin123}`);
			console.log(`  matches 'password'? ${isMatchPassword}`);
		}
		process.exit(0);
	} catch (e) {
		console.error('Error:', e);
		process.exit(1);
	}
}

main();
