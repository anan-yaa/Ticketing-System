import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

interface SlaHealthTelemetryProps {
  ticket: any;
}

export const SlaHealthTelemetry: React.FC<SlaHealthTelemetryProps> = ({ ticket }) => {
  const [ttfrString, setTtfrString] = useState('-- : -- : --');
  const [resolutionString, setResolutionString] = useState('-- : -- : --');
  const [isTtfrBreached, setIsTtfrBreached] = useState(false);
  const [isResolutionBreached, setIsResolutionBreached] = useState(false);

  const { data: dbSlaRules } = useQuery({
    queryKey: ['slaComplianceRules'],
    queryFn: async () => {
      const res = await api.get('/master-config/sla-rules');
      return res.data;
    }
  });

  const calculateRemainingTime = (deadlineEpoch: number) => {
    const now = Date.now();
    const difference = deadlineEpoch - now;
    
    if (difference <= 0) return "BREACHED";
    
    const hrs = Math.floor(difference / (1000 * 60 * 60));
    const mins = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((difference % (1000 * 60)) / 1000);
    
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!ticket.ticketType) {
      setTtfrString('-- : -- : --');
      setResolutionString('-- : -- : --');
      return;
    }

    if (!dbSlaRules) return;

    const ticketRule = dbSlaRules.find((r: any) => r.ticketType === ticket.ticketType);
    if (!ticketRule) {
      setTtfrString('-- : -- : --');
      setResolutionString('-- : -- : --');
      return;
    }

    const priority = ticket.criticality || 'P1'; 
    const resolvedSlaTier = ticketRule.tiers?.find((t: any) => t.level === priority || t.name === priority) || ticketRule.tiers?.[0];

    if (!resolvedSlaTier) {
      setTtfrString('-- : -- : --');
      setResolutionString('-- : -- : --');
      return;
    }

    const createdAtEpoch = new Date(ticket.createdAt).getTime();
    
    const responseMin = resolvedSlaTier.respM || 0;
    const resolutionHr = resolvedSlaTier.resH || 0;

    const responseDeadline = createdAtEpoch + (responseMin * 60 * 1000);
    const resolutionDeadline = createdAtEpoch + (resolutionHr * 60 * 60 * 1000);

    // Run interval
    const interval = setInterval(() => {
      // TTFR logic
      if (ticket.status !== 'OPEN') {
         setTtfrString('✓ SLA MET');
         setIsTtfrBreached(false);
      } else {
         const ttfrVal = calculateRemainingTime(responseDeadline);
         setTtfrString(ttfrVal);
         setIsTtfrBreached(ttfrVal === 'BREACHED');
      }

      // Resolution logic
      if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
         setResolutionString('✓ SLA MET');
         setIsResolutionBreached(false);
      } else {
         const resVal = calculateRemainingTime(resolutionDeadline);
         setResolutionString(resVal);
         setIsResolutionBreached(resVal === 'BREACHED');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ticket, dbSlaRules]);

  let ttfrTextClass = 'text-cyan-600 dark:text-cyan-400';
  let ttfrBadgeClass = 'border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/40';
  let ttfrBadgeText = 'ACTIVE COUNTDOWN';

  if (!ticket.ticketType) {
    ttfrBadgeText = 'PENDING TYPE ASSIGNMENT';
    ttfrTextClass = 'text-slate-500 dark:text-slate-400';
    ttfrBadgeClass = 'border-slate-300 dark:border-slate-500/30 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900';
  } else if (ttfrString === 'BREACHED') {
    ttfrTextClass = 'text-rose-600 dark:text-rose-500 font-bold';
    ttfrBadgeClass = 'text-rose-700 dark:text-rose-500 bg-rose-100 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/40';
    ttfrBadgeText = 'SLA BREACHED';
  } else if (ttfrString === '✓ SLA MET') {
    ttfrTextClass = 'text-emerald-600 dark:text-emerald-400';
    ttfrBadgeClass = 'border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40';
    ttfrBadgeText = 'COMPLIANT ✓';
  }

  let resolutionTextClass = 'text-amber-600 dark:text-amber-400';
  let resolutionBadgeClass = 'border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-955/40';
  let resolutionBadgeText = 'ACTIVE COUNTDOWN';

  if (!ticket.ticketType) {
    resolutionBadgeText = 'PENDING TYPE ASSIGNMENT';
    resolutionTextClass = 'text-slate-500 dark:text-slate-400';
    resolutionBadgeClass = 'border-slate-300 dark:border-slate-500/30 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900';
  } else if (resolutionString === 'BREACHED') {
    resolutionTextClass = 'text-rose-600 dark:text-rose-500 font-bold';
    resolutionBadgeClass = 'text-rose-700 dark:text-rose-500 bg-rose-100 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/40';
    resolutionBadgeText = 'RESOLUTION BREACHED';
  } else if (resolutionString === '✓ SLA MET') {
    resolutionTextClass = 'text-emerald-600 dark:text-emerald-400';
    resolutionBadgeClass = 'border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40';
    resolutionBadgeText = 'RESOLVED COMPLIANT ✓';
  }

  let healthText = 'HEALTHY';
  let healthStyle = 'border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10';

  if (isTtfrBreached || isResolutionBreached) {
    healthText = 'CRITICAL RISK';
    healthStyle = 'border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-500 bg-rose-100 dark:bg-rose-500/10 animate-pulse font-bold shadow-[0_0_15px_rgba(244,63,94,0.15)] dark:shadow-[0_0_15px_rgba(244,63,94,0.25)]';
  } else if (!ticket.ticketType) {
    healthText = 'PENDING INFO';
    healthStyle = 'border-slate-300 dark:border-slate-500/30 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900';
  }

  return (
    <div className="mt-6 border-t border-slate-200 dark:border-white/5 pt-6 space-y-4">
      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono uppercase tracking-widest block font-bold">
        SLA & Health Telemetry
      </span>

      <div className="grid grid-cols-1 gap-3">
        {/* BLOCK 1: Time to First Response */}
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl p-4 flex flex-col justify-between space-y-2">
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
              {ttfrString}
            </span>
          </div>
        </div>

        {/* BLOCK 2: Resolution Time */}
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl p-4 flex flex-col justify-between space-y-2">
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
              {resolutionString}
            </span>
          </div>
        </div>

        {/* BLOCK 3: Ticket Health Score Indicator */}
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl p-4 flex justify-between items-center">
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
