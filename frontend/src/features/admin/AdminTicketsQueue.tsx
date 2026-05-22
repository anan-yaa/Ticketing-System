import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllTicketsAdmin, createTicketAdmin, updateTicketCoreData, Ticket } from '../../api/tickets';
import { fetchUsers } from '../../api/users';
import { PermissionGate } from '../../components/PermissionGate';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { SlaHealthTelemetry } from '../../components/SlaHealthTelemetry';

const SERVICE_GROUPS_CONFIG = [
  {
    service: 'RIMS',
    description: 'Remote Infrastructure Management Services',
    queues: [
      { name: 'RIMS - Information', label: 'Information' },
      { name: 'RIMS - Offboarding', label: 'Offboarding' },
      { name: 'RIMS - Proactive', label: 'Proactive' }
    ]
  },
  {
    service: 'MSS',
    description: 'Managed Security Services',
    queues: [
      { name: 'MSS - SIEM Alerts', label: 'SIEM Alerts' },
      { name: 'MSS - Incident Response', label: 'Incident Response' },
      { name: 'MSS - Vulnerability Management', label: 'Vulnerability Management' }
    ]
  },

  {
    service: 'WPE',
    description: 'Workplace Endpoints',
    queues: [
      { name: 'WPE - Device Enrollment', label: 'Device Enrollment' },
      { name: 'WPE - Quarantine Investigation', label: 'Quarantine Investigation' },
      { name: 'WPE - Software Distribution', label: 'Software Distribution' }
    ]
  }
];

