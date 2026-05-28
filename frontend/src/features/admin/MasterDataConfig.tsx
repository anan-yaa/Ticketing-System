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
  const [expandedSlaRule, setExpandedSlaRule] = useState<string | null>(null);

  const SLA_COMBINATIONS = [
    { id: 'cloud_incident', label: 'CLOUD - INCIDENT', p1: { desc: 'Critical Outage / Server Down', respH: 0, respM: 15, resH: 2, resM: 0 }, p2: { desc: 'High Impact / Degradation', respH: 0, respM: 30, resH: 4, resM: 0 }, p3: { desc: 'Normal Priority Request', respH: 2, respM: 0, resH: 24, resM: 0 }, p4: { desc: 'Low Priority Inquiry', respH: 24, respM: 0, resH: 168, resM: 0 } },
    { id: 'network_incident', label: 'NETWORK - INCIDENT', p1: { desc: 'Total Routing Failure', respH: 0, respM: 10, resH: 1, resM: 30 }, p2: { desc: 'Subnet Unreachable', respH: 0, respM: 20, resH: 3, resM: 0 }, p3: { desc: 'Intermittent Latency', respH: 1, respM: 0, resH: 12, resM: 0 }, p4: { desc: 'Port Activation', respH: 12, respM: 0, resH: 72, resM: 0 } },
    { id: 'rims_maintenance', label: 'RIMS - MAINTENANCE', p1: { desc: 'Emergency Patching', respH: 1, respM: 0, resH: 8, resM: 0 }, p2: { desc: 'Zero-day Mitigation', respH: 2, respM: 0, resH: 24, resM: 0 }, p3: { desc: 'Routine Backup Check', respH: 8, respM: 0, resH: 48, resM: 0 }, p4: { desc: 'Scheduled Audits', respH: 48, respM: 0, resH: 336, resM: 0 } },
    { id: 'cloud_req', label: 'CLOUD - SERVICE REQ', p1: { desc: 'Immediate Resource Scale', respH: 2, respM: 0, resH: 24, resM: 0 }, p2: { desc: 'New Environment Spin-up', respH: 4, respM: 0, resH: 48, resM: 0 }, p3: { desc: 'Access Provisioning', respH: 12, respM: 0, resH: 72, resM: 0 }, p4: { desc: 'General Architecture Qs', respH: 48, respM: 0, resH: 168, resM: 0 } }
  ];

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

        {/* SLA Registry Builder Panel */}
        <div className="theme-card-panel rounded-2xl p-6 flex flex-col h-full transition-colors duration-300">
          <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 pb-4 mb-6">
            <h3 className="text-sm font-bold theme-heading-text font-mono uppercase tracking-wider flex items-center gap-2">
              <span>📑 SLA COMPLIANCE REGISTRY</span>
            </h3>
            <button
              onClick={() => setIsSlaModalOpen(true)}
              className="px-4 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-400 text-indigo-400 dark:text-indigo-300 font-mono text-[10px] font-bold uppercase rounded-lg transition-all shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] tracking-wider"
            >
              ➕ ADD NEW SLA RULE
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1">
            {/* Hardcoded Combinations List */}
            {SLA_COMBINATIONS.map((combo) => (
              <div key={combo.id} className="theme-card-panel rounded-xl border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 overflow-hidden transition-all duration-300">
                <button
                  onClick={() => setExpandedSlaRule(expandedSlaRule === combo.id ? null : combo.id)}
                  className="w-full p-4 flex justify-between items-center group cursor-pointer hover:bg-slate-200/30 dark:hover:bg-white/5 transition-colors"
                >
                  <h4 className="text-sm font-bold theme-heading-text uppercase tracking-wider group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-3">
                    <span className="text-indigo-500 text-lg">❖</span> {combo.label}
                  </h4>
                  <span className={`transform transition-transform text-slate-500 dark:text-slate-400 font-mono text-[10px] ${expandedSlaRule === combo.id ? 'rotate-180' : ''}`}>▼</span>
                </button>
                
                {expandedSlaRule === combo.id && (
                  <div className="p-4 border-t border-slate-200/50 dark:border-white/5 bg-slate-100/30 dark:bg-black/20 space-y-3">
                     {[
                       { p: 'P1', name: combo.p1.desc, respH: combo.p1.respH, respM: combo.p1.respM, resH: combo.p1.resH, resM: combo.p1.resM, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                       { p: 'P2', name: combo.p2.desc, respH: combo.p2.respH, respM: combo.p2.respM, resH: combo.p2.resH, resM: combo.p2.resM, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                       { p: 'P3', name: combo.p3.desc, respH: combo.p3.respH, respM: combo.p3.respM, resH: combo.p3.resH, resM: combo.p3.resM, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                       { p: 'P4', name: combo.p4.desc, respH: combo.p4.respH, respM: combo.p4.respM, resH: combo.p4.resH, resM: combo.p4.resM, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
                     ].map(tier => (
                       <div key={tier.p} className="flex justify-between items-center bg-white/40 dark:bg-white/5 p-3 rounded-lg border border-slate-200/50 dark:border-white/5">
                         <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-full ${tier.bg} flex items-center justify-center ${tier.color} font-bold font-mono text-xs`}>{tier.p}</div>
                           <div>
                             <h5 className="text-[11px] font-bold theme-heading-text uppercase tracking-wider">{tier.name}</h5>
                           </div>
                         </div>
                         <div className="flex gap-8 items-center">
                           <div className="text-right">
                             <span className="block text-[8px] text-slate-500 uppercase tracking-widest font-mono mb-1">Response</span>
                             <span className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono">{tier.respH > 0 ? `${tier.respH}H ` : ''}{tier.respM}M</span>
                           </div>
                           <div className="text-right">
                             <span className="block text-[8px] text-slate-500 uppercase tracking-widest font-mono mb-1">Resolution</span>
                             <span className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono">{tier.resH > 0 ? `${tier.resH}H ` : ''}{tier.resM > 0 || tier.resH === 0 ? `${tier.resM}M` : ''}</span>
                           </div>
                         </div>
                       </div>
                     ))}
                  </div>
                )}
              </div>
            ))}

            <div className="pt-6 pb-2 flex justify-center">
              <button 
                onClick={() => navigate('/admin/master-data/sla-ledger')}
                className="px-6 py-2.5 bg-slate-200/50 dark:bg-white/5 hover:bg-slate-300/50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 font-mono text-[10px] font-bold uppercase rounded-xl transition-all tracking-widest flex items-center gap-2"
              >
                🔽 VIEW MORE RULES
              </button>
            </div>

          </div>
        </div>
      </div>


      {isSlaModalOpen && (
        <ConfigureSlaModal 
          onClose={() => setIsSlaModalOpen(false)}
          onSave={(payload) => {
            setIsSlaModalOpen(false);
            showToast('Matrix logic bundled. Pending API hook.', 'success');
            console.log(payload);
          }}
        />
      )}
    </div>
  );
};
