import React, { useState } from 'react';

interface ConfigureSlaModalProps {
  onClose: () => void;
  onSave: (payload: any) => void;
}

export const ConfigureSlaModal: React.FC<ConfigureSlaModalProps> = ({ onClose, onSave }) => {
  const [matrixServiceGroup, setMatrixServiceGroup] = useState('RIMS');
  const [matrixTicketType, setMatrixTicketType] = useState('Incident');
  const [matrixTiers, setMatrixTiers] = useState([
    { level: 'P1', name: 'CRITICAL THREAT', description: '', responseHours: 0, responseMins: 15, resolutionHours: 4, resolutionMins: 0 },
    { level: 'P2', name: 'HIGH EFFICIENCY', description: '', responseHours: 0, responseMins: 30, resolutionHours: 8, resolutionMins: 0 },
    { level: 'P3', name: 'MEDIUM LEVEL', description: '', responseHours: 4, responseMins: 0, resolutionHours: 24, resolutionMins: 0 },
    { level: 'P4', name: 'LOW PRIORITY', description: '', responseHours: 24, responseMins: 0, resolutionHours: 168, resolutionMins: 0 }
  ]);

  const updateMatrixTier = (index: number, field: string, value: string | number) => {
    const newTiers = [...matrixTiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setMatrixTiers(newTiers);
  };

  const addMatrixTier = () => {
    setMatrixTiers([...matrixTiers, {
      level: `P${matrixTiers.length + 1}`,
      name: 'NEW TIER',
      description: '',
      responseHours: 0,
      responseMins: 0,
      resolutionHours: 0,
      resolutionMins: 0
    }]);
  };

  const removeMatrixTier = (index: number) => {
    if (matrixTiers.length <= 1) return;
    const newTiers = [...matrixTiers];
    newTiers.splice(index, 1);
    const reindexedTiers = newTiers.map((tier, idx) => ({ ...tier, level: `P${idx + 1}` }));
    setMatrixTiers(reindexedTiers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative theme-card-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-300 dark:border-white/10 flex flex-col bg-white dark:bg-slate-900">
        
        <div className="p-6 border-b border-slate-200 dark:border-white/5 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur z-10 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold theme-heading-text uppercase tracking-widest">CONFIGURE SLA COMPLIANCE RULE</h3>
            <p className="text-xs theme-body-subtext font-mono mt-1">Map a Service Group and Ticket Type to custom Priority Tiers</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="p-6 space-y-8 flex-1">
          <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/5">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 font-bold">Target Service Group</label>
              <select 
                value={matrixServiceGroup}
                onChange={(e) => setMatrixServiceGroup(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-indigo-500 theme-heading-text outline-none font-mono text-xs uppercase"
              >
                <option value="RIMS">RIMS - Remote Infrastructure</option>
                <option value="Network">NETWORK - Infrastructure</option>
                <option value="Cloud">CLOUD - Enterprise Architecture</option>
                <option value="WPE">WPE - Workplace Endpoints</option>
                <option value="MSS">MSS - Managed Security Services</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 font-bold">Target Ticket Type</label>
              <select 
                value={matrixTicketType}
                onChange={(e) => setMatrixTicketType(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-indigo-500 theme-heading-text outline-none font-mono text-xs uppercase"
              >
                <option value="Incident">Incident</option>
                <option value="Service Req">Service Request</option>
                <option value="Proactive Notifications">Proactive Notifications</option>
                <option value="Reports">Reports</option>
                <option value="Information">Information</option>
                <option value="Notification">Notification</option>
                <option value="Junk">Junk</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold theme-heading-text uppercase tracking-widest border-b border-slate-200 dark:border-white/5 pb-2 mb-4">DYNAMIC COMPLIANCE TIERS</h4>
            
            {matrixTiers.map((tier, index) => {
              const colorsList = ['rose', 'orange', 'amber', 'emerald', 'cyan', 'indigo', 'purple'];
              const colors = colorsList[index % colorsList.length];

              return (
                <div key={index} className={`relative flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-${colors}-500/20 bg-${colors}-500/5 group`}>
                  {matrixTiers.length > 1 && (
                    <button 
                      onClick={() => removeMatrixTier(index)} 
                      className="absolute right-3 top-3 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove Tier"
                    >
                      🗑️
                    </button>
                  )}
                  <div className="w-full md:w-1/3 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-full bg-${colors}-500/20 text-${colors}-500 flex items-center justify-center font-bold font-mono text-xs border border-${colors}-500/30 shadow-[0_0_10px_rgba(var(--${colors}-500),0.1)]`}>{tier.level}</span>
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => updateMatrixTier(index, 'name', e.target.value)}
                        placeholder="Tier Name"
                        className={`flex-1 bg-transparent border-b border-${colors}-500/30 focus:border-${colors}-500 text-[10px] font-bold uppercase tracking-widest text-${colors}-500 outline-none`}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder={`${tier.level} Scope Description`}
                      value={tier.description}
                      onChange={(e) => updateMatrixTier(index, 'description', e.target.value)}
                      className={`w-full px-3 py-2 bg-white/50 dark:bg-black/20 border border-${colors}-500/20 rounded-lg outline-none font-mono text-xs theme-heading-text focus:border-${colors}-400 mt-1`}
                    />
                  </div>
                  
                  <div className="w-full md:w-2/3 grid grid-cols-2 gap-4 mt-2 md:mt-0">
                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold block">Response Target</label>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5 text-center">Hrs</span>
                          <input type="number" min="0" value={tier.responseHours} onChange={(e) => updateMatrixTier(index, 'responseHours', parseInt(e.target.value) || 0)} className={`w-14 px-2 py-1.5 bg-white/80 dark:bg-black/40 border border-${colors}-500/30 rounded focus:border-${colors}-400 outline-none font-mono text-xs text-center theme-heading-text`} />
                        </div>
                        <span className="text-slate-400 font-bold mt-3">:</span>
                        <div className="flex flex-col">
                          <span className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5 text-center">Mins</span>
                          <input type="number" min="0" max="59" value={tier.responseMins} onChange={(e) => updateMatrixTier(index, 'responseMins', parseInt(e.target.value) || 0)} className={`w-14 px-2 py-1.5 bg-white/80 dark:bg-black/40 border border-${colors}-500/30 rounded focus:border-${colors}-400 outline-none font-mono text-xs text-center theme-heading-text`} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold block">Resolution Target</label>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5 text-center">Hrs</span>
                          <input type="number" min="0" value={tier.resolutionHours} onChange={(e) => updateMatrixTier(index, 'resolutionHours', parseInt(e.target.value) || 0)} className={`w-14 px-2 py-1.5 bg-white/80 dark:bg-black/40 border border-${colors}-500/30 rounded focus:border-${colors}-400 outline-none font-mono text-xs text-center theme-heading-text`} />
                        </div>
                        <span className="text-slate-400 font-bold mt-3">:</span>
                        <div className="flex flex-col">
                          <span className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5 text-center">Mins</span>
                          <input type="number" min="0" max="59" value={tier.resolutionMins} onChange={(e) => updateMatrixTier(index, 'resolutionMins', parseInt(e.target.value) || 0)} className={`w-14 px-2 py-1.5 bg-white/80 dark:bg-black/40 border border-${colors}-500/30 rounded focus:border-${colors}-400 outline-none font-mono text-xs text-center theme-heading-text`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <button 
              onClick={addMatrixTier}
              className="w-full py-3 mt-4 border border-dashed border-indigo-500/50 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-500 hover:text-indigo-400 font-mono text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all"
            >
              ➕ ADD NEW SLA RULE
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 sticky bottom-0 z-10 flex justify-end gap-4 rounded-b-2xl">
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold uppercase rounded-xl transition-all tracking-widest">
            CANCEL
          </button>
          <button 
            onClick={() => onSave({ serviceGroup: matrixServiceGroup, ticketType: matrixTicketType, tiers: matrixTiers })} 
            className="px-6 py-2.5 bg-indigo-600/20 border border-indigo-500/50 hover:bg-indigo-500 text-indigo-400 hover:text-white font-mono text-xs font-bold uppercase rounded-xl transition-all tracking-widest shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]"
          >
            SAVE COMPLIANCE RULE
          </button>
        </div>
      </div>
    </div>
  );
};
