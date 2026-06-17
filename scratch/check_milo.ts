import postgres from 'postgres';

const sql = postgres('postgresql://postgres.ykyqsaoidopacrflimrm:KbfnNZM6vjeoSLRI@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres');

async function main() {
	try {
		const product = await sql`
			SELECT * FROM products WHERE name ILIKE '%Milo%';
		`;
		console.log('Product Milo:', product);

		if (product.length > 0) {
			const productId = product[0].id;
			const inventory = await sql`
				SELECT * FROM inventory WHERE product_id = ${productId};
			`;
			console.log('Inventory for Milo:', inventory);

			const transactions = await sql`
				SELECT * FROM inventory_transactions WHERE product_id = ${productId};
			`;
			console.log('Transactions for Milo:', transactions);
		}
		process.exit(0);
	} catch (e) {
		console.error('Error:', e);
		process.exit(1);
	}
}

main();
