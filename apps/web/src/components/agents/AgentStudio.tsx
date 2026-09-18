import React, { useState } from 'react';
import { Bot, Save, Wrench, Volume2, ShieldCheck, Plus, Sparkles, CheckSquare } from 'lucide-react';
import { Agent, Merchant } from '../../types';
import { ApiService } from '../../services/api';

interface AgentStudioProps {
  agents: Agent[];
  activeAgent: Agent | null;
  activeMerchant: Merchant | null;
  onRefresh: () => void;
}

export const AgentStudio: React.FC<AgentStudioProps> = ({
  agents,
  activeAgent,
  activeMerchant,
  onRefresh,
}) => {
  const [formData, setFormData] = useState<any>(
    activeAgent || {
      name: 'New Voice Shopping Assistant',
      purpose: 'SALES',
      personality: { tone: 'friendly', style: 'Crisp Indian retail shopping assistant', default_language: 'hinglish' },
      max_response_sentences: 2,
      allowed_tools: ['search_products', 'get_product_details', 'calculate_discount', 'get_order_status'],
      business_rules: ['Orders above ₹999 qualify for Free Shipping', 'Offer coupon VOXA10 on inquiries'],
      voice_config: { provider: 'BROWSER_TTS', voice_id: 'en-IN-Standard-A', speed: 1.05, pitch: 1.0 },
    }
  );

  const [saving, setSaving] = useState(false);

  const allAvailableTools = [
    { id: 'search_products', label: 'search_products()', desc: 'Search catalog by category, price, keywords' },
    { id: 'get_product_details', label: 'get_product_details()', desc: 'Retrieve attributes and variants' },
    { id: 'check_inventory', label: 'check_inventory()', desc: 'Verify SKU stock level' },
    { id: 'calculate_discount', label: 'calculate_discount()', desc: 'Validate and calculate promo discounts' },
    { id: 'calculate_final_price', label: 'calculate_final_price()', desc: 'Deterministic cart and GST tax calculation' },
    { id: 'get_order_status', label: 'get_order_status()', desc: 'Track order shipment status' },
    { id: 'create_order', label: 'create_order()', desc: 'Confirm order and decrement stock' },
    { id: 'cancel_order', label: 'cancel_order()', desc: 'Cancel order and return stock' },
  ];

  const handleToolToggle = (toolId: string) => {
    const current = formData.allowed_tools || [];
    if (current.includes(toolId)) {
      setFormData({ ...formData, allowed_tools: current.filter((t: string) => t !== toolId) });
    } else {
      setFormData({ ...formData, allowed_tools: [...current, toolId] });
    }
  };

  const handleSave = async () => {
    if (!activeMerchant) return;
    setSaving(true);
    try {
      if (activeAgent?._id) {
        await ApiService.updateAgent(activeAgent._id, formData);
      } else {
        await ApiService.createAgent(formData);
      }
      alert('Agent configuration successfully saved!');
      onRefresh();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <Bot className="w-6 h-6 text-brand-400" />
            <span>Voice Agent Studio & Persona Customizer</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure agent personality, voice constraints, and sandboxed tool permissions for {activeMerchant?.name}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Agent Config'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Core Profile & Persona */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Agent Persona & Dialect</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Agent Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Agent Purpose</label>
                <select
                  value={formData.purpose || 'SALES'}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="SALES">SALES</option>
                  <option value="SUPPORT">SUPPORT</option>
                  <option value="ORDER_TRACKING">ORDER TRACKING</option>
                  <option value="RETURNS">RETURNS</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Tone of Voice</label>
                <select
                  value={formData.personality?.tone || 'friendly'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personality: { ...formData.personality, tone: e.target.value },
                    })
                  }
                  className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="friendly">Friendly & Helpful</option>
                  <option value="professional">Professional & Direct</option>
                  <option value="enthusiastic">Enthusiastic & High-Energy</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Default Dialogue Language</label>
              <select
                value={formData.personality?.default_language || 'hinglish'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    personality: { ...formData.personality, default_language: e.target.value },
                  })
                }
                className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="hinglish">Hinglish (Hindi + English Code-Switching)</option>
                <option value="en-IN">Indian English (en-IN)</option>
                <option value="hi-IN">Hindi (hi-IN)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">
                Max Response Sentences (Voice Constraint: $\le 3$)
              </label>
              <input
                type="number"
                min={1}
                max={4}
                value={formData.max_response_sentences || 2}
                onChange={(e) => setFormData({ ...formData, max_response_sentences: parseInt(e.target.value, 10) })}
                className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Keeps generated responses brief and natural for voice synthesis.
              </span>
            </div>
          </div>
        </div>

        {/* 2. Allowed Tools Whitelist */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>Allowed Tools Whitelist</span>
          </h2>
          <p className="text-xs text-slate-400">
            Select the exact backend tools this agent is authorized to invoke.
          </p>

          <div className="space-y-2 pt-1 text-xs">
            {allAvailableTools.map((t) => {
              const isChecked = (formData.allowed_tools || []).includes(t.id);
              return (
                <div
                  key={t.id}
                  onClick={() => handleToolToggle(t.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isChecked
                      ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                      : 'bg-surface-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <span className="font-mono font-bold block">{t.label}</span>
                    <span className="text-[11px] text-slate-400">{t.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
