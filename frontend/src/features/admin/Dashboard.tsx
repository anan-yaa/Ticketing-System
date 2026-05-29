import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUsers, fetchRoles } from '../../api/users';

export const Dashboard: React.FC = () => {
  // Fetch users with a large limit to count active ones
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users-count'],
    queryFn: () => fetchUsers(1, 1000, ''),
  });

  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles-count'],
    queryFn: fetchRoles,
  });

  const activeUsersCount = usersData?.users
    ? usersData.users.filter((u: any) => u.status === 'ACTIVE').length
    : 0;

  const totalRolesCount = rolesData ? rolesData.length : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Users Card */}
        <div className="relative group overflow-hidden w-full p-6 rounded-2xl border border-slate-300/90 dark:border-white/5 bg-white dark:bg-slate-950/40 shadow-sm transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-cyan-500/10 transition-colors"></div>
          <div className="flex flex-col">
            <h3 className="text-xs font-bold tracking-wider text-slate-500 dark:text-cyan-400 uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
              Active Users
            </h3>
            {isLoadingUsers ? (
              <div className="text-3xl font-black font-mono text-slate-500 dark:text-slate-400 animate-pulse">QUERYING...</div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-sky-500 mt-4">
                  {activeUsersCount}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-500 tracking-wide uppercase">Accounts Active</span>
              </div>
            )}
          </div>
        </div>

        {/* System Roles Card */}
        <div className="relative group overflow-hidden w-full p-6 rounded-2xl border border-slate-300/90 dark:border-white/5 bg-white dark:bg-slate-950/40 shadow-sm transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-cyan-500/10 transition-colors"></div>
          <div className="flex flex-col">
            <h3 className="text-xs font-bold tracking-wider text-slate-500 dark:text-cyan-400 uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
              System Defined Roles
            </h3>
            {isLoadingRoles ? (
              <div className="text-3xl font-black font-mono text-slate-500 dark:text-slate-400 animate-pulse">QUERYING...</div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-sky-500 mt-4">
                  {totalRolesCount}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-500 tracking-wide uppercase">Defined Roles</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
