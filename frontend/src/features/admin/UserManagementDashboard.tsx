import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { AdminTicketsQueue } from './AdminTicketsQueue';
import { Dashboard } from './Dashboard';

// Simple Toast Component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colorClasses = () => {
    switch (type) {
      case 'success': return 'bg-emerald-900/90 border-emerald-500/50 text-emerald-300';
      case 'info': return 'bg-cyan-900/90 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]';
      default: return 'bg-rose-900/90 border-rose-500/50 text-rose-300';
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-2xl border font-mono text-sm tracking-widest uppercase animate-in slide-in-from-bottom-5 z-50 ${colorClasses()}`}>
      {message}
    </div>
  );
};

export const UserManagementDashboard: React.FC = () => {
  const { logout, user, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialTab = () => {
    if (location.pathname.includes('/tickets')) return 'tickets';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'tickets'>(getInitialTab);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleTabChange = (tab: 'dashboard' | 'tickets') => {
    setActiveTab(tab);
    if (tab === 'dashboard') navigate('/dashboard');
    else if (tab === 'tickets') navigate('/tickets');
  };

  useEffect(() => {
    if (location.state?.infoMessage) {
      setToast({ message: location.state.infoMessage, type: 'info' });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200 font-sans flex overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Sidebar Layout */}
      <aside className="w-80 p-6 pr-3 flex flex-col h-screen shrink-0">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 h-full flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-y-auto">
          <div className="mb-10">
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider uppercase">
              {user?.role?.name || 'ADMIN'} CONSOLE
            </h1>
          </div>
          <nav className="flex-1 space-y-3">
            {hasPermission('USER_VIEW') && (
              <button
                onClick={() => handleTabChange('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl font-medium transition-all text-sm uppercase tracking-wider ${activeTab === 'dashboard' ? 'bg-white/10 border border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]' : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
              >
                Dashboard
              </button>
            )}
            {hasPermission('TICKET_VIEW') && (
              <button
                onClick={() => handleTabChange('tickets')}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl font-medium transition-all text-sm uppercase tracking-wider ${activeTab === 'tickets' ? 'bg-white/10 border border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]' : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
              >
                Tickets Queue
              </button>
            )}
            {(hasPermission('USER_VIEW') || hasPermission('ROLE_VIEW') || hasPermission('AUDIT_VIEW')) && (
              <Link
                to="/settings"
                className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-medium transition-all text-sm uppercase tracking-wider border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
              >
                Settings
              </Link>
            )}
          </nav>
          <div className="mt-auto border-t border-white/10 pt-6 space-y-3">
            <div className="text-center text-[10px] font-mono text-slate-500 uppercase tracking-widest break-all">
              {user?.email}
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white rounded-xl font-bold transition-all text-xs uppercase tracking-widest"
            >
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 p-6 pl-3 h-screen overflow-y-auto">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl h-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col">
          {/* TOP HEADER */}
          <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20 shrink-0">
            <h2 className="text-xl font-bold text-white tracking-widest uppercase flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
              {activeTab === 'dashboard' && 'Executive Metrics Dashboard'}
              {activeTab === 'tickets' && 'Ticket Queue Management'}
            </h2>
          </div>

          {/* CONTENT */}
          <div className="flex-grow min-h-0 flex flex-col p-6 overflow-y-auto">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'tickets' && <AdminTicketsQueue />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserManagementDashboard;
