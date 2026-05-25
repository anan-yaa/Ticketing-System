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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 transition-all duration-300 ease-out">
      <div className="bg-slate-950 border border-white/10 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
            Schedule Ticket
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Execution Timestamp</label>
            <input
              required
              type="datetime-local"
              value={selectedDateTime}
              onChange={(e) => setSelectedDateTime(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-cyan-400 outline-none transition-all font-mono text-sm shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Wake-up Action Note</label>
            <textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-cyan-400 outline-none transition-all font-mono text-sm resize-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
              placeholder="E.g., Follow up with vendor regarding RMA..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-slate-400 hover:text-white font-mono text-xs uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedDateTime}
              className="px-6 py-2 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-white border border-cyan-500/50 hover:border-cyan-400 rounded-xl font-bold font-mono text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Scheduling...' : 'Set Timer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
