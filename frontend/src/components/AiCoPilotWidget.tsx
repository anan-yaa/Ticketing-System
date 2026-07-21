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
  ShieldCheck,
  Bot,
} from 'lucide-react';
import api from '../api/axios';

export interface AiCoPilotWidgetProps {
  /** The unique identifier of the active ticket being viewed */
  ticketId: string;
  /** Optional ticket subject/title for context display */
  ticketTitle?: string;
  /** Callback triggered when technician clicks 'Apply to Resolution Fields' */
  onApplyToResolutionFields?: (combinedSteps: string) => void;
  /** Alternative alias callback name for flexibility across parent components */
  onApply?: (combinedSteps: string) => void;
  /** Optional custom CSS classes for layout integration */
  className?: string;
}

interface CoPilotSuggestionData {
  suggestedSteps: string[];
  confidenceScore: number;
}

/**
 * Senior Frontend UI/UX Component: AI Co-Pilot Assistant Widget
 * Designed with a sleek, high-end developer dashboard theme using React, Tailwind CSS & Lucide icons.
 */
export const AiCoPilotWidget: React.FC<AiCoPilotWidgetProps> = ({
  ticketId,
  ticketTitle,
  onApplyToResolutionFields,
  onApply,
  className = '',
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CoPilotSuggestionData | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  // Automatically fetch suggestions from backend when ticketId changes
  const fetchAiSuggestions = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    setAppliedSuccess(false);

    try {
      // Fetching from full endpoint path or centralized axios instance
      const response = await api.get<CoPilotSuggestionData>(`/ai/co-pilot/suggestions/${ticketId}`);
      if (response.data && Array.isArray(response.data.suggestedSteps)) {
        setData(response.data);
      } else {
        throw new Error('Received malformed structural payload from AI Co-Pilot endpoint.');
      }
    } catch (err: any) {
      console.error('Failed to fetch AI Co-Pilot suggestions:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Unable to synthesize AI resolution steps for this ticket.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchAiSuggestions();
  }, [fetchAiSuggestions]);

  // Copy individual step string to system clipboard & toggle icon for 2 seconds
  const handleCopyStep = (stepText: string, index: number) => {
    navigator.clipboard.writeText(stepText);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex((prev) => (prev === index ? null : prev));
    }, 2000);
  };

  // Combine sequential steps together & pass to callback to auto-fill resolution fields
  const handleApplyToResolutionFields = () => {
    if (!data || !data.suggestedSteps.length) return;

    const combinedSteps = data.suggestedSteps
      .map((step, idx) => `Step ${idx + 1}: ${step}`)
      .join('\n\n');

    // Trigger either provided callback prop
    if (onApplyToResolutionFields) {
      onApplyToResolutionFields(combinedSteps);
    } else if (onApply) {
      onApply(combinedSteps);
    }

    // Also copy combined text to clipboard for convenience
    navigator.clipboard.writeText(combinedSteps);

    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
    }, 2000);
  };

  // Format confidence score percentage cleanly (e.g., 90.7% or 91%)
  const formatConfidenceScore = (score: number): string => {
    const percentage = score * 100;
    return Number.isInteger(percentage)
      ? `${percentage}%`
      : `${percentage.toFixed(1)}%`;
  };

  // Determine badge styles based on confidence thresholds
  const getConfidenceBadgeColor = (score: number) => {
    const percentage = score * 100;
    if (percentage >= 80) {
      return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 dark:text-emerald-300';
    }
    if (percentage >= 60) {
      return 'bg-amber-500/15 border-amber-500/30 text-amber-400 dark:text-amber-300';
    }
    return 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 dark:text-cyan-300';
  };

  return (
    <div
      className={`flex flex-col bg-slate-900/95 dark:bg-zinc-950 border border-slate-800 dark:border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Top Header Banner */}
      <div className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/10">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-100 tracking-tight font-sans">
                AI Co-Pilot Assistant
              </h3>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-mono px-2 py-0.5 rounded-full border border-cyan-500/30 uppercase tracking-wider font-semibold">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[220px] sm:max-w-[300px] mt-0.5">
              {ticketTitle ? `Target: ${ticketTitle}` : `Synthesizing Ticket #${ticketId}`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchAiSuggestions}
            disabled={loading}
            title="Refresh AI Recommendations"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Body Content */}
      <div className="p-5 flex-1 flex flex-col space-y-4">
        {/* STATE 1: ELEGANT LOADING STATE (Shimmering Slate Skeleton) */}
        {loading && (
          <div className="space-y-4 py-2 animate-pulse">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3.5">
              <div className="h-4 w-36 bg-slate-800/80 rounded-md"></div>
              <div className="h-6 w-32 bg-slate-800/80 rounded-full"></div>
            </div>

            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="p-4 rounded-xl border border-slate-800/60 bg-slate-900/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-20 bg-slate-800/80 rounded-full"></div>
                  <div className="h-5 w-6 bg-slate-800/80 rounded-md"></div>
                </div>
                <div className="space-y-2 pt-1">
                  <div className="h-3.5 bg-slate-800/80 rounded-md w-full"></div>
                  <div className="h-3.5 bg-slate-800/80 rounded-md w-4/5"></div>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <div className="h-12 w-full bg-slate-800/80 rounded-xl"></div>
            </div>
          </div>
        )}

        {/* STATE 2: DYNAMIC ERROR / EMPTY STATE */}
        {!loading && (error || !data || data.suggestedSteps.length === 0) && (
          <div className="my-auto py-10 px-6 text-center rounded-2xl border border-rose-500/25 bg-rose-500/5 flex flex-col items-center justify-center space-y-3.5">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shadow-inner">
              <AlertCircle className="w-6 h-6 text-rose-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-200 tracking-tight">
                AI Synthesis Interrupted
              </h4>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                {error || 'No context matches or suggested steps found for this ticket.'}
              </p>
            </div>
            <button
              onClick={fetchAiSuggestions}
              className="mt-2 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold transition-all shadow-md active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry AI Analysis</span>
            </button>
          </div>
        )}

        {/* STATE 3: SUCCESS VIEW LAYOUT */}
        {!loading && !error && data && data.suggestedSteps.length > 0 && (
          <>
            {/* Confidence Score Badge Banner */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
              <div className="flex items-center space-x-2 text-xs font-medium text-slate-300">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>Recommended Action Plan</span>
              </div>
              <div
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-mono font-bold tracking-tight shadow-sm ${getConfidenceBadgeColor(
                  data.confidenceScore
                )}`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{formatConfidenceScore(data.confidenceScore)} Confidence Score</span>
              </div>
            </div>

            {/* Styled Ordered Sequence of Steps */}
            <div className="space-y-3.5 overflow-y-auto max-h-[480px] pr-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {data.suggestedSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="group relative bg-slate-950/80 dark:bg-zinc-900/80 border border-slate-800/80 dark:border-zinc-800 rounded-xl p-4 transition-all duration-200 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                      Step {idx + 1}
                    </span>

                    {/* Copy Action Icon Button */}
                    <button
                      onClick={() => handleCopyStep(step, idx)}
                      className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/60 text-slate-400 hover:text-cyan-300 transition-all duration-150 shadow-sm active:scale-95"
                      title="Copy exact step text"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-75 duration-150" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                    {step}
                  </p>
                </div>
              ))}
            </div>

            {/* Direct Application Feature Footer Button */}
            <div className="pt-3 border-t border-slate-800/80">
              <button
                onClick={handleApplyToResolutionFields}
                disabled={appliedSuccess}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all duration-200 shadow-xl transform active:scale-[0.99] ${
                  appliedSuccess
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20 border border-emerald-500'
                    : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 text-white shadow-cyan-500/25 border border-cyan-500/30'
                }`}
              >
                {appliedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 animate-bounce" />
                    <span>Applied to Resolution Fields! ✓</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Apply to Resolution Fields</span>
                    <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2">
                Combines and transfers all 3 steps directly into your active resolution notes field.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default AiCoPilotWidget;