export const AdminTicketsQueue: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<'openQueue' | 'inProgress' | 'closedArchive'>('openQueue');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCoreDataModalOpen, setIsCoreDataModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Create Ticket Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('Portal');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Core Data Form State
  const [coreType, setCoreType] = useState('');
  const [coreQueueId, setCoreQueueId] = useState('');
  const [coreStatus, setCoreStatus] = useState('OPEN');
  const [coreFirewallCategory, setCoreFirewallCategory] = useState('');
  const [coreSource, setCoreSource] = useState('PORTAL');
  const [coreIsScope, setCoreIsScope] = useState(true);
  const [coreCustomerName, setCoreCustomerName] = useState('');
  const [coreServiceContract, setCoreServiceContract] = useState('');
  const [coreCriticality, setCoreCriticality] = useState('');
  const [corePriority, setCorePriority] = useState('LOW');
  const [coreTimeSpent, setCoreTimeSpent] = useState(0);
  const [coreOwnerId, setCoreOwnerId] = useState('');
  const [coreDevice, setCoreDevice] = useState('');
  const [coreIp, setCoreIp] = useState('');

  // Fetch Tickets
  const { data: tickets = [], isLoading: isLoadingTickets, isError: isErrorTickets } = useQuery<Ticket[]>({
    queryKey: ['admin-tickets'],
    queryFn: fetchAllTicketsAdmin,
  });

  // Fetch Users for customer selection
  const { data: usersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: () => fetchUsers(1, 100, customerSearch),
    enabled: isCreateModalOpen,
  });

  const customers = (usersData?.users || []).filter(
    (u: any) => u.role?.name === 'CUSTOMER' || u.systemRole === 'CUSTOMER'
  );

  // Fetch all users for owners dropdown
  const { data: ownersData } = useQuery({
    queryKey: ['owners-list'],
    queryFn: () => fetchUsers(1, 100, ''),
    enabled: isCoreDataModalOpen,
  });

  const owners = (ownersData?.users || []).filter(
    (u: any) => u.role?.name !== 'CUSTOMER' && u.systemRole !== 'CUSTOMER'
  );

  // Fetch Master Data Categories
  const { data: masterCategories = [] } = useQuery<any[]>({
    queryKey: ['master-categories'],
    queryFn: async () => {
      const res = await api.get('/master-config/categories?activeOnly=true');
      return res.data;
    },
    enabled: isCoreDataModalOpen,
  });

  // Fetch Master Data Types
  const { data: masterTypes = [] } = useQuery<any[]>({
    queryKey: ['master-types'],
    queryFn: async () => {
      const res = await api.get('/master-config/types?activeOnly=true');
      return res.data;
    },
    enabled: isCoreDataModalOpen,
  });

  // Fetch Master Data Queues
  const { data: masterQueues = [] } = useQuery<any[]>({
    queryKey: ['master-queues'],
    queryFn: async () => {
      const res = await api.get('/master-config/queues?activeOnly=true');
      return res.data;
    },
    enabled: isCoreDataModalOpen,
  });

  // Fetch Master Data Services
  const { data: masterServices = [] } = useQuery<any[]>({
    queryKey: ['master-services'],
    queryFn: async () => {
      const res = await api.get('/master-config/services?activeOnly=true');
      return res.data;
    },
    enabled: isCoreDataModalOpen,
  });

  // Filter Master Queues dynamically by selected Service Contract name or id
  const filteredQueues = masterQueues.filter((q: any) => {
    if (!coreServiceContract) return false;
    return q.service?.id === coreServiceContract || q.service?.name === coreServiceContract;
  });

  // Show Toast Helper
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Create Ticket Mutation
  const createTicketMutation = useMutation({
    mutationFn: createTicketAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      showToast('TICKET CREATED SUCCESSFULLY', 'success');
      setIsCreateModalOpen(false);
      setTitle('');
      setDescription('');
      setCategory('');
      setSource('Portal');
      setSelectedCustomerId('');
      setCustomerSearch('');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'FAILED TO CREATE TICKET', 'error');
    },
  });

  // Core Data Update Mutation
  const updateCoreDataMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateTicketCoreData(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      showToast('CORE TELEMETRY ENRICHED SUCCESSFULLY', 'success');
      setIsCoreDataModalOpen(false);

      // Update local selected ticket details
      if (selectedTicket && selectedTicket.id === updated.id) {
        setSelectedTicket({
          ...selectedTicket,
          ...updated,
        });
      }
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'FAILED TO ENRICH TELEMETRY', 'error');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !selectedCustomerId) {
      showToast('TITLE, DESCRIPTION, AND CUSTOMER ARE REQUIRED', 'error');
      return;
    }

    // Fallback verification check to prevent submission breakage
    let targetCustomerId = selectedCustomerId;
    const chosenCust = customers.find((c: any) => c.id === selectedCustomerId);
    if (chosenCust) {
      if (!chosenCust.id && !chosenCust.customerId) {
        targetCustomerId = 'FALLBACK_CUSTOMER_INDEX';
      } else {
        targetCustomerId = chosenCust.id || chosenCust.customerId;
      }
    }

    createTicketMutation.mutate({
      title,
      description,
      category,
      source,
      customerId: targetCustomerId,
    });
  };

  const handleCoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    const payload: any = {
      ticketType: coreType || undefined,
      queueId: coreQueueId || undefined,
      status: coreStatus || undefined,
      firewallCategory: coreFirewallCategory || undefined,
      ticketSource: coreSource || undefined,
      isScopeInScope: coreIsScope,
      customerName: coreCustomerName || undefined,
      serviceContract: coreServiceContract || undefined,
      criticality: coreCriticality || undefined,
      priority: corePriority || undefined,
      timeSpentMin: parseInt(String(coreTimeSpent), 10) || 0,
      ticketOwnerId: coreOwnerId || undefined,
      affectedDevice: coreDevice || undefined,
      deviceIp: coreIp || undefined,
    };

    updateCoreDataMutation.mutate({ id: selectedTicket.id, payload });
  };

  const openCoreDataForm = () => {
    if (!selectedTicket) return;
    setCoreType(selectedTicket.ticketType || '');
    setCoreQueueId(selectedTicket.queueId || '');
    setCoreStatus(selectedTicket.status || 'OPEN');
    setCoreFirewallCategory(selectedTicket.firewallCategory || '');
    setCoreSource(selectedTicket.ticketSource || selectedTicket.source || 'PORTAL');
    setCoreIsScope(selectedTicket.isScopeInScope ?? true);
    setCoreCustomerName(selectedTicket.customerName || selectedTicket.customer?.name || '');
    setCoreServiceContract(selectedTicket.serviceContract || '');
    setCoreCriticality(selectedTicket.criticality || '');
    setCorePriority(selectedTicket.priority || 'LOW');
    setCoreTimeSpent(selectedTicket.timeSpentMin || 0);
    setCoreOwnerId(selectedTicket.ticketOwnerId || '');
    setCoreDevice(selectedTicket.affectedDevice || '');
    setCoreIp(selectedTicket.deviceIp || '');
    setIsCoreDataModalOpen(true);
  };

  // Filter tickets dynamically by routing group (Rule B)
  const groupFilteredTickets = tickets.filter((t) => {
    if (selectedGroupFilter !== 'ALL') {
      return t.queueId === selectedGroupFilter;
    }
    return true;
  });

  // Filter tickets for "Open Queue" (status is exactly OPEN)
  const openQueueTickets = groupFilteredTickets.filter(
    (t) => t.status === 'OPEN'
  );

  // Filter tickets for "In Progress" (status is exactly IN_PROGRESS)
  const inProgressTickets = groupFilteredTickets.filter(
    (t) => t.status === 'IN_PROGRESS'
  );

  // Filter tickets for "Closed Archive" (status is exactly CLOSED)
  const closedArchiveTickets = groupFilteredTickets.filter(
    (t) => t.status === 'CLOSED'
  );

  const displayedTickets =
    workspace === 'openQueue' ? openQueueTickets :
      workspace === 'inProgress' ? inProgressTickets :
        workspace === 'closedArchive' ? closedArchiveTickets : [];

  const priorityColor = (p: string) => {
    switch (String(p).toUpperCase()) {
      case 'URGENT':
        return 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.2)]';
      case 'HIGH':
        return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
      case 'MEDIUM':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      default:
        return 'bg-slate-500/10 border-slate-500/30 text-slate-400';
    }
  };

  const statusColor = (s: string) => {
    switch (String(s).toUpperCase()) {
      case 'OPEN':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]';
      case 'IN_PROGRESS':
        return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.2)]';
      case 'CLOSED':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-400 opacity-60';
      default:
        return 'bg-slate-500/10 border-slate-500/30 text-slate-400';
    }
  };

  // If a ticket type or other core metadata properties are currently null
  const isCoreDataNull = selectedTicket && !selectedTicket.ticketType;

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in">
          <div
            className={`backdrop-blur-xl border px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-3 font-mono text-sm ${toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/50 text-rose-400'
              }`}
          >
            <span
              className={`w-2 h-2 rounded-full animate-ping ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
            ></span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Workspace Split-Tab Selection & Actions */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div className="flex gap-4">
          <button
            onClick={() => setWorkspace('openQueue')}
            className={`px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-all rounded-xl border ${workspace === 'openQueue'
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
              : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
          >
            [ Open Queue ({openQueueTickets.length}) ]
          </button>
          <button
            onClick={() => setWorkspace('inProgress')}
            className={`px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-all rounded-xl border ${workspace === 'inProgress'
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
              : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
          >
            [ In Progress ({inProgressTickets.length}) ]
          </button>
          <button
            onClick={() => setWorkspace('closedArchive')}
            className={`px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-all rounded-xl border ${workspace === 'closedArchive'
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
              : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
          >
            [ Closed Archive ({closedArchiveTickets.length}) ]
          </button>
        </div>

        <PermissionGate allowedPermissions={['TICKET_CREATE_AS_ADMIN']}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] uppercase tracking-widest text-xs"
          >
            + Create Ticket
          </button>
        </PermissionGate>
      </div>

      {/* Workspace Flex Split */}
      <div className="flex flex-col md:flex-row gap-6 w-full items-start flex-1 overflow-hidden mt-6">
        {/* LEFT SERVICE-QUEUE FILTER RAIL */}
        <div className="w-full md:w-64 shrink-0 bg-slate-950/80 border border-white/10 rounded-2xl p-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-md space-y-6 max-h-[80vh] overflow-y-auto">
          <div>
            <button
              onClick={() => {
                setIsExpanded(!isExpanded);
                setSelectedGroupFilter('ALL');
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-mono transition-all duration-200 uppercase flex items-center justify-between border ${selectedGroupFilter === 'ALL'
                ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)] font-bold'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <span className="flex items-center gap-2">🌐 All Service Groups</span>
              <span className={`transform transition-transform duration-200 text-[10px] ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                ▶
              </span>
            </button>
          </div>

          {isExpanded && (
            <>
              {SERVICE_GROUPS_CONFIG.map((group) => {
                return (
                  <div key={group.service} className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <h4 className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-semibold px-2">
                      ── {group.service} QUEUES ──
                    </h4>
                    <div className="space-y-1">
                      {group.queues.map((q) => {
                        const displayName = `• ${q.label}`;
                        const isActive = selectedGroupFilter === q.name;
                        return (
                          <button
                            key={q.name}
                            onClick={() => setSelectedGroupFilter(q.name)}
                            className={`w-full text-left px-4 py-2 rounded-xl text-xs font-mono transition-all duration-200 uppercase border ${isActive
                              ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-bold'
                              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                              }`}
                          >
                            {displayName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* System/Global Fallback */}
              {(() => {
                const systemQueues = masterQueues.filter(
                  (q) => !q.service && !['RIMS', 'MSS', 'IAM', 'WPE'].some(s => q.name.startsWith(`${s} - `))
                );
                if (systemQueues.length === 0) return null;
                return (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <h4 className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-semibold px-2">
                      ── SYSTEM QUEUES ──
                    </h4>
                    <div className="space-y-1">
                      {systemQueues.map((q) => {
                        const displayName = `• ${q.name}`;
                        const isActive = selectedGroupFilter === q.name;
                        return (
                          <button
                            key={q.id}
                            onClick={() => setSelectedGroupFilter(q.name)}
                            className={`w-full text-left px-4 py-2 rounded-xl text-xs font-mono transition-all duration-200 uppercase border ${isActive
                              ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-bold'
                              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                              }`}
                          >
                            {displayName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* RIGHT CONTENT WORKSPACE */}
        <div className="flex-1 w-full overflow-y-auto">
          {isLoadingTickets ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse border border-white/10" />
              ))}
            </div>
          ) : isErrorTickets ? (
            <div className="h-full flex items-center justify-center text-rose-400 font-mono tracking-widest text-center py-12">
              ERROR FETCHING QUEUE CHANNELS
            </div>
          ) : workspace === 'inProgress' ? (
            <div className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-300 font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 uppercase tracking-widest text-[10px] text-slate-400">
                      <th className="p-4 font-bold font-mono">Identifier</th>
                      <th className="p-4 font-bold font-mono">Title</th>
                      <th className="p-4 font-bold font-mono">Customer Name</th>
                      <th className="p-4 font-bold font-mono">Category</th>
                      <th className="p-4 font-bold font-mono">Assigned Engineer</th>
                      <th className="p-4 font-bold font-mono text-center">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inProgressTickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 uppercase font-mono">
                          No active tickets inside this channel
                        </td>
                      </tr>
                    ) : (
                      inProgressTickets.map((t) => {
                        return (
                          <tr
                            key={t.id}
                            onClick={() => setSelectedTicket(t)}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                          >
                            <td className="p-4 font-bold text-white group-hover:text-cyan-400 font-mono">
                              #{t.id.slice(0, 8).toUpperCase()}
                            </td>
                            <td className="p-4 font-semibold text-slate-200 group-hover:text-cyan-400 font-mono">
                              {t.title}
                            </td>
                            <td className="p-4 font-mono">
                              {t.customerName || t.customer?.name || 'N/A'}
                            </td>
                            <td className="p-4 uppercase font-mono">{t.category || 'General'}</td>
                            <td className="p-4 font-mono">
                              <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-slate-300 text-[10px]">
                                {t.ticketOwner?.name || t.ticketOwner?.email || 'N/A'}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-0.5 border text-[10px] font-bold font-mono rounded uppercase ${priorityColor(t.priority)}`}>
                                {t.priority}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : workspace === 'closedArchive' ? (
            <div className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-300 font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 uppercase tracking-widest text-[10px] text-slate-400">
                      <th className="p-4 font-bold font-mono">Identifier</th>
                      <th className="p-4 font-bold font-mono">Customer Name</th>
                      <th className="p-4 font-bold font-mono">Category</th>
                      <th className="p-4 font-bold font-mono">Closed Date</th>
                      <th className="p-4 font-bold font-mono text-center">SLA Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedArchiveTickets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 uppercase font-mono">
                          No closed tickets in historical archive
                        </td>
                      </tr>
                    ) : (
                      closedArchiveTickets.map((t) => {
                        const isBreached = t.isSlaBreached ?? (t.closedAt ? new Date(t.closedAt) > new Date(t.slaDeadline) : new Date() > new Date(t.slaDeadline));
                        return (
                          <tr
                            key={t.id}
                            onClick={() => setSelectedTicket(t)}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                          >
                            <td className="p-4 font-bold text-white group-hover:text-cyan-400 font-mono">
                              #{t.id.slice(0, 8).toUpperCase()}
                            </td>
                            <td className="p-4 font-mono">
                              {t.customerName || t.customer?.name || 'N/A'}
                            </td>
                            <td className="p-4 uppercase font-mono">{t.category || 'General'}</td>
                            <td className="p-4 font-mono">
                              {t.closedAt ? new Date(t.closedAt).toLocaleString() : 'N/A'}
                            </td>
                            <td className="p-4 text-center">
                              <span
                                className={`px-3 py-1 font-black tracking-widest text-[9px] uppercase rounded-full border ${!isBreached
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse'
                                  }`}
                              >
                                {!isBreached ? 'COMPLIANT' : 'BREACHED'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : displayedTickets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
              <div className="text-sm font-mono tracking-widest uppercase mb-2">No active tickets inside this channel</div>
              <div className="text-xs text-slate-600 font-mono uppercase">Queue status clears successfully</div>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className="bg-black/30 border border-white/5 hover:border-cyan-500/20 rounded-2xl p-6 transition-all hover:bg-black/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-500 font-bold uppercase select-all">#{t.id.slice(0, 8)}</span>
                      <span className={`px-2 py-0.5 border text-[10px] font-bold font-mono rounded uppercase ${statusColor(t.status)}`}>
                        {t.status}
                      </span>
                      <span className={`px-2 py-0.5 border text-[10px] font-bold font-mono rounded uppercase ${priorityColor(t.priority)}`}>
                        {t.priority}
                      </span>
                    </div>
                    <h3 className="text-white font-semibold text-base group-hover:text-cyan-400 transition-colors">{t.title}</h3>
                    <p className="text-slate-400 text-xs line-clamp-1">{t.description}</p>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-slate-500 text-xs font-mono">
                      <div>
                        <span className="text-slate-600">CUSTOMER:</span> {t.customer?.name || 'Unassigned'} ({t.customer?.email || 'N/A'})
                      </div>
                      <div>
                        <span className="text-slate-600">CATEGORY:</span> {t.category || 'General'}
                      </div>
                      {t.ticketType && (
                        <div>
                          <span className="text-slate-600">TYPE:</span> {t.ticketType}
                        </div>
                      )}
                      <div>
                        <span className="text-slate-600">SLA DEADLINE:</span> {new Date(t.slaDeadline).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SPLIT-PANE TICKET DETAILS VIEW MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 md:p-8 bg-black/70 backdrop-blur-md">
          <div className="relative bg-slate-900/90 border border-white/10 rounded-[2rem] w-full max-w-5xl h-[85vh] flex flex-col md:flex-row shadow-[0_20px_70px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Absolute Close Button in Top-Right Corner of Entire Main Panel */}
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-6 right-6 z-50 text-slate-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2.5"
              aria-label="Close Ticket Details"
            >
              ✕
            </button>

            {/* Left Meta Details Pane — fixed at 70% */}
            <div className="w-full md:w-[70%] md:max-w-[70%] md:shrink-0 bg-black/40 border-r border-white/5 p-8 flex flex-col overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-lg border ${statusColor(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </span>
                  {selectedTicket.status === 'OPEN' && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await api.patch(`/tickets/${selectedTicket.id}/status`, { status: 'IN_PROGRESS' });
                          setSelectedTicket(res.data);
                          queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
                          setToast({ message: 'Ticket status moved to In Progress', type: 'success' });
                        } catch (err) {
                          setToast({ message: 'Failed to update ticket status', type: 'error' });
                        }
                      }}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white font-mono text-[10px] font-bold uppercase rounded-lg transition-all shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] tracking-wider"
                    >
                      start progress
                    </button>
                  )}
                  {selectedTicket.status === 'IN_PROGRESS' && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await api.patch(`/tickets/${selectedTicket.id}/status`, { status: 'CLOSED' });
                          setSelectedTicket(res.data);
                          queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
                          setToast({ message: 'Ticket successfully resolved and archived', type: 'success' });
                        } catch (err) {
                          setToast({ message: 'Failed to update ticket status', type: 'error' });
                        }
                      }}
                      className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white font-mono text-[10px] font-bold uppercase rounded-lg transition-all shadow-[0_0_10px_rgba(52,211,153,0.2)] hover:shadow-[0_0_20px_rgba(52,211,153,0.5)] tracking-wider animate-pulse"
                    >
                      Close Ticket
                    </button>
                  )}
                </div>
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
                  <span className={`font-bold text-xs ${priorityColor(selectedTicket.priority).split(' ')[0]}`}>
                    {selectedTicket.priority}
                  </span>
                </div>
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 flex justify-between items-center">
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Category Sector</span>
                  <span className="text-slate-300 font-mono text-xs uppercase">{selectedTicket.category || 'General'}</span>
                </div>
              </div>

              <div className="border-t border-white/5 pt-6 mt-6">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block border-b border-white/5 pb-2 mb-4">
                  Ticket Audit Log
                </span>

                {(!selectedTicket.comments || selectedTicket.comments.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-slate-600 font-mono text-xs tracking-widest uppercase">
                    No replies or logs on record
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedTicket.comments.map((comment: any) => {
                      const isSelf = comment.authorId === user?.id;
                      const authorName = comment.author?.name || 'SYSTEM';
                      const authorRole = comment.author?.role?.name || 'AGENT';

                      return (
                        <div
                          key={comment.id}
                          className={`flex flex-col max-w-[85%] ${isSelf ? 'ml-auto items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-2 mb-1.5 font-mono text-[9px] text-slate-500 tracking-wider">
                            <span className="uppercase text-slate-400 font-semibold">{authorName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase scale-90">{authorRole}</span>
                            <span>•</span>
                            <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className={`px-5 py-3 rounded-2xl text-xs leading-relaxed border ${isSelf ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-50 rounded-tr-sm shadow-[0_0_15px_rgba(6,182,212,0.08)]' : 'bg-white/5 border-white/10 text-slate-300 rounded-tl-sm'}`}>
                            {comment.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Comments Timeline Pane — fixed at 30% */}
            <div className="w-full md:w-[30%] md:max-w-[30%] md:shrink-0 flex flex-col bg-slate-950/40 relative">
              <div className="flex-1 overflow-y-auto px-6 pt-12 pb-28 space-y-8">

                {/* Display Core telemetry if populated */}
                {selectedTicket.ticketType && (
                  <div className="border-b border-white/5 pb-6 space-y-3">
                    <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest block font-bold">Telemetry Core Data</span>
                    <div className="grid grid-cols-2 gap-4 pr-4 text-xs font-mono text-slate-300">
                      <div className="p-4 flex flex-col justify-between h-20 bg-slate-900/50 border border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">TYPE</span> {selectedTicket.ticketType}</div>
                      <div className="p-4 flex flex-col justify-between h-20 bg-slate-900/50 border border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">QUEUE</span> {selectedTicket.queueId || 'N/A'}</div>
                      <div className="p-4 flex flex-col justify-between h-20 bg-slate-900/50 border border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">CATEGORIES</span> {selectedTicket.firewallCategory || 'N/A'}</div>
                      <div className="p-4 flex flex-col justify-between h-20 bg-slate-900/50 border border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">CONTRACT</span> {selectedTicket.serviceContract || 'N/A'}</div>
                      <div className="p-4 flex flex-col justify-between h-20 bg-slate-900/50 border border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">SCOPE</span> {selectedTicket.isScopeInScope ? 'IN-SCOPE' : 'OUT-OF-SCOPE'}</div>
                      <div className="p-4 flex flex-col justify-between h-20 bg-slate-900/50 border border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">AFFECTED DEVICE</span> {selectedTicket.affectedDevice || 'N/A'}</div>
                      <div className="p-4 flex flex-col justify-between h-20 bg-slate-900/50 border border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">DEVICE IP</span> {selectedTicket.deviceIp || 'N/A'}</div>
                      <div className="p-4 flex flex-col justify-between h-20 bg-slate-900/50 border border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">OWNER</span> {selectedTicket.ticketOwner?.name || 'Unassigned'}</div>
                    </div>
                  </div>
                )}

                {/* SLA & Health Telemetry Widget Grid */}
                <SlaHealthTelemetry ticket={selectedTicket} />
              </div>

              {/* Permanent Floating Add Core Data Button */}
              <PermissionGate permission="TICKET_CORE_DATA_UPDATE">
                <button
                  onClick={openCoreDataForm}
                  className="absolute bottom-6 right-6 z-40 py-2.5 px-4 bg-slate-900/90 border border-cyan-500/50 hover:bg-cyan-500 text-cyan-300 hover:text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] uppercase tracking-widest text-[9px] tracking-widest text-center backdrop-blur-sm"
                >
                  {!isCoreDataNull ? '✎ Edit Core Data' : '+ Add Core Data'}
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 transition-all duration-300 ease-out">
          <div className="bg-slate-950 border border-white/10 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
                Create New Ticket
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Title</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all placeholder-slate-700 font-mono text-sm"
                  placeholder="Summarize the core request"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Description</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all placeholder-slate-700 font-mono text-sm resize-none"
                  placeholder="Describe the full technical requirements..."
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">PRIMARY DOMAIN</label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all text-sm font-mono"
                  >
                    <option value="" disabled className="bg-slate-900">Select broad domain...</option>
                    <option value="General Support" className="bg-slate-900">General Support</option>
                    <option value="Network & Security" className="bg-slate-900">Network & Security</option>
                    <option value="Hardware & Endpoints" className="bg-slate-900">Hardware & Endpoints</option>
                    <option value="Software & Access" className="bg-slate-900">Software & Access</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Ticket Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all text-sm font-mono"
                  >
                    <option value="Email" className="bg-slate-900">Email</option>
                    <option value="Phone" className="bg-slate-900">Phone</option>
                    <option value="Portal" className="bg-slate-900">Portal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Search Customer ID, Name, or Email...</label>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search Customer ID, Name, or Email..."
                    className="w-full px-4 py-2 bg-black/20 border border-white/5 rounded-lg text-white font-mono text-xs uppercase tracking-wider outline-none focus:ring-1 focus:ring-cyan-500/30"
                  />

                  <select
                    required
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white outline-none transition-all text-sm font-mono"
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-500">
                      {isLoadingCustomers ? 'Loading matching accounts...' : 'Choose a customer account'}
                    </option>
                    {customers.map((c: any) => {
                      const custId = c.customerId || c.id.substring(0, 8).toUpperCase();
                      return (
                        <option key={c.id} value={c.id} className="bg-slate-900 font-mono text-xs">
                          [{custId}] {c.name} ({c.email})
                        </option>
                      );
                    })}
                    {!isLoadingCustomers && customers.length === 0 && (
                      <option disabled className="bg-slate-900 text-rose-400">
                        NO REGISTERED CUSTOMER ACCOUNTS FOUND
                      </option>
                    )}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white font-bold uppercase tracking-widest text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="flex-1 px-4 py-3 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-500 text-cyan-300 hover:text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  {createTicketMutation.isPending ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Core Data Modal */}
      {isCoreDataModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 overflow-y-auto transition-all duration-300 ease-out">
          <div className="relative bg-slate-950 border border-white/10 rounded-3xl w-full max-w-4xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden my-8 animate-in zoom-in-95 duration-300">
            {/* Absolute Close Button in Top-Right Corner */}
            <button
              onClick={() => setIsCoreDataModalOpen(false)}
              className="absolute top-4 right-4 z-50 text-slate-400 hover:text-cyan-400 transition-colors duration-200 bg-white/5 hover:bg-white/10 rounded-full p-2"
              aria-label="Close Core Data Modal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center pr-16">
              <h2 className="text-xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
                Add Ticket Core Data
              </h2>
            </div>

            <form onSubmit={handleCoreSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">

              {/* PANEL 1: Classification */}
              <div className="space-y-4 border border-white/5 bg-white/5 p-6 rounded-2xl">
                <h3 className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold border-b border-white/5 pb-2">
                  Panel 1: Classification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">Ticket Type</label>
                    <select
                      value={coreType}
                      onChange={(e) => setCoreType(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none text-xs font-mono uppercase"
                    >
                      <option value="" className="bg-slate-900">Select Type</option>
                      {masterTypes.map((t) => (
                        <option key={t.id} value={t.name} className="bg-slate-900">
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">Queue ID</label>
                    <select
                      value={coreQueueId}
                      onChange={(e) => setCoreQueueId(e.target.value)}
                      disabled={!coreServiceContract}
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none text-xs font-mono uppercase disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <option value="" className="bg-slate-900">
                        {!coreServiceContract ? 'Select Service Contract First' : 'Select Queue'}
                      </option>
                      {filteredQueues.map((q) => (
                        <option key={q.id} value={q.name} className="bg-slate-900">
                          {q.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">Status</label>
                    <select
                      value={coreStatus}
                      onChange={(e) => setCoreStatus(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none text-xs font-mono uppercase"
                    >
                      <option value="OPEN" className="bg-slate-900">OPEN</option>
                      <option value="IN_PROGRESS" className="bg-slate-900">IN PROGRESS</option>
                      <option value="CLOSED" className="bg-slate-900">CLOSED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">Categories</label>
                    <select
                      value={coreFirewallCategory}
                      onChange={(e) => setCoreFirewallCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none text-xs font-mono uppercase"
                    >
                      <option value="" className="bg-slate-900">Select Category</option>
                      {masterCategories.map((c) => (
                        <option key={c.id} value={c.name} className="bg-slate-900">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">Source Channel</label>
                    <select
                      value={coreSource}
                      onChange={(e) => setCoreSource(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none text-xs font-mono uppercase"
                    >
                      <option value="Email" className="bg-slate-900">Email</option>
                      <option value="Phone" className="bg-slate-900">Phone</option>
                      <option value="Portal" className="bg-slate-900">Portal</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4 pt-6">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Is Scope In Scope?</label>
                    <input
                      type="checkbox"
                      checked={coreIsScope}
                      onChange={(e) => setCoreIsScope(e.target.checked)}
                      className="w-5 h-5 bg-black border border-white/10 rounded focus:ring-0 text-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* PANEL 2: Assignment/SLA */}
              <div className="space-y-4 border border-white/5 bg-white/5 p-6 rounded-2xl">
                <h3 className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold border-b border-white/5 pb-2">
                  Panel 2: Assignment/SLA
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">Customer Name</label>
                    <input
                      type="text"
                      value={coreCustomerName}
                      onChange={(e) => setCoreCustomerName(e.target.value)}
                      placeholder="Organization or Individual name"
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none font-mono text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">Service Contract ID</label>
                    <select
                      value={coreServiceContract}
                      onChange={(e) => {
                        setCoreServiceContract(e.target.value);
                        setCoreQueueId('');
                      }}
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none text-xs font-mono uppercase"
                    >
                      <option value="" className="bg-slate-900">Select Contract</option>
                      <option value="SLA-PREMIUM-24X7" className="bg-slate-900">SLA-PREMIUM-24X7</option>
                      <option value="SLA-STANDARD-BIZ" className="bg-slate-900">SLA-STANDARD-BIZ</option>
                      <option value="SLA-BASIC-HOURS" className="bg-slate-900">SLA-BASIC-HOURS</option>
                      {masterServices.map((s) => (
                        <option key={s.id} value={s.name} className="bg-slate-900">
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">Criticality Rating</label>
                    <select
                      value={coreCriticality}
                      onChange={(e) => setCoreCriticality(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none text-xs font-mono uppercase"
                    >
                      <option value="" className="bg-slate-900">Select Criticality</option>
                      <option value="Low" className="bg-slate-900">Low</option>
                      <option value="Medium" className="bg-slate-900">Medium</option>
                      <option value="High" className="bg-slate-900">High</option>
                      <option value="Urgent" className="bg-slate-900">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">Priority Threat Level</label>
                    <select
                      value={corePriority}
                      onChange={(e) => setCorePriority(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none text-xs font-mono uppercase"
                    >
                      <option value="P4" className="bg-slate-900">P4 (Low / General Request)</option>
                      <option value="P3" className="bg-slate-900">P3 (Medium / Minor Degradation)</option>
                      <option value="P2" className="bg-slate-900">P2 (High / Major Disruption)</option>
                      <option value="P1" className="bg-slate-900">P1 (Critical / System Down)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">Time Spent Tracking (Min)</label>
                    <input
                      type="number"
                      min={0}
                      value={coreTimeSpent}
                      onChange={(e) => setCoreTimeSpent(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none font-mono text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">Select Ticket Owner (Engineer)</label>
                    <select
                      value={coreOwnerId}
                      onChange={(e) => setCoreOwnerId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none text-xs font-mono"
                    >
                      <option value="" className="bg-slate-900 text-slate-500">Unassigned (Assign to Engineer)</option>
                      {owners.map((o: any) => (
                        <option key={o.id} value={o.id} className="bg-slate-900 text-xs">
                          {o.name} ({o.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* PANEL 3: Endpoint Protection (EPO) */}
              <div className="space-y-4 border border-white/5 bg-white/5 p-6 rounded-2xl">
                <h3 className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold border-b border-white/5 pb-2">
                  Panel 3: Endpoint Protection (EPO)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">Affected Device Hostname</label>
                    <input
                      type="text"
                      value={coreDevice}
                      onChange={(e) => setCoreDevice(e.target.value)}
                      placeholder="e.g. WS-LPT-SEC09"
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none font-mono text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">Affected IP Address</label>
                    <input
                      type="text"
                      value={coreIp}
                      onChange={(e) => setCoreIp(e.target.value)}
                      placeholder="e.g. 192.168.1.100"
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 text-white outline-none font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4 mt-8 items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsCoreDataModalOpen(false)}
                  className="px-6 py-3 bg-transparent border-none text-slate-400 hover:text-slate-100 font-bold uppercase tracking-widest text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateCoreDataMutation.isPending}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  {updateCoreDataMutation.isPending ? 'Processing..' : 'Save Core Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
