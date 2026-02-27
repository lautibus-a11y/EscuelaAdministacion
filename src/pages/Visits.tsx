import React, { useState, useEffect } from 'react';
import { Plus, Search, School, Calendar, User, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';

const Visits = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [visits, setVisits] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
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
    visit_date: '',
    purpose: '',
    notes: '',
    status: 'Programada'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitsRes, instRes] = await Promise.all([
        supabase.from('visits').select(`
          *,
          institutions(name),
          profiles(full_name)
        `).order('visit_date', { ascending: false }),
        supabase.from('institutions').select('id, name').order('name')
      ]);

      if (visitsRes.error) throw visitsRes.error;
      if (instRes.error) throw instRes.error;

      setVisits(visitsRes.data || []);
      setInstitutions(instRes.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = visits.filter(v =>
    (v.institutions?.name && v.institutions.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.profiles?.full_name && v.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.purpose && v.purpose.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (visit?: any) => {
    if (visit) {
      setIsEditing(true);
      setCurrentId(visit.id);
      setFormData({
        institution_id: visit.institution_id || '',
        visit_date: visit.visit_date ? String(visit.visit_date).substring(0, 10) : '',
        purpose: visit.purpose || '',
        notes: visit.notes || '',
        status: visit.status || 'Programada'
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({
        institution_id: institutions[0]?.id || '',
        visit_date: new Date().toISOString().substring(0, 10),
        purpose: '',
        notes: '',
        status: 'Programada'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('No hay sesión activa.');

    try {
      const payload = {
        ...formData,
        user_id: user.id
      };

      if (isEditing && currentId) {
        const { error } = await supabase.from('visits').update(payload).eq('id', currentId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('visits').insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert('Error guardando visita: ' + error.message);
    }
  };

  const triggerDelete = (id: string) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from('visits').delete().eq('id', itemToDelete);
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
          <h2 className="text-2xl font-bold text-zinc-900">Visitas y Observaciones</h2>
          <p className="text-zinc-500">Registro de visitas de supervisión y comentarios técnicos.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nueva Visita
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100">
        <div className="p-4 border-b border-zinc-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por institución, propósito o supervisor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Cargando visitas...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No hay visitas registradas.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Institución / Fecha</th>
                  <th className="px-6 py-4 font-semibold hidden md:table-cell">Propósito / Notas</th>
                  <th className="px-6 py-4 font-semibold hidden lg:table-cell">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((visit) => (
                  <tr key={visit.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                          <School className="w-4 h-4 text-emerald-600" />
                          {visit.institutions?.name || 'Sin institución'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1">
                          <Calendar className="w-3 h-3 text-zinc-400" />
                          {visit.visit_date ? new Date(visit.visit_date).toLocaleDateString() : '-'}
                        </div>
                        <div className="md:hidden mt-2 flex flex-col gap-1">
                          <span className="text-xs text-zinc-600 font-medium line-clamp-1">{visit.purpose}</span>
                          <span className={`inline-block w-fit px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${visit.status === 'Completada' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {visit.status}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-sm text-zinc-700 font-medium">
                          <Calendar className="w-3 h-3" />
                          {visit.visit_date ? new Date(visit.visit_date).toLocaleDateString() : '-'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                          <User className="w-3 h-3" />
                          {visit.profiles?.full_name || 'Desconocido'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-zinc-800 line-clamp-1">{visit.purpose}</span>
                        <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{visit.notes || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${visit.status === 'Completada' ? 'bg-emerald-100 text-emerald-700' :
                        visit.status === 'Programada' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                        {visit.status}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(visit)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => triggerDelete(visit.id)}
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
        title={isEditing ? 'Editar Visita' : 'Nueva Visita'}
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
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Fecha de Visita</label>
              <input
                type="date"
                required
                value={formData.visit_date}
                onChange={e => setFormData({ ...formData, visit_date: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Estado</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="Programada">Programada</option>
                <option value="Completada">Completada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Propósito de la Visita</label>
            <input
              type="text"
              required
              value={formData.purpose}
              onChange={e => setFormData({ ...formData, purpose: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Notas / Observaciones</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
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

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Visita"
        message="¿Estás seguro de que deseas eliminar esta visita? Esta acción no se puede deshacer."
      />
    </div>
  );
};

export default Visits;

