import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LayoutHeader: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const showDashboard = hasPermission('USER_VIEW');
  const showTickets = hasPermission('TICKET_VIEW');
  const showSettings = hasPermission('USER_VIEW') || hasPermission('ROLE_VIEW') || hasPermission('AUDIT_VIEW');

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-900/60 backdrop-blur-md border-b border-slate-800/60 shrink-0">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left Side: Glowing Title/Logo */}
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse"></div>
          <div className="flex flex-col items-start justify-center leading-none">
            <span className="text-l font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 font-mono uppercase">
              SUPER ADMIN
            </span>
            <span className="text-l font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 font-mono uppercase mt-0.5">
              PORTAL
            </span>
          </div>
        </div>

        {/* Center Navigation Menu */}
        <nav className="flex items-center gap-2">
          {showDashboard && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs uppercase tracking-wider transition-all border ${isActive
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)] font-bold'
                  : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              <span className="text-[10px]">■</span> Dashboard
            </NavLink>
          )}

          {showTickets && (
            <NavLink
              to="/tickets"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs uppercase tracking-wider transition-all border ${isActive
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)] font-bold'
                  : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              <span className="text-[10px]">⇄</span> Tickets Queue
            </NavLink>
          )}

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs uppercase tracking-wider transition-all border ${isActive
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)] font-bold'
                : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            <span className="text-[10px]">⚙</span> {showSettings ? 'Admin Settings' : 'Settings'}
          </NavLink>
        </nav>

        {/* Right Side: Profile & Logout */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-200 font-mono tracking-wider">
              {user?.name}
            </span>
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
              {user?.role?.name?.replace('_', ' ')}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center px-4 py-2 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/30 text-rose-400 text-xs font-mono font-bold uppercase tracking-widest rounded-xl transition-all"
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
};

export default LayoutHeader;
