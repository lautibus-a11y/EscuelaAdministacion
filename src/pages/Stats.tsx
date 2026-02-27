import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { supabase } from '../lib/supabaseClient';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

const Stats = () => {
  const [dataInstitutions, setDataInstitutions] = useState<any[]>([]);
  const [dataCargos, setDataCargos] = useState<any[]>([]);
  const [totalDocentes, setTotalDocentes] = useState(0);
  const [metrics, setMetrics] = useState({
    visits: 0,
    newPositions: 0
  });

  useEffect(() => {
    fetchStatsData();
  }, []);

  const fetchStatsData = async () => {
    try {
      // Fetch Institutions with Student count
      const { data: instData } = await supabase
        .from('institutions')
        .select(`id, name, students(count)`);

      if (instData) {
        // Prepare chart data
        const chartData = instData.map(inst => ({
          name: inst.name.length > 15 ? inst.name.substring(0, 15) + '...' : inst.name,
          alumnos: inst.students[0]?.count || 0
        })).sort((a, b) => b.alumnos - a.alumnos);
        setDataInstitutions(chartData);
      }

      // Fetch positions for pie chart
      const { data: posData } = await supabase.from('positions').select('type');
      if (posData) {
        const counts: Record<string, number> = { 'Titulares': 0, 'Suplentes': 0, 'Interinos': 0 };
        posData.forEach(p => {
          if (p.type === 'Titular') counts['Titulares']++;
          else if (p.type === 'Suplente') counts['Suplentes']++;
          else if (p.type === 'Interino') counts['Interinos']++;
        });

        setDataCargos(Object.keys(counts).map(k => ({ name: k, value: counts[k] })).filter(c => c.value > 0));
      }

      // Fetch total current teachers for center of pie map
      const { count: teachersCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
      setTotalDocentes(teachersCount || 0);

      // Fetch Visits this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: visitsCount } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .gte('visit_date', startOfMonth.toISOString());

      // Fetch new positions this month
      const { count: positionsMonthCount } = await supabase
        .from('positions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      setMetrics({
        visits: visitsCount || 0,
        newPositions: positionsMonthCount || 0
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Estadísticas y Reportes</h2>
        <p className="text-zinc-500">Visualización de datos generales del sistema.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <h3 className="font-bold text-zinc-900 mb-6">Alumnos por Institución</h3>
          <div className="h-80">
            {dataInstitutions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataInstitutions}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="alumnos" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400">Sin datos</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <h3 className="font-bold text-zinc-900 mb-6">Distribución de Cargos</h3>
          <div className="h-80 flex items-center justify-center relative">
            {dataCargos.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dataCargos}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {dataCargos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-bold text-zinc-900">{totalDocentes}</span>
                  <span className="text-xs text-zinc-500">Docentes</span>
                </div>
              </>
            ) : (
              <div className="text-zinc-400">Sin datos</div>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {dataCargos.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-xs font-medium text-zinc-600">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Visitas este mes', value: metrics.visits, color: 'text-emerald-600' },
          { label: 'Nuevas Designaciones (Mes)', value: metrics.newPositions, color: 'text-blue-600' },
          { label: 'Alertas activas', value: '0', color: 'text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 text-center">
            <p className="text-zinc-500 text-sm font-medium">{stat.label}</p>
            <p className={`text-4xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Stats;

