import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { updateTicketCoreData, fetchAllTicketsAdmin, Ticket } from '../api/tickets';
import { fetchUsers } from '../api/users';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export const EditCoreDataPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Core Data Form State ────────────────────────────────────────────────────
  const [coreType, setCoreType] = useState('');
  const [coreStatus, setCoreStatus] = useState('OPEN');
  const [coreFirewallCategory, setCoreFirewallCategory] = useState('');
  const [coreSource, setCoreSource] = useState('Portal');
  const [coreIsScope, setCoreIsScope] = useState(true);
  const [coreCustomerName, setCoreCustomerName] = useState('');
  const [selectedServiceGroup, setSelectedServiceGroup] = useState('');
  const [corePriority, setCorePriority] = useState('LOW');
  const [coreOwnerId, setCoreOwnerId] = useState('');
  const [coreDevice, setCoreDevice] = useState('');
  const [coreIp, setCoreIp] = useState('');

  // ── Resolve ticket from the admin cache ────────────────────────────────────
  const { data: allTickets = [], isLoading: isLoadingTickets } = useQuery<Ticket[]>({
    queryKey: ['admin-tickets'],
    queryFn: fetchAllTicketsAdmin,
    staleTime: 30_000,
  });

  const ticket = allTickets.find((t) => t.id === id);

  // Pre-fill form once ticket data is available
  useEffect(() => {
    if (!ticket) return;
    setCoreType(ticket.ticketType || '');
    setCoreStatus(ticket.status || 'OPEN');
    setCoreFirewallCategory(ticket.firewallCategory || '');
    setCoreSource(ticket.ticketSource || (ticket as any).source || 'Portal');
    setCoreIsScope(ticket.isScopeInScope ?? true);
    setCoreCustomerName(ticket.customerName || ticket.customer?.name || '');
    setSelectedServiceGroup(ticket.queueId || ticket.serviceContract || '');
    setCorePriority(ticket.priority || 'LOW');
    setCoreOwnerId(ticket.ticketOwnerId || '');
    setCoreDevice(ticket.affectedDevice || '');
    setCoreIp(ticket.deviceIp || '');
  }, [ticket]);

  // ── Server Status Options ───────────────────────────────────────────────────
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  useEffect(() => {
    api.get('/master-config/statuses?activeOnly=true')
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setStatusOptions(rows);
      })
      .catch(() => {/* silent */});
  }, []);

  // ── Assignment Groups ───────────────────────────────────────────────────────
  const { data: assignmentGroups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['masterAssignmentGroupsList'],
    queryFn: async () => {
      const res = await api.get('/master-config/groups');
      return res.data;
    },
  });

  // ── Categories ─────────────────────────────────────────────────────────────
  const { data: masterCategories = [] } = useQuery<any[]>({
    queryKey: ['master-categories'],
    queryFn: async () => {
      const res = await api.get('/master-config/categories?activeOnly=true');
      return res.data;
    },
  });

  // ── SLA Rule for Selected Type ──────────────────────────────────────────────
  const { data: activeSlaRule, isLoading: isLoadingSlaTiers } = useQuery({
    queryKey: ['activeSlaRuleForType', coreType],
    queryFn: async () => {
      if (!coreType) return null;
      const res = await api.get(`/master-config/sla-rules?type=${coreType}`);
      return res.data;
    },
    enabled: !!coreType,
  });

  // ── Owners (non-customer staff) ─────────────────────────────────────────────
  const { data: ownersData } = useQuery({
    queryKey: ['owners-list'],
    queryFn: () => fetchUsers(1, 100, ''),
  });

  const owners = (ownersData?.users || []).filter(
    (u: any) => u.role?.name !== 'CUSTOMER' && u.systemRole !== 'CUSTOMER'
  );

  // ── Mutation ────────────────────────────────────────────────────────────────
  const updateCoreDataMutation = useMutation({
    mutationFn: ({ ticketId, payload }: { ticketId: string; payload: any }) =>
      updateTicketCoreData(ticketId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['activeTicketsList'] });
      queryClient.invalidateQueries({ queryKey: ['archivedTicketsList'] });
      queryClient.invalidateQueries({ queryKey: ['ticketDetails', updated.id] });
      showToast('CORE DATA SAVED SUCCESSFULLY', 'success');
      setTimeout(() => navigate('/tickets'), 1000);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'FAILED TO SAVE CORE DATA', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const isResolved = coreStatus === 'RESOLVED';
    const payload: any = {
      ticketType: coreType || undefined,
      queueId: selectedServiceGroup || undefined,
      status: coreStatus || undefined,
      firewallCategory: coreFirewallCategory || undefined,
      ticketSource: coreSource || undefined,
      isScopeInScope: coreIsScope,
      customerName: coreCustomerName || undefined,
      priority: corePriority || undefined,
      ticketOwnerId: coreOwnerId || undefined,
      affectedDevice: coreDevice || undefined,
      deviceIp: coreIp || undefined,
      isArchived: isResolved,
      archivedAt: isResolved ? new Date().toISOString() : null,
      closedBy: isResolved ? user?.name : null,
    };

    updateCoreDataMutation.mutate({ ticketId: id, payload });
  };

  // ── Loading / Not Found Guards ───────────────────────────────────────────────
  if (isLoadingTickets) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Loading ticket...</span>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">Ticket Not Found</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">ID: {id}</p>
          <button
            onClick={() => navigate('/tickets')}
            className="mt-4 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-xl transition-all"
          >
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all";

  return (
    <div className="min-h-full w-full flex flex-col">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in">
          <div className={`backdrop-blur-xl border px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-3 font-mono text-sm ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/50 text-rose-400'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-ping ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => navigate('/tickets')}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          aria-label="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest mb-1">
            <span>Tickets</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-slate-500 dark:text-slate-400 font-semibold">{ticket.id}</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-cyan-500">Core Data</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
            {ticket.ticketType ? 'Edit Core Data' : 'Add Core Data'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 truncate max-w-lg">
            {ticket.title}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Panel 1: Classification */}
          <div className="bg-white dark:bg-[#090d16] border border-slate-200 dark:border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/5 pb-3">
              Panel 1 — Classification
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

              {/* Ticket Type */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ticket Type</label>
                <select
                  value={coreType}
                  onChange={(e) => {
                    setCoreType(e.target.value);
                    setCorePriority('');
                  }}
                  className={inputClass}
                >
                  <option value="" className="bg-slate-900">Select Type</option>
                  <option value="Incident" className="bg-slate-900">Incident</option>
                  <option value="Service Request" className="bg-slate-900">Service Request</option>
                  <option value="Proactive Notification" className="bg-slate-900">Proactive Notification</option>
                  <option value="Report" className="bg-slate-900">Report</option>
                  <option value="Information" className="bg-slate-900">Information</option>
                  <option value="Notification - Domain/Renewal Updates" className="bg-slate-900">Notification - Domain/Renewal Updates</option>
                  <option value="Junk - Advertisements" className="bg-slate-900">Junk - Advertisements</option>
                  <option value="Maintenance" className="bg-slate-900">Maintenance</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">Status</label>
                <select
                  value={coreStatus}
                  onChange={(e) => setCoreStatus(e.target.value)}
                  className={`${inputClass} font-semibold uppercase`}
                >
                  {statusOptions.filter((s: any) => s.isActive !== false).map((status: any) => (
                    <option key={status.id} value={status.name}>
                      {status.label} {status.description ? `- ${status.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Category</label>
                <select
                  value={coreFirewallCategory}
                  onChange={(e) => setCoreFirewallCategory(e.target.value)}
                  className={inputClass}
                >
                  <option value="" className="bg-slate-900">Select Category</option>
                  {masterCategories.map((c) => (
                    <option key={c.id} value={c.name} className="bg-slate-900">{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Source Channel */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Source Channel</label>
                <select value={coreSource} onChange={(e) => setCoreSource(e.target.value)} className={inputClass}>
                  <option value="Email" className="bg-slate-900">Email</option>
                  <option value="Phone" className="bg-slate-900">Phone</option>
                  <option value="Portal" className="bg-slate-900">Portal</option>
                </select>
              </div>

              {/* Is Scope in Scope */}
              <div className="flex items-center gap-4 pt-4">
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

          {/* Panel 2: Assignment / SLA */}
          <div className="bg-white dark:bg-[#090d16] border border-slate-200 dark:border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/5 pb-3">
              Panel 2 — Assignment / SLA
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

              {/* User Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">User Name</label>
                <input
                  type="text"
                  value={coreCustomerName}
                  onChange={(e) => setCoreCustomerName(e.target.value)}
                  placeholder="Organization or Individual name"
                  className={inputClass}
                />
              </div>

              {/* Service Group */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">Service Group</label>
                <select
                  value={selectedServiceGroup}
                  onChange={(e) => setSelectedServiceGroup(e.target.value)}
                  disabled={isLoadingGroups}
                  className={`${inputClass} font-semibold uppercase`}
                >
                  <option value="">-- SELECT SERVICE GROUP --</option>
                  {assignmentGroups
                    ?.filter((group: any) => group.isActive)
                    ?.sort((a: any, b: any) => a.name.localeCompare(b.name))
                    ?.map((group: any) => (
                      <option key={group.id} value={group.name} className="bg-slate-50 dark:bg-slate-900">
                        {group.name.toUpperCase()}
                      </option>
                    ))}
                </select>
              </div>

              {/* Priority Threat Level */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">Priority Threat Level</label>
                <select
                  value={corePriority}
                  onChange={(e) => setCorePriority(e.target.value)}
                  disabled={!coreType || isLoadingSlaTiers}
                  className={`${inputClass} font-semibold uppercase`}
                >
                  {!coreType ? (
                    <option value="">-- CHOOSE A TICKET TYPE FIRST --</option>
                  ) : isLoadingSlaTiers ? (
                    <option value="">LOADING CONFIGURATION TIERS...</option>
                  ) : activeSlaRule?.tiers?.length === 0 || !activeSlaRule?.tiers ? (
                    <option value="">NO PRIORITIES PROVISIONED FOR THIS TYPE</option>
                  ) : (
                    <>
                      <option value="">-- SELECT VALID PRIORITY TIER --</option>
                      {activeSlaRule?.tiers
                        ?.filter((tier: any) => tier.isActive)
                        ?.map((tier: any) => (
                          <option key={tier.id} value={tier.level}>
                            {tier.level.toUpperCase()} - {tier.description || 'CUSTOM OPERATIONAL TARGET'}
                          </option>
                        ))}
                    </>
                  )}
                </select>
              </div>

              {/* Ticket Owner (Engineer) — spans full row */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">Select Ticket Owner (Engineer)</label>
                <select
                  value={coreOwnerId}
                  onChange={(e) => setCoreOwnerId(e.target.value)}
                  className={inputClass}
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

          {/* Panel 3: Endpoint Protection (EPO) */}
          <div className="bg-white dark:bg-[#090d16] border border-slate-200 dark:border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/5 pb-3">
              Panel 3 — Endpoint Protection (EPO)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Affected Device Hostname</label>
                <input
                  type="text"
                  value={coreDevice}
                  onChange={(e) => setCoreDevice(e.target.value)}
                  placeholder="e.g. WS-LPT-SEC09"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Affected IP Address</label>
                <input
                  type="text"
                  value={coreIp}
                  onChange={(e) => setCoreIp(e.target.value)}
                  placeholder="e.g. 192.168.1.100"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-4 items-center justify-end pt-2 pb-8">
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-900 transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateCoreDataMutation.isPending}
              className="px-6 py-2.5 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-500 text-cyan-600 dark:text-cyan-300 hover:text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] uppercase tracking-widest text-xs disabled:opacity-50"
            >
              {updateCoreDataMutation.isPending ? 'Processing...' : 'Save Core Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCoreDataPage;
