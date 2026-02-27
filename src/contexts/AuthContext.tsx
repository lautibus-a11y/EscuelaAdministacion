import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulamos la carga inicial
    const storedAuth = localStorage.getItem('isLocalAuthenticated');
    if (storedAuth === 'true') {
      setUser({
        id: '00000000-0000-0000-0000-000000000000',
        email: 'administrador@escuela.com',
        full_name: 'Administrador Principal',
        role: 'admin',
      });
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    // Dummy authentication delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (email === 'administrador@escuela.com' && pass === 'admin1221') {
      localStorage.setItem('isLocalAuthenticated', 'true');
      setUser({
        id: '00000000-0000-0000-0000-000000000000',
        email: 'administrador@escuela.com',
        full_name: 'Administrador Principal',
        role: 'admin',
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    throw new Error('Credenciales inválidas. Usa administrador@escuela.com / admin1221');
  };

  const logout = async () => {
    localStorage.removeItem('isLocalAuthenticated');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
