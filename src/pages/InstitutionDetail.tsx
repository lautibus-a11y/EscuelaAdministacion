import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, School, Users, UserSquare2, BookOpen, MapPin, Phone, Mail,
    Plus, Edit2, Trash2, User, Briefcase, ExternalLink, ChevronDown, ChevronUp, Heart
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getGoogleMapsUrl } from '../lib/utils';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { logActivity } from '../lib/activityLog';

const REVISTA_COLORS: Record<string, string> = {
    Titular: 'bg-blue-100 text-blue-700',
    Suplente: 'bg-amber-100 text-amber-700',
    Interino: 'bg-purple-100 text-purple-700',
};

const InstitutionDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [institution, setInstitution] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);  // docentes con cargo en esta inst.
    const [teachers, setTeachers] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'alumnos' | 'docentes' | 'cursos'>('alumnos');

    // Student modal
    const [isStudentOpen, setIsStudentOpen] = useState(false);
    const [isStudentEditing, setIsStudentEditing] = useState(false);
    const [studentCurrentId, setStudentCurrentId] = useState<string | null>(null);
    const [studentForm, setStudentForm] = useState({
        full_name: '', grade: '', observations: '', diagnosis: '', responsible_teacher_id: ''
    });

    // Confirm
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ table: string; id: string; label: string } | null>(null);

    // Expanded student
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

    useEffect(() => { fetchAll(); }, [id]);

    const fetchAll = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [instRes, stRes, posRes, teachRes, cRes] = await Promise.all([
                supabase.from('institutions').select('*').eq('id', id).single(),
                supabase.from('students').select('*, responsible_teacher:responsible_teacher_id(id, full_name)').eq('institution_id', id).order('full_name'),
                supabase.from('positions').select('*, teachers(id, full_name, email, phone)').eq('institution_id', id).order('title'),
                supabase.from('teachers').select('id, full_name').order('full_name'),
                supabase.from('courses').select('*, course_teachers(*, teachers(full_name))').eq('institution_id', id).order('name'),
            ]);

            if (instRes.error) throw instRes.error;
            setInstitution(instRes.data);
            setStudents(stRes.data || []);
            setPositions(posRes.data || []);
            setTeachers(teachRes.data || []);
            setCourses(cRes.data || []);
        } catch (err) {
            console.error('Error cargando institución:', err);
        } finally {
            setLoading(false);
        }
    };

    // ── Student CRUD ───────────────────────────────────────────────────────
    const openStudentModal = (student?: any) => {
        if (student) {
            setIsStudentEditing(true);
            setStudentCurrentId(student.id);
            setStudentForm({
                full_name: student.full_name || '',
                grade: student.grade || '',
                observations: student.observations || '',
                diagnosis: student.diagnosis || '',
                responsible_teacher_id: student.responsible_teacher_id || '',
            });
        } else {
            setIsStudentEditing(false);
            setStudentCurrentId(null);
            setStudentForm({ full_name: '', grade: '', observations: '', diagnosis: '', responsible_teacher_id: '' });
        }
        setIsStudentOpen(true);
    };

    const handleStudentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...studentForm,
                institution_id: id,
                responsible_teacher_id: studentForm.responsible_teacher_id || null,
            };
            if (isStudentEditing && studentCurrentId) {
                const { error } = await supabase.from('students').update(payload).eq('id', studentCurrentId);
                if (error) throw error;
                await logActivity('alumno', 'EDITAR', `Alumno "${studentForm.full_name}" editado en ${institution?.name}`);
            } else {
                const { error } = await supabase.from('students').insert([payload]);
                if (error) throw error;
                await logActivity('alumno', 'CREAR', `Alumno "${studentForm.full_name}" agregado a ${institution?.name}`);
            }
            setIsStudentOpen(false);
            fetchAll();
        } catch (err: any) {
            alert('Error guardando alumno: ' + err.message);
        }
    };

    // ── Generic delete ─────────────────────────────────────────────────────
    const triggerDelete = (table: string, id: string, label: string) => {
        setDeleteTarget({ table, id, label });
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            const { error } = await supabase.from(deleteTarget.table).delete().eq('id', deleteTarget.id);
            if (error) throw error;
            const entityMap: Record<string, any> = { students: 'alumno', positions: 'cargo' };
            await logActivity(entityMap[deleteTarget.table] || 'alumno', 'ELIMINAR', `"${deleteTarget.label}" eliminado de ${institution?.name}`);
            fetchAll();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setDeleteTarget(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-zinc-500">Cargando...</div>;
    if (!institution) return <div className="p-8 text-center text-zinc-500">Institución no encontrada.</div>;

    const tabs = [
        { key: 'alumnos', label: 'Alumnos', count: students.length, icon: Users },
        { key: 'docentes', label: 'Docentes / ACDM', count: positions.length, icon: UserSquare2 },
        { key: 'cursos', label: 'Cursos', count: courses.length, icon: BookOpen },
    ] as const;

    return (
        <div className="space-y-6">
            {/* Back + Header */}
            <div>
                <button
                    onClick={() => navigate('/institutions')}
                    className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800 transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver a Instituciones
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <School className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h2 className="text-xl font-bold text-zinc-900">{institution.name}</h2>
                                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded text-xs font-bold">{institution.code}</span>
                                </div>
                                <div className="flex flex-col gap-1 mt-2">
                                    {institution.address && (
                                        <a href={getGoogleMapsUrl(institution.address)} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs text-emerald-600 hover:underline">
                                            <MapPin className="w-3 h-3" />{institution.address}<ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                    )}
                                    {institution.phone && <div className="flex items-center gap-1.5 text-xs text-zinc-500"><Phone className="w-3 h-3" />{institution.phone}</div>}
                                    {institution.email && <div className="flex items-center gap-1.5 text-xs text-zinc-500"><Mail className="w-3 h-3" />{institution.email}</div>}
                                </div>
                            </div>
                        </div>
                        {/* Quick stats */}
                        <div className="flex gap-3 flex-wrap">
                            {[
                                { label: 'Alumnos', value: students.length, color: 'text-emerald-600' },
                                { label: 'Docentes', value: positions.length, color: 'text-blue-600' },
                                { label: 'Cursos', value: courses.length, color: 'text-purple-600' },
                            ].map(s => (
                                <div key={s.label} className="text-center bg-zinc-50 rounded-xl px-4 py-2">
                                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                                    <p className="text-xs text-zinc-500">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.key
                                ? 'bg-white text-zinc-900 shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${activeTab === tab.key ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-500'}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── TAB: Alumnos ──────────────────────────────────────────────── */}
            {activeTab === 'alumnos' && (
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-100">
                    <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-800">Alumnos en {institution.name}</h3>
                        <button
                            onClick={() => openStudentModal()}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" /> Nuevo Alumno
                        </button>
                    </div>

                    {students.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400">No hay alumnos en esta institución.</div>
                    ) : (
                        <div className="divide-y divide-zinc-100">
                            {students.map(student => {
                                const isExpanded = expandedStudent === student.id;
                                return (
                                    <div key={student.id}>
                                        <div className="flex items-center gap-3 px-6 py-4 hover:bg-zinc-50 transition-colors">
                                            <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 flex-shrink-0">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-bold text-zinc-900">{student.full_name}</span>
                                                    <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[10px] font-semibold">{student.grade}</span>
                                                    {student.diagnosis && (
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded text-[10px] font-semibold">
                                                            <Heart className="w-2.5 h-2.5" />{student.diagnosis}
                                                        </span>
                                                    )}
                                                </div>
                                                {student.responsible_teacher && (
                                                    <div className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
                                                        <User className="w-2.5 h-2.5" />
                                                        ACDM: <span className="font-medium text-zinc-700">{student.responsible_teacher.full_name}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                                                    className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 transition-colors"
                                                    title="Ver detalles"
                                                >
                                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => openStudentModal(student)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors" title="Editar">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => triggerDelete('students', student.id, student.full_name)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors" title="Eliminar">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded detail */}
                                        {isExpanded && (
                                            <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-100">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Grado/Curso</p>
                                                        <p className="text-zinc-700">{student.grade || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Diagnóstico / Patología</p>
                                                        <p className="text-zinc-700 flex items-center gap-1">
                                                            {student.diagnosis ? <><Heart className="w-3 h-3 text-rose-400" />{student.diagnosis}</> : <span className="text-zinc-400">Sin diagnóstico registrado</span>}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Docente ACDM</p>
                                                        <p className="text-zinc-700">{student.responsible_teacher?.full_name || <span className="text-zinc-400">Sin asignar</span>}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Observaciones</p>
                                                        <p className="text-zinc-700">{student.observations || <span className="text-zinc-400">Sin observaciones</span>}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: Docentes / ACDM ─────────────────────────────────────── */}
            {activeTab === 'docentes' && (
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-100">
                    <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-800">Docentes y ACDM en {institution.name}</h3>
                        <button
                            onClick={() => navigate('/positions')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" /> Gestionar Cargos
                        </button>
                    </div>
                    {positions.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400">No hay docentes asignados. Gestioná los cargos en la sección Cargos.</div>
                    ) : (
                        <div className="divide-y divide-zinc-100">
                            {positions.map(pos => (
                                <div key={pos.id} className="flex items-center gap-3 px-6 py-4 hover:bg-zinc-50 transition-colors">
                                    <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 flex-shrink-0">
                                        <UserSquare2 className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-bold text-zinc-900">{pos.teachers?.full_name || 'Sin nombre'}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${REVISTA_COLORS[pos.type] ?? 'bg-zinc-100 text-zinc-600'}`}>
                                                {pos.type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
                                            <Briefcase className="w-2.5 h-2.5" />
                                            {pos.title}
                                        </div>
                                        <div className="flex gap-3 mt-0.5">
                                            {pos.teachers?.email && <span className="text-xs text-zinc-400">{pos.teachers.email}</span>}
                                            {pos.teachers?.phone && <span className="text-xs text-zinc-400">{pos.teachers.phone}</span>}
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${pos.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                        {pos.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: Cursos ──────────────────────────────────────────────── */}
            {activeTab === 'cursos' && (
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-100">
                    <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-800">Cursos en {institution.name}</h3>
                        <button
                            onClick={() => navigate('/courses')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" /> Gestionar Cursos
                        </button>
                    </div>
                    {courses.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400">No hay cursos para esta institución.</div>
                    ) : (
                        <div className="divide-y divide-zinc-100">
                            {courses.map(c => (
                                <div key={c.id} className="px-6 py-4 hover:bg-zinc-50 transition-colors">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <BookOpen className="w-4 h-4 text-zinc-400" />
                                        <span className="text-sm font-bold text-zinc-900">{c.name}</span>
                                        <span className="text-xs text-zinc-400">{c.year}</span>
                                    </div>
                                    {c.description && <p className="text-xs text-zinc-500 mt-0.5 ml-6">{c.description}</p>}
                                    {c.course_teachers?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2 ml-6">
                                            {c.course_teachers.map((ct: any) => (
                                                <span key={ct.id} className="flex items-center gap-1 px-2 py-0.5 bg-zinc-100 rounded text-xs text-zinc-600">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${ct.role === 'Titular' ? 'bg-blue-500' : ct.role === 'Coordinador' ? 'bg-purple-500' : 'bg-amber-500'}`} />
                                                    {ct.teachers?.full_name} ({ct.role})
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Student Modal */}
            <Modal
                isOpen={isStudentOpen}
                onClose={() => setIsStudentOpen(false)}
                title={isStudentEditing ? 'Editar Alumno' : 'Nuevo Alumno'}
            >
                <form onSubmit={handleStudentSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 mb-1">Nombre Completo</label>
                        <input
                            type="text" required value={studentForm.full_name}
                            onChange={e => setStudentForm({ ...studentForm, full_name: e.target.value })}
                            className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-700 mb-1">Grado/Curso</label>
                            <input
                                type="text" required value={studentForm.grade}
                                onChange={e => setStudentForm({ ...studentForm, grade: e.target.value })}
                                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                                <Heart className="w-3 h-3 text-rose-400" /> Diagnóstico / Patología
                            </label>
                            <input
                                type="text" value={studentForm.diagnosis}
                                placeholder="Ej: TEA, TDAH..."
                                onChange={e => setStudentForm({ ...studentForm, diagnosis: e.target.value })}
                                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 mb-1">Docente ACDM (Responsable)</label>
                        <select
                            value={studentForm.responsible_teacher_id}
                            onChange={e => setStudentForm({ ...studentForm, responsible_teacher_id: e.target.value })}
                            className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        >
                            <option value="">Sin asignar</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.full_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 mb-1">Observaciones</label>
                        <textarea
                            value={studentForm.observations} rows={2}
                            onChange={e => setStudentForm({ ...studentForm, observations: e.target.value })}
                            className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-zinc-100">
                        <button type="button" onClick={() => setIsStudentOpen(false)}
                            className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-700 font-semibold rounded-xl hover:bg-zinc-200 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit"
                            className="flex-1 px-4 py-2 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar?"
                message={`¿Seguro que querés eliminar "${deleteTarget?.label}"? Esta acción no se puede deshacer.`}
            />
        </div>
    );
};

export default InstitutionDetail;
