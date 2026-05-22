import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, requiredPermission }) => {
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        <p className="mt-6 text-cyan-400 font-mono text-sm tracking-[0.3em] uppercase animate-pulse">Initializing Session</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission) {
    if (!hasPermission(requiredPermission)) {
      return <Navigate to="/unauthorized" replace />;
    }
  } else if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role.name)) {
    // Redirect based on their actual role if they don't have access
    if (user.role.name === 'SUPER_ADMIN') {
      return <Navigate to="/dashboard" replace />;
    } else if (user.role.name === 'ADMIN') {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/customer/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
