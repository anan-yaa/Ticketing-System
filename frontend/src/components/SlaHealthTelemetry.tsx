import React from 'react';
import { useCountDown } from '../hooks/useCountDown';

interface SlaHealthTelemetryProps {
  ticket: any;
}

export const SlaHealthTelemetry: React.FC<SlaHealthTelemetryProps> = ({ ticket }) => {
  const { timeString: ttfrCount } = useCountDown(
    ticket.ttfrDeadline,
    ticket.createdAt
  );

  const { timeString: resolutionCount, percentRemaining: resolutionPercent } = useCountDown(
    ticket.resolutionDeadline,
    ticket.createdAt
  );

  // Time to First Response (TTFR) compliance state checking
  const isPendingResponse = ticket.status === 'OPEN';
  const isTtfrBreached = ticket.isTtfrBreached || (ticket.firstRespondedAt && new Date(ticket.firstRespondedAt) > new Date(ticket.ttfrDeadline));

  let ttfrDisplayString = '';
  let ttfrTextClass = 'text-cyan-400';
  let ttfrBadgeClass = 'border-cyan-500/30 text-cyan-400 bg-cyan-950/40';
  let ttfrBadgeText = 'ACTIVE COUNTDOWN';

  if (isPendingResponse) {
    if (ttfrCount === 'BREACHED') {
      ttfrDisplayString = 'BREACHED';
      ttfrTextClass = 'text-rose-500 animate-pulse font-bold';
      ttfrBadgeClass = 'border-rose-500/40 text-rose-500 bg-rose-950/40';
      ttfrBadgeText = 'SLA BREACHED';
    } else {
      ttfrDisplayString = ttfrCount;
    }
  } else {
    // Acknowledged / In Progress / Closed
    if (isTtfrBreached) {
      ttfrDisplayString = 'BREACHED';
      ttfrTextClass = 'text-rose-500 font-bold';
      ttfrBadgeClass = 'border-rose-500/40 text-rose-500 bg-rose-950/40';
      ttfrBadgeText = 'RESPONSE BREACHED';
    } else {
      const responseTime = ticket.firstRespondedAt || ticket.respondedAt;
      ttfrDisplayString = responseTime 
        ? new Date(responseTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'COMPLIANT ✓';
      ttfrTextClass = 'text-emerald-400';
      ttfrBadgeClass = 'border-emerald-500/30 text-emerald-400 bg-emerald-950/40';
      ttfrBadgeText = 'COMPLIANT ✓';
    }
  }

  // Resolution compliance state checking
  const isClosed = ticket.status === 'CLOSED';
  const isResolutionBreached = ticket.isResolutionBreached || (ticket.closedAt && new Date(ticket.closedAt) > new Date(ticket.resolutionDeadline));

  let resolutionDisplayString = '';
  let resolutionTextClass = 'text-amber-400';
  let resolutionBadgeClass = 'border-amber-500/30 text-amber-400 bg-amber-955/40';
  let resolutionBadgeText = 'ACTIVE COUNTDOWN';

  if (isClosed) {
    if (isResolutionBreached) {
      resolutionDisplayString = 'BREACHED';
      resolutionTextClass = 'text-rose-500 font-bold';
      resolutionBadgeClass = 'border-rose-500/40 text-rose-500 bg-rose-950/40';
      resolutionBadgeText = 'RESOLUTION BREACHED';
    } else {
      resolutionDisplayString = ticket.closedAt
        ? new Date(ticket.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'COMPLIANT ✓';
      resolutionTextClass = 'text-emerald-400';
      resolutionBadgeClass = 'border-emerald-500/30 text-emerald-400 bg-emerald-950/40';
      resolutionBadgeText = 'RESOLVED COMPLIANT ✓';
    }
  } else {
    // Open or In Progress
    if (resolutionCount === 'BREACHED') {
      resolutionDisplayString = 'BREACHED';
      resolutionTextClass = 'text-rose-500 animate-pulse font-bold';
      resolutionBadgeClass = 'border-rose-500/40 text-rose-500 bg-rose-950/40';
      resolutionBadgeText = 'SLA BREACHED';
    } else {
      resolutionDisplayString = resolutionCount;
    }
  }

  // Ticket Health Score logic:
  // - "HEALTHY" if > 50% remaining and no breach
  // - "WARNING" if between 15% and 50% remaining and no breach
  // - "CRITICAL RISK" if < 15% remaining or either response or resolution target is breached.
  let healthText = 'HEALTHY';
  let healthStyle = 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10';

  const isAnyBreached = isTtfrBreached || isResolutionBreached || (isPendingResponse && ttfrCount === 'BREACHED') || resolutionCount === 'BREACHED';

  if (isAnyBreached || resolutionPercent < 15) {
    healthText = 'CRITICAL RISK';
    healthStyle = 'border-rose-500/40 text-rose-500 bg-rose-500/10 animate-pulse font-bold shadow-[0_0_15px_rgba(244,63,94,0.25)]';
  } else if (resolutionPercent >= 15 && resolutionPercent <= 50) {
    healthText = 'WARNING';
    healthStyle = 'border-amber-500/30 text-amber-400 bg-amber-500/10';
  }

  return (
    <div className="mt-6 border-t border-white/5 pt-6 space-y-4">
      <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest block font-bold">
        SLA & Health Telemetry
      </span>

      <div className="grid grid-cols-1 gap-3">
        {/* BLOCK 1: Time to First Response */}
        <div className="bg-slate-950 border border-white/5 rounded-xl p-4 flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">
              Time To First Response (TTFR)
            </span>
            <span className={`text-[9px] font-mono font-bold tracking-wider uppercase border px-2 py-0.5 rounded-lg ${ttfrBadgeClass}`}>
              {ttfrBadgeText}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className={`text-lg font-bold font-mono tracking-wider ${ttfrTextClass}`}>
              {ttfrDisplayString}
            </span>
            {!isPendingResponse && !isTtfrBreached && (
              <span className="text-[10px] text-slate-500 font-mono">
                Responded Compliant
              </span>
            )}
          </div>
        </div>

        {/* BLOCK 2: Resolution Time */}
        <div className="bg-slate-950 border border-white/5 rounded-xl p-4 flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">
              Resolution Time Target
            </span>
            <span className={`text-[9px] font-mono font-bold tracking-wider uppercase border px-2 py-0.5 rounded-lg ${resolutionBadgeClass}`}>
              {resolutionBadgeText}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className={`text-lg font-bold font-mono tracking-wider ${resolutionTextClass}`}>
              {resolutionDisplayString}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {isClosed ? 'Closed State Frozen' : `${Math.round(resolutionPercent)}% time remaining`}
            </span>
          </div>
        </div>

        {/* BLOCK 3: Ticket Health Score Indicator */}
        <div className="bg-slate-950 border border-white/5 rounded-xl p-4 flex justify-between items-center">
          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">
            Ticket Health Status
          </span>
          <span className={`px-3 py-1 rounded-xl border text-[9px] font-mono tracking-widest uppercase ${healthStyle}`}>
            {healthText}
          </span>
        </div>
      </div>
    </div>
  );
};
