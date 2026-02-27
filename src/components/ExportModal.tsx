import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, FileSpreadsheet, Download, X } from 'lucide-react';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    filename: string;
    type: 'pdf' | 'excel';
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onConfirm, title, filename, type }) => {
    if (!isOpen) return null;

    const isPdf = type === 'pdf';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
                >
                    <div className="flex items-center justify-between p-6 border-b border-zinc-100">
                        <h3 className="text-xl font-bold text-zinc-900">{title}</h3>
                        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-xl transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6">
                        <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100 mb-6">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isPdf ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {isPdf ? <FileText className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-900 truncate">{filename}</p>
                                <p className="text-xs text-zinc-500 uppercase font-bold">{isPdf ? 'Documento PDF' : 'Libro de Excel'}</p>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6">
                            <p className="text-sm text-blue-700">
                                El archivo se guardará automáticamente en tu carpeta de <strong>Descargas</strong>.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 bg-zinc-100 text-zinc-700 font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white font-semibold rounded-xl transition-colors shadow-lg ${isPdf ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                                    }`}
                            >
                                <Download className="w-4 h-4" />
                                Confirmar y Guardar
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ExportModal;
