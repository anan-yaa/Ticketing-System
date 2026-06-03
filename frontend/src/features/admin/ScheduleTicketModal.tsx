import React, { useState } from 'react';
import api from '../../api/axios';
import { useQueryClient } from '@tanstack/react-query';

interface ScheduleTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  onSuccess: (updatedTicket: any) => void;
}

export const ScheduleTicketModal: React.FC<ScheduleTicketModalProps> = ({ isOpen, onClose, ticketId, onSuccess }) => {
  const [selectedDateTime, setSelectedDateTime] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateTime) return;
    
    setIsSubmitting(true);
    try {
      const res = await api.patch(`/tickets/${ticketId}/core-data`, {
        subStatus: 'ON_HOLD',
        scheduledAt: new Date(selectedDateTime).toISOString(),
        schedulingReason: noteText,
      });
      
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      onSuccess(res.data);
      onClose();
    } catch (error) {
      console.error('Failed to schedule ticket:', error);
      // Let the parent handle toast if needed, or we can just log
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-md p-4 transition-all duration-300 ease-out">
      <div className="relative w-full max-w-sm transform overflow-hidden rounded-2xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl transition-colors duration-200 flex flex-col gap-4 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-widest uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
            Schedule Ticket
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black tracking-wider text-slate-700 dark:text-slate-400 uppercase">Execution Timestamp</label>
            <input
              required
              type="datetime-local"
              value={selectedDateTime}
              onChange={(e) => setSelectedDateTime(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-2.5 text-xs font-bold focus:outline-none placeholder:text-slate-400 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black tracking-wider text-slate-700 dark:text-slate-400 uppercase">Wake-up Action Note</label>
            <textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-2.5 text-xs font-bold focus:outline-none placeholder:text-slate-400 transition-colors resize-none"
              placeholder="E.g., Follow up with vendor regarding RMA..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 w-full mt-2 pt-3 border-t border-slate-100 dark:border-slate-800/60">
            {/* CANCEL */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-xl uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>

            {/* SET TIMER */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedDateTime}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800/50 dark:disabled:text-slate-600 text-white font-black text-[11px] rounded-xl uppercase tracking-wider transition-all shadow-sm shadow-sky-500/10"
            >
              {isSubmitting ? 'Scheduling...' : 'Set Timer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
