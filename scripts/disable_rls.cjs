const { Client } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;

const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        // Disable RLS on all tables
        const tables = ['institutions', 'profiles', 'teachers', 'students', 'positions', 'designations', 'visits'];

        for (const table of tables) {
            await client.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
            console.log(`Disabled RLS on ${table}`);
        }

        console.log("RLS disabled successfully!");
    } catch (err) {
        console.error("Error disabling RLS:", err);
    } finally {
        await client.end();
    }
}

run();
