import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, UserSquare2, Phone, Mail, FileText, FileSpreadsheet, Edit2, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import ExportModal from '../components/ExportModal';
import { logActivity } from '../lib/activityLog';

const Teachers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [teachers, setTeachers] = useState<any[]>([]);
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
    full_name: '',
    dni: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('teachers').select('*').order('full_name');
      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = teachers.filter(t =>
    t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.dni.includes(searchTerm) ||
    (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (teacher?: any) => {
    if (teacher) {
      setIsEditing(true);
      setCurrentId(teacher.id);
      setFormData({
        full_name: teacher.full_name,
        dni: teacher.dni,
        email: teacher.email || '',
        phone: teacher.phone || ''
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ full_name: '', dni: '', email: '', phone: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && currentId) {
        const { error } = await supabase.from('teachers').update(formData).eq('id', currentId);
        if (error) throw error;
        await logActivity('docente', 'EDITAR', `Docente "${formData.full_name}" editado.`);
      } else {
        const { error } = await supabase.from('teachers').insert([formData]);
        if (error) throw error;
        await logActivity('docente', 'CREAR', `Docente "${formData.full_name}" creado.`);
      }
      setIsModalOpen(false);
      fetchTeachers();
    } catch (error: any) {
      alert('Error guardando docente: ' + error.message);
    }
  };

  const triggerDelete = (id: string) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const teacherToDelete = teachers.find(t => t.id === itemToDelete);
      const { error } = await supabase.from('teachers').delete().eq('id', itemToDelete);
      if (error) throw error;
      if (teacherToDelete) {
        await logActivity('docente', 'ELIMINAR', `Docente "${teacherToDelete.full_name}" eliminado.`);
      }
      fetchTeachers();
    } catch (error: any) {
      alert('Error eliminando: ' + error.message);
    } finally {
      setItemToDelete(null);
    }
  };

  const getStandardFilename = (ext: string) => {
    const date = new Date().toISOString().split('T')[0];
    return `docentes_${date}.${ext}`;
  };

  const handleOpenExport = (type: 'pdf' | 'excel') => {
    setExportType(type);
    setExportFilename(getStandardFilename(type === 'pdf' ? 'pdf' : 'xlsx'));
    setIsExportOpen(true);
  };

  const runExport = () => {
    if (exportType === 'pdf') {
      const doc = new jsPDF() as any;
      doc.setFontSize(18);
      doc.text('EduGestión - Listado de Docentes', 14, 20);
      doc.setFontSize(10);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-AR')}`, 14, 28);

      autoTable(doc, {
        startY: 35,
        head: [['Nombre', 'DNI', 'Email', 'Teléfono']],
        body: filtered.map(t => [t.full_name, t.dni, t.email || '', t.phone || '']),
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 9 },
      });
      doc.save(exportFilename);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(filtered.map(t => ({
        'Nombre': t.full_name,
        'DNI': t.dni,
        'Email': t.email || '',
        'Teléfono': t.phone || ''
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Docentes");
      XLSX.writeFile(workbook, exportFilename);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Docentes</h2>
          <p className="text-zinc-500">Gestión de personal docente y sus datos de contacto.</p>
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
            Registrar Docente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100">
        <div className="p-4 border-b border-zinc-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, DNI o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Cargando docentes...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No hay docentes registrados.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Docente</th>
                  <th className="px-6 py-4 font-semibold hidden md:table-cell">DNI</th>
                  <th className="px-6 py-4 font-semibold hidden lg:table-cell">Contacto</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 flex-shrink-0">
                          <UserSquare2 className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-zinc-900">{teacher.full_name}</span>
                          <span className="text-xs text-zinc-500 md:hidden">DNI: {teacher.dni}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 hidden md:table-cell">{teacher.dni}</td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex flex-col gap-1">
                        {teacher.email && (
                          <div className="flex items-center gap-2 text-xs text-zinc-600">
                            <Mail className="w-3 h-3" />
                            {teacher.email}
                          </div>
                        )}
                        {teacher.phone && (
                          <div className="flex items-center gap-2 text-xs text-zinc-600">
                            <Phone className="w-3 h-3" />
                            {teacher.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 md:gap-2">
                        <button
                          onClick={() => handleOpenModal(teacher)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => triggerDelete(teacher.id)}
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
        title={isEditing ? 'Editar Docente' : 'Nuevo Docente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Nombre Completo</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">DNI</label>
            <input
              type="text"
              required
              value={formData.dni}
              onChange={e => setFormData({ ...formData, dni: e.target.value })}
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
        title="Eliminar Docente"
        message="¿Estás seguro de que deseas eliminar este docente? Esta acción no se puede deshacer."
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

export default Teachers;

