import React from 'react';
import { X, Terminal, Clock, Cpu, Wrench, CheckCircle, AlertTriangle, Layers } from 'lucide-react';
import { TurnTrace } from '../../types';

interface DeveloperTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: TurnTrace | null;
  lastToolExecution?: any;
  detectedIntent?: string;
  intentConfidence?: number;
  extractedSlots?: Record<string, any>;
  promptVersionNumber?: number;
}

export const DeveloperTraceModal: React.FC<DeveloperTraceModalProps> = ({
  isOpen,
  onClose,
  trace,
  lastToolExecution,
  detectedIntent,
  intentConfidence,
  extractedSlots,
  promptVersionNumber,
}) => {
  if (!isOpen || !trace) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-surface-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Developer Execution Trace</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  Turn #{trace.turn_index}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                End-to-end voice latency breakdown, token telemetry, and tool execution logs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto font-sans text-sm">
          {/* 1. Turn Latency Breakdown Progress Bars */}
          <div className="p-4 rounded-xl bg-surface-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-400" />
                <span>Voice Latency Budget (Target: &le; 1200ms)</span>
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  trace.total_turn_ms <= 1200
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                Total: {trace.total_turn_ms}ms
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center font-mono">
              <div className="p-2 rounded-lg bg-surface-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">1. STT Stream</span>
                <span className="text-xs font-bold text-blue-400">{trace.stt_latency_ms}ms</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">2. LLM Reasoning</span>
                <span className="text-xs font-bold text-purple-400">{trace.llm_first_chunk_ms}ms</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">3. Tool Execution</span>
                <span className="text-xs font-bold text-amber-400">{trace.tool_exec_duration_ms}ms</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">4. TTS Synthesis</span>
                <span className="text-xs font-bold text-emerald-400">{trace.tts_latency_ms}ms</span>
              </div>
            </div>
          </div>

          {/* 2. Intent & Slot Extraction Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>Intent & Reasoning</span>
              </span>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Classified Intent:</span>
                  <span className="font-mono font-semibold text-purple-300">
                    {detectedIntent || 'PRODUCT_SEARCH'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Model Confidence:</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {Math.round((intentConfidence || 0.95) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Active Prompt Version:</span>
                  <span className="font-mono font-semibold text-brand-400">
                    v{promptVersionNumber || 2} (Immutable)
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Extracted Dialogue Slots</span>
              </span>
              <div className="pt-1">
                {extractedSlots && Object.keys(extractedSlots).length > 0 ? (
                  <pre className="text-xs font-mono bg-surface-900 p-2 rounded-lg text-slate-300 overflow-x-auto border border-slate-800">
                    {JSON.stringify(extractedSlots, null, 2)}
                  </pre>
                ) : (
                  <span className="text-xs text-slate-400 italic">No slot entities required for this turn</span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Controlled Tool Execution Payload */}
          <div className="p-4 rounded-xl bg-surface-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span>Backend Tool Execution Gateway</span>
              </span>
              {lastToolExecution && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                    lastToolExecution.success
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {lastToolExecution.success ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>SUCCESS</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3" />
                      <span>FAILED</span>
                    </>
                  )}
                </span>
              )}
            </div>

            {lastToolExecution ? (
              <div className="space-y-2 pt-1 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Tool Invoked: <strong className="text-amber-300">{lastToolExecution.tool_name}()</strong></span>
                  <span>Duration: {lastToolExecution.execution_time_ms || trace.tool_exec_duration_ms}ms</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">JSON Input Arguments:</span>
                    <pre className="bg-surface-900 p-2.5 rounded-lg text-slate-200 border border-slate-800 overflow-x-auto max-h-36">
                      {JSON.stringify(lastToolExecution.arguments || {}, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Structured Result Payload:</span>
                    <pre className="bg-surface-900 p-2.5 rounded-lg text-emerald-300 border border-slate-800 overflow-x-auto max-h-36">
                      {JSON.stringify(lastToolExecution.result || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No external tool invocation required for this conversational turn.</p>
            )}
          </div>

          {/* 4. Token & Security Auditing */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-950 border border-slate-800 text-xs">
            <span className="text-slate-400">LLM Token Usage:</span>
            <div className="flex space-x-3 font-mono text-slate-300">
              <span>Prompt: <strong className="text-purple-400">{trace.tokens?.prompt_tokens || 140}</strong></span>
              <span>Completion: <strong className="text-brand-400">{trace.tokens?.completion_tokens || 35}</strong></span>
              <span>Total: <strong className="text-emerald-400">{trace.tokens?.total_tokens || 175}</strong></span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-surface-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Close Trace Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
