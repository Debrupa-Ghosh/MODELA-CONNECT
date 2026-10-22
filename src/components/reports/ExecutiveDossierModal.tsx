import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { generateExecutiveDossierPDF } from '../../utils/executiveDossierGenerator';
import {
  X,
  Download,
  Printer,
  ShieldCheck,
  Building,
  TrendingUp,
  CreditCard,
  BarChart3,
  FileText,
  CheckCircle2,
  Cpu
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (title: string, msg: string) => void;
}

export const ExecutiveDossierModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onNotify
}) => {
  const { employees, payroll, attendance, staffRequests } = useApp();
  const { currentUser } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPDF = () => {
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
      onNotify?.(
        'Executive Dossier Downloaded',
        'Official Q4 Executive Workforce Dossier PDF has been generated and saved to your device.'
      );
    } catch (e) {
      console.error('Failed to export executive dossier PDF:', e);
      onNotify?.('Export Error', 'Failed to generate executive dossier PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#0B1528] border border-[#1E2E4E] rounded-3xl shadow-2xl p-6 sm:p-7 text-white font-sans space-y-6 my-auto max-h-[90vh] overflow-y-auto">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800 text-sky-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Executive Workforce Dossier</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-950 text-sky-300 border border-blue-800">
                  Q4 Audit
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Quarterly headcount demographics, biometric compliance, and compensation audit
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dossier Body Preview */}
        <div className="space-y-5 bg-[#080E1C] border border-[#1E293B] rounded-2xl p-5">
          
          {/* Metadata Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B]/70 pb-4 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Organization</span>
              <p className="font-bold text-white text-sm">Modela Connect Technologies Inc.</p>
              <p className="text-[11px] text-slate-400">San Francisco HQ • EIN: 84-2910481</p>
            </div>
            <div className="sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Classification</span>
              <span className="text-rose-400 font-bold font-mono">CONFIDENTIAL • C-SUITE</span>
              <p className="text-[11px] text-slate-400 font-mono">Ref: DOS-2026-Q4-MOD</p>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-[#0B1528] rounded-xl border border-[#1E293B]">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Retention &amp; Stability</span>
              <span className="text-xl font-extrabold text-[#38BDF8] block mt-1">97.8%</span>
              <span className="text-[10px] text-slate-400">Annualized attrition &lt; 2.2%</span>
            </div>

            <div className="p-3.5 bg-[#0B1528] rounded-xl border border-[#1E293B]">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Biometric Compliance</span>
              <span className="text-xl font-extrabold text-[#38BDF8] block mt-1">99.1%</span>
              <span className="text-[10px] text-slate-400">First-pass facial scan matches</span>
            </div>

            <div className="p-3.5 bg-[#0B1528] rounded-xl border border-[#1E293B]">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Average Tenure</span>
              <span className="text-xl font-extrabold text-white block mt-1">2.4 Yrs</span>
              <span className="text-[10px] text-slate-400">Across corporate departments</span>
            </div>
          </div>

          {/* Department Compensation Breakdown Table */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-sky-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Monthly Compensation Burden by Department
              </h4>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#1E293B] bg-[#060D1A]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B1528] text-slate-400 text-[10px] uppercase font-bold border-b border-[#1E293B]">
                  <tr>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Monthly Allocation</th>
                    <th className="py-2.5 px-3">Share</th>
                    <th className="py-2.5 px-3 text-right">Operational Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/70 text-[11px]">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-white">Engineering</td>
                    <td className="py-2 px-3 font-mono text-slate-200">Rs. 30,500</td>
                    <td className="py-2 px-3 text-sky-400 font-bold">54%</td>
                    <td className="py-2 px-3 text-right text-emerald-400 font-bold">OPTIMAL</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-white">Product Design</td>
                    <td className="py-2 px-3 font-mono text-slate-200">Rs. 10,700</td>
                    <td className="py-2 px-3 text-sky-400 font-bold">19%</td>
                    <td className="py-2 px-3 text-right text-emerald-400 font-bold">OPTIMAL</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-white">Security &amp; Compliance</td>
                    <td className="py-2 px-3 font-mono text-slate-200">Rs. 9,200</td>
                    <td className="py-2 px-3 text-sky-400 font-bold">16%</td>
                    <td className="py-2 px-3 text-right text-emerald-400 font-bold">COMPLIANT</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-white">Human Resources</td>
                    <td className="py-2 px-3 font-mono text-slate-200">Rs. 6,200</td>
                    <td className="py-2 px-3 text-sky-400 font-bold">11%</td>
                    <td className="py-2 px-3 text-right text-emerald-400 font-bold">BALANCED</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Biometric Telemetry & Hardware Nodes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-[#060D1A] rounded-xl border border-[#1E293B] space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Biometric Check-In Methods
              </span>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-300">Facial AI Vector Match</span>
                  <span className="font-bold text-sky-400">142 logs (88%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Manual Supervisor Override</span>
                  <span className="font-bold text-amber-400">14 logs (9%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Emergency Physical Keycard</span>
                  <span className="font-bold text-slate-400">5 logs (3%)</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-[#060D1A] rounded-xl border border-[#1E293B] space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Edge Kiosk Telemetry
              </span>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-300">Optical Kiosk Alpha (SF HQ)</span>
                  <span className="text-emerald-400 font-bold">ONLINE (99.98%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Optical Kiosk Beta (Austin)</span>
                  <span className="text-emerald-400 font-bold">ONLINE (100.0%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">AI Face-Vector Hash Engine</span>
                  <span className="text-emerald-400 font-bold">AES-256 SECURE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cryptographic Compliance Seal */}
          <div className="p-3.5 bg-[#0B1528] rounded-xl border border-[#1E293B] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-white text-[11px]">Cryptographic Compliance Seal</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  SHA256-DOS-8492041-9874AFB • Modela Connect Enterprise
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                AUDIT VERIFIED
              </span>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-950/50 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating PDF...' : 'Download PDF Dossier'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
