import React, { useState, useEffect } from 'react';
import { PackageCheck, Clock, CheckCircle2, User, Phone, MapPin, DollarSign } from 'lucide-react';
import { Order, Merchant } from '../../types';
import { ApiService } from '../../services/api';

interface OrderHubProps {
  activeMerchant: Merchant | null;
}

export const OrderHub: React.FC<OrderHubProps> = ({ activeMerchant }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchOrders();
  }, [activeMerchant?._id]);

  const fetchOrders = async () => {
    if (!activeMerchant) return;
    try {
      const res = await ApiService.listOrders();
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
          <PackageCheck className="w-6 h-6 text-brand-400" />
          <span>Voice Commerce Orders & Fulfillment</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Real-time stream of orders generated and confirmed via autonomous voice sessions for {activeMerchant?.name}
        </p>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Order #</th>
              <th className="py-3.5 px-4">Customer</th>
              <th className="py-3.5 px-4">Purchased Items</th>
              <th className="py-3.5 px-4">Pricing Breakdown</th>
              <th className="py-3.5 px-4">Fulfillment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {orders.map((o) => (
              <tr key={o._id} className="hover:bg-slate-800/30 transition">
                <td className="py-3.5 px-4">
                  <span className="font-mono font-bold text-white block">#{o.order_number}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(o.created_at).toLocaleDateString()}
                  </span>
                </td>

                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-200">{o.customer.name}</div>
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>{o.customer.phone}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 line-clamp-1">
                    {o.customer.shipping_address?.city}, {o.customer.shipping_address?.state}
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <div className="space-y-1">
                    {o.items.map((it, idx) => (
                      <div key={idx} className="text-slate-300">
                        <strong>{it.quantity}x</strong> {it.title} (₹{it.unit_price})
                      </div>
                    ))}
                  </div>
                </td>

                <td className="py-3.5 px-4 font-mono">
                  <div className="font-bold text-emerald-400">₹{o.pricing.grand_total.toLocaleString()}</div>
                  {o.pricing.discount_total > 0 && (
                    <div className="text-[10px] text-purple-400">
                      -{o.pricing.discount_total} ({o.pricing.coupon_applied || 'Coupon'})
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400">
                    Payment: <span className="font-semibold text-slate-200">{o.payment_status}</span>
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      o.fulfillment_status === 'DELIVERED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : o.fulfillment_status === 'SHIPPED'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {o.fulfillment_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
