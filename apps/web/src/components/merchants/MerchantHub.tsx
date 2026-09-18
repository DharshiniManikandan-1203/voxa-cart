import React, { useState } from 'react';
import { Store, Plus, Globe, Clock, CheckCircle2, DollarSign, Shield } from 'lucide-react';
import { Merchant } from '../../types';
import { ApiService } from '../../services/api';

interface MerchantHubProps {
  merchants: Merchant[];
  activeMerchant: Merchant | null;
  onSelectMerchant: (merchant: Merchant) => void;
  onRefresh: () => void;
}

export const MerchantHub: React.FC<MerchantHubProps> = ({
  merchants,
  activeMerchant,
  onSelectMerchant,
  onRefresh,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [industry, setIndustry] = useState<'FASHION' | 'ELECTRONICS' | 'GROCERY' | 'BEAUTY' | 'GENERAL'>('FASHION');
  const [description, setDescription] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;
    try {
      await ApiService.createMerchant({
        name,
        code: code.toLowerCase().trim(),
        industry,
        description,
        currency: 'INR',
        supported_languages: ['en-IN', 'hinglish'],
      });
      setIsCreateOpen(false);
      setName('');
      setCode('');
      setDescription('');
      onRefresh();
    } catch (err: any) {
      alert(`Error provisioning merchant: ${err.message}`);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <Store className="w-6 h-6 text-brand-400" />
            <span>Multi-Merchant Tenants Hub</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Provision new store tenants, configure language preferences, currencies, and tenant isolation policies
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Merchant</span>
        </button>
      </div>

      {/* Merchants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {merchants.map((m) => {
          const isActive = activeMerchant?._id === m._id;
          return (
            <div
              key={m._id}
              onClick={() => onSelectMerchant(m)}
              className={`glass-panel p-6 rounded-2xl border cursor-pointer transition space-y-4 ${
                isActive
                  ? 'border-brand-500/60 bg-surface-850 shadow-xl glow-indigo'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  {m.industry}
                </span>
                {isActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>ACTIVE SCOPE</span>
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-base font-bold text-white">{m.name}</h2>
                <div className="text-xs text-slate-400 font-mono mt-0.5">tenant_code: {m.code}</div>
                <p className="text-xs text-slate-300 mt-2 line-clamp-2">{m.description || 'Configured voice commerce store.'}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                <div className="flex items-center justify-between">
                  <span>Currency:</span>
                  <strong className="text-slate-200">{m.currency || 'INR'}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Languages:</span>
                  <strong className="text-slate-200">{m.supported_languages?.join(', ') || 'en-IN, hinglish'}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Provision Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white">Provision New Merchant Store</h2>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Merchant Store Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zen Lifestyle"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!code) setCode(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Tenant Code (Slug)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. zen-lifestyle"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 font-mono lowercase"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Industry</label>
                  <select
                    value={industry}
                    onChange={(e: any) => setIndustry(e.target.value)}
                    className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="FASHION">FASHION</option>
                    <option value="ELECTRONICS">ELECTRONICS</option>
                    <option value="GROCERY">GROCERY</option>
                    <option value="BEAUTY">BEAUTY</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold"
                >
                  Provision Merchant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
