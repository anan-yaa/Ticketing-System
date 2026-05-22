import React from 'react';
import { useAuth } from '../context/AuthContext';

interface PermissionGateProps {
  permission?: string;
  allowedPermissions?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  allowedPermissions,
  children,
  fallback = null,
}) => {
  const { hasPermission } = useAuth();

  const hasAccess =
    (permission && hasPermission(permission)) ||
    (allowedPermissions && allowedPermissions.some((perm) => hasPermission(perm)));

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
