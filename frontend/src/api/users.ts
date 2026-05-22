import api from './axios';

export interface User {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface RoleData {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: {
    permission: {
      id: string;
      key: string;
      label: string;
      module: string;
    };
  }[];
  _count?: {
    users: number;
  };
}

export interface PermissionGroup {
  module: string;
  permissions: {
    id: string;
    key: string;
    label: string;
    module: string;
  }[];
}

export const fetchUsers = async (page = 1, limit = 10, search = '') => {
  const { data } = await api.get('/users', { params: { page, limit, search } });
  return data.data;
};

export const fetchRoles = async (): Promise<RoleData[]> => {
  const { data } = await api.get('/roles');
  return data;
};

export const fetchPermissions = async (): Promise<PermissionGroup[]> => {
  const { data } = await api.get('/permissions');
  return data;
};

export const createRole = async (role: { name: string; description?: string }) => {
  const { data } = await api.post('/roles', role);
  return data;
};

export const assignPermissions = async (roleId: string, permissionIds: string[]) => {
  const { data } = await api.patch(`/roles/${roleId}/permissions`, { permissionIds });
  return data;
};

export const deleteRole = async (roleId: string) => {
  const { data } = await api.delete(`/roles/${roleId}`);
  return data;
};

export const createUser = async (user: any) => {
  const { data } = await api.post('/users', user);
  return data.data;
};

export const updateUser = async (id: string, user: any) => {
  const { data } = await api.patch(`/users/${id}`, user);
  return data.data;
};

export const deleteUser = async (id: string) => {
  const { data } = await api.delete(`/users/${id}`);
  return data.data;
};

export interface AuditLog {
  id: string;
  action: string;
  performedById: string;
  performedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  details: any;
  createdAt: string;
}

export const fetchAuditLogs = async (page = 1, limit = 20) => {
  const { data } = await api.get('/audit-logs', { params: { page, limit } });
  return data.data;
};
