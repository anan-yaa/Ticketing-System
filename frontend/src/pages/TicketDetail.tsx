import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { fetchTicketById, updateTicket } from '../api/tickets';
import { useAuth } from '../context/AuthContext';

interface FormValues {
  status: string;
  resolutionSummary: string;
}

export const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicketById(id!),
    enabled: !!id,
  });

  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      status: '',
      resolutionSummary: '',
    },
  });

  const currentStatus = watch('status');

  useEffect(() => {
    if (ticket) {
      reset({
        status: ticket.status || 'OPEN',
        resolutionSummary: ticket.resolutionSummary || '',
      });
    }
  }, [ticket, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => updateTicket(id!, data),
    onSuccess: () => {
      showToast('Ticket updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.message || 'Failed to update ticket', 'error');
    },
  });

  const onSubmit = (data: FormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-xl text-gray-500 font-semibold animate-pulse">Loading Ticket Details...</div>
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Ticket Not Found</h2>
          <p className="mt-2 text-gray-500">The ticket you are looking for does not exist or you do not have permission.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'RESOLVED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'CLOSED': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'LOW': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded shadow-lg flex items-center gap-3 transition-all ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                &larr; Back
              </button>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {ticket.id}: {ticket.title}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Description Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Description</h2>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans text-sm leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700/50">
                {ticket.description || 'No description provided.'}
              </div>
            </div>

            {/* Resolution Form Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-700 pb-3">Update Lifecycle & Resolution</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Operational Status
                    </label>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm transition"
                        >
                          <option value="OPEN">Open</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="WAITING_FOR_CUSTOMER">Waiting on Customer</option>
                          <option value="WAITING_FOR_VENDOR">Waiting on Vendor</option>
                          <option value="RESOLVED">Resolved</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Resolution Summary
                    {currentStatus === 'RESOLVED' && <span className="text-red-500 ml-1">* Required</span>}
                  </label>
                  <Controller
                    name="resolutionSummary"
                    control={control}
                    rules={{
                      validate: (value) => 
                        (currentStatus === 'RESOLVED' && !value.trim()) 
                          ? 'A resolution summary is required to resolve this ticket.' 
                          : true
                    }}
                    render={({ field }) => (
                      <div>
                        <textarea
                          {...field}
                          rows={4}
                          className={`mt-1 block w-full px-4 py-3 border ${errors.resolutionSummary ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'} rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white transition`}
                          placeholder="Document the technical steps taken to resolve this issue..."
                        />
                        {errors.resolutionSummary && (
                          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.resolutionSummary.message}</p>
                        )}
                      </div>
                    )}
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving Changes...
                      </>
                    ) : 'Save / Update Ticket'}
                  </button>
                </div>
              </form>
            </div>
            
          </div>

          {/* Right Sidebar - Core Information Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden sticky top-6">
              
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Core Information</h3>
                {ticket.isIndexedToVectorDb && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-800/50" title="This ticket's resolution is indexed in Pgvector for AI learning.">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                    Indexed to Vector DB
                  </span>
                )}
              </div>
              
              <div className="p-6 space-y-6">
                
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace(/_/g, ' ')}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </div>

                {/* Info List */}
                <dl className="space-y-4 text-sm">
                  <div className="flex flex-col border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0 last:pb-0">
                    <dt className="text-gray-500 dark:text-gray-400 font-medium mb-1">Category</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-semibold">{ticket.category || 'Uncategorized'}</dd>
                  </div>
                  
                  <div className="flex flex-col border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0 last:pb-0">
                    <dt className="text-gray-500 dark:text-gray-400 font-medium mb-1">Ticket Type & Queue</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-semibold">
                      {ticket.ticketType || 'Standard'} 
                      {ticket.queueId && <span className="text-gray-400 font-normal ml-1">({ticket.queueId})</span>}
                    </dd>
                  </div>

                  <div className="flex flex-col border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0 last:pb-0">
                    <dt className="text-gray-500 dark:text-gray-400 font-medium mb-1">Customer Details</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-semibold">
                      {ticket.customerName || ticket.customer?.name || 'Unknown Customer'}
                    </dd>
                    {ticket.customer?.email && (
                      <dd className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                        {ticket.customer.email}
                      </dd>
                    )}
                  </div>

                  <div className="flex flex-col border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0 last:pb-0">
                    <dt className="text-gray-500 dark:text-gray-400 font-medium mb-1">Created At</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium">
                      {new Date(ticket.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </dd>
                  </div>
                </dl>

              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
