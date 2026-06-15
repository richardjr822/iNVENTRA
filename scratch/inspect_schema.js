import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL env var not found');
	process.exit(1);
}

const sql = postgres(databaseUrl);

async function main() {
	console.log('Fetching table list...');
	const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
	console.log(
		'Tables:',
		tables.map((t) => t.table_name)
	);

	for (const table of tables) {
		const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table.table_name}
      ORDER BY ordinal_position;
    `;
		console.log(`\nTable: ${table.table_name}`);
		columns.forEach((col) => {
			console.log(` - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
		});
	}

	await sql.end();
}

main().catch(console.error);
