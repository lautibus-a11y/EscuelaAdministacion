import React, { useState, useEffect } from 'react';
import { Plus, Search, School, BookOpen, Users, Edit2, Trash2, UserPlus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { logActivity } from '../lib/activityLog';

const ROLE_COLORS: Record<string, string> = {
    Titular: 'bg-blue-100 text-blue-700',
    Suplente: 'bg-amber-100 text-amber-700',
    Coordinador: 'bg-purple-100 text-purple-700',
};

const Courses = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [courses, setCourses] = useState<any[]>([]);
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [courseTeachers, setCourseTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

    // Course Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);

    // Assign Teacher Modal State
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [assignCourseId, setAssignCourseId] = useState<string | null>(null);
    const [assignCourseLabel, setAssignCourseLabel] = useState('');

    // Confirm Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isConfirmCTOpen, setIsConfirmCTOpen] = useState(false);
    const [ctToDelete, setCtToDelete] = useState<string | null>(null);

    // Course Form
    const [formData, setFormData] = useState({
        institution_id: '',
        name: '',
        year: new Date().getFullYear(),
        description: '',
    });

    // Assign Teacher Form
    const [assignForm, setAssignForm] = useState({
        teacher_id: '',
        role: 'Titular',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cRes, instRes, teachRes, ctRes] = await Promise.all([
                supabase.from('courses').select('*, institutions(name)').order('year', { ascending: false }).order('name'),
                supabase.from('institutions').select('id, name').order('name'),
                supabase.from('teachers').select('id, full_name').order('full_name'),
                supabase.from('course_teachers').select('*, teachers(full_name)').eq('is_active', true),
            ]);

            if (cRes.error) throw cRes.error;
            if (instRes.error) throw instRes.error;
            if (teachRes.error) throw teachRes.error;
            if (ctRes.error) throw ctRes.error;

            setCourses(cRes.data || []);
            setInstitutions(instRes.data || []);
            setTeachers(teachRes.data || []);
            setCourseTeachers(ctRes.data || []);
        } catch (error: any) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = courses.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.institutions?.name && c.institutions.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getTeachersForCourse = (courseId: string) =>
        courseTeachers.filter(ct => ct.course_id === courseId);

    // ── Course CRUD ──────────────────────────────────────────────

    const handleOpenModal = (course?: any) => {
        if (course) {
            setIsEditing(true);
            setCurrentId(course.id);
            setFormData({
                institution_id: course.institution_id || '',
                name: course.name || '',
                year: course.year || new Date().getFullYear(),
                description: course.description || '',
            });
        } else {
            setIsEditing(false);
            setCurrentId(null);
            setFormData({
                institution_id: institutions[0]?.id || '',
                name: '',
                year: new Date().getFullYear(),
                description: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && currentId) {
                const { error } = await supabase.from('courses').update(formData).eq('id', currentId);
                if (error) throw error;
                await logActivity('curso', 'EDITAR', `Curso "${formData.name}" editado.`);
            } else {
                const { error } = await supabase.from('courses').insert([formData]);
                if (error) throw error;
                await logActivity('curso', 'CREAR', `Curso "${formData.name}" creado.`);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            alert('Error guardando curso: ' + error.message);
        }
    };

    const triggerDelete = (id: string) => {
        setItemToDelete(id);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            const courseToDelete = courses.find(c => c.id === itemToDelete);
            const { error } = await supabase.from('courses').delete().eq('id', itemToDelete);
            if (error) throw error;
            if (courseToDelete) {
                await logActivity('curso', 'ELIMINAR', `Curso "${courseToDelete.name}" eliminado.`);
            }
            fetchData();
        } catch (error: any) {
            alert('Error eliminando: ' + error.message);
        } finally {
            setItemToDelete(null);
        }
    };

    // ── Assign Teacher ────────────────────────────────────────────

    const handleOpenAssign = (course: any) => {
        setAssignCourseId(course.id);
        setAssignCourseLabel(`${course.name} (${course.year})`);
        setAssignForm({
            teacher_id: teachers[0]?.id || '',
            role: 'Titular',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
        });
        setIsAssignOpen(true);
    };

    const handleSubmitAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignCourseId) return;
        try {
            const payload = {
                course_id: assignCourseId,
                teacher_id: assignForm.teacher_id,
                role: assignForm.role,
                start_date: assignForm.start_date,
                end_date: assignForm.end_date || null,
                is_active: true,
            };
            const { error } = await supabase.from('course_teachers').insert([payload]);
            if (error) throw error;
            setIsAssignOpen(false);
            fetchData();
        } catch (error: any) {
            alert('Error asignando docente: ' + error.message);
        }
    };

    const triggerDeleteCT = (ctId: string) => {
        setCtToDelete(ctId);
        setIsConfirmCTOpen(true);
    };

    const handleConfirmDeleteCT = async () => {
        if (!ctToDelete) return;
        try {
            const { error } = await supabase.from('course_teachers').delete().eq('id', ctToDelete);
            if (error) throw error;
            fetchData();
        } catch (error: any) {
            alert('Error eliminando asignación: ' + error.message);
        } finally {
            setCtToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900">Cursos</h2>
                    <p className="text-zinc-500">Gestión de cursos y vinculación de docentes por cargo.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Curso
                </button>
            </div>

            {/* Table card */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100">
                <div className="p-4 border-b border-zinc-100">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o institución..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-zinc-500">Cargando cursos...</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">No hay cursos registrados.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Curso / Institución</th>
                                    <th className="px-6 py-4 font-semibold hidden md:table-cell">Año</th>
                                    <th className="px-6 py-4 font-semibold hidden lg:table-cell">Descripción</th>
                                    <th className="px-6 py-4 font-semibold hidden md:table-cell">Docentes</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {filtered.map((course) => {
                                    const cTeachers = getTeachersForCourse(course.id);
                                    const isExpanded = expandedCourse === course.id;
                                    return (
                                        <React.Fragment key={course.id}>
                                            <tr className="hover:bg-zinc-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-zinc-900">{course.name}</span>
                                                        <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                                                            <School className="w-3 h-3" />
                                                            {course.institutions?.name || 'Sin institución'}
                                                        </div>
                                                        {/* Mobile: year + teacher count */}
                                                        <div className="md:hidden flex gap-2 mt-1">
                                                            <span className="text-xs text-zinc-500">{course.year}</span>
                                                            <span className="text-xs text-zinc-500">· {cTeachers.length} docente{cTeachers.length !== 1 ? 's' : ''}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-zinc-600 hidden md:table-cell">{course.year}</td>
                                                <td className="px-6 py-4 hidden lg:table-cell">
                                                    <p className="text-sm text-zinc-500 line-clamp-1">{course.description || '-'}</p>
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell">
                                                    <button
                                                        onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                                                        className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-emerald-600 transition-colors"
                                                    >
                                                        <Users className="w-3.5 h-3.5" />
                                                        {cTeachers.length} docente{cTeachers.length !== 1 ? 's' : ''}
                                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                    </button>
                                                </td>
                                                <td className="px-3 md:px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 md:gap-2">
                                                        <button
                                                            onClick={() => handleOpenAssign(course)}
                                                            className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                                                            title="Asignar Docente"
                                                        >
                                                            <UserPlus className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenModal(course)}
                                                            className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => triggerDelete(course.id)}
                                                            className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded row: docentes del curso */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={5} className="bg-zinc-50 px-6 py-4 border-b border-zinc-100">
                                                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                                                            Docentes asignados a {course.name}
                                                        </p>
                                                        {cTeachers.length === 0 ? (
                                                            <p className="text-sm text-zinc-400 italic">Sin docentes asignados. Usá el botón <UserPlus className="w-3 h-3 inline" /> para asignar uno.</p>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-2">
                                                                {cTeachers.map(ct => (
                                                                    <div key={ct.id} className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 shadow-sm">
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ROLE_COLORS[ct.role] || 'bg-zinc-100 text-zinc-600'}`}>
                                                                            {ct.role}
                                                                        </span>
                                                                        <span className="text-sm text-zinc-800 font-medium">{ct.teachers?.full_name}</span>
                                                                        {ct.start_date && (
                                                                            <span className="text-[10px] text-zinc-400">desde {ct.start_date}</span>
                                                                        )}
                                                                        <button
                                                                            onClick={() => triggerDeleteCT(ct.id)}
                                                                            className="ml-1 p-0.5 hover:bg-red-50 rounded text-red-400 transition-colors"
                                                                            title="Quitar asignación"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal: Crear/Editar Curso */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? 'Editar Curso' : 'Nuevo Curso'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 mb-1">Institución</label>
                        <select
                            required
                            value={formData.institution_id}
                            onChange={e => setFormData({ ...formData, institution_id: e.target.value })}
                            className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        >
                            <option value="" disabled>Seleccione una institución</option>
                            {institutions.map(inst => (
                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-700 mb-1">Nombre del Curso</label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: 3° A, Historia"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-zinc-700 mb-1">Año</label>
                            <input
                                type="number"
                                required
                                min={2000}
                                max={2100}
                                value={formData.year}
                                onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 mb-1">Descripción (opcional)</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-zinc-100">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-700 font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Asignar Docente */}
            <Modal
                isOpen={isAssignOpen}
                onClose={() => setIsAssignOpen(false)}
                title={`Asignar Docente — ${assignCourseLabel}`}
            >
                <form onSubmit={handleSubmitAssign} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 mb-1">Docente</label>
                        <select
                            required
                            value={assignForm.teacher_id}
                            onChange={e => setAssignForm({ ...assignForm, teacher_id: e.target.value })}
                            className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        >
                            <option value="" disabled>Seleccione un docente</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.full_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 mb-1">Cargo en el Curso</label>
                        <select
                            value={assignForm.role}
                            onChange={e => setAssignForm({ ...assignForm, role: e.target.value })}
                            className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        >
                            <option value="Titular">Titular</option>
                            <option value="Suplente">Suplente</option>
                            <option value="Coordinador">Coordinador</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-700 mb-1">Fecha de Inicio</label>
                            <input
                                type="date"
                                required
                                value={assignForm.start_date}
                                onChange={e => setAssignForm({ ...assignForm, start_date: e.target.value })}
                                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-zinc-700 mb-1">Fecha de Fin (opcional)</label>
                            <input
                                type="date"
                                value={assignForm.end_date}
                                onChange={e => setAssignForm({ ...assignForm, end_date: e.target.value })}
                                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-zinc-100">
                        <button
                            type="button"
                            onClick={() => setIsAssignOpen(false)}
                            className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-700 font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            Asignar
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm delete course */}
            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Curso"
                message="¿Estás seguro de que deseas eliminar este curso? Se eliminarán también todos sus docentes asignados."
            />

            {/* Confirm delete course_teacher */}
            <ConfirmModal
                isOpen={isConfirmCTOpen}
                onClose={() => setIsConfirmCTOpen(false)}
                onConfirm={handleConfirmDeleteCT}
                title="Quitar Docente"
                message="¿Deseas quitar la asignación de este docente al curso?"
            />
        </div>
    );
};

export default Courses;
