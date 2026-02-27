import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const run = async () => {
    const connectionStrings = [
        'postgresql://postgres:mXpsXoBcORYPyuHe@db.dbupkgyygugcqumpdonn.supabase.co:5432/postgres',
        'postgresql://postgres:[mXpsXoBcORYPyuHe]@db.dbupkgyygugcqumpdonn.supabase.co:5432/postgres'
    ];

    const sql = `
-- Drop recursing policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Create Security Definer function to check admin status bypassing RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies safely
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (public.is_admin());
  `;

    for (const connString of connectionStrings) {
        const client = new Client({
            connectionString: connString,
            ssl: { rejectUnauthorized: false }
        });

        try {
            await client.connect();
            console.log('Connected! Fixing policies...');
            await client.query(sql);
            console.log('Policies updated successfully to prevent infinite recursion.');
            await client.end();
            return;
        } catch (err) {
            console.log('Connection failed with error:', err.message);
        }
    }
}

run();
