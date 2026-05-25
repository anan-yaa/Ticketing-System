import React, { useState } from 'react';
import api from '../../api/axios';
import { useQueryClient } from '@tanstack/react-query';
import { Ticket } from '../../api/tickets';

interface MergeTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTicket: Ticket;
  allTickets: Ticket[];
}

export const MergeTicketsModal: React.FC<MergeTicketsModalProps> = ({ isOpen, onClose, selectedTicket, allTickets }) => {
  const [parentTicketId, setParentTicketId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  if (!isOpen) return null;

  // Filter valid potential parents:
  // 1. Not the selected ticket
  // 2. Not already merged into something else (parentId is null)
  // 3. Status is OPEN or IN_PROGRESS
  const validParents = allTickets.filter(t => 
    t.id !== selectedTicket.id &&
    !t.parentId &&
    (t.status === 'OPEN' || t.status === 'IN_PROGRESS')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentTicketId) return;
    
    setIsSubmitting(true);
    try {
      await api.post(`/tickets/merge`, {
        childTicketId: selectedTicket.id,
        parentTicketId: parentTicketId,
      });
      
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      onClose();
    } catch (error) {
      console.error('Failed to merge ticket:', error);
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
            Merge Tickets
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <p className="text-slate-400 text-xs font-mono mb-4 leading-relaxed">
            Select an active Master Ticket below. The current ticket 
            <span className="text-white font-bold mx-1">{selectedTicket.id}</span>
            will become a nested child in the execution sequence and be placed ON HOLD.
          </p>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Select Target Master Ticket</label>
            <select
              required
              value={parentTicketId}
              onChange={(e) => setParentTicketId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-cyan-400 outline-none transition-all font-mono text-sm shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] appearance-none"
            >
              <option value="">-- Select Master Ticket --</option>
              {validParents.map(t => (
                <option key={t.id} value={t.id}>
                  {t.id} - {t.title.substring(0, 40)}{t.title.length > 40 ? '...' : ''}
                </option>
              ))}
            </select>
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
              disabled={isSubmitting || !parentTicketId || validParents.length === 0}
              className="px-6 py-2 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white border border-indigo-500/50 hover:border-indigo-400 rounded-xl font-bold font-mono text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Merging...' : 'Confirm Merge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
