import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const LayoutHeader: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const showDashboard = hasPermission('USER_VIEW');
  const showTickets = hasPermission('TICKET_VIEW');
  const showSettings = hasPermission('USER_VIEW') || hasPermission('ROLE_VIEW') || hasPermission('AUDIT_VIEW');

  return (
    <>
      {/* Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Slide-out Sidebar Drawer */}
      <div
        className={`fixed top-0 left-0 h-screen z-50 w-64 bg-white dark:bg-[#0b0f19]/95 backdrop-blur-md border-r border-slate-200 dark:border-cyan-500/30 shadow-[4px_0_24px_rgba(34,211,238,0.15)] transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <span className="text-sm font-black tracking-widest text-cyan-400 font-mono uppercase">Menu</span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-slate-400 hover:text-white transition-colors p-2"
          >
            ✕
          </button>
        </div>
        <nav className="flex flex-col gap-2 p-4">
          {showDashboard && (
            <NavLink
              to="/dashboard"
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-xs uppercase tracking-wider transition-all border ${isActive
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)] font-bold'
                  : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              <span className="text-[16px]">■</span> Dashboard
            </NavLink>
          )}

          {showTickets && (
            <NavLink
              to="/tickets"
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-xs uppercase tracking-wider transition-all border ${isActive
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)] font-bold'
                  : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              <span className="text-[16px]">⇄</span> Tickets Queue
            </NavLink>
          )}

          <NavLink
            to="/settings"
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-xs uppercase tracking-wider transition-all border ${isActive
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)] font-bold'
                : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            <span className="text-[16px]">⚙</span> {showSettings ? 'Settings' : 'Settings'}
          </NavLink>
        </nav>
      </div>

      <header className="sticky top-0 z-30 w-full bg-slate-900/60 backdrop-blur-md border-b border-slate-800/60 shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left Side: Toggle & Glowing Title/Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-cyan-400 hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] rounded-lg border border-cyan-500/30 transition-all flex flex-col gap-1 items-center justify-center w-10 h-10"
            >
              <div className="w-5 h-0.5 bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
              <div className="w-5 h-0.5 bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
              <div className="w-5 h-0.5 bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
            </button>

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
          </div>

          {/* Right Side: Theme Toggle, Profile & Logout */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 mr-2 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-inner hover:shadow-md transition-all duration-300 flex items-center justify-center w-10 h-10"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <span className="text-xl filter drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]">☀️</span>
              ) : (
                <span className="text-xl">🌙</span>
              )}
            </button>

            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-200 font-mono tracking-wider">
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
    </>
  );
};
export default LayoutHeader;
