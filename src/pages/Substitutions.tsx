import React, { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, School, User, Edit2, Trash2, ArrowRight, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { logActivity } from '../lib/activityLog';

const Substitutions = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [substitutions, setSubstitutions] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);

    // Confirm Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        course_id: '',
        original_teacher_id: '',
        substitute_teacher_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        reason: '',
        is_active: true,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [subRes, cRes, tRes] = await Promise.all([
                supabase.from('substitutions').select(`
          *,
          courses(name, year, institutions(name)),
          original_teacher:original_teacher_id(full_name),
          substitute_teacher:substitute_teacher_id(full_name)
        `).order('start_date', { ascending: false }),
                supabase.from('courses').select('id, name, year, institutions(name)').order('name'),
                supabase.from('teachers').select('id, full_name').order('full_name'),
            ]);

            if (subRes.error) throw subRes.error;
            if (cRes.error) throw cRes.error;
            if (tRes.error) throw tRes.error;

            setSubstitutions(subRes.data || []);
            setCourses(cRes.data || []);
            setTeachers(tRes.data || []);
        } catch (error: any) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = substitutions.filter(s =>
        (s.courses?.name && s.courses.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.original_teacher?.full_name && s.original_teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.substitute_teacher?.full_name && s.substitute_teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleOpenModal = (sub?: any) => {
        if (sub) {
            setIsEditing(true);
            setCurrentId(sub.id);
            setFormData({
                course_id: sub.course_id || '',
                original_teacher_id: sub.original_teacher_id || '',
                substitute_teacher_id: sub.substitute_teacher_id || '',
                start_date: sub.start_date || new Date().toISOString().split('T')[0],
                end_date: sub.end_date || '',
                reason: sub.reason || '',
                is_active: sub.is_active,
            });
        } else {
            setIsEditing(false);
            setCurrentId(null);
            setFormData({
                course_id: courses[0]?.id || '',
                original_teacher_id: teachers[0]?.id || '',
                substitute_teacher_id: teachers[1]?.id || '',
                start_date: new Date().toISOString().split('T')[0],
                end_date: '',
                reason: '',
                is_active: true,
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.original_teacher_id === formData.substitute_teacher_id) {
            alert('El docente titular y el suplente no pueden ser la misma persona.');
            return;
        }
        try {
            const payload = {
                ...formData,
                end_date: formData.end_date || null,
            };
            if (isEditing && currentId) {
                const { error } = await supabase.from('substitutions').update(payload).eq('id', currentId);
                if (error) throw error;
                await logActivity('suplencia', 'EDITAR', `Suplencia actualizada.`);
            } else {
                const { error } = await supabase.from('substitutions').insert([payload]);
                if (error) throw error;
                await logActivity('suplencia', 'CREAR', `Nueva suplencia registrada.`);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            alert('Error guardando suplencia: ' + error.message);
        }
    };

    const triggerDelete = (id: string) => {
        setItemToDelete(id);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            const { error } = await supabase.from('substitutions').delete().eq('id', itemToDelete);
            if (error) throw error;
            await logActivity('suplencia', 'ELIMINAR', `Suplencia eliminada.`);
            fetchData();
        } catch (error: any) {
            alert('Error eliminando: ' + error.message);
        } finally {
            setItemToDelete(null);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null;
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900">Suplencias</h2>
                    <p className="text-zinc-500">Registro de reemplazos y suplencias docentes temporales.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Suplencia
                </button>
            </div>

            {/* Table card */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100">
                <div className="p-4 border-b border-zinc-100">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Buscar por curso, titular o suplente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-zinc-500">Cargando suplencias...</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">No hay suplencias registradas.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Suplencia</th>
                                    <th className="px-6 py-4 font-semibold hidden md:table-cell">Curso</th>
                                    <th className="px-6 py-4 font-semibold hidden lg:table-cell">Período</th>
                                    <th className="px-6 py-4 font-semibold hidden md:table-cell">Estado</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {filtered.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-zinc-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {/* Titular → Suplente */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <User className="w-3 h-3 text-zinc-500" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-zinc-400 leading-none">Titular ausente</span>
                                                            <span className="text-sm font-semibold text-zinc-800">{sub.original_teacher?.full_name || '-'}</span>
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-zinc-300 flex-shrink-0" />
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <RefreshCw className="w-3 h-3 text-amber-600" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-amber-500 leading-none">Suplente</span>
                                                            <span className="text-sm font-semibold text-zinc-800">{sub.substitute_teacher?.full_name || '-'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Mobile: curso + estado */}
                                                <div className="md:hidden flex items-center gap-2 flex-wrap mt-1">
                                                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                                                        <School className="w-3 h-3" />
                                                        {sub.courses?.name} ({sub.courses?.year})
                                                    </div>
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${sub.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                                        {sub.is_active ? 'Activa' : 'Finalizada'}
                                                    </span>
                                                </div>
                                                {sub.reason && (
                                                    <p className="text-xs text-zinc-400 italic mt-0.5 line-clamp-1">"{sub.reason}"</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1 text-sm text-zinc-700 font-medium">
                                                    <School className="w-3 h-3" />
                                                    {sub.courses?.name || '-'}
                                                </div>
                                                <span className="text-xs text-zinc-400">{sub.courses?.year} · {sub.courses?.institutions?.name || ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden lg:table-cell">
                                            <div className="flex flex-col gap-0.5 text-xs text-zinc-600">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-zinc-400" />
                                                    Desde {formatDate(sub.start_date)}
                                                </div>
                                                {sub.end_date && (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-zinc-400" />
                                                        Hasta {formatDate(sub.end_date)}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${sub.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                                                }`}>
                                                {sub.is_active ? 'Activa' : 'Finalizada'}
                                            </span>
                                        </td>
                                        <td className="px-3 md:px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 md:gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(sub)}
                                                    className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => triggerDelete(sub.id)}
                                                    className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal: Crear/Editar Suplencia */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? 'Editar Suplencia' : 'Nueva Suplencia'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 mb-1">Curso</label>
                        <select
                            required
                            value={formData.course_id}
                            onChange={e => setFormData({ ...formData, course_id: e.target.value })}
                            className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        >
                            <option value="" disabled>Seleccione un curso</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.year}) — {c.institutions?.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                            <User className="w-3 h-3" /> Docente Titular (ausente)
                        </label>
                        <select
                            required
                            value={formData.original_teacher_id}
                            onChange={e => setFormData({ ...formData, original_teacher_id: e.target.value })}
                            className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        >
                            <option value="" disabled>Seleccione el docente titular</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.full_name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" /> Docente Suplente (reemplaza)
                        </label>
                        <select
                            required
                            value={formData.substitute_teacher_id}
                            onChange={e => setFormData({ ...formData, substitute_teacher_id: e.target.value })}
                            className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        >
                            <option value="" disabled>Seleccione el docente suplente</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.full_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-700 mb-1">Fecha de Inicio</label>
                            <input
                                type="date"
                                required
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-zinc-700 mb-1">Fecha de Fin (opcional)</label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 mb-1">Motivo (opcional)</label>
                        <textarea
                            value={formData.reason}
                            onChange={e => setFormData({ ...formData, reason: e.target.value })}
                            rows={2}
                            placeholder="Ej: licencia médica, vacaciones, etc."
                            className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-sm font-semibold text-zinc-700">Estado</label>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_active ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span className={`text-sm font-medium ${formData.is_active ? 'text-emerald-600' : 'text-zinc-400'}`}>
                            {formData.is_active ? 'Activa' : 'Finalizada'}
                        </span>
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

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Suplencia"
                message="¿Estás seguro de que deseas eliminar este registro de suplencia?"
            />
        </div>
    );
};

export default Substitutions;
