import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });

      // We no longer block login for required password changes.

      const { accessToken, user, requiresPasswordChange } = response.data;

      // Store token and user info using AuthContext
      login(accessToken, user);

      const navState = requiresPasswordChange ? { infoMessage: "You are currently using a temporary password. You can update it anytime in Settings." } : {};

      // Decode token to extract accessTier for routing
      let accessTier = 'L1';
      try {
        const decoded = JSON.parse(atob(accessToken.split('.')[1]));
        accessTier = decoded.accessTier;
      } catch (e) { }

      // Redirect based on Engineering Tier
      if (['L1_SUPPORT', 'L1_ENGINEER'].includes(accessTier)) {
        navigate('/tickets', { state: { ...navState, viewMode: 'default_triage' } });
      } else if (['L2_ANALYST', 'L2_ENGINEER'].includes(accessTier)) {
        navigate('/tickets', { state: { ...navState, viewMode: 'l2_optimization' } });
      } else if (['L3_ARCHITECT', 'L3_ENGINEER'].includes(accessTier)) {
        navigate('/tickets', { state: { ...navState, viewMode: 'high_alert_incident' } });
      } else if (user.permissions?.includes('USER_VIEW')) {
        navigate('/dashboard', { state: navState });
      } else if (user.systemRole === 'CUSTOMER' || user.email === 'user1@example.com' || user.permissions?.includes('TICKET_CREATE')) {
        navigate('/portal', { state: navState });
      } else {
        navigate('/settings', { state: navState });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#030712] flex items-center justify-center p-4 transition-colors duration-300 relative overflow-hidden">
      <div className="w-full max-w-md bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-8 shadow-[0_8px_40px_-6px_rgba(15,23,42,0.06)] backdrop-blur-md transition-all duration-300 flex flex-col gap-6">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight text-center uppercase">
          LOGIN
        </h1>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2 block">Email Address</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/60 transition-all duration-200 font-medium"
                placeholder="user@system.net"
              />
            </div>

            <div>
              <label className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2 block">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/60 transition-all duration-200 font-medium"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 text-xs font-mono p-3 rounded-lg flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs tracking-wider uppercase py-3.5 px-4 rounded-xl shadow-md shadow-sky-600/10 hover:shadow-sky-500/20 transform hover:-translate-y-0.5 transition-all duration-200 mt-2 focus:outline-none flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>
      </div>
    </div>
  );
};

export default Login;
