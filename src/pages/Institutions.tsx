import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, MapPin, Phone, Mail, FileSpreadsheet, FileText, ExternalLink, Edit2, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getGoogleMapsUrl } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import ExportModal from '../components/ExportModal';

const Institutions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Confirm Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Export Modal State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'excel'>('pdf');
  const [exportFilename, setExportFilename] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('institutions').select('*').order('name');
      if (error) throw error;
      setInstitutions(data || []);
    } catch (error) {
      console.error('Error fetching institutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = institutions.filter(inst =>
    inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inst.email && inst.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (inst?: any) => {
    if (inst) {
      setIsEditing(true);
      setCurrentId(inst.id);
      setFormData({
        name: inst.name,
        code: inst.code,
        address: inst.address || '',
        phone: inst.phone || '',
        email: inst.email || ''
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', code: '', address: '', phone: '', email: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && currentId) {
        const { error } = await supabase.from('institutions').update(formData).eq('id', currentId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('institutions').insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchInstitutions();
    } catch (error: any) {
      alert('Error guardando institución: ' + error.message);
    }
  };

  const triggerDelete = (id: string) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from('institutions').delete().eq('id', itemToDelete);
      if (error) throw error;
      fetchInstitutions();
    } catch (error: any) {
      alert('Error eliminando: ' + error.message);
    } finally {
      setItemToDelete(null);
    }
  };

  const getStandardFilename = (ext: string) => {
    const date = new Date().toISOString().split('T')[0];
    return `instituciones_${date}.${ext}`;
  };

  const handleOpenExport = (type: 'pdf' | 'excel') => {
    setExportType(type);
    setExportFilename(getStandardFilename(type === 'pdf' ? 'pdf' : 'xlsx'));
    setIsExportOpen(true);
  };

  const runExport = () => {
    const date = new Date().toISOString().split('T')[0];
    if (exportType === 'pdf') {
      const doc = new jsPDF() as any;
      doc.setFontSize(18);
      doc.text('EduGestión - Listado de Instituciones', 14, 20);
      doc.setFontSize(10);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-AR')}`, 14, 28);

      autoTable(doc, {
        startY: 35,
        head: [['Código', 'Nombre', 'Dirección', 'Email', 'Teléfono']],
        body: filtered.map(i => [i.code, i.name, i.address, i.email, i.phone]),
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 9 },
      });
      doc.save(exportFilename);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(filtered.map(i => ({
        'Código': i.code,
        'Nombre': i.name,
        'Dirección': i.address || '',
        'Email': i.email || '',
        'Teléfono': i.phone || ''
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Instituciones");
      XLSX.writeFile(workbook, exportFilename);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Instituciones</h2>
          <p className="text-zinc-500">Administra las instituciones educativas registradas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => handleOpenExport('pdf')}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 rounded-lg text-zinc-700 text-sm font-semibold transition-colors"
            >
              <FileText className="w-4 h-4 text-red-500" />
              PDF
            </button>
            <div className="w-px h-4 bg-zinc-200"></div>
            <button
              onClick={() => handleOpenExport('excel')}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 rounded-lg text-zinc-700 text-sm font-semibold transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Excel
            </button>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Nueva Institución
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100">
        <div className="p-4 border-b border-zinc-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Cargando instituciones...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No hay instituciones creadas.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Código</th>
                  <th className="px-6 py-4 font-semibold">Institución</th>
                  <th className="px-6 py-4 font-semibold">Contacto</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((inst) => (
                  <tr key={inst.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs font-bold">
                        {inst.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900">{inst.name}</span>
                        {inst.address && (
                          <a
                            href={getGoogleMapsUrl(inst.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:underline mt-1 transition-colors"
                          >
                            <MapPin className="w-3 h-3" />
                            {inst.address}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {inst.phone && (
                          <div className="flex items-center gap-2 text-xs text-zinc-600">
                            <Phone className="w-3 h-3" />
                            {inst.phone}
                          </div>
                        )}
                        {inst.email && (
                          <div className="flex items-center gap-2 text-xs text-zinc-600">
                            <Mail className="w-3 h-3" />
                            {inst.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(inst)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => triggerDelete(inst.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
        title={isEditing ? 'Editar Institución' : 'Nueva Institución'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Código</label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Nombre</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Dirección</label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
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
        title="Eliminar Institución"
        message="¿Estás seguro de que deseas eliminar esta institución? Esta acción no se puede deshacer."
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onConfirm={runExport}
        title="Confirmar Exportación"
        filename={exportFilename}
        type={exportType}
      />
    </div>
  );
};

export default Institutions;

