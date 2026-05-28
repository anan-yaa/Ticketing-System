import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function UserPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Ticket Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('LOW');

  // Fetch only tickets where customerId matches the logged in user
  // The backend '/tickets/my-tickets' handles this mapping
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const res = await api.get('/tickets/my-tickets');
      return res.data;
    }
  });

  const createTicketMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/tickets', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      setIsModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewPriority('LOW');
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    createTicketMutation.mutate({
      title: newTitle,
      description: newDesc,
      priority: newPriority,
      source: 'PORTAL'
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black font-sans text-slate-200">

      {/* HEADER */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-pulse"></span>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-widest uppercase">
              🌐 SUPPORT PORTAL
            </h1>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-xs font-mono text-slate-400 flex flex-col items-end">
              <span className="uppercase tracking-widest text-[9px] mb-1">Session Active</span>
              <span className="text-cyan-400">{user?.email}</span>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="px-6 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl font-mono text-xs uppercase tracking-widest transition-all hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-12">

        {/* HERO ACTION BUTTON */}
        <div className="mb-16 flex justify-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-10 py-5 bg-cyan-500/10 border border-cyan-400/50 hover:bg-cyan-500/20 text-cyan-300 font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:shadow-[0_0_35px_rgba(34,211,238,0.3)] uppercase tracking-widest text-sm flex items-center gap-4 group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">➕</span> CREATE NEW SUPPORT TICKET
          </button>
        </div>

        {/* TICKET GRID */}
        <div className="theme-card-panel overflow-hidden">
          <div className="px-8 py-6 border-b border-white/5 bg-slate-900/60 flex justify-between items-center">
            <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest font-bold">My Active Requests</h2>
            <div className="text-[10px] font-mono text-slate-500 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
              Filtered for {user?.email}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/60 border-b border-white/5 text-[10px] uppercase font-mono text-slate-500 tracking-wider">
                  <th className="p-6 font-bold">Ticket ID</th>
                  <th className="p-6 font-bold">Title</th>
                  <th className="p-6 font-bold">Status</th>
                  <th className="p-6 font-bold">Priority</th>
                  <th className="p-6 font-bold">Created Date</th>
                </tr>
              </thead>
              <tbody className="text-sm font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 font-mono tracking-widest animate-pulse">Syncing Database...</td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 font-mono tracking-widest">NO REGISTERED TICKETS FOUND</td>
                  </tr>
                ) : (
                  tickets.map((t: any) => (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="p-6 font-mono text-cyan-400 text-xs">#{t.ticketId || t.id.substring(0, 8)}</td>
                      <td className="p-6 text-slate-200 font-medium group-hover:text-white transition-colors">{t.title}</td>
                      <td className="p-6">
                        <span className={`px-3 py-1 rounded-md text-[10px] font-mono tracking-wider border ${t.status === 'OPEN' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                          t.status === 'IN_PROGRESS' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                            'bg-slate-500/10 border-slate-500/30 text-slate-400'
                          }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-6 font-mono text-xs">
                        <span className={`px-2 py-1 rounded ${t.priority === 'URGENT' || t.priority === 'P1' ? 'text-rose-400 bg-rose-500/10' :
                          t.priority === 'HIGH' || t.priority === 'P2' ? 'text-orange-400 bg-orange-500/10' :
                            'text-slate-400'
                          }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-6 text-slate-500 font-mono text-xs">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* NEW TICKET MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="px-8 py-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <h2 className="text-lg font-black text-white tracking-widest uppercase flex items-center gap-3">
                <span className="text-xl">➕</span> Initiate Support Request
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">Issue Title</label>
                <input
                  required
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Brief description of the issue"
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none font-sans text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">Detailed Description</label>
                <textarea
                  required
                  rows={5}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Provide any error codes, steps to reproduce, or affected systems..."
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none font-sans text-sm resize-none transition-all"
                />
              </div>


              <div className="pt-6 border-t border-white/5 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-transparent hover:bg-white/5 text-slate-300 font-mono text-xs uppercase tracking-widest rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="px-8 py-2.5 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-500 text-cyan-300 hover:text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] uppercase tracking-widest text-[10px] font-mono disabled:opacity-50"
                >
                  {createTicketMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
