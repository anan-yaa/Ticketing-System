import React from 'react';
import { Link } from 'react-router-dom';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-6">
        {/* Cyberpunk warning sign */}
        <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
          <svg className="w-10 h-10 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-widest text-white uppercase">Access Denied</h1>
          <p className="text-xs font-mono text-rose-400 uppercase tracking-widest">Error Code: 403 Forbidden</p>
        </div>

        <p className="text-sm text-slate-400 font-sans leading-relaxed">
          You do not have permission to access this module.
        </p>

        <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
          <Link
            to="/dashboard"
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all uppercase tracking-widest text-xs"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
