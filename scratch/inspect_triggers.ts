import postgres from 'postgres';

const sql = postgres('postgresql://postgres.ykyqsaoidopacrflimrm:KbfnNZM6vjeoSLRI@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres');

async function main() {
	try {
		const triggers = await sql`
			SELECT 
				trigger_name, 
				event_manipulation, 
				event_object_table, 
				action_statement, 
				action_timing
			FROM information_schema.triggers;
		`;
		console.log('Triggers found in database:', triggers);
		process.exit(0);
	} catch (e) {
		console.error('Error:', e);
		process.exit(1);
	}
}

main();
