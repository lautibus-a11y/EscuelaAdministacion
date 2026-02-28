/**
 * seed_v2.cjs
 * Agrega datos ficticios para: courses, course_teachers, substitutions
 * y asigna responsible_teacher_id a alumnos existentes.
 *
 * Usa los IDs reales de teachers e institutions que ya estén en la DB.
 * Todo lo insertado es 100% editable/borrable desde la app.
 */

const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Conectado a la base de datos. Iniciando seed v2...\n');

        // ── Obtener datos existentes ─────────────────────────────────────────
        const { rows: institutions } = await client.query(
            'SELECT id, name FROM institutions ORDER BY name'
        );
        const { rows: teachers } = await client.query(
            'SELECT id, full_name FROM teachers ORDER BY full_name'
        );
        const { rows: students } = await client.query(
            'SELECT id, full_name FROM students ORDER BY full_name'
        );

        if (institutions.length === 0) {
            console.error('❌ No hay instituciones. Corré primero seed_data.cjs');
            return;
        }
        if (teachers.length < 2) {
            console.error('❌ Se necesitan al menos 2 docentes. Corré primero seed_data.cjs');
            return;
        }

        console.log(`✓ Instituciones: ${institutions.length}`);
        console.log(`✓ Docentes:      ${teachers.length}`);
        console.log(`✓ Alumnos:       ${students.length}\n`);

        // ── Limpiar datos v2 previos ─────────────────────────────────────────
        await client.query('DELETE FROM substitutions');
        await client.query('DELETE FROM course_teachers');
        await client.query('DELETE FROM courses');
        console.log('Datos v2 previos eliminados.\n');

        // ── 1. Cursos ─────────────────────────────────────────────────────────
        // Distribuimos cursos entre las instituciones disponibles
        const courseData = [
            { inst: 0, name: '1° A', year: 2026, description: 'Primer grado, turno mañana' },
            { inst: 0, name: '2° B', year: 2026, description: 'Segundo grado, turno tarde' },
            { inst: 1, name: '3° Año – Cs. Sociales', year: 2026, description: 'Tercer año, orientación ciencias sociales' },
            { inst: 1, name: '4° Año – Matemática', year: 2026, description: 'Cuarto año, matemática avanzada' },
            { inst: Math.min(2, institutions.length - 1), name: 'Salita 5 Años', year: 2026, description: 'Nivel inicial, sala de 5 años' },
            { inst: Math.min(3, institutions.length - 1), name: '5° Año – Historia', year: 2026, description: 'Historia Argentina contemporánea' },
            { inst: Math.min(4, institutions.length - 1), name: '6° Electrotecnia', year: 2026, description: 'Especialidad técnica – Electrotecnia' },
        ].filter(c => institutions[c.inst]);

        const courseIds = [];
        for (const c of courseData) {
            const instId = institutions[c.inst].id;
            const res = await client.query(
                'INSERT INTO courses (institution_id, name, year, description) VALUES ($1, $2, $3, $4) RETURNING id',
                [instId, c.name, c.year, c.description]
            );
            courseIds.push(res.rows[0].id);
        }
        console.log(`✓ Insertados ${courseIds.length} cursos.`);

        // ── 2. Vinculación Profesor ↔ Curso con cargo ────────────────────────
        // Distribuimos docentes disponibles entre los cursos con distintos cargos
        // Evitamos usar el mismo docente con el mismo rol en el mismo curso
        const assignments = [];

        // Función auxiliar para obtener índice docente de forma circular
        const t = (i) => teachers[i % teachers.length];

        // Cada curso recibe al menos un Titular, algunos tienen Suplente o Coordinador
        for (let i = 0; i < courseIds.length; i++) {
            const courseId = courseIds[i];

            // Titular
            assignments.push({
                course_id: courseId,
                teacher_id: t(i).id,
                role: 'Titular',
                start_date: '2026-03-01',
                end_date: null,
                is_active: true,
            });

            // Coordinador (solo para algunos cursos)
            if (i % 2 === 0 && teachers.length > 1) {
                const coordTeacher = t(i + teachers.length - 1); // diferente al titular
                if (coordTeacher.id !== t(i).id) {
                    assignments.push({
                        course_id: courseId,
                        teacher_id: coordTeacher.id,
                        role: 'Coordinador',
                        start_date: '2026-03-01',
                        end_date: null,
                        is_active: true,
                    });
                }
            }

            // Suplente activo (solo para algunos cursos)
            if (i % 3 === 0 && teachers.length > 2) {
                const supTeacher = t(i + 2);
                if (supTeacher.id !== t(i).id) {
                    assignments.push({
                        course_id: courseId,
                        teacher_id: supTeacher.id,
                        role: 'Suplente',
                        start_date: '2026-02-15',
                        end_date: null,
                        is_active: true,
                    });
                }
            }
        }

        // Insertar evitando duplicados (mismo curso+docente+rol)
        const seen = new Set();
        let ctCount = 0;
        for (const a of assignments) {
            const key = `${a.course_id}|${a.teacher_id}|${a.role}`;
            if (seen.has(key)) continue;
            seen.add(key);

            await client.query(
                `INSERT INTO course_teachers (course_id, teacher_id, role, start_date, end_date, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ON CONSTRAINT ct_unique_course_teacher_role DO NOTHING`,
                [a.course_id, a.teacher_id, a.role, a.start_date, a.end_date, a.is_active]
            );
            ctCount++;
        }
        console.log(`✓ Insertadas ${ctCount} asignaciones docente-curso.`);

        // ── 3. Suplencias ────────────────────────────────────────────────────
        // Creamos suplencias realistas entre docentes existentes
        const substitutionData = [];

        if (courseIds.length >= 1 && teachers.length >= 2) {
            substitutionData.push({
                course_id: courseIds[0],
                original_teacher_id: t(0).id,
                substitute_teacher_id: t(1).id,
                start_date: '2026-02-10',
                end_date: '2026-02-28',
                reason: 'Licencia médica (reposo por cirugía)',
                is_active: false,
            });
        }
        if (courseIds.length >= 2 && teachers.length >= 3) {
            substitutionData.push({
                course_id: courseIds[1],
                original_teacher_id: t(1).id,
                substitute_teacher_id: t(2).id,
                start_date: '2026-03-01',
                end_date: null,
                reason: 'Licencia por maternidad',
                is_active: true,
            });
        }
        if (courseIds.length >= 3 && teachers.length >= 4) {
            substitutionData.push({
                course_id: courseIds[2],
                original_teacher_id: t(2).id,
                substitute_teacher_id: t(3).id,
                start_date: '2026-02-20',
                end_date: '2026-03-15',
                reason: 'Capacitación docente en el exterior',
                is_active: true,
            });
        }
        if (courseIds.length >= 4 && teachers.length >= 2) {
            substitutionData.push({
                course_id: courseIds[3],
                original_teacher_id: t(3 % teachers.length).id,
                substitute_teacher_id: t(0).id,
                start_date: '2026-03-05',
                end_date: null,
                reason: 'Vacaciones anuales',
                is_active: true,
            });
        }

        let subCount = 0;
        for (const s of substitutionData) {
            if (s.original_teacher_id === s.substitute_teacher_id) continue;
            await client.query(
                `INSERT INTO substitutions (course_id, original_teacher_id, substitute_teacher_id, start_date, end_date, reason, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [s.course_id, s.original_teacher_id, s.substitute_teacher_id, s.start_date, s.end_date, s.reason, s.is_active]
            );
            subCount++;
        }
        console.log(`✓ Insertadas ${subCount} suplencias.`);

        // ── 4. Profesor responsable en alumnos ────────────────────────────────
        let studentCount = 0;
        for (let i = 0; i < students.length; i++) {
            const responsibleTeacher = t(i);
            await client.query(
                'UPDATE students SET responsible_teacher_id = $1 WHERE id = $2',
                [responsibleTeacher.id, students[i].id]
            );
            studentCount++;
        }
        console.log(`✓ Asignados profesores responsables a ${studentCount} alumnos.`);

        // ── Resumen ───────────────────────────────────────────────────────────
        console.log('\n════════════════════════════════════════');
        console.log('  Seed v2 completado exitosamente ✓');
        console.log(`  Cursos:       ${courseIds.length}`);
        console.log(`  Asignaciones: ${ctCount}`);
        console.log(`  Suplencias:   ${subCount}`);
        console.log(`  Alumnos act.: ${studentCount}`);
        console.log('════════════════════════════════════════');

    } catch (err) {
        console.error('\n❌ Error en seed v2:', err.message);
        console.error(err.detail || '');
    } finally {
        await client.end();
    }
}

run();
