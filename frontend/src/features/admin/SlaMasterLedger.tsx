import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { ConfigureSlaModal } from './ConfigureSlaModal';

export const SlaMasterLedger: React.FC = () => {
  const navigate = useNavigate();
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [isSlaModalOpen, setIsSlaModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: dbSlaRules = [] } = useQuery({
    queryKey: ['slaComplianceRules'],
    queryFn: async () => {
      const res = await api.get('/master-config/sla-rules');
      return res.data;
    }
  });

  const createSlaMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/master-config/sla-rules', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slaComplianceRules'] });
      setIsSlaModalOpen(false);
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/master-config/sla-rules/${id}/toggle-status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slaComplianceRules'] });
    }
  });

  const slaRules = dbSlaRules.map((rule: any) => ({
    id: rule.id,
    label: `${rule.serviceGroup} - ${rule.ticketType}`,
    serviceGroup: rule.serviceGroup,
    ticketType: rule.ticketType,
    isActive: rule.isActive ?? true,
    tiers: rule.tiers || []
  }));

  const filteredRules = filterGroup === 'ALL' ? slaRules : slaRules.filter((b: any) => b.serviceGroup === filterGroup);

  const sortedRules = [...filteredRules].sort((a, b) => {
    // Step 1: Compare Service Group Names (e.g., CLOUD vs NETWORK)
    const groupCompare = a.serviceGroup.localeCompare(b.serviceGroup);
    if (groupCompare !== 0) return groupCompare;

    // Step 2: If the group matches, sort by Ticket Type (e.g., INCIDENT vs SERVICE REQUEST)
    return a.ticketType.localeCompare(b.ticketType);
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 p-6 lg:p-10 transition-colors duration-300">

      {/* Page View Header Layout */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsSlaModalOpen(false);
                navigate("/settings");
              }}
              className="group p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 shadow-sm flex items-center justify-center"
              title="Return to Master Configuration"
            >
              <svg
                className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              SLA Configuration
            </h1>
          </div>
          <p className="text-xs theme-body-subtext font-mono mt-2">Comprehensive view of all provisioned SLA combinations across the organization.</p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-indigo-500 theme-heading-text outline-none font-mono text-xs uppercase shadow-sm"
          >
            <option value="ALL">ALL SERVICE GROUPS</option>
            <option value="RIMS">RIMS</option>
            <option value="MI">MI</option>
            <option value="DATA CENTER">DATA CENTER</option>
            <option value="DS">DS</option>
            <option value="TSS">TSS</option>
            <option value="DATABASE">DATABASE</option>
            <option value="CLOUD">CLOUD</option>
          </select>
          <button
            onClick={() => setIsSlaModalOpen(true)}
            className="px-6 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 hover:border-indigo-500 text-indigo-500 dark:text-indigo-400 font-mono text-xs font-bold uppercase rounded-xl transition-all shadow-sm tracking-widest flex-shrink-0"
          >
            ➕ ADD NEW SLA RULE
          </button>
        </div>
      </div>

      {/* Infinite Scroll Container Wrapper Removed for Native Viewport Scroll */}
      <div className="w-full space-y-6">
        {sortedRules.map((block) => (
          <div key={block.id} className="theme-card-panel bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 flex items-center justify-between">
              <h2 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                {block.label}
              </h2>
              <div className="flex items-center gap-4">
                {/* Active / Inactive Status pill tag */}
                <span className={`text-[10px] px-3 py-1 rounded-full border font-mono font-bold tracking-widest transition-all ${
                  block.isActive 
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40' 
                    : 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                }`}>
                  {block.isActive ? `${block.tiers.length} TIERS ACTIVE` : 'DISABLED'}
                </span>

                {/* Interactive Disable Toggle Switch */}
                <button
                  onClick={() => toggleStatusMutation.mutate(block.id)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    block.isActive ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    block.isActive ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* Render Detailed High-Contrast Tables */}
            <div className={`p-0 overflow-x-auto transition-all duration-300 ${!block.isActive ? 'opacity-40 select-none pointer-events-none saturate-50' : ''}`}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-black/40 border-b border-slate-200 dark:border-white/5">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24">PRIORITY TIER</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">SLA SCOPE DESCRIPTION</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right w-40">RESPONSE TARGET</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right w-40">RESOLUTION TARGET</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {block.tiers
                    ?.sort((a: any, b: any) => a.level.localeCompare(b.level))
                    ?.map((tier: any) => (
                      <tr key={tier.id} className="border-b border-slate-900 text-sm hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-6 font-bold font-mono">
                          <span className="inline-flex w-8 h-8 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 items-center justify-center font-bold font-mono text-xs border border-slate-500/20 shadow-sm">
                            {tier.level}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-slate-700 dark:text-slate-300 font-bold theme-heading-text">{tier.description || tier.name}</td>
                        <td className="py-3 px-6 text-right text-emerald-600 dark:text-emerald-400 font-mono text-xs">{tier.respM + (tier.respH || 0) * 60} Mins</td>
                        <td className="py-3 px-6 text-right text-cyan-600 dark:text-cyan-400 font-mono text-xs">{tier.resH + (tier.resM ? tier.resM / 60 : 0)} Hours</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {isSlaModalOpen && (
        <ConfigureSlaModal
          onClose={() => setIsSlaModalOpen(false)}
          onSave={(payload) => {
            createSlaMutation.mutate(payload);
          }}
        />
      )}
    </div>
  );
};
