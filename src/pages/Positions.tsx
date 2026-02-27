import React, { useState, useEffect } from 'react';
import { Plus, Search, School, User, Link as LinkIcon, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';

const Positions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [positions, setPositions] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
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
    institution_id: '',
    teacher_id: '',
    title: '',
    type: 'Titular',
    status: 'Activo',
    linked_position_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [posRes, instRes, teachRes] = await Promise.all([
        supabase.from('positions').select(`
          *,
          institutions(name),
          teachers(full_name),
          linked_position:linked_position_id(teachers(full_name))
        `).order('created_at', { ascending: false }),
        supabase.from('institutions').select('id, name').order('name'),
        supabase.from('teachers').select('id, full_name').order('full_name')
      ]);

      if (posRes.error) throw posRes.error;
      if (instRes.error) throw instRes.error;
      if (teachRes.error) throw teachRes.error;

      setPositions(posRes.data || []);
      setInstitutions(instRes.data || []);
      setTeachers(teachRes.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = positions.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.teachers?.full_name && p.teachers.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.institutions?.name && p.institutions.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (pos?: any) => {
    if (pos) {
      setIsEditing(true);
      setCurrentId(pos.id);
      setFormData({
        institution_id: pos.institution_id || '',
        teacher_id: pos.teacher_id || '',
        title: pos.title || '',
        type: pos.type || 'Titular',
        status: pos.status || 'Activo',
        linked_position_id: pos.linked_position_id || ''
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({
        institution_id: institutions[0]?.id || '',
        teacher_id: teachers[0]?.id || '',
        title: '',
        type: 'Titular',
        status: 'Activo',
        linked_position_id: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        linked_position_id: formData.type === 'Suplente' && formData.linked_position_id ? formData.linked_position_id : null
      };

      if (isEditing && currentId) {
        const { error } = await supabase.from('positions').update(payload).eq('id', currentId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('positions').insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert('Error guardando designación: ' + error.message);
    }
  };

  const triggerDelete = (id: string) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from('positions').delete().eq('id', itemToDelete);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error eliminando: ' + error.message);
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Cargos y Designaciones</h2>
          <p className="text-zinc-500">Administra las designaciones docentes y vinculaciones.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nueva Designación
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100">
        <div className="p-4 border-b border-zinc-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por cargo, docente o institución..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Cargando designaciones...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No hay designaciones registradas.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Cargo / Institución</th>
                  <th className="px-6 py-4 font-semibold hidden md:table-cell">Docente</th>
                  <th className="px-6 py-4 font-semibold hidden lg:table-cell">Tipo</th>
                  <th className="px-6 py-4 font-semibold hidden lg:table-cell">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((pos) => (
                  <tr key={pos.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900">{pos.title}</span>
                        <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                          <School className="w-3 h-3" />
                          {pos.institutions?.name || 'Sin institución'}
                        </div>
                        <div className="md:hidden flex flex-col gap-1 mt-2">
                          <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                            <User className="w-2.5 h-2.5" />
                            {pos.teachers?.full_name || 'Sin docente'}
                          </span>
                          <div className="flex gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${pos.type === 'Titular' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                              {pos.type}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${pos.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                              {pos.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-sm text-zinc-700 font-medium">
                          <User className="w-3 h-3" />
                          {pos.teachers?.full_name || 'Sin docente'}
                        </div>
                        {pos.linked_position?.teachers && (
                          <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-0.5">
                            <LinkIcon className="w-2.5 h-2.5" />
                            Reemplaza a: {pos.linked_position.teachers.full_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${pos.type === 'Titular' ? 'bg-blue-100 text-blue-700' :
                        pos.type === 'Suplente' ? 'bg-amber-100 text-amber-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                        {pos.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${pos.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' :
                        pos.status === 'Pendiente' ? 'bg-amber-100 text-amber-500' :
                          'bg-zinc-100 text-zinc-600'
                        }`}>
                        {pos.status}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(pos)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => triggerDelete(pos.id)}
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Editar Designación' : 'Nueva Designación'}
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
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Docente</label>
            <select
              required
              value={formData.teacher_id}
              onChange={e => setFormData({ ...formData, teacher_id: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
              <option value="" disabled>Seleccione un docente</option>
              {teachers.map(teach => (
                <option key={teach.id} value={teach.id}>{teach.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Cargo (Ej. Profesor de Historia)</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Tipo de Designación</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="Titular">Titular</option>
                <option value="Interino">Interino</option>
                <option value="Suplente">Suplente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Estado</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="Activo">Activo</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          {formData.type === 'Suplente' && (
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> Cargo que Reemplaza
              </label>
              <select
                value={formData.linked_position_id}
                onChange={e => setFormData({ ...formData, linked_position_id: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="">Ninguno (Opcional)</option>
                {positions.filter(p => p.id !== currentId).map(pos => (
                  <option key={pos.id} value={pos.id}>
                    {pos.title} - {pos.teachers?.full_name} ({pos.institutions?.name})
                  </option>
                ))}
              </select>
            </div>
          )}

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
        title="Eliminar Designación"
        message="¿Estás seguro de que deseas eliminar esta designación? Esta acción no se puede deshacer."
      />
    </div>
  );
};

export default Positions;

