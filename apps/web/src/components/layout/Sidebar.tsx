import React from 'react';
import {
  Mic,
  LayoutDashboard,
  Store,
  Bot,
  FileCode,
  FlaskConical,
  ShoppingBag,
  Tag,
  PackageCheck,
  CheckCircle2,
  Plug,
  Shield,
  Users,
  Terminal,
} from 'lucide-react';

export type TabType =
  | 'playground'
  | 'dashboard'
  | 'merchants'
  | 'agents'
  | 'prompts'
  | 'experiments'
  | 'products'
  | 'discounts'
  | 'orders'
  | 'evaluations'
  | 'integrations'
  | 'audit'
  | 'users';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const navSections = [
    {
      title: 'VOICE AI CORE',
      items: [
        { id: 'playground' as TabType, label: 'Voice Playground', icon: Mic, badge: 'Live Audio' },
        { id: 'dashboard' as TabType, label: 'Analytics & KPIs', icon: LayoutDashboard },
        { id: 'agents' as TabType, label: 'Agent Studio', icon: Bot },
        { id: 'prompts' as TabType, label: 'Prompt Versions', icon: FileCode, badge: 'Immutable' },
        { id: 'experiments' as TabType, label: 'A/B Experiments', icon: FlaskConical },
        { id: 'evaluations' as TabType, label: 'AI Evaluation Bench', icon: CheckCircle2 },
      ],
    },
    {
      title: 'COMMERCE CORE',
      items: [
        { id: 'products' as TabType, label: 'Product Catalog', icon: ShoppingBag },
        { id: 'discounts' as TabType, label: 'Discounts & Pricing', icon: Tag },
        { id: 'orders' as TabType, label: 'Orders & Checkout', icon: PackageCheck },
        { id: 'integrations' as TabType, label: 'Shopify / REST', icon: Plug },
      ],
    },
    {
      title: 'TENANTS & PLATFORM',
      items: [
        { id: 'merchants' as TabType, label: 'Merchants & Tenants', icon: Store },
        { id: 'users' as TabType, label: 'Team & RBAC Roles', icon: Users },
        { id: 'audit' as TabType, label: 'Audit Trail Logs', icon: Shield },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-surface-950/70 p-4 flex flex-col justify-between overflow-y-auto">
      <div className="space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1.5">
            <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-brand-700 text-white'
                            : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Developer Trace Link / Footer */}
      <div className="pt-4 border-t border-slate-800">
        <div className="p-3 rounded-xl bg-surface-900 border border-slate-800">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 mb-1">
            <Terminal className="w-3.5 h-3.5 text-purple-400" />
            <span>Developer Observability</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Real-time STT, LLM tokens, and tool traces logged per voice turn.
          </p>
        </div>
      </div>
    </aside>
  );
};
