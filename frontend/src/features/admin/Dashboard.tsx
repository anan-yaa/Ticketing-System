import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUsers, fetchRoles } from '../../api/users';
import { fetchAllTicketsAdmin } from '../../api/tickets';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';

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

  const { data: tickets = [] } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: fetchAllTicketsAdmin,
  });

  const openTickets = useMemo(() => tickets.filter((t: any) => t.status !== 'CLOSED'), [tickets]);

  // Chart 1 Data: Reduce open tickets by Service Group
  const serviceGroupChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    openTickets.forEach((ticket: any) => {
      const group = (ticket.serviceGroup || ticket.queueId || ticket.serviceContract || 'UNASSIGNED').toUpperCase();
      counts[group] = (counts[group] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [openTickets]);

  // Chart 2 Data: Reduce open tickets by Category
  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    openTickets.forEach((ticket: any) => {
      const cat = ticket.category || ticket.firewallCategory || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count); // Sort descending for bar distribution
  }, [openTickets]);

  // Recharts Aesthetic Color Palettes (Adaptive Slate/Sky/Purple design tokens)
  const CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mt-6">
       
       {/* CARD CONTAINER 1: DONUT CHART — TICKETS BY SERVICE GROUP */}
       <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4 transition-colors">
         <div>
           <h3 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase">
             Tickets by Service Group
           </h3>
           <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase mt-0.5">
             Real-time workload volume distribution per team
           </p>
         </div>
         
         <div className="h-64 w-full flex items-center justify-center">
           {serviceGroupChartData.length === 0 ? (
             <span className="text-xs font-medium text-slate-400 italic">No active group distribution data available</span>
           ) : (
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={serviceGroupChartData}
                   cx="50%"
                   cy="50%"
                   innerRadius={65}
                   outerRadius={85}
                   paddingAngle={4}
                   dataKey="value"
                 >
                   {serviceGroupChartData.map((_entry, index) => (
                     <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip 
                   contentStyle={{ 
                     backgroundColor: '#0f172a', // 👈 Sleek slate-900 background matrix
                     border: '1px solid #334155', // 👈 Slate-700 border framework 
                     borderRadius: '12px', 
                     fontSize: '11px',
                     padding: '8px 12px'
                   }}
                   itemStyle={{ 
                     color: '#f8fafc', // 👈 Crisp white/off-white text utility for data items
                     fontWeight: '600',
                     textTransform: 'uppercase'
                   }}
                   labelStyle={{ 
                     color: '#94a3b8', // 👈 Slate-400 color for item labels
                     fontWeight: '700' 
                   }}
                 />
                 <Legend 
                   verticalAlign="bottom" 
                   height={36}
                   iconType="circle"
                   iconSize={8}
                   wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b' }}
                 />
               </PieChart>
             </ResponsiveContainer>
           )}
         </div>
       </div>

       {/* CARD CONTAINER 2: HORIZONTAL BAR CHART — VOLUME BY CATEGORY */}
       <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4 transition-colors">
         <div>
           <h3 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase">
             Volume by Ticket Category
           </h3>
           <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase mt-0.5">
             Top classification issues requiring infrastructure engineering attention
           </p>
         </div>

         <div className="h-64 w-full">
           {categoryChartData.length === 0 ? (
             <div className="h-full w-full flex items-center justify-center">
               <span className="text-xs font-medium text-slate-400 italic">No active incident categories found</span>
             </div>
           ) : (
             <ResponsiveContainer width="100%" height="100%">
               <BarChart
                 layout="vertical"
                 data={categoryChartData}
                 margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
               >
                 <XAxis type="number" hide />
                 <YAxis 
                   dataKey="name" 
                   type="category" 
                   axisLine={false}
                   tickLine={false}
                   width={110}
                   style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748b', textTransform: 'uppercase' }}
                 />
                 <Tooltip
                   contentStyle={{ 
                     backgroundColor: '#0f172a', 
                     border: '1px solid #334155', 
                     borderRadius: '12px', 
                     fontSize: '11px',
                     padding: '8px 12px'
                   }}
                   itemStyle={{ 
                     color: '#f8fafc', 
                     fontWeight: '600',
                     textTransform: 'uppercase'
                   }}
                   labelStyle={{ 
                     color: '#94a3b8', 
                     fontWeight: '700' 
                   }}
                   cursor={{ fill: 'rgba(241, 245, 249, 0.05)' }} // Subtle light tracking highlights on hover
                 />
                 <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={16}>
                   {categoryChartData.map((_entry, index) => (
                     <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 1) % CHART_COLORS.length]} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           )}
         </div>
       </div>

      </div>
    </div>
  );
};

export default Dashboard;
