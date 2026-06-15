import api from './axios';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | string;
  
  // 🔗 New Relational Layout Properties
  statusId?: string; 
  masterStatus?: {
    id: string;
    name: string;
    description?: string;
    isSlaPaused: boolean;
    isArchived: boolean;
  };
  
  // SLA tracking fields
  slaPausedAt?: string | null;
  resolvedAt?: string | null;

  subStatus?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  category?: string;
  source: string;
  customerId: string;
  customer?: {
    name: string;
    email: string;
  };
  ticketOwnerId?: string;
  ticketOwner?: {
    name: string;
    email: string;
  };
  ticketType?: string | null;
  serviceContract?: string | null;
  firewallCategory?: string | null;
  criticality?: string | null;
  customerName?: string | null;
  ticketSource?: string | null;
  timeSpentMin?: number | null;
  isScopeInScope?: boolean | null;
  affectedDevice?: string | null;
  parentId?: string | null;
  deviceIp?: string | null;
  queueId?: string | null;
  slaId?: string | null;
  respondedAt?: string | null;
  closedAt?: string | null;
  isSlaBreached?: boolean | null;
  comments?: any[];
  attachments?: any[];
  slaDeadline: string;
  createdAt: string;
  updatedAt: string;
}

export const fetchAllTicketsAdmin = async (): Promise<Ticket[]> => {
  const { data } = await api.get('/tickets/admin/all');
  return data;
};

export const createTicketAdmin = async (ticket: {
  title: string;
  description: string;
  category?: string;
  source?: string;
  customerId?: string;
  status?: string;
  executeAt?: string | null;
  isRecurring?: boolean;
  cronExpression?: string;
  // ── Core classification (merged panel) ──────────────────────────────────
  ticketType?: string;
  queueId?: string;
  firewallCategory?: string;
  ticketSource?: string;
  isScopeInScope?: boolean;
  customerName?: string;
  priority?: string;
  ticketOwnerId?: string;
  affectedDevice?: string;
  deviceIp?: string;
}): Promise<Ticket> => {
  const { data } = await api.post('/tickets', ticket);
  return data;
};

export const updateTicketCoreData = async (
  id: string,
  payload: any,
): Promise<Ticket> => {
  const { data } = await api.patch(`/tickets/${id}/core-data`, payload);
  return data;
};
