import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Moon,
  Sun,
  Server,
  Save,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { isDarkMode, toggleTheme, showToast } = useApp();

  const [companyName, setCompanyName] = useState('Modela Technologies Inc.');
  const [sessionTimeout, setSessionTimeout] = useState('60');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Preferences Saved', 'System configurations successfully updated.');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto antialiased font-sans text-white">
      {/* Header (Dark Navy Box matching Image) */}
      <div className="bg-[#0B1528] p-6 rounded-2xl border border-[#1E2E4E] shadow-xl">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          System Settings &amp; Governance
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Organization profile, RBAC policy thresholds, theme parameters, and notification endpoints.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance (Dark Navy Box) */}
        <div className="bg-[#0B1528] p-6 rounded-2xl border border-[#1E293B] shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            {isDarkMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            Interface Appearance &amp; Theme
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">Dark Mode Interface</p>
              <p className="text-[11px] text-slate-400">Toggle high-contrast obsidian dark palette</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${isDarkMode ? 'bg-emerald-600' : 'bg-slate-700'}`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6.5' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
        </div>

        {/* Organization Config (Dark Navy Box) */}
        <div className="bg-[#0B1528] p-6 rounded-2xl border border-[#1E293B] shadow-xl space-y-4 text-xs">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-[#38BDF8]" />
            Tenant Configuration
          </h2>

          <div className="space-y-1">
            <label className="font-bold text-slate-300">Organization Legal Entity</label>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#060B18] border border-[#1E293B] text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300">Inactivity Session Timeout (Minutes)</label>
            <input
              type="number"
              value={sessionTimeout}
              onChange={e => setSessionTimeout(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#060B18] border border-[#1E293B] text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#22C55E] to-[#16a34a] hover:from-[#16a34a] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
