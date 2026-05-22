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

  const [newQueue, setNewQueue] = useState('');
  const [newQueueDesc, setNewQueueDesc] = useState('');

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

  const { data: queues = [], isLoading: loadingQueues } = useQuery<ConfigItem[]>({
    queryKey: ['master-queues'],
    queryFn: async () => {
      const res = await api.get('/master-config/queues');
      return res.data;
    },
  });

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

  const createQueueMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return api.post('/master-config/queues', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-queues'] });
      setNewQueue('');
      setNewQueueDesc('');
      showToast('Queue added successfully', 'success');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to add Queue';
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

  const toggleQueueMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/master-config/queues/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-queues'] });
      showToast('Queue status updated successfully', 'success');
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

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    createCategoryMutation.mutate({ name: newCategory.trim(), description: newCategoryDesc.trim() || undefined });
  };

  const handleAddQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueue.trim()) return;
    createQueueMutation.mutate({ name: newQueue.trim(), description: newQueueDesc.trim() || undefined });
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
        <h2 className="text-xl font-bold text-white tracking-widest uppercase mb-1">
          Master Data Configuration
        </h2>
        <p className="text-xs text-slate-400 font-mono">
          Provision categories, types, and queues dynamically into telemetry drop-downs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Types Panel */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between h-full shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
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
                  <div key={t.id} className="p-3 bg-black/40 border border-white/5 rounded-xl hover:border-white/10 transition-colors flex justify-between items-center gap-4">
                    <div>
                      <div className="text-xs font-mono font-bold text-white uppercase">{t.name}</div>
                      {t.description && <div className="text-[10px] text-slate-400 font-mono mt-1 leading-relaxed">{t.description}</div>}
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
              className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none font-mono text-xs uppercase"
            />
            <input
              type="text"
              value={newTypeDesc}
              onChange={(e) => setNewTypeDesc(e.target.value)}
              placeholder="Optional Description"
              className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none font-mono text-xs"
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
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between h-full shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
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
                  <div key={c.id} className="p-3 bg-black/40 border border-white/5 rounded-xl hover:border-white/10 transition-colors flex justify-between items-center gap-4">
                    <div>
                      <div className="text-xs font-mono font-bold text-white uppercase">{c.name}</div>
                      {c.description && <div className="text-[10px] text-slate-400 font-mono mt-1 leading-relaxed">{c.description}</div>}
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
              className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none font-mono text-xs uppercase"
            />
            <input
              type="text"
              value={newCategoryDesc}
              onChange={(e) => setNewCategoryDesc(e.target.value)}
              placeholder="Optional Description"
              className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none font-mono text-xs"
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

        {/* Queues Panel */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between h-full shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
          <div>
            <h3 className="text-sm font-bold text-cyan-400 font-mono uppercase tracking-wider mb-4 pb-2 border-b border-white/5 flex items-center justify-between">
              <span>Queues</span>
              <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-2.5 py-0.5 rounded-full">
                {queues.length} Defined
              </span>
            </h3>

            {/* List */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 mb-6">
              {loadingQueues ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs animate-pulse">Loading..</div>
              ) : queues.length === 0 ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs">No queues defined.</div>
              ) : (
                queues.map((q) => (
                  <div key={q.id} className="p-3 bg-black/40 border border-white/5 rounded-xl hover:border-white/10 transition-colors flex justify-between items-center gap-4">
                    <div>
                      <div className="text-xs font-mono font-bold text-white uppercase">{q.name}</div>
                      {q.description && <div className="text-[10px] text-slate-400 font-mono mt-1 leading-relaxed">{q.description}</div>}
                    </div>
                    <button
                      onClick={() => toggleQueueMutation.mutate(q.id)}
                      className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none shadow-[0_0_10px_rgba(0,0,0,0.5)] flex-shrink-0 ${q.isActive !== false
                        ? 'bg-emerald-500/20 border border-emerald-500/50'
                        : 'bg-rose-500/10 border border-rose-500/30'
                        }`}
                    >
                      <span
                        className={`${q.isActive !== false
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
          <form onSubmit={handleAddQueue} className="space-y-3 mt-auto pt-4 border-t border-white/5">
            <input
              type="text"
              required
              value={newQueue}
              onChange={(e) => setNewQueue(e.target.value)}
              placeholder="Queue Name (e.g. NET_SEC)"
              className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none font-mono text-xs uppercase"
            />
            <input
              type="text"
              value={newQueueDesc}
              onChange={(e) => setNewQueueDesc(e.target.value)}
              placeholder="Optional Description"
              className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none font-mono text-xs"
            />
            <button
              type="submit"
              disabled={createQueueMutation.isPending}
              className="w-full py-2.5 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-500 text-cyan-300 hover:text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] uppercase tracking-widest text-[10px] font-mono disabled:opacity-50"
            >
              {createQueueMutation.isPending ? 'Adding..' : '+ Add New Queue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
