import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRoles, createUser } from '../api/users';

export default function CreateUserPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Use roleId to match backend requirements, but align with user's requested state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roleId: '',
    status: 'ACTIVE'
  });
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });

  useEffect(() => {
    if (roles.length > 0 && !formData.roleId) {
      const customerRole = roles.find(r => r.name === 'CUSTOMER');
      if (customerRole) {
        setFormData(prev => ({ ...prev, roleId: customerRole.id }));
      } else {
        setFormData(prev => ({ ...prev, roleId: roles[0].id }));
      }
    }
  }, [roles, formData.roleId]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('USER CREATED SUCCESSFULLY. Password is Welcome@123', 'success');
      setTimeout(() => navigate('/settings', { state: { tab: 'directory' } }), 1500);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to register new user instance', 'error');
      console.error("Failed to register new user instance:", err);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.roleId) {
      showToast('NAME, EMAIL AND ROLE ARE REQUIRED', 'error');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-full w-full flex flex-col relative">
      {/* Toast Overlay */}
      {toast && (
        <div className="absolute top-6 right-6 z-50 animate-slide-in">
          <div className={`backdrop-blur-xl border px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-3 font-mono text-sm ${toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/50 text-rose-600 dark:text-rose-400'
            }`}>
            <span className={`w-2 h-2 rounded-full animate-ping ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto p-6 flex flex-col gap-6 animate-fade-in">

        {/* 📌 BAR HEADER HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Register System Account
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Instantiate a new user profile identity and assign operational routing authorization privileges.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/settings', { state: { tab: 'directory' } })}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl uppercase tracking-wider transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Processing...' : 'Confirm & Add User'}
            </button>
          </div>
        </div>

        {/* CARD CANVAS LAYER */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6 bg-white dark:bg-[#0b0f19] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm">

          {/* Full Width for Name Input */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Full Name</label>
            <input
              type="text"
              required
              placeholder="Enter full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-2.5 text-xs font-bold focus:outline-none"
            />
          </div>

          {/* Full Width for Email Input */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Email Address</label>
            <input
              type="email"
              required
              placeholder="user@system.net"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-2.5 text-xs font-bold focus:outline-none"
            />
          </div>

          {/* Dropdown System Role Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">System Role</label>
            <select
              value={formData.roleId}
              onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
              disabled={isLoadingRoles}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-2.5 text-xs font-bold focus:outline-none"
            >
              {isLoadingRoles && <option value="">Loading...</option>}
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Lifecycle Status Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Account Lifecycle Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-2.5 text-xs font-bold focus:outline-none"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>

        </div>
      </form>
    </div>
  );
}
