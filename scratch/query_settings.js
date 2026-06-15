import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL env var not found');
	process.exit(1);
}

const sql = postgres(databaseUrl);

async function main() {
	const settings = await sql`SELECT * FROM settings;`;
	console.log('Settings:', settings);
	await sql.end();
}

main().catch(console.error);
