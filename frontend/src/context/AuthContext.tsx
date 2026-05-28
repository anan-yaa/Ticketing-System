import React, { createContext, useContext, useState, useEffect } from 'react';

type User = {
  id: string;
  role: {
    name: string;
  };
  permissions: string[];
  email: string;
  name: string;
  accessTier?: string;
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: string[];
  role: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (permissionKey: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('jwt_token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    // Simulate initialization delay for smooth UX
    setTimeout(() => {
      setIsLoading(false);
    }, 400);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('jwt_token', newToken);
    
    try {
      const payloadBase64 = newToken.split('.')[1];
      const decodedJson = atob(payloadBase64);
      const decoded = JSON.parse(decodedJson);
      if (decoded.accessTier) {
        newUser.accessTier = decoded.accessTier;
      }
    } catch (e) {
      console.error('Failed to decode token payload', e);
    }

    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permissionKey: string) => {
    if (!user) return false;
    // SUPER_ADMIN has access to everything
    if (user.role?.name === 'SUPER_ADMIN') return true;
    return user.permissions?.includes(permissionKey) || false;
  };

  const permissions = user?.permissions || [];
  const role = user?.role?.name || null;

  return (
    <AuthContext.Provider value={{ user, token, permissions, role, login, logout, isLoading, hasPermission }}>
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
