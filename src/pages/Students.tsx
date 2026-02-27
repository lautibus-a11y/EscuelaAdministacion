import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, User, School, FileText, FileSpreadsheet, Edit2, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import ExportModal from '../components/ExportModal';

const Students = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<any[]>([]);
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
    full_name: '',
    institution_id: '',
    grade: '',
    observations: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, instRes] = await Promise.all([
        supabase.from('students').select('*, institutions(name)').order('full_name'),
        supabase.from('institutions').select('id, name').order('name')
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (instRes.error) throw instRes.error;

      setStudents(studentsRes.data || []);
      setInstitutions(instRes.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.institutions?.name && s.institutions.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (student?: any) => {
    if (student) {
      setIsEditing(true);
      setCurrentId(student.id);
      setFormData({
        full_name: student.full_name,
        institution_id: student.institution_id,
        grade: student.grade,
        observations: student.observations || ''
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ full_name: '', institution_id: institutions[0]?.id || '', grade: '', observations: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && currentId) {
        const { error } = await supabase.from('students').update(formData).eq('id', currentId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('students').insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert('Error guardando alumno: ' + error.message);
    }
  };

  const triggerDelete = (id: string) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from('students').delete().eq('id', itemToDelete);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error eliminando: ' + error.message);
    } finally {
      setItemToDelete(null);
    }
  };

  const getStandardFilename = (ext: string) => {
    const date = new Date().toISOString().split('T')[0];
    return `alumnos_${date}.${ext}`;
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
      doc.text('EduGestión - Listado de Alumnos', 14, 20);
      doc.setFontSize(10);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-AR')}`, 14, 28);

      autoTable(doc, {
        startY: 35,
        head: [['Nombre', 'Institución', 'Grado', 'Observaciones']],
        body: filtered.map(s => [s.full_name, s.institutions?.name || 'N/A', s.grade, s.observations || '']),
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 9 },
      });
      doc.save(exportFilename);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(filtered.map(s => ({
        'Nombre': s.full_name,
        'Institución': s.institutions?.name || 'N/A',
        'Grado': s.grade,
        'Observaciones': s.observations || ''
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Alumnos");
      XLSX.writeFile(workbook, exportFilename);
    }
  };

  const downloadFicha = (student: any) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Ficha del Alumno', 14, 20);
    doc.setFontSize(12);
    doc.text(`Nombre: ${student.full_name}`, 14, 40);
    doc.text(`Institución: ${student.institutions?.name || 'N/A'}`, 14, 50);
    doc.text(`Grado: ${student.grade}`, 14, 60);
    doc.text(`Observaciones: ${student.observations || 'Ninguna'}`, 14, 70);
    doc.save(`ficha_${student.full_name.replace(/\s/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Alumnos</h2>
          <p className="text-zinc-500">Registro administrativo interno de alumnos.</p>
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
            Nuevo Alumno
          </button>
        </div>
      </div>

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
            <div className="p-8 text-center text-zinc-500">Cargando alumnos...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No hay alumnos registrados.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Alumno</th>
                  <th className="px-6 py-4 font-semibold hidden md:table-cell">Institución / Grado</th>
                  <th className="px-6 py-4 font-semibold hidden lg:table-cell">Observaciones</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 flex-shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-zinc-900">{student.full_name}</span>
                          <span className="text-xs text-zinc-500 md:hidden">{student.institutions?.name} - {student.grade}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-sm text-zinc-700 font-medium">
                          <School className="w-3 h-3" />
                          {student.institutions?.name || 'Sin institución'}
                        </div>
                        <span className="text-xs text-zinc-500 mt-0.5">{student.grade}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <p className="text-sm text-zinc-600 line-clamp-1">{student.observations || '-'}</p>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => downloadFicha(student)}
                          className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-emerald-600 transition-colors"
                          title="Descargar Ficha"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(student)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => triggerDelete(student.id)}
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
        title={isEditing ? 'Editar Alumno' : 'Nuevo Alumno'}
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
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Grado/Curso</label>
            <input
              type="text"
              required
              value={formData.grade}
              onChange={e => setFormData({ ...formData, grade: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Observaciones</label>
            <textarea
              value={formData.observations}
              onChange={e => setFormData({ ...formData, observations: e.target.value })}
              rows={3}
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
        title="Eliminar Alumno"
        message="¿Estás seguro de que deseas eliminar este alumno? Esta acción no se puede deshacer."
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

export default Students;

