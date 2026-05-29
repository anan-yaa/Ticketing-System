import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';

interface ConfigureSlaModalProps {
  onClose: () => void;
  onSave: (payload: any) => void;
}

export const ConfigureSlaModal: React.FC<ConfigureSlaModalProps> = ({ onClose, onSave }) => {
  const [matrixTicketType, setMatrixTicketType] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { data: ticketTypes, isLoading: isLoadingTypes } = useQuery({
    queryKey: ['masterTicketTypesList'],
    queryFn: async () => {
      const res = await api.get('/master-config/types');
      return res.data;
    }
  });


  const [customTiers, setCustomTiers] = useState<Array<{
    tierName: string;
    scopeDescription: string;
    responseTimeMin: number;
    resolutionTimeHr: number;
    isActive: boolean;
  }>>([{ tierName: 'P1', scopeDescription: '', responseTimeMin: 0, resolutionTimeHr: 0, isActive: true }]);



  const handleAddPriorityRow = () => {
    const nextIndex = customTiers.length + 1;
    setCustomTiers([...customTiers, {
      tierName: `P${nextIndex}`,
      scopeDescription: '',
      responseTimeMin: 0,
      resolutionTimeHr: 0,
      isActive: true
    }]);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative theme-card-panel w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-300 dark:border-white/10 flex flex-col bg-white dark:bg-slate-900">

        <div className="p-6 border-b border-slate-200 dark:border-white/5 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-t-2xl z-10 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold theme-heading-text uppercase tracking-widest">CONFIGURE SLA RULES</h3>
            <p className="text-xs theme-body-subtext font-mono mt-1">Map a Ticket Type to custom Priority Tiers</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        {toast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50">
            <div className={`px-4 py-2 rounded-xl shadow-lg border font-mono text-[10px] tracking-widest uppercase ${toast.type === 'error' ? 'bg-rose-500/90 text-white border-rose-500' : 'bg-emerald-500/90 text-white border-emerald-500'}`}>
              {toast.message}
            </div>
          </div>
        )}

        <div className="p-6 space-y-8 flex-1 max-h-[60vh] overflow-y-auto pr-2">
          <div className="p-5 rounded-xl border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/40 mb-6">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 font-bold">Target Ticket Type <span className="text-rose-500">*</span></label>
              <select
                value={matrixTicketType}
                onChange={(e) => setMatrixTicketType(e.target.value)}
                disabled={isLoadingTypes}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-semibold uppercase"
              >
                <option value="" className="text-slate-400">
                  {isLoadingTypes ? 'Loading types from database...' : '-- CHOOSE A TYPE --'}
                </option>
                {ticketTypes && ticketTypes
                  ?.filter((type: any) => type.isActive)
                  ?.sort((a: any, b: any) => a.name.localeCompare(b.name))
                  ?.map((type: any) => (
                    <option key={type.id} value={type.name}>
                      {type.name.toUpperCase()}
                    </option>
                  ))
                }
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold theme-heading-text uppercase tracking-widest border-b border-slate-200 dark:border-white/5 pb-2 mb-4">PRIORITY TIERS</h4>

            {customTiers.length === 0 && (
              <div className="text-center py-6 text-slate-500 font-mono text-xs">No priority tiers defined yet.</div>
            )}
            {customTiers.map((tier, index) => {
              const colorsList = ['rose', 'orange', 'amber', 'emerald', 'cyan', 'indigo', 'purple'];
              const colors = colorsList[index % colorsList.length];

              const wrapperClass = `relative flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full p-5 rounded-xl border transition-all duration-200 mb-4 group ${tier.isActive
                ? (index === 0 ? 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-200 dark:border-rose-500/40' : index === 1 ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-500/40' : `bg-${colors}-500/5 border-${colors}-500/20`)
                : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-50 contrast-75 grayscale'
                }`;

              return (
                <div key={index} className={wrapperClass}>

                  <div className="w-full xl:w-5/12 flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Priority Name *</label>
                      <input
                        type="text"
                        placeholder="e.g., CRITICAL, HIGH, STANDARD"
                        value={tier.tierName || ""}
                        onChange={(e) => {
                          const updatedTiers = [...customTiers];
                          updatedTiers[index].tierName = e.target.value;
                          setCustomTiers(updatedTiers);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-xl p-2.5 text-sm font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">SLA Scope Description</label>
                      <input
                        type="text"
                        placeholder="Describe operational boundary details..."
                        value={tier.scopeDescription || ""}
                        onChange={(e) => {
                          const updatedTiers = [...customTiers];
                          updatedTiers[index].scopeDescription = e.target.value;
                          setCustomTiers(updatedTiers);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-xl p-2.5 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="w-full xl:w-7/12 flex items-end gap-4 mt-2 xl:mt-0">
                    <div className="flex-1 space-y-2">
                      <label className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold block">Response Target</label>
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">Mins</span>
                        <input
                          type="number"
                          min="0"
                          value={tier.responseTimeMin || 0}
                          disabled={!tier.isActive}
                          onChange={(e) => {
                            const updatedTiers = [...customTiers];
                            updatedTiers[index].responseTimeMin = Number(e.target.value);
                            setCustomTiers(updatedTiers);
                          }}
                          className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-lg p-2 text-sm text-center outline-none disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="flex-1 space-y-2">
                      <label className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold block">Resolution Target</label>
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">Hrs</span>
                        <input
                          type="number"
                          min="0"
                          value={tier.resolutionTimeHr || 0}
                          disabled={!tier.isActive}
                          onChange={(e) => {
                            const updatedTiers = [...customTiers];
                            updatedTiers[index].resolutionTimeHr = Number(e.target.value);
                            setCustomTiers(updatedTiers);
                          }}
                          className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-lg p-2 text-sm text-center outline-none disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end mb-1">



                    </div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={handleAddPriorityRow}
              className="w-full py-3 mt-4 border border-dashed border-indigo-500/50 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-500 hover:text-indigo-400 font-mono text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all"
            >
              ➕ ADD PRIORITY
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 flex justify-end gap-4 rounded-b-2xl">
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold uppercase rounded-xl transition-all tracking-widest">
            CANCEL
          </button>
          <button
            onClick={() => {
              const hasEmptyName = customTiers.some(t => !t.tierName || !t.tierName.trim());
              if (hasEmptyName) {
                setToast({ message: "All configuration tiers require an explicit Priority Name.", type: 'error' });
                setTimeout(() => setToast(null), 5000);
                return;
              }
              if (!matrixTicketType) {
                setToast({ message: "Ticket Type selection is mandatory to map custom Priority Tiers.", type: 'error' });
                setTimeout(() => setToast(null), 5000);
                return;
              }
              onSave({ ticketType: matrixTicketType, tiers: customTiers });
            }}
            className="px-6 py-2.5 bg-indigo-600/20 border border-indigo-500/50 hover:bg-indigo-500 text-indigo-400 hover:text-white font-mono text-xs font-bold uppercase rounded-xl transition-all tracking-widest shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]"
          >
            SAVE COMPLIANCE RULE
          </button>
        </div>
      </div>
    </div>
  );
};
