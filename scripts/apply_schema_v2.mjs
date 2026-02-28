// Ejecutar SQL v2 usando @supabase/supabase-js con service_role
// Supabase permite DDL via RPC con service_role key en proyectos con extensión pg_net/rpc

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const SUPABASE_URL = 'https://dbupkgyygugcqumpdonn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidXBrZ3l5Z3VnY3F1bXBkb25uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIxODQ1MCwiZXhwIjoyMDg3Nzk0NDUwfQ.h8Hd_dPpCcaYDUYBzePYpD4q7p2Rflwiep4qwQZCJUY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

// Execute individual statements by using supabase.from().select() with raw SQL
// via the rpc endpoint — but we need a custom function for that.
// 
// Better: use the PostgREST /rpc/ endpoint with a pre-existing Supabase function.
// Supabase has a built-in exec_sql function in versions that support it.
// 
// Alternative: use fetch directly with the Supabase REST endpoint

const statements = [
    // ENUM
    `DO $body$ BEGIN
    CREATE TYPE course_role AS ENUM ('Titular', 'Suplente', 'Coordinador');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $body$`,

    // courses table
    `CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

    // course_teachers table
    `CREATE TABLE IF NOT EXISTS course_teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    role course_role NOT NULL DEFAULT 'Titular',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

    // unique constraint
    `DO $body$ BEGIN
    ALTER TABLE course_teachers ADD CONSTRAINT ct_unique_course_teacher_role UNIQUE (course_id, teacher_id, role);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $body$`,

    // alter students
    `ALTER TABLE students ADD COLUMN IF NOT EXISTS responsible_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL`,

    // substitutions table
    `CREATE TABLE IF NOT EXISTS substitutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    original_teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    substitute_teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    reason TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

    `ALTER TABLE courses ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE course_teachers ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE substitutions ENABLE ROW LEVEL SECURITY`,

    `DO $body$ BEGIN CREATE POLICY "Anyone authenticated can read courses" ON courses FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $body$`,
    `DO $body$ BEGIN CREATE POLICY "Admins can manage courses" ON courses FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $body$`,
    `DO $body$ BEGIN CREATE POLICY "Anyone authenticated can read course_teachers" ON course_teachers FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $body$`,
    `DO $body$ BEGIN CREATE POLICY "Admins can manage course_teachers" ON course_teachers FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $body$`,
    `DO $body$ BEGIN CREATE POLICY "Anyone authenticated can read substitutions" ON substitutions FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $body$`,
    `DO $body$ BEGIN CREATE POLICY "Admins can manage substitutions" ON substitutions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $body$`,

    `DO $body$ BEGIN CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); EXCEPTION WHEN duplicate_object THEN NULL; END $body$`,
    `DO $body$ BEGIN CREATE TRIGGER update_course_teachers_updated_at BEFORE UPDATE ON course_teachers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); EXCEPTION WHEN duplicate_object THEN NULL; END $body$`,
    `DO $body$ BEGIN CREATE TRIGGER update_substitutions_updated_at BEFORE UPDATE ON substitutions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); EXCEPTION WHEN duplicate_object THEN NULL; END $body$`,
];

async function execSQL(sql) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ sql_query: sql }),
    });
    return { status: res.status, body: await res.text() };
}

async function main() {
    console.log(`Ejecutando ${statements.length} sentencias SQL en Supabase via RPC...\n`);

    let ok = 0, errors = 0;
    for (let i = 0; i < statements.length; i++) {
        const preview = statements[i].trim().replace(/\s+/g, ' ').slice(0, 55);
        process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);

        const res = await execSQL(statements[i]);
        if (res.status >= 200 && res.status < 300) {
            console.log('✓');
            ok++;
        } else {
            // Parse error message
            let msg = res.body;
            try { msg = JSON.parse(res.body)?.message || msg; } catch { }
            if (msg.includes('already exists') || msg.includes('duplicate')) {
                console.log('✓ (ya existe)');
                ok++;
            } else {
                console.log(`✗ ${res.status}: ${msg.slice(0, 100)}`);
                errors++;
            }
        }
    }

    console.log(`\n===========================`);
    console.log(`✅ Exitosas: ${ok}`);
    if (errors > 0) console.log(`❌ Errores:   ${errors}`);
    console.log(`===========================`);
}

main().catch(console.error);
