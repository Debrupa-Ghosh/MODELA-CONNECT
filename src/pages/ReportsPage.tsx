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

      {/* 2 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Interactive Executive Dossier Preview Modal */}
      <ExecutiveDossierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNotify={showToast}
      />
    </div>
  );
};
