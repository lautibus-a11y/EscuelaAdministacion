-- ============================================================
-- EduGestión v2 — Cursos, Cargos y Suplencias
-- Ejecutar DESPUÉS de supabase_schema.sql base
-- ============================================================

-- 1. Nuevo ENUM para el cargo del docente en un curso
CREATE TYPE course_role AS ENUM ('Titular', 'Suplente', 'Coordinador');

-- 2. Tabla de Cursos
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,          -- Ej: "3° A", "Historia Contemporánea"
    year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de vinculación Profesor ↔ Curso con Cargo
CREATE TABLE course_teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    role course_role NOT NULL DEFAULT 'Titular',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,               -- NULL = vigente
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, teacher_id, role)
);

-- 4. Columna responsable en alumnos
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS responsible_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL;

-- 5. Tabla de Suplencias
CREATE TABLE substitutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    original_teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,   -- el ausente / titular
    substitute_teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE, -- el suplente
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,               -- NULL = en curso
    reason TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE substitutions ENABLE ROW LEVEL SECURITY;

-- Courses
CREATE POLICY "Anyone authenticated can read courses"
    ON courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage courses"
    ON courses FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Course Teachers
CREATE POLICY "Anyone authenticated can read course_teachers"
    ON course_teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage course_teachers"
    ON course_teachers FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Substitutions
CREATE POLICY "Anyone authenticated can read substitutions"
    ON substitutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage substitutions"
    ON substitutions FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- Triggers updated_at
-- ============================================================

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_course_teachers_updated_at
    BEFORE UPDATE ON course_teachers
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_substitutions_updated_at
    BEFORE UPDATE ON substitutions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
