import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldAlert, Cpu, Sparkles, TrendingUp, RefreshCw, BarChart2 } from 'lucide-react';
import { Evaluation, Merchant } from '../../types';
import { ApiService } from '../../services/api';

interface EvaluationHubProps {
  activeMerchant: Merchant | null;
}

export const EvaluationHub: React.FC<EvaluationHubProps> = ({ activeMerchant }) => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvaluations();
  }, [activeMerchant?._id]);

  const fetchEvaluations = async () => {
    if (!activeMerchant) return;
    setLoading(true);
    try {
      const res = await ApiService.listEvaluations();
      setEvaluations(res.data);
    } catch (err) {
      console.error('Failed to load evaluations:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <span>AI Conversation Evaluation & Quality Benchmark</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Objective evaluation scorecards measuring task completion, tool accuracy, hallucination risk, and sentiment
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {evaluations.map((ev) => (
          <div key={ev._id} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono text-slate-400">
                  Evaluated by: <strong className="text-purple-300">{ev.evaluated_by}</strong>
                </span>
                <span className="text-[10px] text-slate-500 block font-mono">
                  {new Date(ev.created_at).toLocaleString()}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">Overall Quality</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">{ev.overall_score}/100</span>
              </div>
            </div>

            {/* Scorecard Metric Gauges */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-950 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Task Resolution</span>
                <span className="text-base font-bold text-white font-mono">{ev.scores.task_completion}%</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-950 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Tool Call Accuracy</span>
                <span className="text-base font-bold text-blue-400 font-mono">{ev.scores.tool_call_accuracy}%</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-950 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Voice Conciseness</span>
                <span className="text-base font-bold text-purple-400 font-mono">{ev.scores.response_length_compliance}%</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-950 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Hallucination Risk</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {ev.scores.hallucination_penalty === 0 ? '0% (Clean)' : `${ev.scores.hallucination_penalty}% Penalty`}
                </span>
              </div>
            </div>

            {/* Detailed Reasoning Breakdown */}
            <div className="p-3.5 rounded-xl bg-surface-950 border border-slate-800 space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Evaluation Reasoning Breakdown:
              </span>
              {ev.eval_breakdown?.map((b, i) => (
                <div key={i} className="text-slate-300 flex items-start space-x-2">
                  <span className="text-brand-400">•</span>
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
