import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ScanFace,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AttendancePage: React.FC = () => {
  const { attendance } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = attendance.filter(a => {
    const matchesDate = !selectedDate || a.date === selectedDate;
    const matchesSearch =
      a.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDate && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto antialiased font-sans text-white">
      {/* Header (Dark Navy Box matching Image) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1528] p-6 rounded-2xl border border-[#1E2E4E] shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Attendance Terminal
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Live Biometric Feed
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Real-time biometric attendance ledger, facial confidence scores, and shift timestamps.
          </p>
        </div>

        <Link
          to="/facial-verification"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#22C55E] to-[#16a34a] hover:from-[#16a34a] text-white text-xs font-bold rounded-xl shadow-md transition-all"
        >
          <ScanFace className="w-4 h-4" />
          <span>Launch AI Facial Kiosk</span>
        </Link>
      </div>

      {/* Filter and Search Bar (Dark Navy Box) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0B1528] p-4 rounded-2xl border border-[#1E293B] shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search attendee by name, ID, department..."
            className="w-full pl-9 pr-4 py-2 bg-[#060B18] border border-[#1E293B] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="p-2 text-xs rounded-xl bg-[#060B18] border border-[#1E293B] text-slate-200 font-medium"
          />
        </div>
      </div>

      {/* Attendance Register Table (Dark Navy Box) */}
      <div className="bg-[#080E1C] rounded-2xl border border-[#1E293B] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060B18] border-b border-[#1E293B] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Attendee</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Check-In</th>
                <th className="py-3.5 px-4">Check-Out</th>
                <th className="py-3.5 px-4">Verification Method</th>
                <th className="py-3.5 px-4">Confidence Score</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/70">
              {filtered.map(rec => (
                <tr key={rec.id} className="hover:bg-[#0E1B33]/60 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-bold text-white">{rec.employeeName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {rec.employeeId} • {rec.department}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">{rec.date}</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    {rec.checkInTime}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{rec.checkOutTime}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-blue-950/60 text-[#38BDF8] border border-blue-800/80">
                      <ScanFace className="w-3 h-3" />
                      {rec.verificationMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-300">
                    {rec.confidenceScore}%
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      rec.status === 'PRESENT'
                        ? 'bg-[#042F20] text-[#34D399] border border-[#065F46]'
                        : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                    }`}>
                      {rec.status}
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
