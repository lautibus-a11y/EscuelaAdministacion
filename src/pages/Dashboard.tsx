import React, { useEffect, useState } from 'react';
import { School, Users, UserSquare2, Briefcase, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-zinc-500 text-sm font-medium">{title}</p>
        <h3 className="text-3xl font-bold mt-1 text-zinc-900">{value}</h3>
        {trend && (
          <div className="flex items-center gap-1 mt-2 text-emerald-600">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-semibold">{trend} este mes</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    institutions: 0,
    students: 0,
    teachers: 0,
    activePositions: 0
  });

  const [recentPositions, setRecentPositions] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch Counts
      const [instCount, stuCount, teachCount, posCount] = await Promise.all([
        supabase.from('institutions').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('teachers').select('*', { count: 'exact', head: true }),
        supabase.from('positions').select('*', { count: 'exact', head: true }).eq('status', 'Activo')
      ]);

      setStats({
        institutions: instCount.count || 0,
        students: stuCount.count || 0,
        teachers: teachCount.count || 0,
        activePositions: posCount.count || 0
      });

      // Fetch Recent Positions
      const { data: positionsData } = await supabase
        .from('positions')
        .select(`*, institutions(name), teachers(full_name)`)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentPositions(positionsData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Resumen General</h2>
        <p className="text-zinc-500">Bienvenido al panel de control de EduGestión.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Instituciones"
          value={stats.institutions}
          icon={School}
          trend=""
          color="bg-blue-500"
        />
        <StatCard
          title="Alumnos"
          value={stats.students}
          icon={Users}
          trend=""
          color="bg-emerald-500"
        />
        <StatCard
          title="Docentes"
          value={stats.teachers}
          icon={UserSquare2}
          trend=""
          color="bg-violet-500"
        />
        <StatCard
          title="Designaciones Activas"
          value={stats.activePositions}
          icon={Briefcase}
          trend=""
          color="bg-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-bold text-zinc-900">Últimas Designaciones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Docente</th>
                  <th className="px-6 py-4 font-semibold">Institución</th>
                  <th className="px-6 py-4 font-semibold">Cargo</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentPositions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                      Aún no hay designaciones registradas.
                    </td>
                  </tr>
                ) : (
                  recentPositions.map((pos) => (
                    <tr key={pos.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-zinc-900">{pos.teachers?.full_name || 'Desconocido'}</td>
                      <td className="px-6 py-4 text-sm text-zinc-600">{pos.institutions?.name || 'Desconocida'}</td>
                      <td className="px-6 py-4 text-sm text-zinc-600">{pos.title} ({pos.type})</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${pos.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                          {pos.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-zinc-900">Avisos del Sistema</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-sm font-bold text-blue-900">Sistema Actualizado</p>
              <p className="text-xs text-blue-700 mt-1">
                CRUD y conexión con Supabase habilitados correctamente.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-sm font-bold text-emerald-900">Dashboard En Vivo</p>
              <p className="text-xs text-emerald-700 mt-1">
                Los datos de este panel ahora se actualizan en base a tu información real.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

