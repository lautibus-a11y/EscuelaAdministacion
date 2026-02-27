import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const run = async () => {
    const sql = fs.readFileSync('supabase_schema.sql', 'utf8');

    // Try the password without brackets first as brackets are usually a placeholder formatting in text
    const connectionStrings = [
        'postgresql://postgres:mXpsXoBcORYPyuHe@db.dbupkgyygugcqumpdonn.supabase.co:5432/postgres',
        'postgresql://postgres:[mXpsXoBcORYPyuHe]@db.dbupkgyygugcqumpdonn.supabase.co:5432/postgres'
    ];

    for (const connString of connectionStrings) {
        console.log(`Trying to connect...`);
        const client = new Client({
            connectionString: connString,
            ssl: { rejectUnauthorized: false }
        });

        try {
            await client.connect();
            console.log('Connected! Executing SQL schema...');
            await client.query(sql);
            console.log('SQL Schema executed successfully.');
            await client.end();
            return;
        } catch (err) {
            console.log(`Connection failed with error: ${err.message}`);
            await client.end().catch(() => { }).finally(() => { });
        }
    }

    console.log('Exhausted all password attempts.');
}

run();
