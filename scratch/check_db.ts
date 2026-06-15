import postgres from 'postgres';

const sql = postgres('postgresql://postgres.ykyqsaoidopacrflimrm:KbfnNZM6vjeoSLRI@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres');

async function main() {
	try {
		const tables = await sql`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_schema = 'public'
			ORDER BY table_name;
		`;
		console.log('Tables found in database:', tables.map(t => t.table_name));
		process.exit(0);
	} catch (e) {
		console.error('Error querying tables:', e);
		process.exit(1);
	}
}

main();
