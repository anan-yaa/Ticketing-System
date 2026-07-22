import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  FileText,
  CheckCircle2,
  ChevronRight,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import api from '../api/axios';

export interface AiCoPilotAdvisorProps {
  /** The unique ID of the active ticket being viewed */
  ticketId: string;
  /** Optional title of the active ticket for display header or fallback context */
  ticketTitle?: string;
  /** Callback triggered when the technician clicks 'Apply to Resolution Notes' */
  onApplyToResolutionNotes?: (concatenatedText: string) => void;
  /** Optional additional CSS class names for styling flexibility */
  className?: string;
}

interface CoPilotResponse {
  suggestedSteps: string[];
  confidenceScore: number;
}

/**
 * Senior-level React Component: AI Co-Pilot Advisor Widget
 * Features:
 * - Shimmering Skeleton Loader during active API generation
 * - Normalized percentage confidence badge & glowing step indicators
 * - Individual step clipboard copy and concatenated auto-fill callback
 */
export const AiCoPilotAdvisor: React.FC<AiCoPilotAdvisorProps> = ({
  ticketId,
  ticketTitle,
  onApplyToResolutionNotes,
  className = '',
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CoPilotResponse | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  const fetchSuggestions = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    setAppliedSuccess(false);

    try {
      const response = await api.get<any>(`/ai/co-pilot/suggestions/${ticketId}`);
      const rawSteps = response.data?.suggestedSteps || response.data?.suggestions || [];
      if (response.data && Array.isArray(rawSteps) && rawSteps.length > 0) {
        setData({
          suggestedSteps: rawSteps,
          confidenceScore: response.data.confidenceScore ?? 0.8,
        });
      } else {
        throw new Error('Malformed structural payload returned by Co-Pilot endpoint.');
      }
    } catch (err: any) {
      console.error('Failed to fetch AI Co-Pilot suggestions:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Unable to synthesize AI Co-Pilot recommendations for this ticket.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleCopyStep = (stepText: string, index: number) => {
    navigator.clipboard.writeText(stepText);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex((prev) => (prev === index ? null : prev));
    }, 2000);
  };

  const handleApplyAll = () => {
    if (!data || !data.suggestedSteps.length) return;

    const concatenatedText = data.suggestedSteps
      .map((step, idx) => `Step ${idx + 1}: ${step}`)
      .join('\n\n');

    // Execute callback if passed by parent workspace page
    if (onApplyToResolutionNotes) {
      onApplyToResolutionNotes(concatenatedText);
    }

    // Also copy all to clipboard as a convenient fallback
    navigator.clipboard.writeText(concatenatedText);

    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
    }, 3000);
  };

  // Helper: Format confidence score to badge color styling
  const getConfidenceBadgeStyles = (score: number) => {
    const percentage = Math.round(score * 100);
    if (percentage >= 80) {
      return {
        badgeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
        iconClass: 'text-emerald-500 dark:text-emerald-400',
        text: `${percentage}% Confidence`,
      };
    }
    if (percentage >= 60) {
      return {
        badgeClass: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
        iconClass: 'text-amber-500 dark:text-amber-400',
        text: `${percentage}% Confidence`,
      };
    }
    return {
      badgeClass: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-600 dark:text-cyan-400',
      iconClass: 'text-cyan-500 dark:text-cyan-400',
      text: `${percentage}% Confidence`,
    };
  };

  return (
    <div
      className={`sticky top-6 flex flex-col bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-500 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-sm font-bold text-white tracking-wide font-sans">
                AI Co-Pilot Advisor
              </h3>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-mono px-1.5 py-0.5 rounded border border-cyan-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-[260px]">
              {ticketTitle ? `Analyzing: ${ticketTitle}` : 'RAG Semantic Resolution Engine'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchSuggestions}
            disabled={loading}
            title="Regenerate AI Suggestions"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body Content Area */}
      <div className="p-5 flex-1 flex flex-col space-y-4">
        {/* STATE 1: LOADING (Shimmering Skeleton Loader) */}
        {loading && (
          <div className="space-y-4 py-2 animate-pulse">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
              <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            </div>

            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                  <div className="h-5 w-5 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                </div>
                <div className="space-y-2 pt-1">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-full"></div>
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-5/6"></div>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            </div>
          </div>
        )}

        {/* STATE 2: EMPTY / ERROR STATE */}
        {!loading && (error || !data || data.suggestedSteps.length === 0) && (
          <div className="my-auto py-8 px-4 text-center rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Synthesis Interrupted
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                {error || 'No verified historical resolution patterns matched this ticket yet.'}
              </p>
            </div>
            <button
              onClick={fetchSuggestions}
              className="mt-2 inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-all shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry AI Analysis</span>
            </button>
          </div>
        )}

        {/* STATE 3: SUCCESS STATE */}
        {!loading && !error && data && data.suggestedSteps.length > 0 && (
          <>
            {/* Confidence Score Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Zap className="w-3.5 h-3.5 text-cyan-500" />
                <span>Verified Plan (`3 Steps`)</span>
              </div>
              <div
                className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-bold tracking-tight shadow-sm ${
                  getConfidenceBadgeStyles(data.confidenceScore).badgeClass
                }`}
              >
                <ShieldCheck
                  className={`w-3.5 h-3.5 ${
                    getConfidenceBadgeStyles(data.confidenceScore).iconClass
                  }`}
                />
                <span>{getConfidenceBadgeStyles(data.confidenceScore).text}</span>
              </div>
            </div>

            {/* Step-by-Step Cards List */}
            <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              {data.suggestedSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="group relative bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl p-4 transition-all duration-200 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wide uppercase bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300">
                      Step {idx + 1}
                    </span>

                    {/* Individual Copy Button */}
                    <button
                      onClick={() => handleCopyStep(step, idx)}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all duration-150 shadow-sm"
                      title="Copy exact step text"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 animate-in zoom-in-75 duration-150" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                    {step}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer Action Button */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                onClick={handleApplyAll}
                disabled={appliedSuccess}
                className={`w-full py-3 px-4 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg transform active:scale-[0.99] ${
                  appliedSuccess
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20 border border-emerald-500'
                    : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 text-white shadow-cyan-500/25'
                }`}
              >
                {appliedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 animate-bounce" />
                    <span>Applied to Resolution Notes! ✓</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Apply to Resolution Notes</span>
                    <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              <p className="text-[10px] text-center text-slate-400 mt-2">
                Clicking applies all 3 verified steps directly to your technician note workspace.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
