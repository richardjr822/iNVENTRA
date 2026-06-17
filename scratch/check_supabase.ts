import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse env manually
const envContent = fs.readFileSync(path.resolve('d:/inventra/.env.local'), 'utf-8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
	const trimmed = line.trim();
	if (trimmed && !trimmed.startsWith('#')) {
		const idx = trimmed.indexOf('=');
		if (idx > -1) {
			const k = trimmed.slice(0, idx).trim();
			const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
			env[k] = v;
		}
	}
}

const supabaseUrl = env.SUPABASE_URL || '';
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
	try {
		const { data, error } = await supabase.from('products').select(
			`
				id,
				name,
				inventory (quantity)
				`
		).limit(5);

		if (error) {
			console.error('Supabase error:', error);
		} else {
			console.log('Supabase returned data:', JSON.stringify(data, null, 2));
		}
		process.exit(0);
	} catch (e) {
		console.error('Error:', e);
		process.exit(1);
	}
}

main();
