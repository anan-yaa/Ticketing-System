import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  User,
  fetchAuditLogs,
  AuditLog,
  fetchRoles,
  RoleData
} from '../../api/users';
import { RoleManagementPage } from '../admin/RoleManagementPage';
import { MasterDataConfig } from '../admin/MasterDataConfig';

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

const ProfileSettings: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'directory' | 'roles' | 'audit' | 'master-config'>('personal');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showUserDirectory = hasPermission('USER_VIEW');
  const showRoles = hasPermission('ROLE_VIEW');
  const showAudit = hasPermission('AUDIT_VIEW');
  const showMasterConfig = hasPermission('MASTER_DATA_UPDATE');

  // Security (Change Password) State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // User Directory State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [limit] = useState(10);
  const [formData, setFormData] = useState({ name: '', email: '', roleId: '', status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' });

  // Fetch Roles dynamically
  const { data: rolesData } = useQuery<RoleData[]>({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    enabled: showUserDirectory || showRoles
  });
  const roles = rolesData || [];

  // Automatically default roleId to CUSTOMER role when roles load
  useEffect(() => {
    if (roles.length > 0 && !formData.roleId) {
      const customerRole = roles.find(r => r.name === 'CUSTOMER');
      if (customerRole) {
        setFormData(prev => ({ ...prev, roleId: customerRole.id }));
      }
    }
  }, [roles, formData.roleId]);

  // React Query Fetch Users
  const { data: usersData, isLoading: isUsersLoading, isError: isUsersError, error: usersError } = useQuery({
    queryKey: ['users', page, limit, search],
    queryFn: () => fetchUsers(page, limit, search),
    enabled: showUserDirectory && activeTab === 'directory'
  });

  const users: User[] = usersData?.users || [];
  const totalPages = usersData?.totalPages || 1;

  // React Query Fetch Audit Logs
  const { data: auditData, isLoading: isAuditLoading } = useQuery({
    queryKey: ['auditLogs', auditPage],
    queryFn: () => fetchAuditLogs(auditPage, 10),
    enabled: showAudit && activeTab === 'audit',
  });

  const auditLogs: AuditLog[] = auditData?.logs || [];
  const auditTotalPages = auditData?.totalPages || 1;

  // Mutations
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setToast({ message: 'User created successfully. Temporary password is Welcome@123', type: 'success' });
      setIsModalOpen(false);
      const customerRole = roles.find(r => r.name === 'CUSTOMER');
      setFormData({ name: '', email: '', roleId: customerRole?.id || '', status: 'ACTIVE' });
    },
    onError: (err: any) => {
      setToast({ message: err.response?.data?.message || 'Failed to create user', type: 'error' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: any }) => updateUser(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setToast({ message: 'User updated successfully', type: 'success' });
    },
    onError: () => {
      setToast({ message: 'Failed to update user', type: 'error' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setToast({ message: 'User deleted successfully', type: 'success' });
    },
    onError: () => {
      setToast({ message: 'Failed to delete user', type: 'error' });
    }
  });

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    updateMutation.mutate({ id: userId, updates: { status: currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } });
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this entity?")) {
      deleteMutation.mutate(userId);
    }
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToast({ message: 'New passwords do not match', type: 'error' });
      return;
    }

    setPasswordLoading(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });
      setToast({ message: 'Password updated successfully.', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to update password', type: 'error' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case 'SUPER_ADMIN': return 'text-red-400 border-red-500/50 bg-red-900/20 shadow-[0_0_15px_rgba(248,113,113,0.5)]';
      case 'ADMIN': return 'text-orange-400 border-orange-500/50 bg-orange-900/20 shadow-[0_0_15px_rgba(251,146,60,0.5)]';
      case 'CUSTOMER': return 'text-blue-400 border-blue-500/50 bg-blue-900/20 shadow-[0_0_15px_rgba(96,165,250,0.5)]';
      default: return 'text-slate-400 border-slate-600';
    }
  };

  return (
    <div className="w-full">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="w-full flex flex-col min-h-[80vh]">


        {/* Sub-tab menu selection bar */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 dark:border-white/5 pb-6">
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-all rounded-xl border ${activeTab === 'personal'
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
          >
            Personal Information
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-all rounded-xl border ${activeTab === 'security'
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
          >
            Security
          </button>

          {showUserDirectory && (
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-all rounded-xl border ${activeTab === 'directory'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
            >
              User Directory
            </button>
          )}

          {showRoles && (
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-all rounded-xl border ${activeTab === 'roles'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
            >
              Roles & Permissions
            </button>
          )}

          {showAudit && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-all rounded-xl border ${activeTab === 'audit'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
            >
              Audit Log
            </button>
          )}

          {showMasterConfig && (
            <button
              onClick={() => setActiveTab('master-config')}
              className={`px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-all rounded-xl border ${activeTab === 'master-config'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
            >
              Master Data Config
            </button>
          )}
        </div>

        {/* Dynamic viewport layout */}
        <div className="flex-grow">
          {/* PERSONAL INFORMATION */}
          {activeTab === 'personal' && (
            <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
              <p className="theme-body-subtext uppercase">User Profile</p>
              <div className="theme-card-panel p-6 space-y-4 transition-all duration-300">
                <div>
                  <span className="block text-slate-500 font-mono text-xs uppercase mb-1">Name</span>
                  <span className="text-lg font-bold text-white">{user?.name}</span>
                </div>
                <div>
                  <span className="block text-slate-500 font-mono text-xs uppercase mb-1">Email Address</span>
                  <span className="text-sm text-slate-300 font-mono">{user?.email}</span>
                </div>
                <div>
                  <span className="block text-slate-500 font-mono text-xs uppercase mb-2">Assigned Role Badge</span>
                  <span className={`inline-flex items-center px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-lg border bg-black/40 transition-all duration-300 ${getRoleBadge(user?.role?.name || '')}`}>
                    {(user?.role?.name === 'CUSTOMER' ? 'USER' : (user?.role?.name || '')).replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* THEME PREFERENCE BLOCK */}
              <div className="theme-card-panel p-6 flex items-center justify-between transition-all duration-300">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">Interface Appearance</h3>
                  <p className="theme-body-subtext mt-1">Toggle Dark mode and Light mode</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-300 focus:outline-none shadow-inner ${theme === 'dark' ? 'bg-violet-600' : 'bg-slate-300'}`}
                >
                  <span
                    className={`inline-flex h-6 w-6 transform rounded-full bg-white transition-all duration-300 items-center justify-center shadow-md ${theme === 'dark' ? 'translate-x-9' : 'translate-x-1'}`}
                  >
                    <span className="text-xs leading-none">{theme === 'dark' ? '🌙' : '☀️'}</span>
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeTab === 'security' && (
            <div className="max-w-xl mx-auto animate-in fade-in duration-300">
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

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  {passwordLoading ? 'Processing...' : 'Confirm Update'}
                </button>
              </form>
            </div>
          )}

          {/* USER DIRECTORY */}
          {activeTab === 'directory' && showUserDirectory && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center bg-black/20 p-4 border border-white/10 rounded-2xl">
                <input
                  type="text"
                  placeholder="SEARCH USERS..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none text-xs font-mono uppercase tracking-widest w-64"
                />

                {hasPermission('USER_CREATE') && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all transform hover:-translate-y-1 uppercase tracking-widest text-xs"
                  >
                    + Add User
                  </button>
                )}
              </div>

              {isUsersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse border border-white/10" />
                  ))}
                </div>
              ) : isUsersError ? (
                <div className="text-rose-400 font-mono tracking-widest text-center py-10">
                  ERROR RETRIEVING DATA: {(usersError as Error).message}
                </div>
              ) : users.length === 0 ? (
                <div className="text-slate-500 font-mono tracking-widest uppercase text-center py-10">
                  No User Records Found
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/40 border-b border-white/5 text-[10px] uppercase tracking-widest font-mono text-slate-500">
                          <th className="p-5 font-semibold">Identifier</th>
                          <th className="p-5 font-semibold">Email</th>
                          <th className="p-5 font-semibold">Access Tier</th>
                          <th className="p-5 font-semibold">System Status</th>
                          <th className="p-5 font-semibold">Created At</th>
                          <th className="p-5 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                            <td className="p-5 font-semibold text-slate-200">{u.name}</td>
                            <td className="p-5 text-slate-400 font-mono text-xs">{u.email}</td>
                            <td className="p-5">
                              <span className={`inline-flex items-center px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-lg border bg-black/40 ${getRoleBadge(u.role?.name || '')}`}>
                                {(u.role?.name === 'CUSTOMER' ? 'USER' : (u.role?.name || '')).replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-5">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]'}`} />
                                <span className={`text-xs font-mono uppercase tracking-widest ${u.status === 'ACTIVE' ? 'text-emerald-400' : 'text-rose-400 opacity-70'}`}>
                                  {u.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </td>
                            <td className="p-5 text-slate-500 font-mono text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td className="p-5 text-right space-x-4">
                              {hasPermission('USER_UPDATE') && (
                                <button
                                  onClick={() => handleToggleStatus(u.id, u.status)}
                                  disabled={updateMutation.isPending}
                                  className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none shadow-[0_0_10px_rgba(0,0,0,0.5)] ${u.status === 'ACTIVE' ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-rose-500/10 border border-rose-500/30'}`}
                                >
                                  <span className={`${u.status === 'ACTIVE' ? 'translate-x-4 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'translate-x-1 bg-rose-500/50'} inline-block w-3.5 h-3.5 transform rounded-full transition-transform`} />
                                </button>
                              )}
                              {hasPermission('USER_DELETE') && (
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  disabled={deleteMutation.isPending}
                                  className="text-slate-500 hover:text-rose-400 transition-colors bg-white/5 p-1.5 rounded-md hover:bg-rose-900/30"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="pt-6 flex justify-between items-center border-t border-white/5 mt-4">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-4 py-2 bg-white/5 text-slate-400 rounded-lg text-xs font-mono uppercase disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-xs font-mono text-slate-500">PAGE {page} OF {totalPages}</span>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-4 py-2 bg-white/5 text-slate-400 rounded-lg text-xs font-mono uppercase disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ROLES & PERMISSIONS */}
          {activeTab === 'roles' && showRoles && (
            <div className="animate-in fade-in duration-300">
              <RoleManagementPage />
            </div>
          )}

          {/* AUDIT LOG */}
          {activeTab === 'audit' && showAudit && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {isAuditLoading ? (
                <div className="text-center font-mono text-xs uppercase tracking-widest text-slate-500 py-10">
                  Querying Ledger...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center text-slate-500 py-10 font-mono tracking-widest uppercase">
                  No Audit Records Found
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-widest text-slate-400 bg-white/5">
                          <th className="px-6 py-4">Action</th>
                          <th className="px-6 py-4">Performed By</th>
                          <th className="px-6 py-4">Details</th>
                          <th className="px-6 py-4">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono text-xs text-slate-300">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-bold text-cyan-400">{log.action}</td>
                            <td className="px-6 py-4">
                              <div>{log.performedBy?.name || 'SYSTEM'}</div>
                              <div className="text-[10px] text-slate-500">{log.performedBy?.email || ''}</div>
                            </td>
                            <td className="px-6 py-4">
                              <pre className="text-[10px] font-mono text-slate-400 bg-black/40 border border-white/5 p-2 rounded-lg max-w-sm overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </td>
                            <td className="px-6 py-4 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                      Page {auditPage} of {auditTotalPages}
                    </div>
                    <div className="flex gap-3">
                      <button
                        disabled={auditPage <= 1}
                        onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                        className="px-4 py-2 bg-white/5 text-slate-400 hover:text-white rounded-lg text-xs font-mono uppercase disabled:opacity-50 transition-colors"
                      >
                        Prev
                      </button>
                      <button
                        disabled={auditPage >= auditTotalPages}
                        onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                        className="px-4 py-2 bg-white/5 text-slate-400 hover:text-white rounded-lg text-xs font-mono uppercase disabled:opacity-50 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {showMasterConfig && activeTab === 'master-config' && (
            <MasterDataConfig />
          )}
        </div>
      </div>

      {/* Add New User Modal (from Directory tab) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
          <div className="bg-slate-950/90 border border-white/10 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
                Add New User
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all placeholder-slate-700 font-mono text-sm" placeholder="Enter full name" />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all placeholder-slate-700 font-mono text-sm" placeholder="user@system.net" />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Role</label>
                  <select value={formData.roleId} onChange={e => setFormData({ ...formData, roleId: e.target.value })} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all text-sm">
                    {roles.map(r => (
                      <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all text-sm">
                    <option value="ACTIVE" className="bg-slate-900">ACTIVE</option>
                    <option value="INACTIVE" className="bg-slate-900">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-4 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white font-bold uppercase tracking-widest text-xs rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 px-4 py-3 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-500 text-cyan-300 hover:text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] uppercase tracking-widest text-xs disabled:opacity-50">
                  {createMutation.isPending ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;
