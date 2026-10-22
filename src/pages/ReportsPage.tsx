import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { generateExecutiveDossierPDF } from '../utils/executiveDossierGenerator';
import { ExecutiveDossierModal } from '../components/reports/ExecutiveDossierModal';
import {
  Download,
  CreditCard,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Building,
  Eye
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { employees, payroll, attendance, staffRequests, showToast } = useApp();
  const { currentUser } = useAuth();

  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    try {
      generateExecutiveDossierPDF({
        employees,
        payroll,
        attendance,
        staffRequests,
        currentUser,
        autoDownload: true
      });
      showToast(
        'Executive Dossier Generated & Downloaded',
        'Official Q4 Executive Workforce Dossier PDF has been downloaded.'
      );
      setIsModalOpen(true);
    } catch (err) {
      console.error('Failed generating executive dossier PDF:', err);
      showToast('Export Error', 'Failed to generate executive dossier PDF.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto antialiased font-sans text-white">
      {/* Header (Dark Navy Box matching Image) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1528] p-6 rounded-2xl border border-[#1E2E4E] shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Analytics &amp; Executive Reports
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-950/80 text-sky-300 border border-blue-800">
              Live Aggregations
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Headcount metrics, biometric attendance compliance, and compensation distributions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 bg-[#131E36] hover:bg-[#1E2E4E] text-slate-300 hover:text-white rounded-xl border border-[#203050] transition-colors cursor-pointer"
            title="Preview Executive Dossier"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#131E36] hover:bg-blue-600 hover:border-blue-500 text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-[#203050] shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>{isExporting ? 'Generating PDF...' : 'Export Executive Dossier'}</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards (Matches Image 6) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Retention & Stability */}
        <div className="p-5 bg-[#0B132B] rounded-2xl border border-[#1E293B] shadow-sm">
          <span className="text-xs font-semibold text-slate-400">
            Retention & Stability
          </span>
          <div className="text-2xl font-extrabold text-[#38BDF8] mt-2">
            97.8%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Annualized attrition &lt; 2.2%
          </div>
        </div>

        {/* Biometric Compliance */}
        <div className="p-5 bg-[#0B132B] rounded-2xl border border-[#1E293B] shadow-sm">
          <span className="text-xs font-semibold text-slate-400">
            Biometric Compliance
          </span>
          <div className="text-2xl font-extrabold text-[#38BDF8] mt-2">
            99.1%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            First-pass facial scan matches
          </div>
        </div>

        {/* Average Tenure */}
        <div className="p-5 bg-[#0B132B] rounded-2xl border border-[#1E293B] shadow-sm">
          <span className="text-xs font-semibold text-slate-400">
            Average Tenure
          </span>
          <div className="text-2xl font-extrabold text-white mt-2">
            2.4 Yrs
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across corporate departments
          </div>
        </div>
      </div>

      {/* 2 Bottom Breakdown Cards (Matches Image 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Monthly Compensation Burden by Department */}
        <div className="p-6 bg-[#0B132B] rounded-2xl border border-[#1E293B] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1E293B] pb-3">
            <CreditCard className="w-4 h-4 text-[#38BDF8]" />
            <h2 className="text-sm font-bold text-white">
              Monthly Compensation Burden by Department
            </h2>
          </div>

          <div className="space-y-4 pt-1">
            {/* Engineering */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">Engineering</span>
                <span className="font-bold text-white font-mono">Rs. 30,500 (54%)</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '54%' }} />
              </div>
            </div>

            {/* Product Design */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">Product Design</span>
                <span className="font-bold text-white font-mono">Rs. 10,700 (19%)</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '19%' }} />
              </div>
            </div>

            {/* Security & Compliance */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">Security & Compliance</span>
                <span className="font-bold text-white font-mono">Rs. 9,200 (16%)</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-500 rounded-full" style={{ width: '16%' }} />
              </div>
            </div>

            {/* Human Resources */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">Human Resources</span>
                <span className="font-bold text-white font-mono">Rs. 6,200 (11%)</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sky-400 rounded-full" style={{ width: '11%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Biometric Check-in Method Distribution */}
        <div className="p-6 bg-[#0B132B] rounded-2xl border border-[#1E293B] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1E293B] pb-3">
            <BarChart3 className="w-4 h-4 text-[#38BDF8]" />
            <h2 className="text-sm font-bold text-white">
              Biometric Check-in Method Distribution
            </h2>
          </div>

          <div className="space-y-4 pt-1">
            {/* Facial AI Vector Match */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">Facial AI Vector Match</span>
                <span className="font-bold text-white font-mono">142 logs (88%)</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '88%' }} />
              </div>
            </div>

            {/* Manual Supervisor Override */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">Manual Supervisor Override</span>
                <span className="font-bold text-white font-mono">14 logs (9%)</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '9%' }} />
              </div>
            </div>

            {/* Emergency Physical Keycard */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">Emergency Physical Keycard</span>
                <span className="font-bold text-white font-mono">5 logs (3%)</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-600 rounded-full" style={{ width: '3%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Executive Dossier Preview Modal */}
      <ExecutiveDossierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNotify={showToast}
      />
    </div>
  );
};
