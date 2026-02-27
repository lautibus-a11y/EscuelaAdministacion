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
        console.log("Connected to database. Starting seed...");

        // 1. Clear existing data (optional, but good for a clean demo)
        // We do it in reverse order of dependencies
        await client.query('DELETE FROM visits');
        await client.query('DELETE FROM designations');
        await client.query('DELETE FROM positions');
        await client.query('DELETE FROM students');
        await client.query('DELETE FROM teachers');
        // Keep internal admin profile
        await client.query("DELETE FROM profiles WHERE id != '00000000-0000-0000-0000-000000000000'");
        await client.query('DELETE FROM institutions');

        console.log("Existing data cleared.");

        // 2. Insert Institutions
        const institutions = [
            ['Escuela Primaria N°1 "Sarmiento"', 'EPR001', 'Av. Rivadavia 1234, CABA', '011-4567-8901', 'primaria1@escuela.com'],
            ['Colegio Nacional "Manuel Belgrano"', 'CNB010', 'Calle Florida 567, CABA', '011-4321-7654', 'nacional.belgrano@escuela.com'],
            ['Instituto San José', 'ISJ045', 'Av. Santa Fe 890, CABA', '011-9876-5432', 'info@sanjose.edu.ar'],
            ['Liceo de Señoritas N°3', 'LIC003', 'Av. Pueyrredón 432, CABA', '011-3344-5566', 'contacto@liceo3.edu.ar'],
            ['Escuela Técnica N°12 "Libertad"', 'ET12L', 'Av. de Mayo 999, CABA', '011-2233-4455', 'tecnica12@escuela.com']
        ];

        const instIds = [];
        for (const inst of institutions) {
            const res = await client.query(
                'INSERT INTO institutions (name, code, address, phone, email) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                inst
            );
            instIds.push(res.rows[0].id);
        }
        console.log(`Inserted ${instIds.length} institutions.`);

        // 3. Insert Teachers
        const teachers = [
            ['Ana María González', '20.345.678', 'ana.gonzalez@email.com', '11-4455-6677'],
            ['Carlos Alberto Rodríguez', '22.123.456', 'carlos.rod@email.com', '11-2233-4455'],
            ['Lucía Fernández', '25.678.901', 'lucia.f@email.com', '11-6677-8899'],
            ['Martín Pérez', '28.901.234', 'martin.perez@email.com', '11-9988-7766'],
            ['Beatriz López', '30.123.789', 'beatriz.l@email.com', '11-3322-1100'],
            ['José María García', '18.765.432', 'jose.garcia@email.com', '11-5544-3322'],
            ['Elena Vázquez', '32.456.789', 'elena.v@email.com', '11-7788-9900'],
            ['Ricardo Sánchez', '21.987.654', 'ricardo.s@email.com', '11-1122-3344']
        ];

        const teacherIds = [];
        for (const t of teachers) {
            const res = await client.query(
                'INSERT INTO teachers (full_name, dni, email, phone) VALUES ($1, $2, $3, $4) RETURNING id',
                t
            );
            teacherIds.push(res.rows[0].id);
        }
        console.log(`Inserted ${teacherIds.length} teachers.`);

        // 4. Insert Students
        const students = [
            [instIds[0], 'Julián Álvarez', '7° Grado A', 'Alumno destacado en deportes.'],
            [instIds[0], 'Sofía Martínez', '7° Grado B', 'Requiere apoyo en matemáticas.'],
            [instIds[1], 'Mateo Rossi', '3° Año 2°', 'Delegado de curso.'],
            [instIds[1], 'Valentina Gómez', '4° Año 1°', null],
            [instIds[2], 'Thiago Benítez', 'Salita 5', 'Alergia al maní.'],
            [instIds[2], 'Emma Silva', 'Salita 4', null],
            [instIds[3], 'Bautista Cabrera', '5° Año', 'Excelencia académica.'],
            [instIds[4], 'Delfina Morales', '6° Año Electrotecnia', 'Participa en club de robótica.']
        ];

        for (const s of students) {
            await client.query(
                'INSERT INTO students (institution_id, full_name, grade, observations) VALUES ($1, $2, $3, $4)',
                s
            );
        }
        console.log(`Inserted ${students.length} students.`);

        // 5. Insert Positions
        const positions = [
            [instIds[0], teacherIds[0], 'Maestra de Grado', 'Titular', 'Activo'],
            [instIds[0], teacherIds[1], 'Profesor de Educación Física', 'Interino', 'Activo'],
            [instIds[1], teacherIds[2], 'Profesora de Historia', 'Titular', 'Activo'],
            [instIds[1], teacherIds[3], 'Preceptor', 'Titular', 'Activo'],
            [instIds[2], teacherIds[4], 'Maestra Jardinera', 'Interino', 'Activo'],
            [instIds[3], teacherIds[5], 'Rector', 'Titular', 'Activo'],
            [instIds[4], teacherIds[6], 'Jefe de Taller', 'Titular', 'Activo'],
            [instIds[4], teacherIds[7], 'Profesor de Electrónica', 'Suplente', 'Activo']
        ];

        for (const p of positions) {
            await client.query(
                'INSERT INTO positions (institution_id, teacher_id, title, type, status) VALUES ($1, $2, $3, $4, $5)',
                p
            );
        }
        console.log(`Inserted ${positions.length} positions.`);

        // 6. Insert Visits
        const adminId = '00000000-0000-0000-0000-000000000000';
        const visits = [
            [instIds[0], adminId, '2026-03-05 10:00:00+00', 'Supervisión de rutina', 'Todo en orden. Se recomienda pintar el aula 3.', 'Completada'],
            [instIds[1], adminId, '2026-03-10 14:00:00+00', 'Reunión con directivos', 'Discusión sobre nuevo presupuesto.', 'Programada'],
            [instIds[2], adminId, '2026-03-15 09:00:00+00', 'Control de documentación', 'Pendiente entrega de legajos.', 'Programada'],
            [instIds[4], adminId, '2026-02-20 11:30:00+00', 'Inspección técnica', 'Laboratorios en excelente estado.', 'Completada']
        ];

        for (const v of visits) {
            await client.query(
                'INSERT INTO visits (institution_id, user_id, visit_date, purpose, notes, status) VALUES ($1, $2, $3, $4, $5, $6)',
                v
            );
        }
        console.log(`Inserted ${visits.length} visits.`);

        console.log("Seeding completed successfully!");
    } catch (err) {
        console.error("Error seeding database:", err);
    } finally {
        await client.end();
    }
}

run();
