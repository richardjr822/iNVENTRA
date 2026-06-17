import postgres from 'postgres';

const sql = postgres('postgresql://postgres.ykyqsaoidopacrflimrm:KbfnNZM6vjeoSLRI@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres');

async function main() {
	try {
		const users = await sql`
			SELECT id, username, full_name, role, is_active 
			FROM users;
		`;
		console.log('Users found in database:', users);
		process.exit(0);
	} catch (e) {
		console.error('Error querying users:', e);
		process.exit(1);
	}
}

main();
