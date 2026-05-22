import { useState, useEffect } from 'react';

export function useCountDown(deadline: string | Date | null | undefined, createdAt?: string | Date | null) {
  const [timeString, setTimeString] = useState<string>('00:00:00');
  const [percentRemaining, setPercentRemaining] = useState<number>(100);

  useEffect(() => {
    if (!deadline) {
      setTimeString('N/A');
      setPercentRemaining(100);
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
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const hStr = String(hours).padStart(2, '0');
      const mStr = String(minutes).padStart(2, '0');
      const sStr = String(seconds).padStart(2, '0');

      setTimeString(`${hStr}:${mStr}:${sStr}`);

      if (totalDuration > 0) {
        const pct = Math.max(0, Math.min(100, (diff / totalDuration) * 100));
        setPercentRemaining(pct);
      } else {
        setPercentRemaining(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deadline, createdAt]);

  return { timeString, percentRemaining };
}
