import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { ConfigureSlaModal } from './ConfigureSlaModal';

interface ConfigItem {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt: string;
}

export const MasterDataConfig: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // States for new items
  const [newType, setNewType] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');

  const [newCategory, setNewCategory] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const [isSlaModalOpen, setIsSlaModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAddStatusModalOpen, setIsAddStatusModalOpen] = useState(false);

  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusDesc, setNewStatusDesc] = useState('');


  const { data: services = [], isLoading: loadingServices } = useQuery<ConfigItem[]>({
    queryKey: ['master-groups'],
    queryFn: async () => {
      const res = await api.get('/master-config/groups');
      return res.data;
    },
  });

  const { data: slaRules = [], isLoading: loadingSla } = useQuery<any[]>({
    queryKey: ['slaComplianceRules'],
    queryFn: async () => {
      const res = await api.get('/master-config/sla-rules');
      return res.data;
    },
  });

  React.useEffect(() => {
    console.log("👉 CURRENT DB GROUPS:", services);
  }, [services]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Queries
  const { data: types = [], isLoading: loadingTypes } = useQuery<ConfigItem[]>({
    queryKey: ['master-types'],
    queryFn: async () => {
      const res = await api.get('/master-config/types');
      return res.data;
    },
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery<ConfigItem[]>({
    queryKey: ['master-categories'],
    queryFn: async () => {
      const res = await api.get('/master-config/categories');
      return res.data;
    },
  });

  const { data: statuses = [] } = useQuery<any[]>({
    queryKey: ['master-statuses'],
    queryFn: async () => {
      const res = await api.get('/master-config/statuses');
      return res.data;
    },
  });

  const [newGroup, setNewGroup] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return api.post('/master-config/groups', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-groups'] });
      setNewGroup('');
      setNewGroupDesc('');
      setIsGroupModalOpen(false);
      showToast('Assignment Group added successfully', 'success');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to add Assignment Group';
      showToast(errMsg, 'error');
    },
  });

  const toggleGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/master-config/groups/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-groups'] });
      showToast('Assignment Group status updated successfully', 'success');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to toggle status';
      showToast(errMsg, 'error');
    },
  });

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.trim()) return;
    const name = newGroup.trim().toUpperCase();
    const description = newGroupDesc.trim() || undefined;

    try {
      console.log("📡 [NETWORK] Launching direct API handshake...");
      const result = await createGroupMutation.mutateAsync({ name, description });
      console.log("⚡ [NETWORK RESPONSE] Raw string returned from server:", result);
    } catch (netErr: any) {
      console.error("🚨 [NETWORK CRASH] The browser failed to broadcast or receive:", netErr.response?.data || netErr.message);
      alert(`API Write Blocked: ${netErr.message}`);
    }
  };

  // Mutations for Create
  const createTypeMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return api.post('/master-config/types', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-types'] });
      setNewType('');
      setNewTypeDesc('');
      setIsTypeModalOpen(false);
      showToast('Ticket Type added successfully', 'success');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to add Ticket Type';
      showToast(errMsg, 'error');
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return api.post('/master-config/categories', data);
    },
    onSuccess: (response: any) => {
      console.log("✅ [FRONTEND SUCCESS] Server responded with:", response.data);
      queryClient.invalidateQueries({ queryKey: ['master-categories'] });
      setNewCategory('');
      setNewCategoryDesc('');
      setIsCategoryModalOpen(false);
      showToast('Category added successfully', 'success');
    },
    onError: (err: any) => {
      console.error("❌ [FRONTEND NETWORK ERROR] API communication failed:", err);
      const errMsg = err.response?.data?.message || 'Failed to add Category';
      showToast(errMsg, 'error');
    },
  });

  const createStatusMutation = useMutation({
    mutationFn: async (data: { name: string; label: string; description?: string }) => {
      return api.post('/master-config/statuses', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-statuses'] });
      setNewStatusLabel('');
      setNewStatusDesc('');
      setIsAddStatusModalOpen(false);
      showToast('Status added successfully', 'success');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to add Status';
      showToast(errMsg, 'error');
    },
  });

  const handleAddStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusLabel.trim()) return;
    const label = newStatusLabel.trim();
    const name = label.toUpperCase().replace(/\s+/g, '_');
    const description = newStatusDesc.trim() || undefined;

    try {
      await createStatusMutation.mutateAsync({ name, label, description });
    } catch (netErr: any) {
      console.error(netErr);
    }
  };

  const toggleStatusMutation = useMutation({
    mutationFn: async (data: { id: string, isActive: boolean }) => {
      return api.patch(`/master-config/statuses/${data.id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-statuses'] });
      showToast('Status visibility updated successfully', 'success');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to toggle status';
      showToast(errMsg, 'error');
    },
  });

  // Mutations for SLA
  const createSlaMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/master-config/sla-rules', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slaComplianceRules'] });
      setIsSlaModalOpen(false);
      showToast('SLA Rule saved successfully', 'success');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to save SLA Rule';
      showToast(errMsg, 'error');
    }
  });

  // Mutations for Toggle
  const toggleTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/master-config/types/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-types'] });
      showToast('Ticket Type status updated successfully', 'success');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to toggle status';
      showToast(errMsg, 'error');
    },
  });

  const toggleCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/master-config/categories/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-categories'] });
      showToast('Category status updated successfully', 'success');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to toggle status';
      showToast(errMsg, 'error');
    },
  });


  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.trim()) return;
    createTypeMutation.mutate({ name: newType.trim(), description: newTypeDesc.trim() || undefined });
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    const name = newCategory.trim().toUpperCase();
    const description = newCategoryDesc.trim() || undefined;
    console.log("🚀 [FRONTEND SUBMIT] Packaging payload data:", { name, description });

    try {
      const result = await createCategoryMutation.mutateAsync({ name, description });
      console.log("⚡ [NETWORK RESPONSE] Raw string returned from server:", result);
    } catch (netErr: any) {
      console.error("🚨 [NETWORK CRASH] The browser failed to broadcast or receive:", netErr.response?.data || netErr.message);
      alert(`API Write Blocked: ${netErr.message}`);
    }
  };


  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-2xl border font-mono text-sm tracking-widest uppercase z-50 animate-in slide-in-from-bottom-5 ${toast.type === 'success'
          ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-300'
          : 'bg-rose-900/90 border-rose-500/50 text-rose-300'
          }`}>
          {toast.message}
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold theme-heading-text tracking-widest uppercase mb-1">
          Master Data Configuration
        </h2>
        <p className="text-xs theme-body-subtext font-mono">
          Provision categories, types, and queues dynamically into telemetry drop-downs.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl mx-auto">
        {/* Ticket Types Panel */}
        <div className="theme-card-panel rounded-2xl p-6 flex flex-col justify-between h-full transition-colors duration-300">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 pb-4 mb-4">
              <h3 className="text-sm font-bold text-cyan-400 font-mono uppercase tracking-wider flex items-center gap-2">
                <span>Ticket Types</span>
                <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-2.5 py-0.5 rounded-full">
                  {types.length} Defined
                </span>
              </h3>
              <button
                onClick={() => setIsTypeModalOpen(true)}
                className="px-4 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-400 text-indigo-400 dark:text-indigo-300 font-mono text-[10px] font-bold uppercase rounded-lg transition-all shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] tracking-wider"
              >
                ➕ ADD NEW TYPE
              </button>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 mb-6">
              {loadingTypes ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs animate-pulse">Loading..</div>
              ) : types.length === 0 ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs">No types defined.</div>
              ) : (
                types.map((t) => (
                  <div key={t.id} className="w-full flex items-center justify-between p-4 mb-3 rounded-xl border border-slate-200/40 dark:border-white/5 bg-slate-50/40 dark:bg-slate-950/30 hover:bg-slate-50/80 dark:hover:bg-slate-950/50 transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <div className="text-indigo-500 text-xs">◆</div>
                      <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100 uppercase">{t.name}</h3>
                        {t.description && <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{t.description}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleTypeMutation.mutate(t.id)}
                      className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none shadow-[0_0_10px_rgba(0,0,0,0.5)] flex-shrink-0 ${t.isActive !== false
                        ? 'bg-emerald-500/20 border border-emerald-500/50'
                        : 'bg-rose-500/10 border border-rose-500/30'
                        }`}
                    >
                      <span
                        className={`${t.isActive !== false
                          ? 'translate-x-4 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                          : 'translate-x-1 bg-rose-500/50'
                          } inline-block w-3.5 h-3.5 transform rounded-full transition-transform`}
                      />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Categories Panel */}
        <div className="theme-card-panel rounded-2xl p-6 flex flex-col justify-between h-full transition-colors duration-300">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 pb-4 mb-4">
              <h3 className="text-sm font-bold text-cyan-400 font-mono uppercase tracking-wider flex items-center gap-2">
                <span>Categories</span>
                <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-2.5 py-0.5 rounded-full">
                  {categories.length} Defined
                </span>
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-4 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-400 text-indigo-400 dark:text-indigo-300 font-mono text-[10px] font-bold uppercase rounded-lg transition-all shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] tracking-wider"
              >
                ➕ ADD NEW CATEGORY
              </button>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 mb-6">
              {loadingCategories ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs animate-pulse">Loading..</div>
              ) : categories.length === 0 ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs">No categories defined.</div>
              ) : (
                categories.map((c) => (
                  <div key={c.id} className="w-full flex items-center justify-between p-4 mb-3 rounded-xl border border-slate-200/40 dark:border-white/5 bg-slate-50/40 dark:bg-slate-950/30 hover:bg-slate-50/80 dark:hover:bg-slate-950/50 transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <div className="text-indigo-500 text-xs">◆</div>
                      <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100 uppercase">{c.name}</h3>
                        {c.description && <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{c.description}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleCategoryMutation.mutate(c.id)}
                      className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none shadow-[0_0_10px_rgba(0,0,0,0.5)] flex-shrink-0 ${c.isActive !== false
                        ? 'bg-emerald-500/20 border border-emerald-500/50'
                        : 'bg-rose-500/10 border border-rose-500/30'
                        }`}
                    >
                      <span
                        className={`${c.isActive !== false
                          ? 'translate-x-4 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                          : 'translate-x-1 bg-rose-500/50'
                          } inline-block w-3.5 h-3.5 transform rounded-full transition-transform`}
                      />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Master Service Groups Panel */}
        <div className="theme-card-panel rounded-2xl p-6 flex flex-col justify-between h-full transition-colors duration-300">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 pb-4 mb-4">
              <h3 className="text-sm font-bold text-cyan-400 font-mono uppercase tracking-wider flex items-center gap-2">
                <span>MASTER SERVICE GROUPS</span>
                <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-2.5 py-0.5 rounded-full">
                  {services.length} Defined
                </span>
              </h3>
              <button
                onClick={() => setIsGroupModalOpen(true)}
                className="px-4 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-400 text-indigo-400 dark:text-indigo-300 font-mono text-[10px] font-bold uppercase rounded-lg transition-all shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] tracking-wider"
              >
                ➕ ADD NEW GROUP
              </button>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 mb-6">
              {loadingServices ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs animate-pulse">Loading..</div>
              ) : services.length === 0 ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs">No groups defined.</div>
              ) : (
                services.map((group) => (
                  <div key={group.id} className="w-full flex items-center justify-between p-4 mb-3 rounded-xl border border-slate-200/40 dark:border-white/5 bg-slate-50/40 dark:bg-slate-950/30 hover:bg-slate-50/80 dark:hover:bg-slate-950/50 transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <div className="text-indigo-500 text-xs">◆</div>
                      <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100 uppercase">
                          {group.name}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium max-w-xl">
                          {group.description || "Provisioning a master service group automatically deploys all core compliance ticket classifications by default."}
                        </p>
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => toggleGroupMutation.mutate(group.id)}
                        className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none shadow-[0_0_10px_rgba(0,0,0,0.5)] flex-shrink-0 ${group.isActive !== false
                          ? 'bg-emerald-500/20 border border-emerald-500/50'
                          : 'bg-rose-500/10 border border-rose-500/30'
                          }`}
                      >
                        <span
                          className={`${group.isActive !== false
                            ? 'translate-x-4 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                            : 'translate-x-1 bg-rose-500/50'
                            } inline-block w-3.5 h-3.5 transform rounded-full transition-transform`}
                        />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* STATUSES Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4 border-l-4 border-l-purple-500 transition-colors duration-200">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase">Statuses</h3>
              <span className="text-[10px] font-bold bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 px-2 py-0.5 rounded-full">
                {statuses?.length || 0} Defined
              </span>
            </div>
            <button 
              onClick={() => setIsAddStatusModalOpen(true)}
              className="bg-purple-50 text-purple-600 border border-purple-200/60 hover:bg-purple-100 font-bold text-[10px] tracking-wider uppercase px-2.5 py-1.5 rounded-xl transition-all"
            >
              + Add New Status
            </button>
          </div>

          {/* Map List of Status Rows from DB */}
          <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto pr-1">
            {statuses?.map((status: any) => (
              <div 
                key={status.id} 
                className="flex justify-between items-center bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80 transition-all"
              >
                {/* Refactored Status Sub-Row Option Item Wrapper */}
                <div>
                  {/* Row Label text color update */}
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    {status.label}
                  </h4>
                  {status.description && (
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 normal-case leading-normal">
                      {status.description}
                    </p>
                  )}
                </div>
                
                {/* Dynamic Active/Disabled Toggle Controller */}
                <button
                  type="button"
                  onClick={() => toggleStatusMutation.mutate({ id: status.id, isActive: !status.isActive })}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    status.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    status.isActive ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SLA Registry Builder Panel */}
        <div className="theme-card-panel rounded-2xl p-6 flex flex-col h-full transition-colors duration-300">
          <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 pb-4 mb-6">
            <h3 className="text-sm font-bold theme-heading-text font-mono uppercase tracking-wider flex items-center gap-2">
              <span>SLA CONFIGURATION RULES</span>
            </h3>
            <button
              onClick={() => setIsSlaModalOpen(true)}
              className="px-4 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-400 text-indigo-400 dark:text-indigo-300 font-mono text-[10px] font-bold uppercase rounded-lg transition-all shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] tracking-wider"
            >
              ➕ ADD NEW SLA RULE
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1">
            {/* Dynamically Fetched SLA Rules List */}
            {loadingSla ? (
              <div className="text-center py-6 text-slate-500 font-mono text-xs animate-pulse">Loading SLA Rules...</div>
            ) : slaRules && slaRules.length > 0 ? (
              slaRules.map((rule: any) => (
                <div key={rule.id} className="flex justify-between items-center p-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="font-mono text-sm uppercase text-slate-700 dark:text-slate-200">
                    🔹 {rule.ticketType}
                  </span>
                  <span className="text-xs text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800/40">
                    {rule.tiers?.length || 0} TIERS
                  </span>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-center py-8">No SLA Rules defined in the database.</div>
            )}

            <div className="pt-6 pb-2 flex justify-center">
              <button
                type="button"
                onClick={() => navigate('/admin/master-config/sla-ledger')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all mx-auto mt-4"
              >
                <span>🔽 VIEW MORE RULES</span>
              </button>
            </div>

          </div>
        </div>
      </div>


      {isSlaModalOpen && (
        <ConfigureSlaModal
          onClose={() => setIsSlaModalOpen(false)}
          onSave={(payload) => {
            createSlaMutation.mutate(payload);
          }}
        />
      )}

      {isGroupModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsGroupModalOpen(false)} />
          <div className="relative theme-card-panel w-full max-w-md rounded-2xl shadow-2xl border border-slate-300 dark:border-white/10 flex flex-col bg-white dark:bg-slate-900">
            <div className="p-6 border-b border-slate-200 dark:border-white/5 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-t-2xl z-10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold theme-heading-text uppercase tracking-widest">ADD NEW GROUP</h3>
              </div>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>
            <form onSubmit={handleAddGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 font-bold">Group Name</label>
                <input required value={newGroup} onChange={e => setNewGroup(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-indigo-500 theme-heading-text outline-none font-mono text-xs uppercase" placeholder="e.g. INFRASTRUCTURE" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 font-bold">Description</label>
                <textarea value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-indigo-500 theme-heading-text outline-none font-mono text-xs" rows={3} placeholder="Optional details..." />
              </div>
              <div className="pt-4 flex justify-end gap-4">
                <button type="button" onClick={() => setIsGroupModalOpen(false)} className="px-6 py-2.5 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold uppercase rounded-xl transition-all tracking-widest">CANCEL</button>
                <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase rounded-xl shadow-lg transition-all tracking-widest">SAVE</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTypeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsTypeModalOpen(false)} />
          <div className="relative theme-card-panel w-full max-w-md rounded-2xl shadow-2xl border border-slate-300 dark:border-white/10 flex flex-col bg-white dark:bg-slate-900">
            <div className="p-6 border-b border-slate-200 dark:border-white/5 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-t-2xl z-10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold theme-heading-text uppercase tracking-widest">ADD NEW TYPE</h3>
              </div>
              <button onClick={() => setIsTypeModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>
            <form onSubmit={handleAddType} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 font-bold">Type Name</label>
                <input required value={newType} onChange={e => setNewType(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-indigo-500 theme-heading-text outline-none font-mono text-xs uppercase" placeholder="e.g. INCIDENT" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 font-bold">Description</label>
                <textarea value={newTypeDesc} onChange={e => setNewTypeDesc(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-indigo-500 theme-heading-text outline-none font-mono text-xs" rows={3} placeholder="Optional details..." />
              </div>
              <div className="pt-4 flex justify-end gap-4">
                <button type="button" onClick={() => setIsTypeModalOpen(false)} className="px-6 py-2.5 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold uppercase rounded-xl transition-all tracking-widest">CANCEL</button>
                <button type="submit" disabled={createTypeMutation.isPending} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase rounded-xl shadow-lg transition-all tracking-widest disabled:opacity-50">SAVE</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)} />
          <div className="relative theme-card-panel w-full max-w-md rounded-2xl shadow-2xl border border-slate-300 dark:border-white/10 flex flex-col bg-white dark:bg-slate-900">
            <div className="p-6 border-b border-slate-200 dark:border-white/5 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-t-2xl z-10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold theme-heading-text uppercase tracking-widest">ADD NEW CATEGORY</h3>
              </div>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>
            <form onSubmit={handleAddCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 font-bold">Category Name</label>
                <input required value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-indigo-500 theme-heading-text outline-none font-mono text-xs uppercase" placeholder="e.g. ACCESS POLICY" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 font-bold">Description</label>
                <textarea value={newCategoryDesc} onChange={e => setNewCategoryDesc(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-indigo-500 theme-heading-text outline-none font-mono text-xs" rows={3} placeholder="Optional details..." />
              </div>
              <div className="pt-4 flex justify-end gap-4">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-6 py-2.5 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold uppercase rounded-xl transition-all tracking-widest">CANCEL</button>
                <button type="submit" disabled={createCategoryMutation.isPending} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase rounded-xl shadow-lg transition-all tracking-widest disabled:opacity-50">SAVE</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Status Modal */}
      {isAddStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAddStatusModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Add New Status</h3>
              <button onClick={() => setIsAddStatusModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            <form onSubmit={handleAddStatus} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status Title Label</label>
                <input
                  type="text"
                  value={newStatusLabel}
                  onChange={(e) => setNewStatusLabel(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl p-3 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                  placeholder="e.g., Escalated, Pending Review"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status Subtitle Description (Optional)</label>
                <textarea
                  value={newStatusDesc}
                  onChange={(e) => setNewStatusDesc(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl p-3 text-sm min-h-[100px] resize-none focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                  placeholder="Describe what this status implies..."
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddStatusModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] uppercase rounded-xl transition-all tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createStatusMutation.isPending}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] uppercase rounded-xl transition-all tracking-widest disabled:opacity-50"
                >
                  {createStatusMutation.isPending ? 'Saving...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
