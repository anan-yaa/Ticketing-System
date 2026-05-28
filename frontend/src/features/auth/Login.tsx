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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black font-sans text-slate-200">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider mb-2">
              LOGIN
            </h1>

          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Email Address</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all placeholder-slate-700 font-mono text-sm"
                placeholder="user@system.net"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all placeholder-slate-700 font-mono text-sm tracking-[0.2em]"
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
              className="w-full mt-4 px-4 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all transform hover:-translate-y-1 uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-2"
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
    </div>
  );
};

export default Login;
