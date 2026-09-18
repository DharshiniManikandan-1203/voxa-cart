import React, { useState, useEffect } from 'react';
import { Tag, Plus, CheckCircle, Percent, DollarSign, Truck } from 'lucide-react';
import { Discount, Merchant } from '../../types';
import { ApiService } from '../../services/api';

interface DiscountHubProps {
  activeMerchant: Merchant | null;
}

export const DiscountHub: React.FC<DiscountHubProps> = ({ activeMerchant }) => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING'>('PERCENTAGE');
  const [newValue, setNewValue] = useState('');
  const [newMinOrder, setNewMinOrder] = useState('999');
  const [newMaxCap, setNewMaxCap] = useState('');

  useEffect(() => {
    fetchDiscounts();
  }, [activeMerchant?._id]);

  const fetchDiscounts = async () => {
    if (!activeMerchant) return;
    try {
      const res = await ApiService.listDiscounts();
      setDiscounts(res.data);
    } catch (err) {
      console.error('Failed to load discounts:', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newValue) return;
    try {
      await ApiService.createDiscount({
        code: newCode.toUpperCase().trim(),
        type: newType,
        value: parseFloat(newValue),
        min_order_value: parseFloat(newMinOrder) || 0,
        max_discount_cap: newMaxCap ? parseFloat(newMaxCap) : undefined,
      });
      setIsModalOpen(false);
      setNewCode('');
      setNewValue('');
      fetchDiscounts();
    } catch (err: any) {
      alert(`Error creating discount: ${err.message}`);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <Tag className="w-6 h-6 text-brand-400" />
            <span>Dynamic Discounts & Coupon Engine</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure tiered percentage discounts, flat coupons, and min order constraints for {activeMerchant?.name}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon Code</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {discounts.map((d) => (
          <div key={d._id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-black text-white px-2.5 py-1 rounded-lg bg-surface-950 border border-slate-700">
                {d.code}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {d.status}
              </span>
            </div>

            <div className="text-xs text-slate-300">
              {d.type === 'PERCENTAGE' && <span><strong>{d.value}% Off</strong> across eligible items</span>}
              {d.type === 'FIXED_AMOUNT' && <span>Flat <strong>₹{d.value} Off</strong> your cart</span>}
              {d.type === 'FREE_SHIPPING' && <span><strong>100% Free Shipping</strong> applied</span>}
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1 font-mono">
              <div>Min Order Value: ₹{d.min_order_value}</div>
              {d.max_discount_cap && <div>Max Cap: ₹{d.max_discount_cap}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white">Create Promo Coupon</h2>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Coupon Code (Uppercase)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE20"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Discount Type</label>
                  <select
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                    <option value="FREE_SHIPPING">Free Shipping</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 15 or 200"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Min Order Value (₹)</label>
                  <input
                    type="number"
                    value={newMinOrder}
                    onChange={(e) => setNewMinOrder(e.target.value)}
                    className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Max Cap (₹, Optional)</label>
                  <input
                    type="number"
                    value={newMaxCap}
                    onChange={(e) => setNewMaxCap(e.target.value)}
                    className="w-full bg-surface-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
