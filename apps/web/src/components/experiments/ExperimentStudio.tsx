import React, { useState, useEffect } from 'react';
import { FlaskConical, Trophy, CheckCircle, TrendingUp, Clock, AlertTriangle, Plus } from 'lucide-react';
import { Experiment, Agent } from '../../types';
import { ApiService } from '../../services/api';

interface ExperimentStudioProps {
  activeAgent: Agent | null;
}

export const ExperimentStudio: React.FC<ExperimentStudioProps> = ({ activeAgent }) => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExperiments();
  }, [activeAgent?._id]);

  const fetchExperiments = async () => {
    setLoading(true);
    try {
      const res = await ApiService.listExperiments();
      setExperiments(res.data);
    } catch (err) {
      console.error('Failed to load experiments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteExperiment = async (id: string, winner: 'A' | 'B') => {
    try {
      await ApiService.completeExperiment(id, winner);
      alert(`Variant ${winner} declared winner! Prompt version updated on live agent.`);
      fetchExperiments();
    } catch (err: any) {
      alert(`Error completing experiment: ${err.message}`);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <FlaskConical className="w-6 h-6 text-purple-400" />
            <span>Prompt A/B Testing & Evaluation Studio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Statistically compare prompt versions against task completion, latency, and conversion rates
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {experiments.map((exp) => {
          const isRunning = exp.status === 'RUNNING';
          return (
            <div key={exp._id} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-white">{exp.name}</h2>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        isRunning
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {exp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Hypothesis: {exp.hypothesis}</p>
                </div>

                {isRunning && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCompleteExperiment(exp._id, 'A')}
                      className="px-3 py-1.5 rounded-xl bg-surface-950 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                    >
                      Crown Variant A
                    </button>
                    <button
                      onClick={() => handleCompleteExperiment(exp._id, 'B')}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition"
                    >
                      Crown Variant B Winner
                    </button>
                  </div>
                )}
              </div>

              {/* Side by Side Variant Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Variant A */}
                <div
                  className={`p-5 rounded-2xl border space-y-4 ${
                    exp.winner_variant === 'A'
                      ? 'bg-purple-950/20 border-purple-500/40 shadow-lg'
                      : 'bg-surface-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-300">
                      VARIANT A (v{exp.variant_a.version_number || 1})
                    </span>
                    {exp.winner_variant === 'A' && (
                      <span className="text-xs font-bold text-purple-400 flex items-center space-x-1">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>WINNER</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-xl bg-surface-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Samples</span>
                      <span className="text-sm font-bold text-white font-mono">{exp.variant_a.sample_count}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Resolution</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">{exp.variant_a.task_completion_rate}%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Avg Latency</span>
                      <span className="text-sm font-bold text-blue-400 font-mono">{exp.variant_a.avg_latency_ms}ms</span>
                    </div>
                  </div>
                </div>

                {/* Variant B */}
                <div
                  className={`p-5 rounded-2xl border space-y-4 ${
                    exp.winner_variant === 'B'
                      ? 'bg-purple-950/20 border-purple-500/40 shadow-lg'
                      : 'bg-surface-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-purple-300">
                      VARIANT B (v{exp.variant_b.version_number || 2})
                    </span>
                    {exp.winner_variant === 'B' && (
                      <span className="text-xs font-bold text-purple-400 flex items-center space-x-1">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>WINNER (+11% Resolution)</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-xl bg-surface-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Samples</span>
                      <span className="text-sm font-bold text-white font-mono">{exp.variant_b.sample_count}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Resolution</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">{exp.variant_b.task_completion_rate}%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Avg Latency</span>
                      <span className="text-sm font-bold text-blue-400 font-mono">{exp.variant_b.avg_latency_ms}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
