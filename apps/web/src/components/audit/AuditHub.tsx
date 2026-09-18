import React, { useState, useEffect } from 'react';
import { Shield, Clock, Terminal, User, FileText } from 'lucide-react';
import { AuditLog, Merchant } from '../../types';
import { ApiService } from '../../services/api';

interface AuditHubProps {
  activeMerchant: Merchant | null;
}

export const AuditHub: React.FC<AuditHubProps> = ({ activeMerchant }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchLogs();
  }, [activeMerchant?._id]);

  const fetchLogs = async () => {
    try {
      const res = await ApiService.listAuditLogs();
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
          <Shield className="w-6 h-6 text-brand-400" />
          <span>Tamper-Evident Audit Trail & Security Logs</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Cryptographically recorded administrative mutations, prompt activations, and tenant actions
        </p>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Action</th>
              <th className="py-3.5 px-4">Resource</th>
              <th className="py-3.5 px-4">Actor</th>
              <th className="py-3.5 px-4">IP / Details</th>
              <th className="py-3.5 px-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {logs.map((l) => (
              <tr key={l._id} className="hover:bg-slate-800/30 transition">
                <td className="py-3.5 px-4">
                  <span className="font-mono font-bold text-brand-400">{l.action}</span>
                </td>
                <td className="py-3.5 px-4 text-slate-300">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                    {l.resource_type}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-300">
                  {l.actor_email || 'System'}
                </td>
                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                  {l.ip_address || '127.0.0.1'}
                </td>
                <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                  {new Date(l.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
