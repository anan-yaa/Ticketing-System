import { useState, useEffect } from 'react';

export function useCountDown(
  deadline: string | Date | null | undefined, 
  createdAt?: string | Date | null,
  status?: string,
  subStatus?: string
) {
  const [timeString, setTimeString] = useState<string>('00:00:00');
  const [percentRemaining, setPercentRemaining] = useState<number>(100);
  const [colorClass, setColorClass] = useState<string>('text-cyan-400');

  useEffect(() => {
    const COMPLETED_STATES = ['UNDER_OBSERVATION', 'CLOSED'];
    const PAUSED_STATES = ['WAITING_FOR_APPROVAL', 'WAITING_FOR_VENDOR', 'WAITING_FOR_CUSTOMER', 'ON_HOLD'];
    
    // Evaluate combined state
    const activeState = COMPLETED_STATES.includes(subStatus || '') || COMPLETED_STATES.includes(status || '')
      ? 'COMPLETED'
      : PAUSED_STATES.includes(subStatus || '')
      ? 'PAUSED'
      : 'RUNNING';

    if (activeState === 'COMPLETED') {
      setTimeString('✓ SLA MET');
      setPercentRemaining(100);
      setColorClass('text-emerald-500');
      return;
    }

    if (!deadline) {
      setTimeString('N/A');
      setPercentRemaining(100);
      setColorClass('text-slate-500');
      return;
    }

    const target = new Date(deadline).getTime();
    const created = createdAt ? new Date(createdAt).getTime() : target - 24 * 60 * 60 * 1000;
    const totalDuration = target - created;

    const updateTimer = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeString('BREACHED');
        setPercentRemaining(0);
        setColorClass('text-rose-500');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const hStr = String(hours).padStart(2, '0');
      const mStr = String(minutes).padStart(2, '0');
      const sStr = String(seconds).padStart(2, '0');

      setTimeString(`${hStr}:${mStr}:${sStr}`);
      setColorClass(activeState === 'PAUSED' ? 'text-amber-500' : 'text-cyan-400');

      if (totalDuration > 0) {
        const pct = Math.max(0, Math.min(100, (diff / totalDuration) * 100));
        setPercentRemaining(pct);
      } else {
        setPercentRemaining(0);
      }
    };

    updateTimer();

    if (activeState === 'PAUSED') {
      // Clear interval by not starting one, timer is frozen.
      return;
    }

    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline, createdAt, status, subStatus]);

  return { timeString, percentRemaining, colorClass };
}
