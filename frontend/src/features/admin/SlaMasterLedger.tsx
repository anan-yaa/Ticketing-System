import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfigureSlaModal } from './ConfigureSlaModal';

export const SlaMasterLedger: React.FC = () => {
  const navigate = useNavigate();
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [isSlaModalOpen, setIsSlaModalOpen] = useState(false);

  // Hardcoded matrix node blocks for display
  const MATRIX_BLOCKS = [
    {
      id: 'cloud_incident',
      label: '☁️ CLOUD - INCIDENT COMPLIANCE MATRIX',
      group: 'CLOUD',
      tiers: [
        { level: 'P1', desc: 'Critical Outage / Server Down', resp: '15 Mins', res: '2 Hours' },
        { level: 'P2', desc: 'High Impact / Degradation', resp: '30 Mins', res: '4 Hours' },
        { level: 'P3', desc: 'Normal Priority Request', resp: '2 Hours', res: '24 Hours' },
        { level: 'P4', desc: 'Low Priority Inquiry', resp: '24 Hours', res: '168 Hours' },
        { level: 'P5', desc: 'Cosmetic UI Adjustments', resp: '72 Hours', res: '14 Days' },
      ]
    },
    {
      id: 'network_incident',
      label: '🌐 NETWORK - INCIDENT COMPLIANCE MATRIX',
      group: 'NETWORK',
      tiers: [
        { level: 'P1', desc: 'Total Routing Failure', resp: '10 Mins', res: '1 Hour 30 Mins' },
        { level: 'P2', desc: 'Subnet Unreachable', resp: '20 Mins', res: '3 Hours' },
        { level: 'P3', desc: 'Intermittent Latency', resp: '1 Hour', res: '12 Hours' },
        { level: 'P4', desc: 'Port Activation', resp: '12 Hours', res: '72 Hours' },
      ]
    },
    {
      id: 'rims_maintenance',
      label: '⚙️ RIMS - MAINTENANCE COMPLIANCE MATRIX',
      group: 'RIMS',
      tiers: [
        { level: 'P1', desc: 'Emergency Patching', resp: '1 Hour', res: '8 Hours' },
        { level: 'P2', desc: 'Zero-day Mitigation', resp: '2 Hours', res: '24 Hours' },
        { level: 'P3', desc: 'Routine Backup Check', resp: '8 Hours', res: '48 Hours' },
        { level: 'P4', desc: 'Scheduled Audits', resp: '48 Hours', res: '336 Hours' },
      ]
    }
  ];

  const filteredBlocks = filterGroup === 'ALL' ? MATRIX_BLOCKS : MATRIX_BLOCKS.filter(b => b.group === filterGroup);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 p-6 lg:p-10 transition-colors duration-300">
      
      {/* Page View Header Layout */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/settings')}
              className="group p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 shadow-sm flex items-center justify-center"
              title="Return to Master Data Configuration"
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
              SLA Compliance Engine
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
            <option value="CLOUD">CLOUD</option>
            <option value="NETWORK">NETWORK</option>
            <option value="RIMS">RIMS</option>
          </select>
          <button
            onClick={() => setIsSlaModalOpen(true)}
            className="px-6 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 hover:border-indigo-500 text-indigo-500 dark:text-indigo-400 font-mono text-xs font-bold uppercase rounded-xl transition-all shadow-sm tracking-widest flex-shrink-0"
          >
            ➕ ADD NEW SLA RULE
          </button>
        </div>
      </div>

      {/* Infinite Scroll Container Wrapper */}
      <div className="w-full overflow-y-auto max-h-[85vh] space-y-6 pr-2 custom-scrollbar">
        {filteredBlocks.map((block) => (
          <div key={block.id} className="theme-card-panel bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 flex items-center justify-between">
              <h2 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                {block.label}
              </h2>
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest px-3 py-1 bg-slate-200/50 dark:bg-white/5 rounded-full">
                {block.tiers.length} Tiers Active
              </span>
            </div>

            {/* Render Detailed High-Contrast Tables */}
            <div className="p-0 overflow-x-auto">
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
                  {block.tiers.map((tier, idx) => {
                    const colorsList = ['rose', 'orange', 'amber', 'emerald', 'cyan', 'indigo', 'purple'];
                    const colors = colorsList[idx % colorsList.length];
                    
                    return (
                      <tr key={tier.level} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <span className={`inline-flex w-8 h-8 rounded-full bg-${colors}-500/10 text-${colors}-600 dark:text-${colors}-400 items-center justify-center font-bold font-mono text-xs border border-${colors}-500/20 shadow-sm`}>
                            {tier.level}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold theme-heading-text tracking-wide">{tier.desc}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">{tier.resp}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">{tier.res}</span>
                        </td>
                      </tr>
                    );
                  })}
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
            setIsSlaModalOpen(false);
            console.log('SLA Rule payload to submit:', payload);
            // Optionally, add a toast or query invalidation here
          }}
        />
      )}
    </div>
  );
};
