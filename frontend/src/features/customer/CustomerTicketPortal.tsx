import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

interface Comment {
  id: string;
  content: string;
  isInternal: boolean;
  authorId: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    role: {
      name: string;
    } | null;
  };
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'PENDING' | 'WAITING' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string | null;
  source: string;
  slaDeadline: string;
  customerId: string;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
}

const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    error: 'bg-rose-500/10 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]',
    info: 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
  };

  return (
    <div className={`fixed bottom-5 right-5 z-[100] border p-4 rounded-xl flex items-center gap-3 backdrop-blur-xl ${styles[type]}`}>
      <span className={`w-2 h-2 rounded-full ${type === 'success' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : type === 'error' ? 'bg-rose-400 shadow-[0_0_8px_#f43f5e]' : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'}`} />
      <span className="font-mono text-xs uppercase tracking-wider">{message}</span>
      <button onClick={onClose} className="ml-4 hover:text-white transition-colors">✕</button>
    </div>
  );
};

export const CustomerTicketPortal: React.FC = () => {
  const queryClient = useQueryClient();
  const { logout, user } = useAuth();

  // Tabs: 'my-tickets' | 'create-ticket'
  const [activeTab, setActiveTab] = useState<'my-tickets' | 'create-ticket'>('my-tickets');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Search + Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Form states
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'LOW',
    source: 'PORTAL',
    category: 'General Support'
  });
  const [newComment, setNewComment] = useState('');

  // Fetch Tickets
  const { data: tickets = [], isLoading, isError, error } = useQuery<Ticket[]>({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const response = await api.get('/tickets/my-tickets');
      return response.data;
    }
  });

  // Create Ticket Mutation
  const createTicketMutation = useMutation({
    mutationFn: async (payload: typeof newTicket) => {
      // Map CRITICAL priority internally to URGENT if chosen in dropdown
      const priorityMapped = payload.priority === 'CRITICAL' ? 'URGENT' : payload.priority;
      const response = await api.post('/tickets', {
        ...payload,
        priority: priorityMapped
      });
      return response.data;
    },
    onSuccess: () => {
      setToast({ message: 'SUPPORT SEQUENCE INITIALIZED. TELEMETRY TRANSMITTED.', type: 'success' });
      setNewTicket({
        title: '',
        description: '',
        priority: 'LOW',
        source: 'PORTAL',
        category: 'General Support'
      });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      setActiveTab('my-tickets');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'FAILED TO INITIATE TICKET.';
      setToast({ message: msg, type: 'error' });
    }
  });

  // Add Comment Mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ ticketId, content }: { ticketId: string; content: string }) => {
      const response = await api.post(`/tickets/${ticketId}/comments`, { content });
      return response.data;
    },
    onSuccess: (comment) => {
      if (selectedTicket) {
        // Optimistically append the comment with fully populated author info locally
        const mockAuthor = {
          id: user?.id || comment.authorId,
          name: user?.name || 'You',
          email: user?.email || '',
          role: { name: user?.role?.name || 'CUSTOMER' }
        };
        const populatedComment = { ...comment, author: mockAuthor };
        const updatedTicket = {
          ...selectedTicket,
          comments: [...(selectedTicket.comments || []), populatedComment]
        };
        setSelectedTicket(updatedTicket);
        queryClient.setQueryData<Ticket[]>(['my-tickets'], (prev) =>
          prev ? prev.map((t) => (t.id === selectedTicket.id ? updatedTicket : t)) : []
        );
      }
      setNewComment('');
      setToast({ message: 'REPLY BROADCAST SUCCESSFUL.', type: 'success' });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'TRANSMISSION FAILURE.';
      setToast({ message: msg, type: 'error' });
    }
  });

  // Close Ticket Mutation
  const closeTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const response = await api.patch(`/tickets/${ticketId}/close`);
      return response.data;
    },
    onSuccess: () => {
      if (selectedTicket) {
        const updatedTicket = { ...selectedTicket, status: 'CLOSED' as const };
        setSelectedTicket(updatedTicket);
        queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      }
      setToast({ message: 'TICKET TERMINATION RESOLVED.', type: 'success' });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'CLOSURE TRANSACTION FAILURE.';
      setToast({ message: msg, type: 'error' });
    }
  });

  // Form submit handler
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.title.trim() || !newTicket.description.trim()) return;
    createTicketMutation.mutate(newTicket);
  };

  // Comment submit handler
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;
    addCommentMutation.mutate({ ticketId: selectedTicket.id, content: newComment });
  };

  // Helper: calculate time remaining for SLA
  const calculateTimeRemaining = (deadlineDate: string, status: string) => {
    if (status === 'CLOSED') return { text: 'Resolved', color: 'text-slate-500' };
    const total = Date.parse(deadlineDate) - Date.now();
    if (total <= 0) return { text: 'SLA Breached', color: 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.8)]' };
    
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    
    if (hours < 1) return { text: `${minutes}m left`, color: 'text-orange-400 animate-pulse drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]' };
    return { text: `${hours}h ${minutes}m left`, color: 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' };
  };

  // Badge glow colors
  const getStatusGlow = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-cyan-300 border-cyan-500/40 bg-cyan-950/20 shadow-[0_0_15px_rgba(34,211,238,0.3)]';
      case 'PENDING': return 'text-amber-300 border-amber-500/40 bg-amber-950/20 shadow-[0_0_15px_rgba(251,191,36,0.3)]';
      case 'WAITING': return 'text-purple-300 border-purple-500/40 bg-purple-950/20 shadow-[0_0_15px_rgba(192,132,252,0.3)]';
      case 'CLOSED': return 'text-slate-400 border-slate-700 bg-slate-900/50';
      default: return 'text-cyan-300 border-cyan-500/40 bg-cyan-950/20';
    }
  };

  const getPriorityGlow = (priority: string) => {
    switch (priority) {
      case 'URGENT':
      case 'CRITICAL':
        return 'text-rose-400 border-rose-500/40 bg-rose-950/20 shadow-[0_0_10px_rgba(251,113,133,0.3)]';
      case 'HIGH': return 'text-orange-400 border-orange-500/40 bg-orange-950/20 shadow-[0_0_10px_rgba(251,146,60,0.3)]';
      case 'MEDIUM': return 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20 shadow-[0_0_10px_rgba(34,211,238,0.3)]';
      case 'LOW': return 'text-slate-400 border-slate-700 bg-slate-900/50';
      default: return 'text-slate-400 border-slate-700 bg-slate-900/50';
    }
  };

  // Statistics calculation
  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter(t => t.status === 'PENDING' || t.status === 'WAITING').length;
  const closedCount = tickets.filter(t => t.status === 'CLOSED').length;

  // Filter and search computation
  const filteredTickets = tickets.filter(t => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || 
      (priorityFilter === 'CRITICAL' ? t.priority === 'URGENT' : t.priority === priorityFilter);
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200 font-sans flex flex-col overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Main Top Header Navigation */}
      <header className="border-b border-white/5 bg-slate-950/50 backdrop-blur-md px-8 py-4 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-mono font-black text-white text-lg shadow-[0_0_15px_rgba(34,211,238,0.5)]">
            T
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase">
              OmniPortal Console
            </h1>
            <p className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest leading-none">
              Client Node ID: {user?.id.substring(0, 8).toUpperCase() || 'UNKNOWN'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Link
            to="/settings"
            className="text-xs font-mono text-slate-400 hover:text-white uppercase tracking-wider transition-colors"
          >
            Settings
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-xs font-mono text-slate-500">{user?.email}</span>
          <button
            onClick={logout}
            className="px-4 py-2 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg text-xs font-bold transition-all uppercase tracking-widest"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Primary Dashboard Container */}
      <div className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto space-y-8 pb-16">
        
        {/* Welcome & Stats Section */}
        <section className="flex flex-col gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div>
              <h2 className="text-3xl font-extrabold tracking-wide text-white uppercase mb-2">
                Welcome back, {user?.name || 'OPERATOR'}
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                Submit support requests, monitor active sequences, and interact with the technical response core.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="font-mono text-xs uppercase tracking-widest text-emerald-400">
                Core Systems Connected
              </span>
            </div>
          </div>

          {/* Ticket stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Total Requests</span>
              <span className="text-4xl font-black text-white font-mono mt-2">{isLoading ? '...' : totalCount}</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Open Status</span>
              <span className="text-4xl font-black text-cyan-400 font-mono mt-2">{isLoading ? '...' : openCount}</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">In Progress</span>
              <span className="text-4xl font-black text-amber-400 font-mono mt-2">{isLoading ? '...' : inProgressCount}</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Resolved / Closed</span>
              <span className="text-4xl font-black text-emerald-400 font-mono mt-2">{isLoading ? '...' : closedCount}</span>
            </div>
          </div>
        </section>

        {/* Inner Tabs and Filters Menu */}
        <section className="space-y-6">
          <div className="border-b border-white/10 flex justify-between items-end gap-6 flex-wrap">
            <div className="flex gap-4">
              <button
                onClick={() => { setActiveTab('my-tickets'); setSelectedTicket(null); }}
                className={`pb-4 px-2 font-bold tracking-widest uppercase text-xs transition-all border-b-2 ${activeTab === 'my-tickets' ? 'border-cyan-500 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                My Tickets
              </button>
              <button
                onClick={() => { setActiveTab('create-ticket'); setSelectedTicket(null); }}
                className={`pb-4 px-2 font-bold tracking-widest uppercase text-xs transition-all border-b-2 ${activeTab === 'create-ticket' ? 'border-cyan-500 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                Create Ticket
              </button>
            </div>

            {/* Filter controls only visible in my-tickets */}
            {activeTab === 'my-tickets' && (
              <div className="flex items-center gap-4 pb-4 flex-wrap">
                <input
                  type="text"
                  placeholder="Search by ID or Title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none text-xs font-mono placeholder-slate-700 w-52 uppercase tracking-wide"
                />
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none text-xs font-mono"
                >
                  <option value="ALL">ALL STATUSES</option>
                  <option value="OPEN">OPEN</option>
                  <option value="PENDING">PENDING</option>
                  <option value="WAITING">WAITING</option>
                  <option value="CLOSED">CLOSED</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none text-xs font-mono"
                >
                  <option value="ALL">ALL PRIORITIES</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            )}
          </div>

          {/* ACTIVE TAB CONTAINER */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-h-[400px] flex flex-col">
            
            {/* MY TICKETS TAB */}
            {activeTab === 'my-tickets' && (
              <div className="flex-1 flex flex-col">
                {isLoading ? (
                  // Skeleton loader
                  <div className="space-y-4 flex-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
                    ))}
                  </div>
                ) : isError ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-rose-400 font-mono text-sm tracking-widest">
                    DATALINK TRANSACTION FAILURE: {(error as Error).message.toUpperCase()}
                  </div>
                ) : filteredTickets.length === 0 ? (
                  // Friendly empty state
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4 py-16">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-600 border border-white/5">
                      ✕
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-xs uppercase tracking-widest text-slate-400">No Tickets Registered</p>
                      <p className="text-xs text-slate-600 uppercase tracking-widest mt-1">Submit a new support ticket to begin tracking.</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-500 text-[10px] uppercase font-mono tracking-widest">
                          <th className="p-4">Ticket Number</th>
                          <th className="p-4">Title</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Priority</th>
                          <th className="p-4">Created Date</th>
                          <th className="p-4">Last Updated</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredTickets.map(ticket => (
                          <tr key={ticket.id} className="hover:bg-white/5 transition-colors group">
                            <td className="p-4 font-mono text-xs text-cyan-400">
                              {ticket.id}
                            </td>
                            <td className="p-4 text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                              {ticket.title}
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${getStatusGlow(ticket.status)}`}>
                                {ticket.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${getPriorityGlow(ticket.priority)}`}>
                                {ticket.priority === 'URGENT' ? 'CRITICAL' : ticket.priority}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-xs text-slate-500">
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 font-mono text-xs text-slate-500">
                              {new Date(ticket.updatedAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => setSelectedTicket(ticket)}
                                className="px-4 py-1.5 border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-white rounded-lg text-xs font-bold transition-all uppercase tracking-widest"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* CREATE TICKET TAB */}
            {activeTab === 'create-ticket' && (
              <div className="max-w-2xl mx-auto w-full">
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-2">
                    Initialize Support Sequence
                  </h3>
                  <p className="text-slate-400 text-xs uppercase tracking-wider">
                    Provide precise details for diagnostics transmission.
                  </p>
                </div>
                <form onSubmit={handleCreateSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">
                      Subject Designation
                    </label>
                    <input
                      required
                      type="text"
                      value={newTicket.title}
                      onChange={e => setNewTicket({ ...newTicket, title: e.target.value })}
                      placeholder="e.g. Database connectivity drop in production stack"
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 focus:border-cyan-400 text-white outline-none transition-all placeholder-slate-700 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">
                      Telemetry Details
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={newTicket.description}
                      onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                      placeholder="Submit full stack trace or description of the error."
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 focus:border-cyan-400 text-white outline-none transition-all resize-none placeholder-slate-700 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">
                        Threat Level
                      </label>
                      <select
                        value={newTicket.priority}
                        onChange={e => setNewTicket({ ...newTicket, priority: e.target.value })}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none text-sm appearance-none font-mono"
                      >
                        <option value="LOW" className="bg-slate-900">LOW</option>
                        <option value="MEDIUM" className="bg-slate-900">MEDIUM</option>
                        <option value="HIGH" className="bg-slate-900">HIGH</option>
                        <option value="CRITICAL" className="bg-slate-900">CRITICAL</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">
                        Access Source
                      </label>
                      <select
                        value={newTicket.source}
                        onChange={e => setNewTicket({ ...newTicket, source: e.target.value })}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none text-sm appearance-none font-mono"
                      >
                        <option value="PORTAL" className="bg-slate-900">PORTAL</option>
                        <option value="EMAIL" className="bg-slate-900">EMAIL</option>
                        <option value="PHONE" className="bg-slate-900">PHONE</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">
                        Category Sector
                      </label>
                      <select
                        value={newTicket.category || ''}
                        onChange={e => setNewTicket({ ...newTicket, category: e.target.value })}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none text-sm appearance-none font-mono"
                      >
                        <option value="General Support" className="bg-slate-900">General Support</option>
                        <option value="Billing" className="bg-slate-900">Billing</option>
                        <option value="Technical Issue" className="bg-slate-900">Technical Issue</option>
                        <option value="Feature Request" className="bg-slate-900">Feature Request</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={createTicketMutation.isPending}
                    className="w-full py-4 mt-4 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-500 text-cyan-300 hover:text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] uppercase tracking-widest text-sm flex justify-center items-center gap-2"
                  >
                    {createTicketMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                        Transmitting Telemetry...
                      </>
                    ) : (
                      'Transmit Request Sequence'
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* SPLIT-PANE TICKET DETAILS VIEW MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/70 backdrop-blur-md">
          <div className="bg-slate-900/90 border border-white/10 rounded-[2rem] w-full max-w-5xl h-[85vh] flex flex-col md:flex-row shadow-[0_20px_70px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Left Meta Details Pane */}
            <div className="w-full md:w-1/3 bg-black/40 border-r border-white/5 p-8 flex flex-col overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <span className={`px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-lg border ${getStatusGlow(selectedTicket.status)}`}>
                  {selectedTicket.status}
                </span>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full p-2"
                >
                  ✕
                </button>
              </div>
              
              <h2 className="text-xl font-bold text-white mb-2 leading-tight uppercase font-mono tracking-wide">
                {selectedTicket.id}
              </h2>
              <h3 className="text-lg font-semibold text-slate-300 mb-6 leading-tight">
                {selectedTicket.title}
              </h3>
              
              <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex-grow mb-6 max-h-48 overflow-y-auto">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block mb-2">Description</span>
                <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              <div className="space-y-3">
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 flex justify-between items-center">
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Priority Threat</span>
                  <span className={`font-bold text-xs ${getPriorityGlow(selectedTicket.priority).split(' ')[0]}`}>
                    {selectedTicket.priority === 'URGENT' ? 'CRITICAL' : selectedTicket.priority}
                  </span>
                </div>
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 flex justify-between items-center">
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Category Sector</span>
                  <span className="text-slate-300 font-mono text-xs uppercase">{selectedTicket.category || 'General'}</span>
                </div>
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 flex justify-between items-center">
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Source Channel</span>
                  <span className="text-slate-300 font-mono text-xs uppercase">{selectedTicket.source}</span>
                </div>
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 flex justify-between items-center">
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">SLA Time Remaining</span>
                  <span className={`font-mono text-xs ${calculateTimeRemaining(selectedTicket.slaDeadline, selectedTicket.status).color}`}>
                    {calculateTimeRemaining(selectedTicket.slaDeadline, selectedTicket.status).text}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Comments Timeline Pane */}
            <div className="w-full md:w-2/3 flex flex-col bg-slate-950/40">
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block border-b border-white/5 pb-2">
                  TRANSMISSIONS CHRONOLOGY
                </span>
                
                {selectedTicket.comments?.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-600 font-mono text-xs tracking-widest uppercase">
                    No replies or logs on record
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedTicket.comments?.map(comment => {
                      const isCustomer = comment.authorId === user?.id;
                      const authorName = comment.author?.name || 'USER';
                      const authorRole = comment.author?.role?.name || 'CUSTOMER';
                      
                      return (
                        <div
                          key={comment.id}
                          className={`flex flex-col max-w-[85%] ${isCustomer ? 'ml-auto items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-2 mb-1.5 font-mono text-[9px] text-slate-500 tracking-wider">
                            <span className="uppercase text-slate-400 font-semibold">{authorName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase scale-90">{authorRole}</span>
                            <span>•</span>
                            <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className={`px-5 py-3 rounded-2xl text-xs leading-relaxed border ${isCustomer ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-50 rounded-tr-sm shadow-[0_0_15px_rgba(6,182,212,0.08)]' : 'bg-white/5 border-white/10 text-slate-300 rounded-tl-sm'}`}>
                            {comment.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Messaging Input Area */}
              <div className="p-6 bg-black/40 border-t border-white/5">
                {selectedTicket.status !== 'CLOSED' ? (
                  <div className="flex flex-col gap-4">
                    <form onSubmit={handleAddComment} className="flex gap-3">
                      <input
                        type="text"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Type reply and broadcast response sequence..."
                        className="flex-1 px-5 py-3.5 bg-slate-900/60 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none transition-all text-xs font-mono placeholder-slate-600"
                      />
                      <button
                        type="submit"
                        disabled={!newComment.trim() || addCommentMutation.isPending}
                        className="px-6 py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] disabled:opacity-50 disabled:shadow-none uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                      >
                        {addCommentMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          'Transmit'
                        )}
                      </button>
                    </form>
                    <button
                      onClick={() => closeTicketMutation.mutate(selectedTicket.id)}
                      disabled={closeTicketMutation.isPending}
                      className="self-center mt-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-950/20 px-4 py-2 rounded-lg transition-colors border border-emerald-500/20 hover:border-emerald-500/40"
                    >
                      {closeTicketMutation.isPending ? (
                        <div className="w-3.5 h-3.5 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
                          Confirm Resolution & Terminate Ticket
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-3 text-slate-500 font-mono text-[10px] uppercase tracking-widest border border-white/5 bg-white/5 rounded-xl">
                    COMMUNICATION CHANNEL SEVERED. RESPONSE COMPLETE.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerTicketPortal;
