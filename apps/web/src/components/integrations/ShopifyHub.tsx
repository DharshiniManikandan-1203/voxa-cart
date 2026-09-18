import React, { useState } from 'react';
import { Plug, RefreshCw, CheckCircle, ShieldCheck, ExternalLink } from 'lucide-react';
import { Merchant } from '../../types';
import { ApiService } from '../../services/api';

interface ShopifyHubProps {
  activeMerchant: Merchant | null;
}

export const ShopifyHub: React.FC<ShopifyHubProps> = ({ activeMerchant }) => {
  const [shopDomain, setShopDomain] = useState('apex-athletics-demo.myshopify.com');
  const [apiKey, setApiKey] = useState('shpat_demo_secret_key_apex');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await ApiService.triggerShopifySync();
      setSyncStatus(`Sync succeeded: ${res.data.synced_count} external catalog items synced into local memory.`);
    } catch (err: any) {
      alert(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
          <Plug className="w-6 h-6 text-brand-400" />
          <span>E-Commerce Provider Integrations</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Connect external Shopify, WooCommerce, or Custom REST APIs via provider adapters for {activeMerchant?.name}
        </p>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 font-bold">
              🛍️
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Shopify Admin REST / GraphQL Adapter</h2>
              <p className="text-xs text-slate-400">Sync products, inventory, prices, and orders automatically</p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>CONNECTED</span>
          </span>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Shopify Store Domain</label>
            <input
              type="text"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Shopify Access Token (Encrypted at Rest)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          {syncStatus && (
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
              {syncStatus}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Catalog...' : 'Trigger Instant Catalog Sync'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
