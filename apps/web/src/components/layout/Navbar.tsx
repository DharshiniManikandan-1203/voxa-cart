import React from 'react';
import { Mic, Store, ShieldCheck, Sparkles, Activity, Layers } from 'lucide-react';
import { Merchant, Agent } from '../../types';

interface NavbarProps {
  merchants: Merchant[];
  activeMerchant: Merchant | null;
  onSelectMerchant: (merchant: Merchant) => void;
  agents: Agent[];
  activeAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
  userRole: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  merchants,
  activeMerchant,
  onSelectMerchant,
  agents,
  activeAgent,
  onSelectAgent,
  userRole,
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-surface-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand Title */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-purple-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Mic className="w-5 h-5 text-white animate-pulse-slow" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-400 bg-clip-text text-transparent">
              VoxaFlow
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Multi-Tenant Voice AI
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Voice Commerce Orchestration & Intelligence Platform
          </p>
        </div>
      </div>

      {/* Tenant Switcher & Agent Scoping Selector */}
      <div className="flex items-center space-x-3">
        {/* Active Merchant Selector */}
        <div className="flex items-center space-x-2 bg-surface-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm">
          <Store className="w-4 h-4 text-brand-400" />
          <span className="text-xs text-slate-400 font-medium">Tenant:</span>
          <select
            className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            value={activeMerchant?._id || ''}
            onChange={(e) => {
              const selected = merchants.find((m) => m._id === e.target.value);
              if (selected) onSelectMerchant(selected);
            }}
          >
            {merchants.map((m) => (
              <option key={m._id} value={m._id} className="bg-surface-900 text-slate-200">
                {m.name} ({m.industry})
              </option>
            ))}
          </select>
        </div>

        {/* Active Agent Selector */}
        {agents.length > 0 && (
          <div className="hidden md:flex items-center space-x-2 bg-surface-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-400 font-medium">Agent:</span>
            <select
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              value={activeAgent?._id || ''}
              onChange={(e) => {
                const selected = agents.find((a) => a._id === e.target.value);
                if (selected) onSelectAgent(selected);
              }}
            >
              {agents.map((a) => (
                <option key={a._id} value={a._id} className="bg-surface-900 text-slate-200">
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Live Cluster Health Badge */}
        <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Gateway: 840ms Latency</span>
        </div>

        {/* User Role Badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-surface-800 border border-slate-700 text-slate-200 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
          <span>{userRole || 'MERCHANT_ADMIN'}</span>
        </div>
      </div>
    </header>
  );
};
