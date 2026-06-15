import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTicketAdmin } from '../api/tickets';
import { fetchUsers } from '../api/users';
import api from '../api/axios';

const inputClass =
  'w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all';

const labelClass = 'block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2';

// ── Reusable Panel Wrapper ────────────────────────────────────────────────────
const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white dark:bg-[#090d16] border border-slate-200 dark:border-white/5 rounded-2xl p-6 space-y-4">
    <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/5 pb-3 flex items-center gap-2">
      {title}
    </h2>
    {children}
  </div>
);

export const CreateTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Panel 0: Ticket Identity ──────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('Portal');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // ── Panel 1: Classification ───────────────────────────────────────────────
  const [coreType, setCoreType] = useState('');
  const [coreStatus, setCoreStatus] = useState('OPEN');
  const [coreFirewallCategory, setCoreFirewallCategory] = useState('');
  const [coreSource, setCoreSource] = useState('Portal');
  const [coreIsScope, setCoreIsScope] = useState(true);
  const [coreCustomerName, setCoreCustomerName] = useState('');

  // ── Panel 2: Assignment / SLA ─────────────────────────────────────────────
  const [selectedServiceGroup, setSelectedServiceGroup] = useState('');
  const [corePriority, setCorePriority] = useState('');
  const [coreOwnerId, setCoreOwnerId] = useState('');

  // ── Panel 3: EPO ─────────────────────────────────────────────────────────
  const [coreDevice, setCoreDevice] = useState('');
  const [coreIp, setCoreIp] = useState('');

  // ── Scheduling ────────────────────────────────────────────────────────────
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('Run Once');
  const [executeAt, setExecuteAt] = useState('');
  const [cronExpression, setCronExpression] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const { data: usersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: () => fetchUsers(1, 100, customerSearch),
  });

  const customers = (usersData?.users || []).filter(
    (u: any) => u.role?.name === 'CUSTOMER' || u.systemRole === 'CUSTOMER'
  );

  const { data: ownersData } = useQuery({
    queryKey: ['owners-list'],
    queryFn: () => fetchUsers(1, 100, ''),
  });

  const owners = (ownersData?.users || []).filter(
    (u: any) => u.role?.name !== 'CUSTOMER' && u.systemRole !== 'CUSTOMER'
  );

  const { data: assignmentGroups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['masterAssignmentGroupsList'],
    queryFn: async () => {
      const res = await api.get('/master-config/groups');
      return res.data;
    },
  });

  const { data: masterCategories = [] } = useQuery<any[]>({
    queryKey: ['master-categories'],
    queryFn: async () => {
      const res = await api.get('/master-config/categories?activeOnly=true');
      return res.data;
    },
  });

  const { data: activeSlaRule, isLoading: isLoadingSlaTiers } = useQuery({
    queryKey: ['activeSlaRuleForType', coreType],
    queryFn: async () => {
      if (!coreType) return null;
      const res = await api.get(`/master-config/sla-rules?type=${coreType}`);
      return res.data;
    },
    enabled: !!coreType,
  });

  // Status options
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  useEffect(() => {
    api.get('/master-config/statuses?activeOnly=true')
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setStatusOptions(rows);
      })
      .catch(() => {/* silent */ });
  }, []);

  // ── Mutation ──────────────────────────────────────────────────────────────
  const createTicketMutation = useMutation({
    mutationFn: createTicketAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      showToast('TICKET CREATED SUCCESSFULLY', 'success');
      setTimeout(() => navigate('/tickets'), 1000);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'FAILED TO CREATE TICKET', 'error');
    },
  });

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !selectedCustomerId) {
      showToast('TITLE, DESCRIPTION, AND CUSTOMER ARE REQUIRED', 'error');
      return;
    }

    let targetCustomerId = selectedCustomerId;
    const chosenCust = customers.find((c: any) => c.id === selectedCustomerId);
    if (chosenCust) {
      targetCustomerId = chosenCust.id || chosenCust.customerId || 'FALLBACK_CUSTOMER_INDEX';
    }

    createTicketMutation.mutate({
      // Panel 0 — Ticket Identity
      title,
      description,
      category,
      source,
      customerId: targetCustomerId,
      status: isScheduled ? 'SCHEDULED' : (coreStatus || undefined),

      // Scheduling
      ...(isScheduled && {
        executeAt,
        isRecurring: scheduleFrequency === 'Recurring Maintenance Routine',
        cronExpression: scheduleFrequency === 'Recurring Maintenance Routine' ? cronExpression : undefined,
      }),

      // Panel 1 — Classification
      ticketType: coreType || undefined,
      firewallCategory: coreFirewallCategory || undefined,
      ticketSource: coreSource || undefined,
      isScopeInScope: coreIsScope,
      customerName: coreCustomerName || undefined,

      // Panel 2 — Assignment / SLA
      queueId: selectedServiceGroup || undefined,
      priority: corePriority || undefined,
      ticketOwnerId: coreOwnerId || undefined,

      // Panel 3 — EPO
      affectedDevice: coreDevice || undefined,
      deviceIp: coreIp || undefined,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full w-full flex flex-col">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in">
          <div className={`backdrop-blur-xl border px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-3 font-mono text-sm ${toast.type === 'success'
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
            <span className="text-sky-500">Create New</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
            Create New Ticket
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Fill in all details below — ticket is created atomically in a single request.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto space-y-6">

        {/* ── Panel 0: Ticket Identity ─────────────────────────────────────── */}
        <Panel title="Panel 0 — Ticket Identity">
          {/* Title */}
          <div>
            <label className={labelClass}>Title <span className="text-rose-400">*</span></label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="Summarize the core request"
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description <span className="text-rose-400">*</span></label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="Describe the full technical requirements..."
            />
          </div>

          {/* Category + Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Primary Domain <span className="text-rose-400">*</span></label>
              <select required value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                <option value="" disabled className="bg-slate-900">Select broad domain...</option>
                <option value="General Support" className="bg-slate-900">General Support</option>
                <option value="Network & Security" className="bg-slate-900">Network &amp; Security</option>
                <option value="Hardware & Endpoints" className="bg-slate-900">Hardware &amp; Endpoints</option>
                <option value="Software & Access" className="bg-slate-900">Software &amp; Access</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Ticket Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
                <option value="Email" className="bg-slate-900">Email</option>
                <option value="Phone" className="bg-slate-900">Phone</option>
                <option value="Portal" className="bg-slate-900">Portal</option>
              </select>
            </div>
          </div>

          {/* Customer Selector */}
          <div>
            <label className={labelClass}>Customer Account <span className="text-rose-400">*</span></label>
            <div className="space-y-2">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by User ID, Name, or Email..."
                className={inputClass}
              />
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled className="bg-slate-900 text-slate-500">
                  {isLoadingCustomers ? 'Loading matching accounts...' : 'Choose a user account'}
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
        </Panel>

        {/* ── Panel 1: Classification ──────────────────────────────────────── */}
        <Panel title="Panel 1 — Classification">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

            {/* Ticket Type */}
            <div>
              <label className={labelClass}>Ticket Type</label>
              <select
                value={coreType}
                onChange={(e) => { setCoreType(e.target.value); setCorePriority(''); }}
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
              <label className={labelClass}>Status</label>
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
                {statusOptions.length === 0 && (
                  <option value="OPEN">OPEN</option>
                )}
              </select>
            </div>

            {/* Category (firewall category) */}
            <div>
              <label className={labelClass}>Category</label>
              <select value={coreFirewallCategory} onChange={(e) => setCoreFirewallCategory(e.target.value)} className={inputClass}>
                <option value="" className="bg-slate-900">Select Category</option>
                {masterCategories.map((c) => (
                  <option key={c.id} value={c.name} className="bg-slate-900">{c.name}</option>
                ))}
              </select>
            </div>

            {/* Source Channel */}
            <div>
              <label className={labelClass}>Source Channel</label>
              <select value={coreSource} onChange={(e) => setCoreSource(e.target.value)} className={inputClass}>
                <option value="Email" className="bg-slate-900">Email</option>
                <option value="Phone" className="bg-slate-900">Phone</option>
                <option value="Portal" className="bg-slate-900">Portal</option>
              </select>
            </div>

            {/* Is Scope In Scope */}
            <div className="flex items-center gap-4 pt-2">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Is Scope In Scope?</label>
              <input
                type="checkbox"
                checked={coreIsScope}
                onChange={(e) => setCoreIsScope(e.target.checked)}
                className="w-5 h-5 bg-black border border-white/10 rounded focus:ring-0 text-cyan-500"
              />
            </div>
          </div>
        </Panel>

        {/* ── Panel 2: Assignment / SLA ────────────────────────────────────── */}
        <Panel title="Panel 2 — Assignment / SLA">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

            {/* User / Customer Name */}
            <div>
              <label className={labelClass}>User Name</label>
              <input
                type="text"
                value={coreCustomerName}
                onChange={(e) => setCoreCustomerName(e.target.value)}
                placeholder="Organization or Individual name"
                className={inputClass}
              />
            </div>

            {/* Service Group */}
            <div>
              <label className={labelClass}>Service Group</label>
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
            <div>
              <label className={labelClass}>Priority Threat Level</label>
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
                ) : !activeSlaRule?.tiers?.length ? (
                  <option value="">NO PRIORITIES PROVISIONED FOR THIS TYPE</option>
                ) : (
                  <>
                    <option value="">-- SELECT VALID PRIORITY TIER --</option>
                    {activeSlaRule.tiers
                      .filter((tier: any) => tier.isActive)
                      .map((tier: any) => (
                        <option key={tier.id} value={tier.level}>
                          {tier.level.toUpperCase()} — {tier.description || 'CUSTOM OPERATIONAL TARGET'}
                        </option>
                      ))}
                  </>
                )}
              </select>
            </div>

            {/* Ticket Owner */}
            <div className="md:col-span-2">
              <label className={labelClass}>Ticket Owner (Engineer)</label>
              <select value={coreOwnerId} onChange={(e) => setCoreOwnerId(e.target.value)} className={inputClass}>
                <option value="" className="bg-slate-900 text-slate-500">Unassigned (Assign to Engineer)</option>
                {owners.map((o: any) => (
                  <option key={o.id} value={o.id} className="bg-slate-900 text-xs">
                    {o.name} ({o.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Panel>

        {/* ── Panel 3: Endpoint Protection (EPO) ──────────────────────────── */}
        <Panel title="Panel 3 — Endpoint Protection (EPO)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label className={labelClass}>Affected Device Hostname</label>
              <input
                type="text"
                value={coreDevice}
                onChange={(e) => setCoreDevice(e.target.value)}
                placeholder="e.g. WS-LPT-SEC09"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Affected IP Address</label>
              <input
                type="text"
                value={coreIp}
                onChange={(e) => setCoreIp(e.target.value)}
                placeholder="e.g. 192.168.1.100"
                className={inputClass}
              />
            </div>
          </div>
        </Panel>

        {/* ── Schedule Section ─────────────────────────────────────────────── */}
        <Panel title="⚙️  Schedule Ticket">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">Schedule ticket to a future window instead of activating immediately.</p>
            <label className="flex items-center cursor-pointer shrink-0">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${isScheduled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow ${isScheduled ? 'transform translate-x-4' : ''}`} />
              </div>
              <span className="ml-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Enable
              </span>
            </label>
          </div>

          {isScheduled && (
            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Target Execution Window</label>
                  <input
                    type="datetime-local"
                    required={isScheduled}
                    value={executeAt}
                    onChange={(e) => setExecuteAt(e.target.value)}
                    className={`${inputClass} [color-scheme:light] dark:[color-scheme:dark]`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Schedule Frequency</label>
                  <select
                    value={scheduleFrequency}
                    onChange={(e) => setScheduleFrequency(e.target.value)}
                    className={inputClass}
                  >
                    <option value="Run Once" className="bg-slate-900">Run Once</option>
                    <option value="Recurring Maintenance Routine" className="bg-slate-900">Recurring Maintenance Routine</option>
                  </select>
                </div>
              </div>
              {scheduleFrequency === 'Recurring Maintenance Routine' && (
            <div>
              <label className={labelClass}>Cron Pattern Interval</label>
              <input
                type="text"
                required={scheduleFrequency === 'Recurring Maintenance Routine'}
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="0 6 * * 1"
                className={inputClass}
              />
              <p className="text-[10px] text-slate-500 mt-1 font-mono uppercase">e.g., '0 6 * * 1' for weekly</p>
            </div>
          )}
        </div>
          )}
      </Panel>

      {/* ── Footer Actions ───────────────────────────────────────────────── */}
      <div className="flex gap-4 items-center justify-end pb-10">
        <button
          type="button"
          onClick={() => navigate('/tickets')}
          className="px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-900 transition-all uppercase tracking-widest"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createTicketMutation.isPending}
          className="px-8 py-3 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-500 text-cyan-600 dark:text-cyan-300 hover:text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] uppercase tracking-widest text-xs disabled:opacity-50"
        >
          {createTicketMutation.isPending ? 'Creating...' : '✦ Create Ticket'}
        </button>
      </div>
    </form>
    </div >
  );
};

export default CreateTicketPage;
