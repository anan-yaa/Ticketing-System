import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

export const ScheduledTasksTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToConfirmDelete, setTaskToConfirmDelete] = React.useState<{ id: string; title: string } | null>(null);
  const [executionTimeMui, setExecutionTimeMui] = useState<Dayjs | null>(dayjs('2026-06-01T12:00:00'));
  const [formData, setFormData] = useState({
    title: '',
    executionDate: '',
    subject: '',
    instructions: ''
  });

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['scheduledTasks'],
    queryFn: async () => {
      const res = await api.get('/scheduled-tasks');
      return res.data;
    }
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 1, 100, ''],
    queryFn: () => fetchUsers(1, 100, '')
  });

  const customers = usersData?.users?.filter((u: User) => u.role?.name === 'CUSTOMER' || u.systemRole === 'CUSTOMER') || [];

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/scheduled-tasks', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] });
      setIsModalOpen(false);
      setExecutionTimeMui(dayjs('2026-06-01T12:00:00'));
      setFormData({
        title: '',
        executionDate: '',
        subject: '',
        instructions: ''
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/scheduled-tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      await api.patch(`/scheduled-tasks/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] });
    }
  });

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    toggleStatusMutation.mutate({ id, isActive: !currentStatus });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedTimeForBackend = executionTimeMui ? executionTimeMui.format('HH:mm') : '00:00';
    const payload = {
      ...formData,
      dayOfMonth: formData.executionDate ? parseInt(formData.executionDate.split('-')[2], 10) : 1,
      hour: parseInt(formattedTimeForBackend.split(':')[0], 10),
      minute: parseInt(formattedTimeForBackend.split(':')[1], 10),
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center bg-black/20 p-4 border border-white/10 rounded-2xl">
        <h2 className="text-xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
          Scheduled Tasks
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all transform hover:-translate-y-1 uppercase tracking-widest text-xs"
        >
          + Add Scheduled Task
        </button>
      </div>

      {isLoading ? (
        <div className="text-center font-mono text-xs uppercase tracking-widest text-slate-500 py-10">
          Loading Blueprints...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-white/5 text-[10px] uppercase tracking-widest font-mono text-slate-500">
                <th className="p-5 font-semibold">Title</th>
                <th className="p-5 font-semibold">Subject</th>
                <th className="p-5 font-semibold">Trigger Schedule</th>
                <th className="p-5 font-semibold">Status</th>
                <th className="p-5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {tasksData?.map((task: any) => (
                <tr key={task.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-5 font-semibold text-slate-200">{task.title}</td>
                  <td className="p-5 text-slate-400 font-mono text-xs">{task.subject}</td>
                  <td className="p-5 text-slate-300 text-xs">
                    Day {task.dayOfMonth} @ {task.hour.toString().padStart(2, '0')}:{task.minute.toString().padStart(2, '0')}
                  </td>
                  <td className="p-5">
                    <button
                      onClick={() => handleToggleStatus(task.id, task.isActive)}
                      disabled={toggleStatusMutation.isPending}
                      className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none shadow-[0_0_10px_rgba(0,0,0,0.5)] ${task.isActive ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-rose-500/10 border border-rose-500/30'}`}
                    >
                      <span className={`${task.isActive ? 'translate-x-4 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'translate-x-1 bg-rose-500/50'} inline-block w-3.5 h-3.5 transform rounded-full transition-transform`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setTaskToConfirmDelete({ id: task.id, title: task.title })}
                        className="p-1.5 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all duration-150"
                        title="Delete Automation Task"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
          <div className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl transition-all flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                Create Automation
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden mt-4">
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[55vh] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                <div>
                  <label className="text-[10px] font-black tracking-wider text-slate-700 dark:text-slate-400 uppercase">
                    Task Title
                  </label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-500 focus:outline-none transition-colors" placeholder="e.g. Bi-Weekly Core Router Audit Check" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black tracking-wider text-slate-700 dark:text-slate-400 uppercase">
                      Target Trigger Date
                    </label>
                    <input
                      type="date"
                      value={formData.executionDate}
                      onChange={(e) => setFormData({ ...formData, executionDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:border-sky-500 focus:outline-none transition-colors scheme-light dark:scheme-dark"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black tracking-wider text-slate-700 dark:text-slate-400 uppercase">
                      Target Execution Time
                    </label>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <TimePicker
                        value={executionTimeMui}
                        onChange={(newValue) => setExecutionTimeMui(newValue)}
                        slotProps={{
                          textField: {
                            size: 'small',
                            fullWidth: true,
                            placeholder: 'e.g. 03:30 PM',
                            inputProps: {
                              className: 'w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl outline-none border-none transition-colors'
                            },
                            InputProps: {
                              className: 'border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 p-0 overflow-hidden',
                            }
                          }
                        }}
                      />
                    </LocalizationProvider>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black tracking-wider text-slate-700 dark:text-slate-400 uppercase">
                    Ticket Subject
                  </label>
                  <input required type="text" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-500 focus:outline-none transition-colors" placeholder="e.g. Monthly System Maintenance" />
                </div>

                <div>
                  <label className="text-[10px] font-black tracking-wider text-slate-700 dark:text-slate-400 uppercase">
                    Instructions Log
                  </label>
                  <textarea required value={formData.instructions} onChange={e => setFormData({ ...formData, instructions: e.target.value })} rows={4} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 text-xs font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-500 focus:outline-none transition-colors resize-none" placeholder="Enter runbooks and operational instructions here..." />
                </div>
              </div>

              <div className="pt-4 flex gap-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white font-bold uppercase tracking-widest text-xs rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 px-4 py-3 bg-sky-500/10 dark:bg-cyan-600/20 border border-sky-500/30 dark:border-cyan-500/50 hover:bg-sky-500 text-sky-600 dark:text-cyan-300 hover:text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(14,165,233,0.1)] dark:shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(14,165,233,0.4)] dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] uppercase tracking-widest text-xs disabled:opacity-50">
                  {createMutation.isPending ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {taskToConfirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* 🕶️ Backdrop Blur Tint Overlay */}
          <div
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setTaskToConfirmDelete(null)}
          />

          {/* 📦 True Dialog Box Pop */}
          <div className="relative w-full max-w-sm transform overflow-hidden rounded-2xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800/80 p-6 shadow-2xl transition-all scale-100 flex flex-col items-center text-center animate-fade-in-up">

            {/* Warning Warning Shield Icon Design */}
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 dark:text-slate-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>

            {/* Context Headers Typography */}
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Confirm Deletion
            </h3>
            <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to permanently remove <span className="text-slate-800 dark:text-slate-200 font-extrabold">"{taskToConfirmDelete.title}"</span>? This action cannot be undone and will stop all future automatic queue dispatches.
            </p>

            {/* 🛠️ Dialog Footer Action Row layout */}
            <div className="grid grid-cols-2 gap-3 w-full mt-6">
              <button
                type="button"
                onClick={() => setTaskToConfirmDelete(null)}
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors uppercase"
              >
                No, Keep it
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteMutation.mutate(taskToConfirmDelete.id);
                  setTaskToConfirmDelete(null);
                }}
                className="w-full px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs rounded-xl transition-colors uppercase shadow-sm shadow-rose-500/20"
              >
                Yes, Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
