import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  School,
  Users,
  UserSquare2,
  Briefcase,
  ClipboardCheck,
  BarChart3,
  LogOut,
  X,
  BookOpen,
  RefreshCw,
  History
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { role, logout } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['admin', 'supervisor', 'teacher'] },
    { icon: School, label: 'Instituciones', path: '/institutions', roles: ['admin', 'supervisor'] },
    { icon: Users, label: 'Alumnos', path: '/students', roles: ['admin', 'teacher'] },
    { icon: UserSquare2, label: 'Docentes', path: '/teachers', roles: ['admin'] },
    { icon: BookOpen, label: 'Cursos', path: '/courses', roles: ['admin', 'supervisor'] },
    { icon: Briefcase, label: 'Cargos', path: '/positions', roles: ['admin', 'supervisor'] },
    { icon: RefreshCw, label: 'Suplencias', path: '/substitutions', roles: ['admin', 'supervisor'] },
    { icon: ClipboardCheck, label: 'Visitas', path: '/visits', roles: ['admin', 'supervisor'] },
    { icon: BarChart3, label: 'Estadísticas', path: '/stats', roles: ['admin', 'supervisor'] },
    { icon: History, label: 'Historial', path: '/activity', roles: ['admin', 'supervisor'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role || ''));

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 text-zinc-400 flex flex-col h-screen border-r border-zinc-800 transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <School className="text-white w-5 h-5" />
          </div>
          <h1 className="text-white font-bold text-xl tracking-tight">EduGestión</h1>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-zinc-900 rounded-lg text-zinc-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => onClose()}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group",
              isActive
                ? "bg-emerald-500/10 text-emerald-500"
                : "hover:bg-zinc-900 hover:text-zinc-200"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg hover:bg-zinc-900 hover:text-zinc-200 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
