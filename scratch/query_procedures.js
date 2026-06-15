import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL env var not found');
	process.exit(1);
}

const sql = postgres(databaseUrl);

async function main() {
	const routines = await sql`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public';
  `;
	console.log(
		'Routines:',
		routines.map((r) => r.routine_name)
	);
	await sql.end();
}

main().catch(console.error);
