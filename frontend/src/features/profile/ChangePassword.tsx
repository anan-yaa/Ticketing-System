import React, { useState } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await api.patch('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/settings'), 1500); // Redirect to Settings menu after success
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200 font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white tracking-widest uppercase flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
            Change Password
          </h2>
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors text-xs font-mono uppercase">
            ← Back
          </button>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Current Password</label>
            <input
              required
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all placeholder-slate-700 font-mono text-sm tracking-[0.2em]"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">New Password</label>
            <input
              required
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all placeholder-slate-700 font-mono text-sm tracking-[0.2em]"
              placeholder="••••••••"
            />
          </div>
          
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Confirm New Password</label>
            <input
              required
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all placeholder-slate-700 font-mono text-sm tracking-[0.2em]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 text-xs font-mono p-3 rounded-lg flex items-center gap-2 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 text-xs font-mono p-3 rounded-lg flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success !== null}
            className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
