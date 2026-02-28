import React, { useState, useEffect } from 'react';
import { Search, History, User, School, BookOpen, Briefcase, RefreshCw, ClipboardCheck, Filter, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import ConfirmModal from '../components/ConfirmModal';

const ACTION_COLORS: Record<string, string> = {
    CREAR: 'bg-emerald-100 text-emerald-700',
    EDITAR: 'bg-blue-100 text-blue-700',
    ELIMINAR: 'bg-red-100 text-red-700',
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
    'institución': <School className="w-3.5 h-3.5" />,
    'docente': <User className="w-3.5 h-3.5" />,
    'alumno': <User className="w-3.5 h-3.5" />,
    'cargo': <Briefcase className="w-3.5 h-3.5" />,
    'curso': <BookOpen className="w-3.5 h-3.5" />,
    'asignación': <BookOpen className="w-3.5 h-3.5" />,
    'suplencia': <RefreshCw className="w-3.5 h-3.5" />,
    'visita': <ClipboardCheck className="w-3.5 h-3.5" />,
};

const ActivityLog = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState<string>('todos');
    const [filterEntity, setFilterEntity] = useState<string>('todos');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isClearAllOpen, setIsClearAllOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchLogs();
        // Suscripción en tiempo real
        const channel = supabase
            .channel('activity_logs_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => fetchLogs())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*, profiles(full_name)')
                .order('created_at', { ascending: false })
                .limit(500);
            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error('Error cargando logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = logs.filter(log => {
        const matchSearch =
            log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.entity?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchAction = filterAction === 'todos' || log.action === filterAction;
        const matchEntity = filterEntity === 'todos' || log.entity === filterEntity;
        return matchSearch && matchAction && matchEntity;
    });

    const handleDelete = async () => {
        if (!itemToDelete) return;
        await supabase.from('activity_logs').delete().eq('id', itemToDelete);
        setItemToDelete(null);
        fetchLogs();
    };

    const handleClearAll = async () => {
        await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        fetchLogs();
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    const uniqueEntities = [...new Set(logs.map(l => l.entity))].filter(Boolean);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900">Historial de Actividad</h2>
                    <p className="text-zinc-500">Registro de todas las acciones realizadas en el sistema.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsClearAllOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl font-semibold hover:bg-red-100 transition-colors text-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        Limpiar historial
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Buscar en el historial..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        />
                    </div>
                    {/* Action filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        <select
                            value={filterAction}
                            onChange={e => setFilterAction(e.target.value)}
                            className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="todos">Todas las acciones</option>
                            <option value="CREAR">Crear</option>
                            <option value="EDITAR">Editar</option>
                            <option value="ELIMINAR">Eliminar</option>
                        </select>
                    </div>
                    {/* Entity filter */}
                    <select
                        value={filterEntity}
                        onChange={e => setFilterEntity(e.target.value)}
                        className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="todos">Todas las entidades</option>
                        {uniqueEntities.map(e => {
                            const label = String(e);
                            return <option key={label} value={label}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>;
                        })}
                    </select>
                </div>
            </div>

            {/* Log list */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-zinc-500">Cargando historial...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <History className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                        <p className="text-zinc-400 font-medium">No hay actividad registrada aún.</p>
                        <p className="text-zinc-400 text-sm mt-1">Las acciones en la app se registran aquí automáticamente.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-100">
                        {filtered.map(log => (
                            <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-zinc-50 transition-colors group">
                                {/* Entity icon */}
                                <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 flex-shrink-0 mt-0.5">
                                    {ENTITY_ICONS[log.entity] ?? <History className="w-3.5 h-3.5" />}
                                </div>
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ACTION_COLORS[log.action] ?? 'bg-zinc-100 text-zinc-600'}`}>
                                            {log.action}
                                        </span>
                                        <span className="text-xs text-zinc-500 capitalize font-medium">{log.entity}</span>
                                    </div>
                                    <p className="text-sm text-zinc-800 mt-0.5 leading-snug">{log.description}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-zinc-400">{formatDate(log.created_at)}</span>
                                        {log.profiles?.full_name && (
                                            <span className="text-xs text-zinc-400 flex items-center gap-1">
                                                <User className="w-2.5 h-2.5" />
                                                {log.profiles.full_name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {/* Delete button */}
                                <button
                                    onClick={() => { setItemToDelete(log.id); setIsConfirmOpen(true); }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-all flex-shrink-0"
                                    title="Eliminar este registro"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats bar */}
            {filtered.length > 0 && (
                <div className="flex gap-4 text-sm text-zinc-500 px-1">
                    <span>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
                    {['CREAR', 'EDITAR', 'ELIMINAR'].map(a => {
                        const count = filtered.filter(l => l.action === a).length;
                        return count > 0 ? (
                            <span key={a} className={`px-2 py-0.5 rounded text-[10px] font-bold ${ACTION_COLORS[a]}`}>
                                {a}: {count}
                            </span>
                        ) : null;
                    })}
                </div>
            )}

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Eliminar registro"
                message="¿Eliminar este registro del historial?"
            />
            <ConfirmModal
                isOpen={isClearAllOpen}
                onClose={() => setIsClearAllOpen(false)}
                onConfirm={handleClearAll}
                title="Limpiar historial completo"
                message="¿Estás seguro? Se borrarán TODOS los registros de actividad. Esta acción no se puede deshacer."
            />
        </div>
    );
};

export default ActivityLog;
