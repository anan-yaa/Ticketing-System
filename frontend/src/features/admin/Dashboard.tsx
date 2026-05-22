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
        <div className="relative group overflow-hidden bg-gradient-to-br from-slate-900/60 to-slate-950/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-cyan-500/10 transition-colors"></div>
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-white font-mono tracking-wider uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
              Active Users
            </h3>
            {isLoadingUsers ? (
              <div className="text-3xl font-black font-mono text-slate-500 animate-pulse">QUERYING...</div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">
                  {activeUsersCount}
                </span>
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Accounts Active</span>
              </div>
            )}
          </div>
        </div>

        {/* System Roles Card */}
        <div className="relative group overflow-hidden bg-gradient-to-br from-slate-900/60 to-slate-950/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-cyan-500/10 transition-colors"></div>
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-white font-mono tracking-wider uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
              System Defined Roles
            </h3>
            {isLoadingRoles ? (
              <div className="text-3xl font-black font-mono text-slate-500 animate-pulse">QUERYING...</div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">
                  {totalRolesCount}
                </span>
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Defined Roles</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
