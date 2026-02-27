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

        // 1. Modify profiles to remove FK to auth.users so we can insert mock users
        await client.query(`
      ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
      INSERT INTO profiles (id, full_name, role) 
      VALUES ('00000000-0000-0000-0000-000000000000', 'Administrador Principal', 'admin') 
      ON CONFLICT (id) DO NOTHING;
    `);
        console.log("Profiles modified and mock user inserted.");

        // 2. Modify positions
        await client.query(`
      ALTER TABLE positions ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE;
      ALTER TABLE positions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Activo';
    `);
        console.log("Positions modified.");

        // 3. Recreate visits
        await client.query(`
      DROP TABLE IF EXISTS visits CASCADE;
      CREATE TABLE visits (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          visit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          purpose TEXT,
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'Programada',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
        console.log("Visits recreated.");

        console.log("All DB alterations applied successfully!");
    } catch (err) {
        console.error("Error altering schema:", err);
    } finally {
        await client.end();
    }
}

run();
