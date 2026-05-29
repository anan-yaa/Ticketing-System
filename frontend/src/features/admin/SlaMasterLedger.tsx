import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { ConfigureSlaModal } from './ConfigureSlaModal';

export const SlaMasterLedger = () => {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: slaRules, isLoading } = useQuery({
    queryKey: ['slaComplianceRules'],
    queryFn: async () => {
      const res = await api.get('/master-config/sla-rules');
      return res.data.map((rule: any) => ({
        ...rule,
        tiers: rule.tiers?.map((tier: any) => ({
          ...tier,
          tierName: tier.name || tier.level,
          scopeDescription: tier.description,
          responseTimeMin: tier.respM,
          resolutionTimeHr: tier.resH
        })) || []
      }));
    }
  });

  const createSlaMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/master-config/sla-rules', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slaComplianceRules'] });
      setIsCreateModalOpen(false);
    }
  });

  return (
    <div className="w-full max-w-[95vw] mx-auto px-6 pb-12 pt-8 min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 transition-all duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">SLA Configuration Rules</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">All types of provisioned ticket type priority</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all"
        >
          + CREATE SLA
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading SLA configurations...</div>
      ) : (
        <div>
          {slaRules?.map((rule: any) => (
            <div key={rule.id} className="w-full bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-6 transition-all">
              <h2 className="text-sm font-bold tracking-wider text-sky-600 dark:text-sky-400 uppercase mb-4">{rule.ticketType} Compliance Tiers</h2>

              <div className="overflow-x-auto">
                <table className="w-full min-w-full table-fixed text-left border-collapse">
                  <colgroup>
                    <col className="w-[12%]" />
                    <col className="w-[48%]" />
                    <col className="w-[20%]" />
                    <col className="w-[20%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      <th className="pb-3">Priority Tier</th>
                      <th className="pb-3">SLA Scope Description</th>
                      <th className="pb-3 text-right">Response Target</th>
                      <th className="pb-3 text-right">Resolution Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {rule.tiers?.map((tier: any) => (
                      <tr key={tier.id} className={tier.isActive ? "" : "opacity-40 bg-slate-50/50 dark:bg-white/5"}>
                        <td className="py-3 font-bold text-slate-900 dark:text-slate-100">{tier.priorityLevel || tier.tierName || tier.name || 'P-'}</td>
                        <td className="py-3 text-slate-500 dark:text-slate-400">{tier.scopeDescription || 'No custom description defined.'}</td>
                        <td className="py-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                          {tier.responseTimeMin !== undefined && tier.responseTimeMin !== null ? tier.responseTimeMin : 0} Mins
                        </td>
                        <td className="py-3 text-right font-mono font-extrabold text-sky-600 dark:text-sky-400">
                          {tier.resolutionTimeHr !== undefined && tier.resolutionTimeHr !== null ? tier.resolutionTimeHr : 0} Hours
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <ConfigureSlaModal
          onClose={() => setIsCreateModalOpen(false)}
          onSave={(payload) => createSlaMutation.mutate(payload)}
        />
      )}
    </div>
  );
};
