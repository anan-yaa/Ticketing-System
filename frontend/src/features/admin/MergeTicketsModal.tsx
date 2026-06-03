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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-md p-4 transition-all duration-300 ease-out">
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl transition-colors duration-200 flex flex-col gap-4 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-widest uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
            Merge Tickets
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <p className="text-slate-600 dark:text-slate-400 text-xs font-mono mb-4 leading-relaxed">
            Select an active Master Ticket below. The current ticket 
            <span className="text-slate-800 dark:text-white font-bold mx-1">{selectedTicket.id}</span>
            will become a nested child in the execution sequence and be placed ON HOLD.
          </p>

          <div>
            <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-widest">Select Target Master Ticket</label>
            <select
              required
              value={parentTicketId}
              onChange={(e) => setParentTicketId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="">-- Select Master Ticket --</option>
              {validParents.map(t => (
                <option key={t.id} value={t.id}>
                  {t.id} - {t.title.substring(0, 40)}{t.title.length > 40 ? '...' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 🛠️ FOOTER ACTIONS CONTAINER ROW */}
          <div className="flex items-center justify-end gap-3 w-full mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
            
            {/* ⚪ CANCEL BUTTON */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-xl uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>

            {/* 🔵 CONFIRM MERGE BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting || !parentTicketId || validParents.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800/50 dark:disabled:text-slate-600 text-white font-black text-[11px] rounded-xl uppercase tracking-wider transition-all shadow-sm shadow-indigo-500/10"
            >
              {isSubmitting ? 'Merging...' : 'Confirm Merge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
