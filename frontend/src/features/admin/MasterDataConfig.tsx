import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

interface ConfigItem {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt: string;
}

export const MasterDataConfig: React.FC = () => {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // States for new items
  const [newType, setNewType] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');

  const [newCategory, setNewCategory] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const [newSlaName, setNewSlaName] = useState('');
  const [newSlaDesc, setNewSlaDesc] = useState('');
  const [newSlaResponse, setNewSlaResponse] = useState<number | ''>('');
  const [newSlaResponseUnit, setNewSlaResponseUnit] = useState('Mins');
  const [newSlaResolution, setNewSlaResolution] = useState<number | ''>('');
  const [newSlaResolutionUnit, setNewSlaResolutionUnit] = useState('Hours');

  const [slaTiers, setSlaTiers] = useState([
    { id: 'p1', name: 'P1 - CRITICAL THREAT', description: 'Immediate severe business disruption. High data risk.', response: 15, responseUnit: 'Mins', resolution: 2, resolutionUnit: 'Hours', isActive: true },
    { id: 'p2', name: 'P2 - HIGH EFFICIENCY', description: 'Significant operational impact. Partial system failure.', response: 1, responseUnit: 'Hours', resolution: 8, resolutionUnit: 'Hours', isActive: true },
    { id: 'p3', name: 'P3 - MEDIUM LEVEL', description: 'Minor feature degradation. No immediate risk.', response: 4, responseUnit: 'Hours', resolution: 24, resolutionUnit: 'Hours', isActive: true },
    { id: 'p4', name: 'P4 - LOW RE-ROUTE', description: 'Cosmetic issues or general inquiries.', response: 24, responseUnit: 'Hours', resolution: 5, resolutionUnit: 'Days', isActive: false },
  ]);

  const handleSlaToggle = (id: string) => {
    setSlaTiers(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
  };

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

  const [serviceGroups, setServiceGroups] = useState([
    { id: '1', name: 'RIMS - REMOTE INFRASTRUCTURE MANAGEMENT', isActive: true, description: '' },
    { id: '2', name: 'MSS - MANAGED SECURITY SERVICES', isActive: true, description: '' },
    { id: '3', name: 'WPE - WORKPLACE ENDPOINTS', isActive: true, description: '' },
    { id: '4', name: 'CLOUD - ENTERPRISE CLOUD ARCHITECTURE', isActive: true, description: '' },
    { id: '5', name: 'NETWORK - INFRASTRUCTURE & SWITCHES', isActive: true, description: '' }
  ]);
  const [newGroup, setNewGroup] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup) return;
    setServiceGroups([...serviceGroups, { id: Date.now().toString(), name: newGroup, description: newGroupDesc, isActive: true }]);
    setNewGroup('');
    setNewGroupDesc('');
  };

  const toggleGroupStatus = (id: string) => {
    setServiceGroups(serviceGroups.map(g => g.id === id ? { ...g, isActive: !g.isActive } : g));
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-categories'] });
      setNewCategory('');
      setNewCategoryDesc('');
      showToast('Category added successfully', 'success');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to add Category';
      showToast(errMsg, 'error');
    },
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

  const saveSlaMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.put('/master-config/sla', data);
    },
    onSuccess: () => {
      showToast('SLA Matrix saved successfully', 'success');
      setNewSlaName('');
      setNewSlaDesc('');
      setNewSlaResponse('');
      setNewSlaResolution('');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to save SLA Matrix';
      showToast(errMsg, 'error');
    },
  });

  const handleSaveSlaMatrix = () => {
    const payload = {
      tiers: slaTiers,
      newTier: newSlaName ? {
        name: newSlaName,
        description: newSlaDesc,
        response: newSlaResponse,
        responseUnit: newSlaResponseUnit,
        resolution: newSlaResolution,
        resolutionUnit: newSlaResolutionUnit
      } : null
    };
    saveSlaMutation.mutate(payload);
  };

  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.trim()) return;
    createTypeMutation.mutate({ name: newType.trim(), description: newTypeDesc.trim() || undefined });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    createCategoryMutation.mutate({ name: newCategory.trim(), description: newCategoryDesc.trim() || undefined });
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
            <h3 className="text-sm font-bold text-cyan-400 font-mono uppercase tracking-wider mb-4 pb-2 border-b border-white/5 flex items-center justify-between">
              <span>Ticket Types</span>
              <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-2.5 py-0.5 rounded-full">
                {types.length} Defined
              </span>
            </h3>

            {/* List */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 mb-6">
              {loadingTypes ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs animate-pulse">Loading..</div>
              ) : types.length === 0 ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs">No types defined.</div>
              ) : (
                types.map((t) => (
                  <div key={t.id} className="p-3 theme-card-panel rounded-xl hover:border-white/10 transition-colors flex justify-between items-center gap-4">
                    <div>
                      <div className="text-xs font-mono font-bold theme-heading-text uppercase">{t.name}</div>
                      {t.description && <div className="text-[10px] theme-body-subtext font-mono mt-1 leading-relaxed">{t.description}</div>}
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

          {/* Form */}
          <form onSubmit={handleAddType} className="space-y-3 mt-auto pt-4 border-t border-white/5">
            <input
              type="text"
              required
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="Type Name (e.g. Incident)"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 theme-heading-text outline-none font-mono text-xs uppercase"
            />
            <input
              type="text"
              value={newTypeDesc}
              onChange={(e) => setNewTypeDesc(e.target.value)}
              placeholder="Optional Description"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 theme-heading-text outline-none font-mono text-xs"
            />
            <button
              type="submit"
              disabled={createTypeMutation.isPending}
              className="w-full py-2.5 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-500 text-cyan-300 hover:text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] uppercase tracking-widest text-[10px] font-mono disabled:opacity-50"
            >
              {createTypeMutation.isPending ? 'Adding..' : '+ Add New Type'}
            </button>
          </form>
        </div>

        {/* Categories Panel */}
        <div className="theme-card-panel rounded-2xl p-6 flex flex-col justify-between h-full transition-colors duration-300">
          <div>
            <h3 className="text-sm font-bold text-cyan-400 font-mono uppercase tracking-wider mb-4 pb-2 border-b border-white/5 flex items-center justify-between">
              <span>EPO Categories</span>
              <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-2.5 py-0.5 rounded-full">
                {categories.length} Defined
              </span>
            </h3>

            {/* List */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 mb-6">
              {loadingCategories ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs animate-pulse">Loading..</div>
              ) : categories.length === 0 ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs">No categories defined.</div>
              ) : (
                categories.map((c) => (
                  <div key={c.id} className="p-3 theme-card-panel rounded-xl hover:border-white/10 transition-colors flex justify-between items-center gap-4">
                    <div>
                      <div className="text-xs font-mono font-bold theme-heading-text uppercase">{c.name}</div>
                      {c.description && <div className="text-[10px] theme-body-subtext font-mono mt-1 leading-relaxed">{c.description}</div>}
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

          {/* Form */}
          <form onSubmit={handleAddCategory} className="space-y-3 mt-auto pt-4 border-t border-white/5">
            <input
              type="text"
              required
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category Name (e.g. Access Policy)"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 theme-heading-text outline-none font-mono text-xs uppercase"
            />
            <input
              type="text"
              value={newCategoryDesc}
              onChange={(e) => setNewCategoryDesc(e.target.value)}
              placeholder="Optional Description"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 theme-heading-text outline-none font-mono text-xs"
            />
            <button
              type="submit"
              disabled={createCategoryMutation.isPending}
              className="w-full py-2.5 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-500 text-cyan-300 hover:text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] uppercase tracking-widest text-[10px] font-mono disabled:opacity-50"
            >
              {createCategoryMutation.isPending ? 'Adding..' : '+ Add New Category'}
            </button>
          </form>
        </div>

        {/* Master Service Groups Panel */}
        <div className="theme-card-panel rounded-2xl p-6 flex flex-col justify-between h-full transition-colors duration-300">
          <div>
            <h3 className="text-sm font-bold text-cyan-400 font-mono uppercase tracking-wider mb-4 pb-2 border-b border-white/5 flex items-center justify-between">
              <span>MASTER SERVICE GROUPS</span>
              <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-2.5 py-0.5 rounded-full">
                {serviceGroups.length} Defined
              </span>
            </h3>

            {/* List */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 mb-6">
              {serviceGroups.length === 0 ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs">No groups defined.</div>
              ) : (
                serviceGroups.map((g) => (
                  <div key={g.id} className="p-3 theme-card-panel rounded-xl hover:border-white/10 transition-colors flex justify-between items-center gap-4">
                    <div>
                      <div className="text-xs font-mono font-bold theme-heading-text uppercase">{g.name}</div>
                      <div className="text-[10px] text-cyan-500/80 font-mono mt-1 leading-relaxed italic">
                        Provisioning a master service group automatically deploys all 7 core matrix ticket classifications by default.
                      </div>
                    </div>
                    <button
                      onClick={() => toggleGroupStatus(g.id)}
                      className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none shadow-[0_0_10px_rgba(0,0,0,0.5)] flex-shrink-0 ${g.isActive !== false
                        ? 'bg-emerald-500/20 border border-emerald-500/50'
                        : 'bg-rose-500/10 border border-rose-500/30'
                        }`}
                    >
                      <span
                        className={`${g.isActive !== false
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

          {/* Form */}
          <form onSubmit={handleAddGroup} className="space-y-3 mt-auto pt-4 border-t border-white/5">
            <input
              type="text"
              required
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              placeholder="SERVICE GROUP NAME (E.G. CLOUD, NETWORK, INFRA)"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 theme-heading-text outline-none font-mono text-xs uppercase"
            />
            <input
              type="text"
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder="Optional Description"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 theme-heading-text outline-none font-mono text-xs"
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-500 text-cyan-300 hover:text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] uppercase tracking-widest text-[10px] font-mono"
            >
              + Add New Group
            </button>
          </form>
        </div>

        {/* SLA Target Panel */}
        <div className="theme-card-panel rounded-2xl p-6 flex flex-col justify-between h-full transition-colors duration-300">
          <div>
            <h3 className="text-sm font-bold text-cyan-400 font-mono uppercase tracking-wider mb-4 pb-2 border-b border-white/5 flex items-center justify-between">
              <span>SLA TARGET CONFIGURATION</span>
              <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-2.5 py-0.5 rounded-full">
                {slaTiers.length} DEFINED
              </span>
            </h3>

            {/* List */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 mb-6">
              {slaTiers.map((tier, index) => (
                <div key={tier.id} className="p-3 theme-card-panel rounded-xl hover:border-white/10 transition-colors flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="text-xs font-mono font-bold theme-heading-text uppercase">{tier.name}</div>
                      <div className="text-[9px] theme-body-subtext font-mono mt-1 leading-relaxed">{tier.description}</div>
                    </div>
                    <button
                      onClick={() => handleSlaToggle(tier.id)}
                      className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none shadow-[0_0_10px_rgba(0,0,0,0.5)] flex-shrink-0 ${tier.isActive !== false
                        ? 'bg-emerald-500/20 border border-emerald-500/50'
                        : 'bg-rose-500/10 border border-rose-500/30'
                        }`}
                    >
                      <span
                        className={`${tier.isActive !== false
                          ? 'translate-x-4 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                          : 'translate-x-1 bg-rose-500/50'
                          } inline-block w-3.5 h-3.5 transform rounded-full transition-transform`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">Response Target</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={tier.response}
                          onChange={(e) => {
                            const newTiers = [...slaTiers];
                            newTiers[index].response = Number(e.target.value);
                            setSlaTiers(newTiers);
                          }}
                          className="w-14 px-2 py-1 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded focus:ring-1 focus:ring-cyan-500 theme-heading-text outline-none font-mono text-xs text-center"
                        />
                        <span className="text-[10px] font-mono theme-body-subtext">{tier.responseUnit}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">Resolution Target</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={tier.resolution}
                          onChange={(e) => {
                            const newTiers = [...slaTiers];
                            newTiers[index].resolution = Number(e.target.value);
                            setSlaTiers(newTiers);
                          }}
                          className="w-14 px-2 py-1 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded focus:ring-1 focus:ring-cyan-500 theme-heading-text outline-none font-mono text-xs text-center"
                        />
                        <span className="text-[10px] font-mono theme-body-subtext">{tier.resolutionUnit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* New SLA Provisioning Sub-Form */}
          <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
            <h4 className="text-[10px] font-bold text-cyan-400 font-mono uppercase tracking-wider mb-2">
              ➕ PROVISION NEW COMPLIANCE TIER
            </h4>
            <input
              type="text"
              value={newSlaName}
              onChange={(e) => setNewSlaName(e.target.value)}
              placeholder="SLA TIER NAME (E.G. P5 - PLANNING ROUTINE)"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 theme-heading-text outline-none font-mono text-xs uppercase"
            />
            <input
              type="text"
              value={newSlaDesc}
              onChange={(e) => setNewSlaDesc(e.target.value)}
              placeholder="Optional Scope Description..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 theme-heading-text outline-none font-mono text-xs"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">Response Target</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newSlaResponse}
                    onChange={(e) => setNewSlaResponse(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-2 py-2 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-cyan-500 theme-heading-text outline-none font-mono text-xs"
                  />
                  <select 
                    value={newSlaResponseUnit}
                    onChange={(e) => setNewSlaResponseUnit(e.target.value)}
                    className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-2 text-slate-700 dark:text-slate-300 font-mono text-[10px] outline-none"
                  >
                    <option value="Mins">Mins</option>
                    <option value="Hours">Hours</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">Resolution Target</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newSlaResolution}
                    onChange={(e) => setNewSlaResolution(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-2 py-2 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-cyan-500 theme-heading-text outline-none font-mono text-xs"
                  />
                  <select 
                    value={newSlaResolutionUnit}
                    onChange={(e) => setNewSlaResolutionUnit(e.target.value)}
                    className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-2 text-slate-700 dark:text-slate-300 font-mono text-[10px] outline-none"
                  >
                    <option value="Hours">Hours</option>
                    <option value="Days">Days</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-white/5">
            <button
              onClick={handleSaveSlaMatrix}
              disabled={saveSlaMutation.isPending}
              className="w-full py-2.5 bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-500 text-emerald-300 hover:text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(52,211,153,0.15)] hover:shadow-[0_0_25px_rgba(52,211,153,0.4)] uppercase tracking-widest text-[10px] font-mono disabled:opacity-50"
            >
              {saveSlaMutation.isPending ? 'SAVING...' : 'SAVE SLA MATRIX'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
