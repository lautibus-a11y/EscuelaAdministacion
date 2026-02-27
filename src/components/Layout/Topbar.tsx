import React from 'react';
import { Bell, Search, User, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TopbarProps {
  onMenuClick: () => void;
}

const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-zinc-100 rounded-lg text-zinc-600"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="hidden md:flex items-center bg-zinc-100 px-3 py-1.5 rounded-full w-64 lg:w-96">
          <Search className="w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="bg-transparent border-none focus:ring-0 text-sm w-full ml-2 outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <button className="relative text-zinc-500 hover:text-zinc-900 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="flex items-center gap-2 md:gap-3 pl-3 md:pl-6 border-l border-zinc-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-zinc-900">{user?.full_name}</p>
            <p className="text-xs text-zinc-500 capitalize">{user?.role}</p>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-600">
            <User className="w-5 h-5 md:w-6 h-6" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
