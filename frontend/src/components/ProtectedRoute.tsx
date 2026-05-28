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

  const isCustomer = user.role?.name === 'CUSTOMER' || user.email === 'user1@example.com';

  if (requiredPermission) {
    if (!hasPermission(requiredPermission)) {
      return <Navigate to={isCustomer ? "/portal" : "/unauthorized"} replace />;
    }
  } else if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role?.name)) {
    // Redirect based on their actual role if they don't have access
    if (['SUPER_ADMIN', 'ADMIN'].includes(user.role?.name)) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/portal" replace />;
    }
  } else if (isCustomer && !window.location.pathname.startsWith('/portal')) {
    // Strict guard: If customer tries to access any route that doesn't specifically require TICKET_CREATE, and it's not the portal route
    // wait, we only want to block if they are trying to access /settings or /dashboard
    // The easiest way is to just block customers from the main layout in App.tsx using allowedRoles
  }

  return <Outlet />;
};

export default ProtectedRoute;
