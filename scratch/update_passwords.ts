import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres('postgresql://postgres.ykyqsaoidopacrflimrm:KbfnNZM6vjeoSLRI@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres');

async function main() {
	try {
		const adminHash = await bcrypt.hash('admin123', 10);
		const managerHash = await bcrypt.hash('manager123', 10);
		const viewerHash = await bcrypt.hash('viewer123', 10);

		await sql`UPDATE users SET password_hash = ${adminHash} WHERE username = 'admin';`;
		await sql`UPDATE users SET password_hash = ${managerHash} WHERE username = 'manager';`;
		await sql`UPDATE users SET password_hash = ${viewerHash} WHERE username = 'viewer';`;

		console.log('Passwords updated successfully!');
		process.exit(0);
	} catch (e) {
		console.error('Error updating passwords:', e);
		process.exit(1);
	}
}

main();
