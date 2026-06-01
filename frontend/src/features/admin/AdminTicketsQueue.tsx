import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllTicketsAdmin, createTicketAdmin, updateTicketCoreData, Ticket } from '../../api/tickets';
import { fetchUsers } from '../../api/users';
import { PermissionGate } from '../../components/PermissionGate';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { SlaHealthTelemetry } from '../../components/SlaHealthTelemetry';
import { ScheduleTicketModal } from './ScheduleTicketModal';
import { MergeTicketsModal } from './MergeTicketsModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


export const AdminTicketsQueue: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<'openQueue' | 'myQueue' | 'closedArchive'>('openQueue');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState<boolean>(false);

  // Advanced query states
  const [searchCustomer, setSearchCustomer] = useState<string>('');
  const [searchStartDate, setSearchStartDate] = useState<string>('');
  const [searchEndDate, setSearchEndDate] = useState<string>('');
  const [searchTicketNo, setSearchTicketNo] = useState<string>('');
  const [searchSubject, setSearchSubject] = useState<string>('');

  // Helper to evaluate if any advanced query parameter is active
  const isAdvancedSearchActive = !!(searchCustomer || searchStartDate || searchEndDate || searchTicketNo || searchSubject);

  const handleCheckboxToggle = (value: string, currentState: string[], setStateFn: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (currentState.includes(value)) {
      setStateFn(currentState.filter(item => item !== value));
    } else {
      setStateFn([...currentState, value]);
    }
  };

  const totalActiveFiltersCount = selectedStates.length + selectedTypes.length + selectedCategories.length + selectedChannels.length;

  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCoreDataModalOpen, setIsCoreDataModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const statusPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusPopoverRef.current && !statusPopoverRef.current.contains(event.target as Node)) {
        setIsStatusPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Advanced Filters user list: uses the exact same fetchUsers() as the Create Ticket modal
  const { data: advFiltersUsersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['advancedFiltersCustomersList'],
    queryFn: () => fetchUsers(1, 200, ''),
  });

  // Mirror the same CUSTOMER filter logic used in the Create Ticket modal's 'customers' array
  const advFiltersCustomers = React.useMemo(() => {
    const allRows = advFiltersUsersData?.users || [];
    return allRows.filter(
      (u: any) => u.role?.name === 'CUSTOMER' || u.systemRole === 'CUSTOMER'
    );
  }, [advFiltersUsersData]);

  const { data: serverStatuses = [], isLoading: isLoadingStatuses } = useQuery({
    queryKey: ['activeMasterStatuses'],
    queryFn: async () => {
      const res = await api.get('/admin/master-config/statuses').catch(async () => {
        // Fallback in case endpoint is not nested under /admin
        return await api.get('/master-config/statuses');
      });
      return res.data;
    }
  });

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTicket) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ticketId', selectedTicket.id);

      await api.post('/tickets/upload-attachment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setToast({ message: 'Attachment transmitted successfully', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    } catch (error) {
      console.error(error);
      setToast({ message: 'Failed to transmit attachment', type: 'error' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Unified query uses serverStatuses

  const submitMessage = async (isInternal: boolean) => {
    if (!replyText.trim() || !selectedTicket) return;
    try {
      const res = await api.post(`/tickets/${selectedTicket.id}/messages`, {
        content: replyText,
        isInternal,
      });
      setSelectedTicket((prev) => prev ? { ...prev, comments: [...(prev.comments || []), res.data] } : prev);
      setReplyText('');
      setToast({ message: isInternal ? 'Private note added' : 'Reply sent to User', type: 'success' });
    } catch (error) {
      console.error(error);
      setToast({ message: 'Failed to send message', type: 'error' });
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedTicket) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const tableRows = (selectedTicket.comments || []).map((comment: any, index: number) => [
        `#${index + 1}`,
        new Date(comment.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
        comment.author?.name || 'SYSTEM',
        comment.type === 'INTERNAL_NOTE' ? 'INTERNAL NOTE' : (comment.type || 'UNKNOWN').replace('_', ' '),
        comment.content
      ]);

      // Add Compliance Header Block
      doc.setFont('courier', 'normal');
      doc.setFontSize(14);
      doc.text("SUPER ADMIN PORTAL - AUTOMATED AUDIT TRAIL REPORT", 14, 20);

      doc.setFontSize(10);
      doc.text(`Ticket ID Reference Sequence: ${selectedTicket.id}`, 14, 30);
      doc.text(`Current Lifecycle Operational Status: ${selectedTicket.status}`, 14, 35);
      doc.text(`Report Extraction Timestamp: ${new Date().toLocaleString()}`, 14, 40);

      autoTable(doc, {
        startY: 50,
        head: [["INDEX", "TIMESTAMP", "AUTHOR", "TRANSMISSION TYPE", "MESSAGE LOG CONTENT"]],
        body: tableRows,
        styles: { font: 'courier' },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], font: 'courier' },
        columnStyles: { 4: { cellWidth: 'auto' } }
      });

      doc.save(`Ticket_${selectedTicket.id}_Audit_Report.pdf`);
    } catch (err) {
      console.error('Error generating PDF', err);
      setToast({ message: 'Failed to generate PDF', type: 'error' });
    }
  };

  // Create Ticket Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('Portal');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Scheduling State
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('Run Once');
  const [executeAt, setExecuteAt] = useState('');
  const [cronExpression, setCronExpression] = useState('');

  // Core Data Form State
  const [coreType, setCoreType] = useState('');

  const [coreStatus, setCoreStatus] = useState('OPEN');
  const [coreFirewallCategory, setCoreFirewallCategory] = useState('');
  const [coreSource, setCoreSource] = useState('PORTAL');
  const [coreIsScope, setCoreIsScope] = useState(true);
  const [coreCustomerName, setCoreCustomerName] = useState('');
  const [selectedServiceGroup, setSelectedServiceGroup] = useState('');
  const [coreCriticality, setCoreCriticality] = useState('');
  const [corePriority, setCorePriority] = useState('LOW');

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
    }
  });

  // Fetch Master Data Types
  const { data: masterTypes = [] } = useQuery<any[]>({
    queryKey: ['master-types'],
    queryFn: async () => {
      const res = await api.get('/master-config/types?activeOnly=true');
      return res.data;
    }
  });


  // Fetch Assignment Groups
  const { data: assignmentGroups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['masterAssignmentGroupsList'],
    queryFn: async () => {
      const res = await api.get('/master-config/groups');
      return res.data;
    },
    enabled: isCoreDataModalOpen,
  });

  // Fetch SLA Config for Selected Type
  const { data: activeSlaRule, isLoading: isLoadingSlaTiers } = useQuery({
    queryKey: ['activeSlaRuleForType', coreType],
    queryFn: async () => {
      if (!coreType) return null;
      const res = await api.get(`/master-config/sla-rules?type=${coreType}`);
      return res.data;
    },
    enabled: !!coreType && isCoreDataModalOpen
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
      queryClient.invalidateQueries({ queryKey: ['activeTicketsList'] });
      queryClient.invalidateQueries({ queryKey: ['archivedTicketsList'] });
      queryClient.invalidateQueries({ queryKey: ['ticketDetails', updated.id] });

      showToast('CORE DATA ADDED', 'success');
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
      ...(isScheduled && {
        status: 'SCHEDULED',
        executeAt,
        isRecurring: scheduleFrequency === 'Recurring Maintenance Routine',
        cronExpression: scheduleFrequency === 'Recurring Maintenance Routine' ? cronExpression : undefined,
      }),
    });
  };

  const handleCoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    const isResolved = coreStatus === 'RESOLVED';

    const payload: any = {
      ticketType: coreType || undefined,
      queueId: selectedServiceGroup || undefined,
      status: coreStatus || undefined,
      firewallCategory: coreFirewallCategory || undefined,
      ticketSource: coreSource || undefined,
      isScopeInScope: coreIsScope,
      customerName: coreCustomerName || undefined,
      criticality: coreCriticality || undefined,
      priority: corePriority || undefined,

      ticketOwnerId: coreOwnerId || undefined,
      affectedDevice: coreDevice || undefined,
      deviceIp: coreIp || undefined,

      // Automation Flags
      isArchived: isResolved,
      archivedAt: isResolved ? new Date().toISOString() : null,
      closedBy: isResolved ? user?.name : null
    };

    updateCoreDataMutation.mutate({ id: selectedTicket.id, payload });
  };

  const openCoreDataForm = () => {
    if (!selectedTicket) return;
    setCoreType(selectedTicket.ticketType || '');
    setCoreStatus(selectedTicket.status || 'OPEN');
    setCoreFirewallCategory(selectedTicket.firewallCategory || '');
    setCoreSource(selectedTicket.ticketSource || selectedTicket.source || 'PORTAL');
    setCoreIsScope(selectedTicket.isScopeInScope ?? true);
    setCoreCustomerName(selectedTicket.customerName || selectedTicket.customer?.name || '');
    setSelectedServiceGroup(selectedTicket.queueId || selectedTicket.serviceContract || '');
    setCoreCriticality(selectedTicket.criticality || '');
    setCorePriority(selectedTicket.priority || 'LOW');

    setCoreOwnerId(selectedTicket.ticketOwnerId || '');
    setCoreDevice(selectedTicket.affectedDevice || '');
    setCoreIp(selectedTicket.deviceIp || '');
    setIsCoreDataModalOpen(true);
  };

  // Filter tickets dynamically by routing group (Rule B)
  const groupFilteredTickets = tickets.filter((t) => {
    if (selectedGroupFilter !== 'ALL') {
      const getGroup = (tk: any) => tk.queueId || tk.serviceContract || tk.serviceGroup || '';

      if (selectedGroupFilter.includes('::')) {
        const [svc, type] = selectedGroupFilter.split('::');
        if (!(getGroup(t).toUpperCase() === svc && (t.ticketType || '').toUpperCase() === type)) return false;
      } else {
        if (getGroup(t).toUpperCase() !== selectedGroupFilter) return false;
      }
    }

    if (selectedStates.length > 0 && !selectedStates.includes(t.status)) return false;
    if (selectedTypes.length > 0 && !selectedTypes.includes(t.ticketType || '')) return false;
    if (selectedCategories.length > 0 && !selectedCategories.includes(t.category || t.firewallCategory || '')) return false;
    if (selectedChannels.length > 0 && !selectedChannels.includes(t.source || t.ticketSource || '')) return false;

    // 2. New Advanced Form Input Filters
    if (searchTicketNo && !t.id?.toLowerCase().includes(searchTicketNo.toLowerCase())) return false;
    if (searchCustomer) {
      const custName = t.customerName || t.customer?.name || (t as any).userName || '';
      // Match exact selected customer name from our directory tree dropdown
      if (custName !== searchCustomer) return false;
    }
    if (searchSubject && !t.title?.toLowerCase().includes(searchSubject.toLowerCase())) return false;

    if (searchStartDate) {
      const ticketDate = new Date(t.createdAt);
      const startLimit = new Date(searchStartDate);
      if (ticketDate < startLimit) return false;
    }
    if (searchEndDate) {
      const ticketDate = new Date(t.createdAt);
      const endLimit = new Date(searchEndDate);
      // Set time to end of day to include records created on that specific day comfortably
      endLimit.setHours(23, 59, 59, 999);
      if (ticketDate > endLimit) return false;
    }

    return true;
  });

  // Filter tickets for "Open Queue" (all active tickets: status !== 'CLOSED')
  const openQueueTickets = groupFilteredTickets.filter(
    (t) => t.status !== 'CLOSED'
  );

  // Filter tickets for "My Queue" (assigned to current user and not closed)
  const myQueueTickets = groupFilteredTickets.filter(
    (t) => (user as any)?.systemRole === 'SUPER_ADMIN' ? false : ((t.ticketOwnerId === user?.id || (t as any).assignedToId === user?.id) && t.status !== 'CLOSED')
  );

  // Filter tickets for "Closed Archive" (status is exactly CLOSED)
  const closedArchiveTickets = groupFilteredTickets.filter(
    (t) => t.status === 'CLOSED'
  );

  // Dynamically calculate assigned groups present in the current workflow payload
  const nestedQueuesTree = useMemo(() => {
    const tree: Record<string, { totalCount: number; types: Record<string, number> }> = {};

    // We compute this from ALL unclosed tickets globally, independent of group filter
    const openTicketsGlobally = tickets.filter(t => t.status !== 'CLOSED');

    openTicketsGlobally.forEach((ticket: any) => {
      const groupKeyRaw = ticket.queueId || ticket.serviceContract || ticket.serviceGroup;
      const typeRaw = ticket.ticketType;

      const group = groupKeyRaw ? groupKeyRaw.toUpperCase() : null;
      const type = typeRaw ? typeRaw.toUpperCase() : null;

      if (group && type) {
        if (!tree[group]) {
          tree[group] = { totalCount: 0, types: {} };
        }
        tree[group].types[type] = (tree[group].types[type] || 0) + 1;
        tree[group].totalCount += 1;
      }
    });

    // Transform into an array and sort alphabetically by group name
    return Object.entries(tree)
      .map(([groupName, data]) => ({
        groupName,
        totalCount: data.totalCount,
        types: Object.entries(data.types).map(([typeName, count]) => ({
          typeName,
          count
        })).sort((a, b) => a.typeName.localeCompare(b.typeName))
      }))
      .sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [tickets]);

  const displayedTickets =
    workspace === 'openQueue' ? openQueueTickets :
      workspace === 'myQueue' ? myQueueTickets :
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



  // If a ticket type or other core metadata properties are currently null
  const isCoreDataNull = selectedTicket && !selectedTicket.ticketType;

  return (
    <div className="flex flex-row min-h-screen w-full bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 transition-colors duration-300">
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

      {/* LEFT SERVICE-QUEUE FILTER RAIL (Sidebar) */}
      <div className="w-64 min-h-screen bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-900 p-6 flex flex-col gap-4 shrink-0">
        {/* POSITION 1: MY QUEUE */}
        <div>
          <button
            onClick={() => {
              setWorkspace('myQueue');
              setSelectedGroupFilter('ALL');
            }}
            className={workspace === 'myQueue'
              ? "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-sky-500/10 text-sky-400 border border-sky-500/20"
              : "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all duration-200"
            }
          >
            <span className="flex-1 text-left">My Queue</span>
            <span className="font-bold">
              {myQueueTickets.length}
            </span>
          </button>
        </div>

        {/* POSITION 2: OPEN QUEUE ACCORDION */}
        <div className="space-y-2">
          <button
            onClick={() => {
              setWorkspace('openQueue');
              setIsExpanded(!isExpanded);
              if (workspace !== 'openQueue') setSelectedGroupFilter('ALL');
            }}
            className={workspace === 'openQueue'
              ? "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-sky-500/10 text-sky-400 border border-sky-500/20 w-full"
              : "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all duration-200 w-full"
            }
          >
            <span className="flex-1 text-left">Open Queue</span>
            <span className={`transform transition-transform duration-200 text-[10px] ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
              ▼
            </span>
          </button>

          {isExpanded && workspace === 'openQueue' && (
            <div className="flex flex-col gap-1 mt-3 pl-2">
              {/* Master All Open Tickets Filter Control Row */}
              <button
                type="button"
                onClick={() => setSelectedGroupFilter('ALL')}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${selectedGroupFilter === 'ALL'
                  ? 'bg-sky-50 text-sky-700 shadow-sm dark:bg-sky-500/10 dark:text-sky-400'
                  : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                  <span className="tracking-wide uppercase">All Open Tickets</span>
                </div>

                {/* Total Live Open Count Badge Indicator */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedGroupFilter === 'ALL'
                  ? 'bg-sky-200/60 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                  {tickets.filter(t => t.status !== 'CLOSED').length || 0}
                </span>
              </button>

              {/* Horizontal Divider Line Accent */}
              <div className="border-t border-slate-100 dark:border-slate-800/60 my-2 mx-2" />

              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase pl-4 mb-1 mt-1">
                — Service Queues —
              </span>

              <div className="flex flex-col gap-2 pl-2 mt-2">
                {nestedQueuesTree.length === 0 ? (
                  <span className="text-[10px] font-medium text-slate-400 italic pl-4 py-2">
                    No active group assignments found
                  </span>
                ) : (
                  nestedQueuesTree.map((group) => {
                    const isGroupSelected = selectedGroupFilter === group.groupName;

                    return (
                      <div key={group.groupName} className="flex flex-col gap-1">
                        {/* Parent Node: Service Group Header Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedGroupFilter(group.groupName)}
                          className={`w-full flex items-center justify-between px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${isGroupSelected
                            ? 'bg-sky-50 text-sky-700 shadow-sm border-l-2 border-l-sky-500 dark:bg-sky-500/10 dark:text-sky-400'
                            : 'text-slate-600 hover:bg-slate-100/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-70">
                              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                            </svg>
                            <span className="uppercase">{group.groupName}</span>
                          </div>
                          <span className="text-[9px] font-black bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded-full font-mono">
                            {group.totalCount}
                          </span>
                        </button>

                        {/* Nested Child Nodes: Dynamic Active Ticket Types */}
                        <div className="flex flex-col gap-0.5 pl-6 border-l border-slate-200/60 dark:border-slate-800 ml-4 mb-1">
                          {group.types.map((type) => {
                            const filterId = `${group.groupName}::${type.typeName}`;
                            const isTypeSelected = selectedGroupFilter === filterId;

                            return (
                              <button
                                key={type.typeName}
                                type="button"
                                onClick={() => setSelectedGroupFilter(filterId)}
                                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${isTypeSelected
                                  ? 'text-sky-600 bg-sky-50/50 font-bold dark:text-sky-400 dark:bg-sky-500/10'
                                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                                  }`}
                              >
                                <span className="uppercase tracking-wide text-left truncate max-w-[120px]">↳ {type.typeName.toLowerCase()}</span>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 font-mono pr-1">
                                  ({type.count})
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* POSITION 3: CLOSED ARCHIVE */}
        <div className="pt-4 border-t border-white/5">
          <button
            onClick={() => {
              setWorkspace('closedArchive');
              setSelectedGroupFilter('ALL');
            }}
            className={workspace === 'closedArchive'
              ? "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-sky-500/10 text-sky-400 border border-sky-500/20"
              : "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-200"
            }
          >
            <span className="flex-1 text-left">Closed Archive</span>
            <span className="font-bold">{closedArchiveTickets.length}</span>
          </button>
        </div>
      </div>

      {/* RIGHT CONTENT WORKSPACE */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Action Header */}
        <div className="flex justify-end items-center mb-6">
          <PermissionGate allowedPermissions={['TICKET_CREATE_AS_ADMIN']}>
            <div className="flex items-center gap-3">
              {/* COMPONENT LAYER: Advanced Filters Floating Wrapper */}
              <div className="relative">
                {/* Filter Toggle Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-200 border border-slate-200/90 dark:border-white/10 shadow-sm ${totalActiveFiltersCount > 0
                    ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30'
                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
                    }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  <span>Filters</span>
                  {totalActiveFiltersCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-sky-600 text-white font-mono">
                      {totalActiveFiltersCount}
                    </span>
                  )}
                </button>

                {/* Floating Checkbox Matrix Card (Absolute-Positioned) */}
                {isFilterDropdownOpen && (
                  <>
                    {/* Invisible backdrop shield layer to handle outside clicks cleanly */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterDropdownOpen(false)} />

                    <div className="absolute right-0 mt-2 w-84 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-[0_12px_35px_-4px_rgba(15,23,42,0.09)] dark:shadow-[0_12px_40px_-4px_rgba(0,0,0,0.5)] z-50 flex flex-col gap-4 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent pr-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2.5">

                        {totalActiveFiltersCount > 0 && (
                          <button
                            onClick={() => { setSelectedStates([]); setSelectedTypes([]); setSelectedCategories([]); setSelectedChannels([]); }}
                            className="text-[9px] font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 uppercase"
                          >
                            Reset All
                          </button>
                        )}
                      </div>

                      {/* BLOCK 1: SYSTEM LIFE-CYCLE STATES */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase mb-0.5">States</span>
                        <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-100 dark:scrollbar-thumb-slate-800">
                          {serverStatuses?.filter((s: any) => s.isActive !== false).map((status: any) => (
                            <label key={status.id} className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-200 w-full py-0.5">
                              <input
                                type="checkbox"
                                checked={selectedStates.includes(status.name)}
                                onChange={() => handleCheckboxToggle(status.name, selectedStates, setSelectedStates)}
                                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sky-600 focus:ring-sky-500/20 cursor-pointer transition-all shrink-0"
                              />
                              <span className="uppercase tracking-wide truncate" title={status.label}>
                                {status.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* BLOCK 2: TICKET TYPE */}
                      <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                        <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase mb-0.5">Ticket Type</span>
                        <div className="flex flex-col gap-1.5">
                          {masterTypes?.map((type: any) => (
                            <label key={type.id} className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-200 w-full py-0.5">
                              <input
                                type="checkbox"
                                checked={selectedTypes.includes(type.name)}
                                onChange={() => handleCheckboxToggle(type.name, selectedTypes, setSelectedTypes)}
                                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sky-600 focus:ring-sky-500/20 cursor-pointer transition-all shrink-0"
                              />
                              <span className="uppercase tracking-wide truncate" title={type.name}>
                                {type.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* BLOCK 3: CATEGORY */}
                      <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                        <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase mb-0.5">Category</span>
                        <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-100 dark:scrollbar-thumb-slate-800">
                          {masterCategories?.map((cat: any) => (
                            <label key={cat.id} className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-200 w-full py-0.5">
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(cat.name)}
                                onChange={() => handleCheckboxToggle(cat.name, selectedCategories, setSelectedCategories)}
                                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sky-600 focus:ring-sky-500/20 cursor-pointer transition-all shrink-0"
                              />
                              <span className="uppercase tracking-wide truncate" title={cat.name}>
                                {cat.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* BLOCK 4: SOURCE CHANNEL */}
                      <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                        <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase mb-0.5">Source Channel</span>
                        <div className="flex flex-col gap-1.5">
                          {['Email', 'Phone', 'Portal'].map((channel) => (
                            <label key={channel} className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-200 w-full py-0.5">
                              <input
                                type="checkbox"
                                checked={selectedChannels.includes(channel)}
                                onChange={() => handleCheckboxToggle(channel, selectedChannels, setSelectedChannels)}
                                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sky-600 focus:ring-sky-500/20 cursor-pointer transition-all shrink-0"
                              />
                              <span className="uppercase tracking-wide truncate" title={channel}>
                                {channel}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* NEW ACTION FOOTER ZONE */}
                      <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsFilterDropdownOpen(false); // Close popover safely
                            setIsAdvancedModalOpen(true);   // Launch the heavy modal
                          }}
                          className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800/50 text-sky-600 dark:text-sky-400 text-xs font-black tracking-wider uppercase rounded-xl transition-all"
                        >
                          ⚙️ Advanced Filters
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* EXISTING TRIGGER BUTTON: Create Ticket Button */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-sky-600/10 hover:shadow-sky-500/20 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
              >
                + CREATE TICKET
              </button>
            </div>
          </PermissionGate>
        </div>

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
        ) : workspace === 'myQueue' ? (
          <div className="space-y-4">
            {myQueueTickets.length === 0 ? (
              <div className="text-center text-slate-500 uppercase font-mono py-8">
                No active tickets inside this channel
              </div>
            ) : (
              myQueueTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] dark:shadow-none transition-all duration-300 mb-5 flex flex-col gap-3 relative overflow-hidden cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono text-slate-400 tracking-wider">#{t.id.slice(0, 8).toUpperCase()}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border uppercase ${t.status === 'OPEN' ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-500/20' : t.status === 'IN_PROGRESS' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700'}`}>
                      {t.status}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 uppercase">
                      {t.priority || 'LOW PRIORITY'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight group-hover:text-sky-600 dark:group-hover:text-cyan-400 transition-colors mt-1">{t.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{t.description}</p>

                  <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div><span className="text-xs font-bold text-slate-500 dark:text-slate-400/70 tracking-wider uppercase">CUSTOMER:</span> <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.customer?.name || t.customer?.email || 'N/A'}</span></div>
                    <div><span className="text-xs font-bold text-slate-500 dark:text-slate-400/70 tracking-wider uppercase">CATEGORY:</span> <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.category || 'General'}</span></div>
                    {t.ticketType && (
                      <div><span className="text-xs font-bold text-slate-500 dark:text-slate-400/70 tracking-wider uppercase">TYPE:</span> <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.ticketType}</span></div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400/70 tracking-wider uppercase">SLA DEADLINE:</span>
                      <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-100/50 dark:border-rose-500/20 font-mono text-xs font-semibold inline-flex items-center">
                        {new Date(t.slaDeadline).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : workspace === 'closedArchive' ? (
          <div className="space-y-4">
            {closedArchiveTickets.length === 0 ? (
              <div className="text-center text-slate-500 uppercase font-mono py-8">
                No closed tickets in historical archive
              </div>
            ) : (
              closedArchiveTickets.map((t) => {
                const isBreached = t.isSlaBreached ?? (t.closedAt ? new Date(t.closedAt) > new Date(t.slaDeadline) : new Date() > new Date(t.slaDeadline));
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] dark:shadow-none transition-all duration-300 mb-5 flex flex-col gap-3 relative overflow-hidden cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold font-mono text-slate-400 tracking-wider">#{t.id.slice(0, 8).toUpperCase()}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border uppercase ${t.status === 'OPEN' ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-500/20' : t.status === 'IN_PROGRESS' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700'}`}>
                        {t.status}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 uppercase">
                        {t.priority || 'LOW PRIORITY'}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border uppercase ml-auto ${!isBreached ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20'}`}>
                        {!isBreached ? 'SLA COMPLIANT' : 'SLA BREACHED'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight group-hover:text-sky-600 dark:group-hover:text-cyan-400 transition-colors mt-1">{t.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{t.description}</p>

                    <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-2">
                      <div><span className="text-xs font-bold text-slate-500 dark:text-slate-400/70 tracking-wider uppercase">CUSTOMER:</span> <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.customer?.name || t.customer?.email || 'N/A'}</span></div>
                      <div><span className="text-xs font-bold text-slate-500 dark:text-slate-400/70 tracking-wider uppercase">CATEGORY:</span> <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.category || 'General'}</span></div>
                      {t.ticketType && (
                        <div><span className="text-xs font-bold text-slate-500 dark:text-slate-400/70 tracking-wider uppercase">TYPE:</span> <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.ticketType}</span></div>
                      )}
                      <div><span className="text-xs font-bold text-slate-500 dark:text-slate-400/70 tracking-wider uppercase">CLOSED AT:</span> <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.closedAt ? new Date(t.closedAt).toLocaleString() : 'N/A'}</span></div>
                    </div>
                  </div>
                );
              })
            )}
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
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] dark:shadow-none transition-all duration-300 mb-5 flex flex-col gap-3 relative overflow-hidden cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold font-mono text-slate-400 tracking-wider">#{t.id.slice(0, 8).toUpperCase()}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border uppercase ${t.status === 'OPEN' ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-500/20' : t.status === 'IN_PROGRESS' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700'}`}>
                    {t.status}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 uppercase">
                    {t.priority || 'LOW PRIORITY'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight group-hover:text-sky-600 dark:group-hover:text-cyan-400 transition-colors mt-1">{t.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{t.description}</p>

                <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div><span className="text-xs font-bold text-slate-500 dark:text-slate-400/70 tracking-wider uppercase">CUSTOMER:</span> <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.customer?.name || t.customer?.email || 'N/A'}</span></div>
                  <div><span className="text-xs font-bold text-slate-500 dark:text-slate-400/70 tracking-wider uppercase">CATEGORY:</span> <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.category || 'General'}</span></div>
                  {t.ticketType && (
                    <div><span className="text-xs font-bold text-slate-500 dark:text-slate-400/70 tracking-wider uppercase">TYPE:</span> <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.ticketType}</span></div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400/70 tracking-wider uppercase">SLA DEADLINE:</span>
                    <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-100/50 dark:border-rose-500/20 font-mono text-xs font-semibold inline-flex items-center">
                      {new Date(t.slaDeadline).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SPLIT-PANE TICKET DETAILS VIEW MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 md:p-8 bg-black/70 backdrop-blur-md">
          <div className="relative bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-900 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col md:flex-row shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Absolute Close Button in Top-Right Corner of Entire Main Panel */}
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-6 right-6 z-50 text-slate-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2.5"
              aria-label="Close Ticket Details"
            >
              ✕
            </button>

            {/* Left Meta Details Pane — fixed at 70% */}
            <div className="w-full md:w-[70%] md:max-w-[70%] md:shrink-0 bg-white/50 dark:bg-black/40 border-r border-slate-200 dark:border-white/5 p-8 flex flex-col overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative" ref={statusPopoverRef}>
                    <button
                      onClick={() => setIsStatusPopoverOpen(!isStatusPopoverOpen)}
                      className="w-full min-w-[160px] bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-2.5 text-xs font-bold tracking-wider uppercase focus:outline-none transition-all duration-200 text-left flex justify-between items-center"
                    >
                      <span>{selectedTicket.status || 'ASSIGN STATE'}</span>
                      <svg className={`w-4 h-4 transition-transform ${isStatusPopoverOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>

                    {isStatusPopoverOpen && (
                      <div className="absolute top-full left-0 z-50 mt-2 w-72 shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-slate-200 dark:border-slate-800">
                        <div className="flex flex-col max-h-64 overflow-y-auto p-1 bg-white dark:bg-slate-900 rounded-xl">
                          {isLoadingStatuses ? (
                            <div className="text-[10px] font-bold text-slate-400 p-3 animate-pulse uppercase tracking-wider">
                              Syncing Database Statuses...
                            </div>
                          ) : serverStatuses.filter((s: any) => s.isActive !== false).length === 0 ? (
                            <div className="text-[10px] font-medium text-slate-400 p-3 italic">
                              No active lifecycle statuses configured
                            </div>
                          ) : (
                            serverStatuses
                              .filter((status: any) => status.isActive !== false)
                              .map((status: any) => {
                                const isCurrentValue = selectedTicket.status === status.name;

                                return (
                                  <button
                                    key={status.id}
                                    type="button"
                                    onClick={async () => {
                                      setIsStatusPopoverOpen(false);
                                      const statusName = status.name;
                                      try {
                                        const isResolved = statusName === "RESOLVED";

                                        const payload = {
                                          status: statusName,
                                          isArchived: isResolved,
                                          archivedAt: isResolved ? new Date().toISOString() : null,
                                          assignedToId: user?.id,
                                          ticketOwnerId: user?.id,
                                          ...(isResolved ? {
                                            subStatus: 'NONE',
                                            closedAt: new Date().toISOString(),
                                            closedBy: user?.name
                                          } : {})
                                        };

                                        const res = await api.patch(`/tickets/${selectedTicket.id}/status`, payload);

                                        if (isResolved) {
                                          setSelectedTicket(null);
                                        } else {
                                          setSelectedTicket(res.data);
                                        }

                                        queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
                                        queryClient.invalidateQueries({ queryKey: ['activeTicketsList'] });
                                        queryClient.invalidateQueries({ queryKey: ['archivedTicketsList'] });
                                        if (!isResolved) {
                                          queryClient.invalidateQueries({ queryKey: ['ticketDetails', selectedTicket.id] });
                                        }

                                        setToast({ message: isResolved ? 'Ticket successfully resolved and moved to Closed Archive.' : `Status updated to ${statusName.replace(/_/g, ' ')}`, type: 'success' });
                                      } catch (err) {
                                        setToast({ message: 'Failed to update Status', type: 'error' });
                                      }
                                    }}
                                    className={`w-full text-left px-3.5 py-2.5 text-xs rounded-lg font-semibold transition-all flex flex-col gap-0.5 ${isCurrentValue
                                      ? 'bg-sky-50 text-sky-700 font-bold dark:bg-sky-500/20 dark:text-sky-300'
                                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                                      }`}
                                  >
                                    <span className="uppercase tracking-wide">{status.label}</span>
                                    {status.description && (
                                      <span className="text-[9px] font-medium text-slate-400 block normal-case">
                                        {status.description}
                                      </span>
                                    )}
                                  </button>
                                );
                              })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-400 text-indigo-300 font-mono text-[10px] font-bold uppercase rounded-lg transition-all shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] tracking-wider flex items-center gap-1.5"
                    title="Schedule Ticket"
                  >
                    <span>⏱</span> Schedule
                  </button>

                  <button
                    onClick={() => setIsMergeModalOpen(true)}
                    className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400 text-amber-300 font-mono text-[10px] font-bold uppercase rounded-lg transition-all shadow-[0_0_10px_rgba(245,158,11,0.1)] hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] tracking-wider flex items-center gap-1.5"
                    title="Merge Tickets"
                  >
                    <span>🔗</span> Merge
                  </button>
                </div>
              </div>

              <h2 className="text-xl font-bold text-white mb-2 leading-tight uppercase font-mono tracking-wide">
                {selectedTicket.id}
              </h2>
              <h3 className="text-lg font-semibold text-slate-300 mb-6 leading-tight">
                {selectedTicket.title}
              </h3>

              <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl p-4 flex-grow mb-6 max-h-48 overflow-y-auto">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block mb-2">Description</span>
                <p className="text-slate-700 dark:text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
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
                <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-4">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block">
                    Ticket Audit Log
                  </span>
                  <button
                    onClick={handleDownloadPDF}
                    className="text-[9px] font-mono uppercase tracking-widest text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-1 rounded transition-colors"
                  >
                    Download PDF
                  </button>
                </div>

                <div id="audit-log-print-zone" className="p-4 rounded-xl">
                  {(!selectedTicket.comments || selectedTicket.comments.length === 0) ? (
                    <div className="h-full flex items-center justify-center text-center font-mono text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 py-12 uppercase mb-6">
                      No replies or logs on record
                    </div>
                  ) : (
                    <div className="space-y-4 mb-6">
                      {selectedTicket.comments.map((comment: any, index: number) => {
                        const trackingNumber = index + 1;
                        const authorName = comment.author?.name || 'SYSTEM';
                        const authorRole = comment.author?.role?.name || 'AGENT';
                        const cType = comment.type || (comment.isInternal ? 'INTERNAL_NOTE' : 'CLIENT_REPLY');

                        if (cType === 'SYSTEM_EVENT' || (comment.isInternal && authorName === 'SYSTEM')) {
                          return (
                            <div key={comment.id} className="text-center text-[10px] font-mono text-slate-500 tracking-widest uppercase my-4">
                              <span className="text-[10px] font-mono text-cyan-400 font-bold px-1.5 py-0.5 bg-cyan-500/10 rounded mr-2">
                                [ #{trackingNumber} ]
                              </span>
                              {comment.content}
                            </div>
                          );
                        }

                        const isRightAligned = cType === 'AGENT_REPLY';
                        const isInternalNote = cType === 'INTERNAL_NOTE';

                        let alignmentClass = 'items-start';
                        let bubbleClass = 'border-slate-200 bg-slate-100 text-slate-700 dark:text-slate-800 rounded-tl-sm shadow-sm'; // Default CLIENT_REPLY

                        if (isRightAligned) {
                          alignmentClass = 'ml-auto items-end';
                          bubbleClass = 'border-cyan-100/70 bg-cyan-50 text-slate-800 dark:text-slate-900 rounded-tr-sm shadow-[0_0_15px_rgba(6,182,212,0.08)]';
                        } else if (isInternalNote) {
                          alignmentClass = 'items-start';
                          bubbleClass = 'border-amber-200 bg-amber-50 text-amber-900 dark:text-amber-900 rounded-tl-sm shadow-sm';
                        }

                        return (
                          <div key={comment.id} className={`flex flex-col max-w-[85%] ${alignmentClass}`}>
                            <div className="flex items-center gap-2 mb-1.5 font-mono text-[9px] text-slate-500 tracking-wider">
                              <span className="text-[10px] font-mono text-cyan-400 font-bold px-1.5 py-0.5 bg-cyan-500/10 rounded">
                                [ #{trackingNumber} ]
                              </span>
                              <span className="uppercase text-slate-400 font-semibold">{authorName}</span>
                              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase scale-90">{authorRole}</span>
                              {isInternalNote && <span className="text-amber-500 font-bold">[INTERNAL NOTE]</span>}
                              <span>•</span>
                              <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={`px-5 py-3 rounded-2xl text-xs font-semibold leading-relaxed border break-words whitespace-pre-wrap ${bubbleClass}`}>
                              {comment.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* DUAL-ACTION SUBMISSION FORM TOOLBAR */}
                <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mt-6 transition-all duration-200">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                  <div className="flex justify-end items-center gap-3 mt-3">
                    <button
                      onClick={() => submitMessage(true)}
                      disabled={!replyText.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-xs font-bold text-amber-700 transition-all duration-200 shadow-sm disabled:opacity-50"
                    >
                      <span>🔒</span> Add Note
                    </button>
                    <button
                      onClick={() => submitMessage(false)}
                      disabled={!replyText.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all duration-200 shadow-md shadow-sky-600/10 disabled:opacity-50"
                    >
                      <span>✉</span> Reply to User
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Comments Timeline Pane — fixed at 30% */}
            <div className="w-80 md:w-[30%] md:max-w-[30%] md:shrink-0 bg-slate-50 dark:bg-slate-900/40 border-l border-slate-200 dark:border-slate-800 flex flex-col gap-4 relative">
              <div className="flex-1 overflow-y-auto px-6 pt-12 pb-28 space-y-8">

                {/* Display Core telemetry if populated */}
                {selectedTicket.ticketType && (
                  <div className="border-b border-slate-200 dark:border-white/5 pb-6 space-y-3">
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono uppercase tracking-widest block font-bold">Telemetry Core Data</span>
                    <div className="grid grid-cols-2 gap-4 pr-4 text-xs font-mono text-slate-700 dark:text-slate-300">
                      <div className="p-4 flex flex-col justify-between h-20 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">TYPE</span> {selectedTicket.ticketType}</div>
                      <div className="p-4 flex flex-col justify-between h-20 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">QUEUE</span> {selectedTicket.queueId || 'N/A'}</div>
                      <div className="p-4 flex flex-col justify-between h-20 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">CATEGORIES</span> {selectedTicket.firewallCategory || 'N/A'}</div>
                      <div className="p-4 flex flex-col justify-between h-20 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">CONTRACT</span> {selectedTicket.serviceContract || 'N/A'}</div>
                      <div className="p-4 flex flex-col justify-between h-20 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">SCOPE</span> {selectedTicket.isScopeInScope ? 'IN-SCOPE' : 'OUT-OF-SCOPE'}</div>
                      <div className="p-4 flex flex-col justify-between h-20 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">AFFECTED DEVICE</span> {selectedTicket.affectedDevice || 'N/A'}</div>
                      <div className="p-4 flex flex-col justify-between h-20 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">DEVICE IP</span> {selectedTicket.deviceIp || 'N/A'}</div>
                      <div className="p-4 flex flex-col justify-between h-20 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl"><span className="text-slate-500 font-semibold block text-[10px] mb-1">OWNER</span> {selectedTicket.ticketOwner?.name || 'Unassigned'}</div>
                    </div>
                  </div>
                )}

                {/* SLA & Health Telemetry Widget Grid */}
                <SlaHealthTelemetry ticket={selectedTicket} />

                {/* File Attachment Upload Block */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-all flex flex-col items-center justify-center gap-3 text-center mt-6">
                  <h3 className="text-cyan-600 dark:text-cyan-400 font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 self-start w-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)] dark:shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
                    Attachment Upload
                  </h3>

                  <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {isUploading ? (
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <svg className="animate-spin h-6 w-6 text-cyan-600 dark:text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-[10px] text-cyan-700 dark:text-cyan-300 font-mono uppercase tracking-widest animate-pulse">Transmitting Data...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 flex items-center justify-center mb-3 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-500/10 group-hover:border-cyan-300 dark:group-hover:border-cyan-500/30 transition-all">
                          <span className="text-slate-500 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 text-lg">↑</span>
                        </div>
                        <span className="text-xs font-mono text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Click to add attachments</span>
                        <span className="text-[9px] font-mono text-slate-500 mt-2 uppercase tracking-widest">Logs or Visuals</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 📎 ATTACHMENTS SECTION */}
                <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 text-center transition-all mt-6">
                  <h3 className="text-cyan-600 dark:text-cyan-400 font-mono text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 self-start text-left w-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
                    📎 ATTACHMENTS
                  </h3>
                  {(!selectedTicket.attachments || selectedTicket.attachments.length === 0) ? (
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500 italic font-mono">No files uploaded to this ticket yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedTicket.attachments.map((file: any) => (
                        <div key={file.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 flex justify-between items-center hover:border-cyan-500/50 transition-colors">
                          <div className="flex flex-col overflow-hidden text-left">
                            <span className="text-xs font-mono text-slate-800 dark:text-white truncate max-w-[180px]">{file.fileName}</span>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</span>
                          </div>
                          <a
                            href={`http://localhost:3000/${file.filePath.startsWith('./') ? file.filePath.slice(2) : file.filePath.startsWith('/') ? file.filePath.slice(1) : file.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={file.fileName}
                            className="text-[10px] bg-sky-50 dark:bg-white/5 hover:bg-sky-100 dark:hover:bg-cyan-500/20 text-sky-600 dark:text-cyan-400 px-3 py-1.5 rounded-lg font-mono font-bold uppercase tracking-wider transition-all"
                          >
                            ⬇️ Download
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
          <div className="w-full max-w-xl bg-white dark:bg-[#090d16] border border-slate-200 dark:border-white/5 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
                Create New Ticket
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col">
              <div className="max-h-[75vh] overflow-y-auto px-8 py-6 custom-scrollbar space-y-6">
                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">Title</label>
                  <input
                    required
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                    placeholder="Summarize the core request"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">Description</label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all resize-none"
                    placeholder="Describe the full technical requirements..."
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">PRIMARY DOMAIN</label>
                    <select
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                    >
                      <option value="" disabled className="bg-slate-900">Select broad domain...</option>
                      <option value="General Support" className="bg-slate-900">General Support</option>
                      <option value="Network & Security" className="bg-slate-900">Network & Security</option>
                      <option value="Hardware & Endpoints" className="bg-slate-900">Hardware & Endpoints</option>
                      <option value="Software & Access" className="bg-slate-900">Software & Access</option>
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">Ticket Source</label>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                    >
                      <option value="Email" className="bg-slate-900">Email</option>
                      <option value="Phone" className="bg-slate-900">Phone</option>
                      <option value="Portal" className="bg-slate-900">Portal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">Search User ID, Name, or Email...</label>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search User ID, Name, or Email..."
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                    />

                    <select
                      required
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                    >
                      <option value="" disabled className="bg-slate-900 text-slate-500">
                        {isLoadingCustomers ? 'Loading matching accounts...' : 'Choose an user account'}
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

                {/* Automation Parameters */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/5 mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white tracking-widest uppercase flex items-center gap-2">
                      <span className="text-cyan-500 dark:text-cyan-400">⚙️</span> Schedule Ticket
                    </h3>
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${isScheduled ? 'bg-cyan-500' : 'bg-slate-700'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isScheduled ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                      <span className="ml-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Schedule this ticket?
                      </span>
                    </label>
                  </div>

                  {isScheduled && (
                    <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">Frequency</label>
                          <select
                            value={scheduleFrequency}
                            onChange={(e) => setScheduleFrequency(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                          >
                            <option value="Run Once" className="bg-slate-900">Run Once</option>
                            <option value="Recurring Maintenance Routine" className="bg-slate-900">Recurring Maintenance Routine</option>
                          </select>
                        </div>

                        <div className="flex-1">
                          <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">Target Execution Window</label>
                          <input
                            type="datetime-local"
                            required={isScheduled}
                            value={executeAt}
                            onChange={(e) => setExecuteAt(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        </div>
                      </div>

                      {scheduleFrequency === 'Recurring Maintenance Routine' && (
                        <div>
                          <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">Cron Pattern Interval</label>
                          <input
                            type="text"
                            required={scheduleFrequency === 'Recurring Maintenance Routine'}
                            value={cronExpression}
                            onChange={(e) => setCronExpression(e.target.value)}
                            placeholder="0 6 * * 1"
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                          />
                          <p className="text-[10px] text-slate-500 mt-1 font-mono uppercase">e.g., '0 6 * * 1' for weekly</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              <div className="px-8 py-4 border-t border-slate-200 dark:border-white/5 flex gap-4 bg-slate-50/50 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-900 transition-all uppercase tracking-widest"
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
          <div className="relative w-full max-w-3xl bg-white dark:bg-[#090d16] border border-slate-200 dark:border-white/5 rounded-2xl shadow-xl overflow-hidden my-8 animate-in zoom-in-95 duration-300">
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

            <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center pr-16">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
                Add Ticket Core Data
              </h2>
            </div>

            <form onSubmit={handleCoreSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">

              <div className="space-y-4 border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 p-6 rounded-2xl">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/5 pb-2">
                  Panel 1: Classification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ticket Type</label>
                    <select
                      value={coreType}
                      onChange={(e) => {
                        setCoreType(e.target.value);
                        setCorePriority(""); // Reset priority to prevent cross-contamination errors
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-sm focus:outline-none transition-all"
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

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">Status</label>
                    <select
                      value={coreStatus}
                      onChange={(e) => setCoreStatus(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-sm font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                    >
                      {serverStatuses.filter((s: any) => s.isActive !== false).map((status: any) => (
                        <option key={status.id} value={status.name}>
                          {status.label} {status.description ? `- ${status.description}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Categories</label>
                    <select
                      value={coreFirewallCategory}
                      onChange={(e) => setCoreFirewallCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-sm focus:outline-none transition-all"
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
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Source Channel</label>
                    <select
                      value={coreSource}
                      onChange={(e) => setCoreSource(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-sm focus:outline-none transition-all"
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

              <div className="space-y-4 border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 p-6 rounded-2xl">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/5 pb-2">
                  Panel 2: Assignment/SLA
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Field 1: USER NAME */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">User Name</label>
                    <input
                      type="text"
                      value={coreCustomerName}
                      onChange={(e) => setCoreCustomerName(e.target.value)}
                      placeholder="Organization or Individual name"
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-sm focus:outline-none transition-all"
                    />
                  </div>

                  {/* Field 2: SERVICE GROUP */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">Service Group</label>
                    <select
                      value={selectedServiceGroup}
                      onChange={(e) => setSelectedServiceGroup(e.target.value)}
                      disabled={isLoadingGroups}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-sm focus:outline-none transition-all font-semibold uppercase"
                    >
                      <option value="">-- SELECT SERVICE GROUP --</option>
                      {assignmentGroups
                        ?.filter((group: any) => group.isActive)
                        ?.sort((a: any, b: any) => a.name.localeCompare(b.name))
                        ?.map((group: any) => (
                          <option key={group.id} value={group.name} className="bg-slate-50 dark:bg-slate-900">
                            {group.name.toUpperCase()}
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  {/* COMMENTED OUT FOR CLEANER UI MATRIX: 
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">Criticality Rating</label>
                    <select
                      value={coreCriticality}
                      onChange={(e) => setCoreCriticality(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-sm focus:outline-none transition-all"
                    >
                      <option value="" className="bg-slate-900">Select Criticality</option>
                      <option value="Low" className="bg-slate-900">Low</option>
                      <option value="Medium" className="bg-slate-900">Medium</option>
                      <option value="High" className="bg-slate-900">High</option>
                      <option value="Urgent" className="bg-slate-900">Urgent</option>
                    </select>
                  </div>
                  */}

                  {/* Field 4: PRIORITY THREAT LEVEL */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">Priority Threat Level</label>
                    <select
                      value={corePriority}
                      onChange={(e) => setCorePriority(e.target.value)}
                      disabled={!coreType || isLoadingSlaTiers}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-sm font-semibold uppercase focus:outline-none transition-all"
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
                                {tier.level.toUpperCase()} - {tier.description || "CUSTOM OPERATIONAL TARGET"}
                              </option>
                            ))
                          }
                        </>
                      )}
                    </select>
                  </div>

                  {/* Field 5: SELECT TICKET OWNER (ENGINEER) span-full to align cleanly at base */}
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">Select Ticket Owner (Engineer)</label>
                    <select
                      value={coreOwnerId}
                      onChange={(e) => setCoreOwnerId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-sm focus:outline-none transition-all"
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

              <div className="space-y-4 border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 p-6 rounded-2xl">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/5 pb-2">
                  Panel 3: Endpoint Protection (EPO)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Affected Device Hostname</label>
                    <input
                      type="text"
                      value={coreDevice}
                      onChange={(e) => setCoreDevice(e.target.value)}
                      placeholder="e.g. WS-LPT-SEC09"
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-sm focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Affected IP Address</label>
                    <input
                      type="text"
                      value={coreIp}
                      onChange={(e) => setCoreIp(e.target.value)}
                      placeholder="e.g. 192.168.1.100"
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-sm focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-white/5 flex gap-4 mt-8 items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsCoreDataModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-900 transition-all uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateCoreDataMutation.isPending}
                  className="px-5 py-2.5 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-500 text-cyan-700 dark:text-cyan-300 hover:text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  {updateCoreDataMutation.isPending ? 'Processing..' : 'Save Core Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Ticket Modal */}
      {isScheduleModalOpen && selectedTicket && (
        <ScheduleTicketModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          ticketId={selectedTicket.id}
          onSuccess={(updatedTicket: Ticket) => {
            setSelectedTicket(updatedTicket);
            setToast({ message: 'Ticket successfully scheduled', type: 'success' });
          }}
        />
      )}

      {/* Merge Tickets Modal */}
      {isMergeModalOpen && selectedTicket && (
        <MergeTicketsModal
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          selectedTicket={selectedTicket}
          allTickets={tickets}
        />
      )}

      {/* Theme-Adaptive Search Matrix Modal Overlay */}
      {isAdvancedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Backdrop Click Dismissal */}
          <div className="fixed inset-0" onClick={() => setIsAdvancedModalOpen(false)} />

          {/* Modal Core Bounding Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-2xl shadow-xl z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">

            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
              <div>
                <h3 className="text-sm font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase">Advanced Search Filters</h3>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase mt-0.5">Filter data grid by specific record fields</p>
              </div>
              <button
                onClick={() => setIsAdvancedModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Modal Body: 2x2 High-Density Input Grid */}
            <div className="p-6 flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Search Parameter 1: Ticket Number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase">Ticket Number</label>
                  <input
                    type="text"
                    value={searchTicketNo}
                    onChange={(e) => setSearchTicketNo(e.target.value)}
                    placeholder="e.g. TKT-2069"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500 transition-colors placeholder:text-slate-400/70"
                  />
                </div>

                {/* Search Parameter 2: Dynamic Customer/User Selector Dropdown */}
                {/* Search Parameter 2: Customer/User Selector — reuses the same fetchUsers() data as Create Ticket modal */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                    Customer / User Name
                  </label>
                  <div className="relative">
                    <select
                      value={searchCustomer}
                      onChange={(e) => setSearchCustomer(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="">
                        {isLoadingUsers ? "🔄 Loading accounts..." : "-- SELECT CUSTOMER ACCOUNT --"}
                      </option>

                      {/* REUSING THE EXACT WORKING ARRAY FROM THE CREATE TICKET MODAL */}
                      {advFiltersCustomers.map((c: any) => {
                        const custId = c.customerId || c.id.substring(0, 8).toUpperCase();
                        return (
                          <option key={c.id} value={c.name} className="bg-white dark:bg-slate-900">
                            [{custId}] {String(c.name).toUpperCase()} ({c.email})
                          </option>
                        );
                      })}

                      {!isLoadingUsers && advFiltersCustomers.length === 0 && (
                        <option disabled className="text-rose-400">
                          NO REGISTERED CUSTOMER ACCOUNTS FOUND
                        </option>
                      )}
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                </div>

                {/* Search Parameter 3: Date Fields (Start & End grouped inline) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase">Created After (Start Date)</label>
                  <input
                    type="date"
                    value={searchStartDate}
                    onChange={(e) => setSearchStartDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500 transition-colors uppercase"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase">Created Before (End Date)</label>
                  <input
                    type="date"
                    value={searchEndDate}
                    onChange={(e) => setSearchEndDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500 transition-colors uppercase"
                  />
                </div>

              </div>

              {/* Search Parameter 4: Ticket Subject Line (Full-width row) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase">Ticket Subject / Title Keywords</label>
                <input
                  type="text"
                  value={searchSubject}
                  onChange={(e) => setSearchSubject(e.target.value)}
                  placeholder="Search words inside ticket headings..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500 transition-colors placeholder:text-slate-400/70"
                />
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center gap-3">
              {isAdvancedSearchActive && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchCustomer(''); setSearchStartDate(''); setSearchEndDate(''); setSearchTicketNo(''); setSearchSubject('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wide"
                >
                  Reset Form
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsAdvancedModalOpen(false)}
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-black tracking-wider uppercase px-5 py-2.5 rounded-xl shadow-md shadow-sky-600/10 active:translate-y-0.5 transition-all"
              >
                Apply Search
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
