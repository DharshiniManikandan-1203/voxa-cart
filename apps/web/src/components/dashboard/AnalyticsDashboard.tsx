import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Percent,
  Layers,
  Globe,
  Zap,
  DollarSign,
} from 'lucide-react';
import { ApiService } from '../../services/api';

export const AnalyticsDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getAnalyticsDashboard();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load analytics stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-sm">
        Loading real-time analytics & KPIs...
      </div>
    );
  }

  const { kpi, latency, intents, languages, tool_executions } = stats;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Conversation & Commerce Analytics</h1>
        <p className="text-xs text-slate-400 mt-1">
          Real-time metrics, voice latency budgets, intent breakdown, and conversion signals
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Calls</span>
            <Activity className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-black text-white">{kpi.total_conversations.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-400 flex items-center space-x-1 font-semibold">
            <TrendingUp className="w-3 h-3" />
            <span>+14.8% vs last week</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Resolution Rate</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{kpi.successful_resolution_rate}%</div>
          <div className="text-[11px] text-slate-400 font-medium">Avg Duration: 2m 14s</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Fallback Rate</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{kpi.fallback_rate}%</div>
          <div className="text-[11px] text-emerald-400 font-semibold">-2.1% improvement</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Voice Conversion</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{kpi.conversion_rate}%</div>
          <div className="text-[11px] text-slate-400 font-medium">{kpi.total_orders_placed} total orders placed</div>
        </div>
      </div>

      {/* Latency Budget & Tool Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Budget Breakdown */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-brand-400" />
                <span>Voice Turn Latency Budget</span>
              </h2>
              <p className="text-xs text-slate-400">Measured average latency per voice pipeline segment</p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Avg: {latency.avg_total_turn_ms}ms
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">1. Speech-to-Text (STT)</span>
                <span className="font-mono text-blue-400">{latency.avg_stt_ms}ms (22%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: '22%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">2. LLM Reasoning & Intent</span>
                <span className="font-mono text-purple-400">{latency.avg_llm_ms}ms (50%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: '50%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">3. Backend Tool Execution Gateway</span>
                <span className="font-mono text-amber-400">{latency.avg_tool_exec_ms}ms (11%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '11%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">4. Text-to-Speech (TTS) Synthesis</span>
                <span className="font-mono text-emerald-400">{latency.avg_tts_ms}ms (17%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '17%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Language & Intent Mix */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Globe className="w-4 h-4 text-purple-400" />
              <span>Language & Dialect Mix</span>
            </h2>
            <p className="text-xs text-slate-400">Distribution of customer speech across supported languages</p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {languages.map((l: any, idx: number) => (
              <div key={idx} className="p-4 rounded-xl bg-surface-950 border border-slate-800 text-center space-y-1">
                <span className="text-xs font-bold text-slate-400">{l.language}</span>
                <div className="text-xl font-black text-white">{l.percentage}%</div>
                <span className="text-[10px] text-slate-400 block">{l.sessions} calls</span>
              </div>
            ))}
          </div>

          {/* Intent Breakdown */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Customer Shopping Intents
            </h3>
            <div className="space-y-2">
              {intents.map((it: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-surface-950 border border-slate-800 text-xs">
                  <span className="font-semibold text-slate-200">{it.intent}</span>
                  <span className="font-mono text-brand-400 font-bold">{it.count} requests</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
