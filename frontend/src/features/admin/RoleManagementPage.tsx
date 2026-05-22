import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRoles,
  fetchPermissions,
  createRole,
  assignPermissions,
  deleteRole,
  RoleData,
  PermissionGroup
} from '../../api/users';

// Toast Component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 right-6 z-50 animate-slide-in">
      <div className={`backdrop-blur-xl border px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-3 font-mono text-sm ${type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
          : 'bg-rose-500/10 border-rose-500/50 text-rose-400'
        }`}>
        <span className={`w-2 h-2 rounded-full animate-ping ${type === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'}`}></span>
        <span>{message}</span>
      </div>
    </div>
  );
};

export const RoleManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // New Role Form State
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [createModalPermissionIds, setCreateModalPermissionIds] = useState<string[]>([]);

  // Permissions state for the details panel
  const [checkedPermissionIds, setCheckedPermissionIds] = useState<string[]>([]);

  // 1. Fetch Roles
  const { data: roles = [], isLoading: isLoadingRoles, isError: isErrorRoles } = useQuery<RoleData[]>({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });

  // 2. Fetch Permissions
  const { data: permissionGroups = [], isLoading: isLoadingPermissions } = useQuery<PermissionGroup[]>({
    queryKey: ['permissions'],
    queryFn: fetchPermissions,
  });

  // Set default selected role when roles load
  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  // Synchronize checked permission state when selected role or permissions change
  useEffect(() => {
    if (selectedRole?.permissions) {
      const activeIds = selectedRole.permissions.map(rp => rp.permission.id);
      setCheckedPermissionIds(activeIds);
    } else {
      setCheckedPermissionIds([]);
    }
  }, [selectedRoleId, selectedRole]);

  // Mutations
  const createRoleMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string; permissionIds: string[] }) => {
      const role = await createRole({ name: payload.name, description: payload.description });
      if (payload.permissionIds.length > 0) {
        await assignPermissions(role.id, payload.permissionIds);
      }
      return role;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setToast({ message: 'Role created with permissions successfully', type: 'success' });
      setIsCreateModalOpen(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setCreateModalPermissionIds([]);
      setSelectedRoleId(data.id);
    },
    onError: (err: any) => {
      setToast({ message: err.response?.data?.message || 'Failed to create role', type: 'error' });
    }
  });

  const assignPermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      assignPermissions(roleId, permissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setToast({ message: 'Permissions updated successfully', type: 'success' });
    },
    onError: (err: any) => {
      setToast({ message: err.response?.data?.message || 'Failed to update permissions', type: 'error' });
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setToast({ message: 'Role deleted successfully', type: 'success' });
      setSelectedRoleId(roles.length > 1 ? roles.filter(r => r.id !== selectedRoleId)[0].id : null);
    },
    onError: (err: any) => {
      setToast({ message: err.response?.data?.message || 'Failed to delete role', type: 'error' });
    }
  });

  const handleCreateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    createRoleMutation.mutate({ name: newRoleName, description: newRoleDescription, permissionIds: createModalPermissionIds });
  };

  const handlePermissionToggle = (permissionId: string) => {
    setCheckedPermissionIds(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSavePermissions = () => {
    if (!selectedRoleId) return;
    assignPermissionsMutation.mutate({ roleId: selectedRoleId, permissionIds: checkedPermissionIds });
  };

  const handleDeleteRole = () => {
    if (!selectedRoleId || !selectedRole) return;
    if (selectedRole.isSystem) {
      setToast({ message: 'Cannot delete system roles', type: 'error' });
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete the custom role "${selectedRole.name}"?`)) {
      deleteRoleMutation.mutate(selectedRoleId);
    }
  };

  if (isLoadingRoles || isLoadingPermissions) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        <p className="mt-4 text-cyan-400 font-mono text-xs tracking-widest uppercase animate-pulse">Syncing RBAC Matrix...</p>
      </div>
    );
  }

  if (isErrorRoles) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="bg-rose-500/10 border border-rose-500/30 p-8 rounded-3xl max-w-md">
          <p className="text-rose-400 font-mono text-sm uppercase tracking-widest mb-4">Error Syncing Access Control</p>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['roles'] })} className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 font-bold rounded-xl transition-all text-xs uppercase tracking-widest border border-rose-500/50">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-950/20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* LEFT PANEL: ROLES DIRECTORY */}
      <div className="w-96 border-r border-white/5 flex flex-col min-h-0 bg-black/20">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/10 shrink-0">
          <div>
            <h2 className="text-lg font-black tracking-wider text-white uppercase">Roles Directory</h2>

          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="p-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500 hover:to-blue-600 text-cyan-300 hover:text-white border border-cyan-500/40 hover:border-transparent rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
            title="Create Custom Role"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {roles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">No Roles Loaded</p>
            </div>
          ) : (
            roles.map(role => {
              const isSelected = role.id === selectedRoleId;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-2 group relative overflow-hidden ${isSelected
                      ? 'bg-white/10 border-cyan-500/50 text-white shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                      : 'bg-white/5 border-white/5 hover:border-white/15 text-slate-300 hover:bg-white/10'
                    }`}
                >
                  {isSelected && (
                    <span className="absolute top-0 left-0 w-1 h-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm tracking-wider uppercase group-hover:text-cyan-400 transition-colors">
                      {role.name}
                    </span>
                    <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md border ${role.isSystem
                        ? 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20'
                        : 'text-purple-400 border-purple-500/30 bg-purple-950/20'
                      }`}>
                      {role.isSystem ? 'SYSTEM' : 'CUSTOM'}
                    </span>
                  </div>
                  {role.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 pr-2">
                      {role.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/5 text-[10px] font-mono text-slate-500">
                    <span>Active Entities</span>
                    <span className="font-bold text-slate-400">{role._count?.users || 0}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: SELECTED ROLE DETAILS & PERMISSIONS MATRIX */}
      <div className="flex-1 flex flex-col min-h-0 bg-black/40">
        {!selectedRole ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <svg className="w-16 h-16 text-slate-700 mb-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Select a role to manage privileges</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header info */}
            <div className="p-8 border-b border-white/5 bg-black/10 flex justify-between items-start gap-6 shrink-0">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black tracking-widest uppercase text-white">
                    {selectedRole.name}
                  </h3>
                  {selectedRole.isSystem ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black tracking-widest bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      LOCKED SYSTEM ROLE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black tracking-widest bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                      CUSTOM ROLE
                    </span>
                  )}
                </div>
                {selectedRole.description && (
                  <p className="text-sm text-slate-400 font-sans max-w-3xl">
                    {selectedRole.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500 pt-1">
                  <span>Registered: {new Date(selectedRole.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>ID: {selectedRole.id}</span>
                </div>
              </div>

              {!selectedRole.isSystem && (
                <button
                  onClick={handleDeleteRole}
                  disabled={deleteRoleMutation.isPending}
                  className="px-4 py-2.5 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500 hover:text-white hover:border-transparent text-rose-400 font-bold rounded-xl text-xs uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-50 flex items-center gap-2"
                >
                  {deleteRoleMutation.isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Purging...
                    </>
                  ) : (
                    'Delete Role'
                  )}
                </button>
              )}
            </div>

            {/* Permission checklist area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div>
                <h4 className="text-sm font-black tracking-wider text-white uppercase mb-2">Permissions Matrix</h4>
                <p className="text-xs text-slate-500 font-sans mb-6">Select permissions authorized for this role. System roles will enforce structural restrictions under security policies.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {permissionGroups.map(group => (
                  <div key={group.module} className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                    <h5 className="text-xs font-black tracking-widest text-cyan-400 border-b border-white/5 pb-2 uppercase">
                      {group.module} Management
                    </h5>
                    <div className="space-y-3">
                      {group.permissions.map(perm => {
                        const isChecked = checkedPermissionIds.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${isChecked
                                ? 'bg-white/5 border-cyan-500/20 text-white'
                                : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-300'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handlePermissionToggle(perm.id)}
                              className="sr-only"
                            />
                            {/* Cyberpunk styled checkbox */}
                            <span className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all ${isChecked
                                ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)] text-black'
                                : 'border-white/20 bg-black/40'
                              }`}>
                              {isChecked && (
                                <svg className="w-3 h-3 text-slate-950 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold font-mono tracking-wide">{perm.key}</span>
                              <span className="text-[10px] text-slate-500">{perm.label}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions footer */}
            <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-4 shrink-0">
              <button
                onClick={handleSavePermissions}
                disabled={assignPermissionsMutation.isPending}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all uppercase tracking-widest text-xs disabled:opacity-50 flex items-center gap-2"
              >
                {assignPermissionsMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Saving Privileges...
                  </>
                ) : (
                  'Save Permissions'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE ROLE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div onClick={() => setIsCreateModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md"></div>

          {/* Modal Container */}
          <div className="relative w-full max-w-lg bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase">
                  Create Custom Role
                </h3>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">Define Authorization Tier</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white transition-colors text-lg font-bold">×</button>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Role Name</label>
                <input
                  required
                  type="text"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all placeholder-slate-700 font-mono text-sm uppercase"
                  placeholder="e.g. SUPPORT_L1"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Description</label>
                <textarea
                  value={newRoleDescription}
                  onChange={e => setNewRoleDescription(e.target.value)}
                  className="w-full h-20 px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all placeholder-slate-700 text-xs"
                  placeholder="Summarize the operational scope of this custom role..."
                />
              </div>

              <div className="border-t border-white/5 pt-4 space-y-4 max-h-60 overflow-y-auto pr-1">
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest">
                  Assign System Permissions
                </label>
                <div className="space-y-4">
                  {permissionGroups.map(group => (
                    <div key={group.module} className="space-y-2">
                      <h4 className="text-[10px] font-black font-mono text-cyan-400 uppercase tracking-wider">
                        {group.module} module
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {group.permissions.map(perm => {
                          const isChecked = createModalPermissionIds.includes(perm.id);
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all cursor-pointer select-none text-[10px] ${isChecked
                                  ? 'bg-cyan-500/10 border-cyan-500/30 text-white font-semibold'
                                  : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-300'
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setCreateModalPermissionIds(prev =>
                                    prev.includes(perm.id)
                                      ? prev.filter(id => id !== perm.id)
                                      : [...prev, perm.id]
                                  );
                                }}
                                className="sr-only"
                              />
                              <span className={`w-3.5 h-3.5 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all ${isChecked
                                  ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.4)] text-black'
                                  : 'border-white/20 bg-black/40'
                                }`}>
                                {isChecked && (
                                  <svg className="w-2.5 h-2.5 text-slate-950 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </span>
                              <div className="flex flex-col">
                                <span className="font-bold font-mono tracking-wide">{perm.key}</span>
                                <span className="text-[8px] text-slate-500 line-clamp-1">{perm.label}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoleMutation.isPending || !newRoleName.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all uppercase tracking-widest text-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {createRoleMutation.isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    'Provision Role'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
