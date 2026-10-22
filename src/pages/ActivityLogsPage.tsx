import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CheckCircle2,
  Search,
} from 'lucide-react';

export const ActivityLogsPage: React.FC = () => {
  const { auditLogs } = useApp();
  const [search, setSearch] = useState('');

  const filtered = auditLogs.filter(log =>
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.executedBy.toLowerCase().includes(search.toLowerCase()) ||
    log.details.toLowerCase().includes(search.toLowerCase()) ||
    log.module.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto antialiased font-sans text-white">
      {/* Header (Dark Navy Box matching Image) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1528] p-6 rounded-2xl border border-[#1E2E4E] shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Immutable Activity Audit Logs
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Append-Only Ledger
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Tamper-resistant audit record of all identity modifications, biometric checks, and workflow authorizations.
          </p>
        </div>
      </div>

      {/* Search Bar (Dark Navy Box) */}
      <div className="bg-[#0B1528] p-4 rounded-2xl border border-[#1E293B] shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search audit trail by action, initiator, or details..."
            className="w-full pl-9 pr-4 py-2 bg-[#060B18] border border-[#1E293B] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Log Table (Dark Navy Box) */}
      <div className="bg-[#080E1C] rounded-2xl border border-[#1E293B] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060B18] border-b border-[#1E293B] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Event ID / Time</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Module</th>
                <th className="py-3.5 px-4">Initiated By</th>
                <th className="py-3.5 px-4">Details</th>
                <th className="py-3.5 px-4">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/70 font-mono text-[11px]">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-[#0E1B33]/60 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-200">{log.id}</p>
                    <p className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                  </td>
                  <td className="py-3 px-4 font-sans font-bold text-white">
                    {log.action}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-[#0B132B] border border-[#1E293B] text-[#38BDF8]">
                      {log.module}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-200">{log.executedBy}</td>
                  <td className="py-3 px-4 font-sans text-slate-300 max-w-xs truncate">
                    {log.details}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {log.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
