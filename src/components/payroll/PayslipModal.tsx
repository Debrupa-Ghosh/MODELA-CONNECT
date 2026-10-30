import React, { useState } from 'react';
import { PayrollRecord, Employee } from '../../types';
import { generatePayslipPDF } from '../../utils/payslipGenerator';
import {
  X,
  Download,
  Printer,
  FileText
} from 'lucide-react';

interface Props {
  record: PayrollRecord | null;
  employee?: Employee;
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (title: string, msg: string) => void;
}

export const PayslipModal: React.FC<Props> = ({
  record,
  employee,
  isOpen,
  onClose,
  onNotify
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !record) return null;

  const handleDownloadPDF = () => {
    setIsGenerating(true);
    try {
      generatePayslipPDF({
        record,
        employee,
        autoDownload: true
      });
      onNotify?.(
        'Salary Slip Downloaded',
        `Official salary slip for ${record.employeeName} (${record.month} ${record.year}) downloaded successfully.`
      );
    } catch (e) {
      console.error('Failed to generate payslip PDF:', e);
      onNotify?.('Export Failed', 'Could not generate payslip PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Mathematical calculations matching the exact formula
  const basicAmt = record.basicSalary || 0;
  const hra = record.allowanceBreakdown?.hra ?? Math.round(record.allowances * 0.4);
  const medical = record.allowanceBreakdown?.medical ?? Math.round(record.allowances * 0.15);
  const special = record.allowanceBreakdown?.special ?? Math.round(record.allowances * 0.35);
  const internet = record.allowanceBreakdown?.internet ?? Math.max(0, record.allowances - (hra + medical + special));
  const otAmount = Number(record.otAmount) || 0;
  const grossSalary = basicAmt + record.allowances + otAmount;

  const pt = record.deductionBreakdown?.professionalTax ?? 200;
  const pf = record.deductionBreakdown?.pfContribution ?? 1800;
  const healthInsurance = record.deductionBreakdown?.groupHealthInsurance ?? 1700;
  const standardDed = pt + pf + healthInsurance;

  const lopDays = record.lopDays || 0;
  const paidDays = Math.max(0, +((30 - lopDays).toFixed(2)));
  const baseNet = (basicAmt + record.allowances) - standardDed;
  const lopAmount = record.lopAmount !== undefined ? record.lopAmount : +((baseNet / 30) * lopDays).toFixed(2);
  const totalDeductions = record.deductions || (standardDed + lopAmount);
  const netPayable = +(grossSalary - totalDeductions).toFixed(2);

  const payPeriod = `${record.month.substring(0, 3)}-${String(record.year).substring(2)}`;
  const paymentDate = record.paymentDate || `1/${record.month === 'September' ? '10' : '11'}/${record.year}`;
  const doj = employee?.joiningDate || '20/07/2026';
  const pan = employee?.pan || record.pan || 'ITHPK8827F';
  const bankAcc = employee?.bankAccount || record.bankAccount || '815801500344';

  const formatCurr = (val: number) => {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto bg-white text-slate-900 border border-slate-300 rounded-2xl shadow-2xl p-6 sm:p-8 font-sans my-auto print:p-0 print:border-none print:shadow-none print:max-h-none print:overflow-visible">
        
        {/* Top Floating Action Bar (hidden in print) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5 print:hidden">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-blue-700" />
            <h2 className="text-base font-bold text-slate-800">
              Official Salary Slip Voucher — {record.employeeName}
            </h2>
            <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
              {record.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SALARY SLIP DOCUMENT (Exact visual match of Image 3) */}
        <div className="border border-slate-800 text-slate-900 text-xs">
          
          {/* Header */}
          <div className="p-3 text-center border-b border-slate-800 space-y-0.5">
            <h1 className="text-lg font-bold text-blue-800 tracking-wide uppercase">
              MODELA TECHNOLOGIES PVT. LTD.
            </h1>
            <p className="text-[11px] text-slate-700">
              #W2, 11WS16, 11th Floor, West Block, Mani Casadona, Newtown, Kolkata – 700156
            </p>
            <p className="text-[11px] text-slate-600 font-mono">
              www.modelatech.com
            </p>
          </div>

          {/* GST Bar */}
          <div className="flex border-b border-slate-800 px-3 py-1.5 text-[11px]">
            <span className="font-semibold text-slate-700">GST Registration No.:</span>
            <span className="font-bold text-slate-900 ml-3">19AAVCM0271D1ZB</span>
          </div>

          {/* SALARY SLIP Banner */}
          <div className="bg-[#1E50A0] text-white font-bold text-center py-1.5 text-sm uppercase tracking-wider border-b border-slate-800">
            SALARY SLIP
          </div>

          {/* Employee Metadata Grid (2 Columns, 6 Rows) */}
          <div className="grid grid-cols-2 text-[11px] border-b border-slate-800">
            {/* Left Column */}
            <div className="border-r border-slate-800 divide-y divide-slate-800">
              <div className="grid grid-cols-2 p-1.5">
                <span className="font-bold text-slate-800">Employee Name</span>
                <span className="text-slate-900">{record.employeeName}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span className="font-bold text-slate-800">Designation</span>
                <span className="text-slate-900">{employee?.designation || 'SR. BIM Engineer'}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span className="font-bold text-slate-800">Pay Period</span>
                <span className="text-slate-900 font-mono">{payPeriod}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span className="font-bold text-slate-800">PAN</span>
                <span className="text-slate-900 font-mono">{pan}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span className="font-bold text-slate-800">Bank A/C</span>
                <span className="text-slate-900 font-mono">{bankAcc}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span className="font-bold text-slate-800">Working Days</span>
                <span className="text-slate-900 font-mono">30</span>
              </div>
            </div>

            {/* Right Column */}
            <div className="divide-y divide-slate-800">
              <div className="grid grid-cols-2 p-1.5">
                <span className="font-bold text-slate-800">Employee ID</span>
                <span className="text-slate-900 font-mono">{record.employeeId}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span className="font-bold text-slate-800">Department</span>
                <span className="text-slate-900">{employee?.department || 'MEP'}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span className="font-bold text-slate-800">Date of Joining</span>
                <span className="text-slate-900 font-mono">{doj}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span className="font-bold text-slate-800">UAN</span>
                <span className="text-slate-900 font-mono">{employee?.uan || ''}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span className="font-bold text-slate-800">Payment Date</span>
                <span className="text-slate-900 font-mono">{paymentDate}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span className="font-bold text-slate-800">Paid Days</span>
                <span className="text-slate-900 font-mono">{paidDays}</span>
              </div>
            </div>
          </div>

          {/* Section 1: EARNINGS & DEDUCTIONS Header */}
          <div className="bg-[#1E50A0] text-white font-bold px-3 py-1 text-xs border-b border-slate-800">
            EARNINGS &amp; DEDUCTIONS
          </div>

          {/* Table Headers */}
          <div className="grid grid-cols-2 border-b border-slate-800 bg-slate-100 font-bold text-[11px]">
            <div className="grid grid-cols-2 p-1.5 border-r border-slate-800">
              <span>EARNINGS</span>
              <span className="text-right">MONTHLY (₹)</span>
            </div>
            <div className="grid grid-cols-2 p-1.5">
              <span>DEDUCTIONS</span>
              <span className="text-right">MONTHLY (₹)</span>
            </div>
          </div>

          {/* Line items */}
          <div className="grid grid-cols-2 text-[11px] border-b border-slate-800">
            <div className="border-r border-slate-800 divide-y divide-slate-800">
              <div className="grid grid-cols-2 p-1.5">
                <span>Basic Salary</span>
                <span className="text-right font-mono">{formatCurr(basicAmt)}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>House Rent Allowance (HRA)</span>
                <span className="text-right font-mono">{formatCurr(hra)}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>Medical Allowance</span>
                <span className="text-right font-mono">{formatCurr(medical)}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>Special Allowance</span>
                <span className="text-right font-mono">{formatCurr(special)}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>Internet Allowance</span>
                <span className="text-right font-mono">{formatCurr(internet)}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>OT</span>
                <span className="text-right font-mono">{formatCurr(otAmount)}</span>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              <div className="grid grid-cols-2 p-1.5">
                <span>Professional Tax</span>
                <span className="text-right font-mono">{formatCurr(pt)}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>Employee PF Contribution</span>
                <span className="text-right font-mono">{formatCurr(pf)}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>Group Health Insurance</span>
                <span className="text-right font-mono">{formatCurr(healthInsurance)}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>LOP ({lopDays} {lopDays === 1 ? 'day' : 'days'})</span>
                <span className="text-right font-mono">{formatCurr(lopAmount)}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>&nbsp;</span>
                <span className="text-right font-mono">&nbsp;</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>&nbsp;</span>
                <span className="text-right font-mono">&nbsp;</span>
              </div>
            </div>
          </div>

          {/* Gross Salary & Total Deductions */}
          <div className="grid grid-cols-2 font-bold text-[11px] border-b border-slate-800 bg-slate-50">
            <div className="grid grid-cols-2 p-1.5 border-r border-slate-800">
              <span>Gross Salary</span>
              <span className="text-right font-mono">{formatCurr(grossSalary)}</span>
            </div>
            <div className="grid grid-cols-2 p-1.5">
              <span>Total Deductions</span>
              <span className="text-right font-mono">{formatCurr(totalDeductions)}</span>
            </div>
          </div>

          {/* NET SALARY PAYABLE */}
          <div className="grid grid-cols-2 font-bold text-xs border-b border-slate-800 bg-emerald-50 text-emerald-950 p-2">
            <span className="tracking-wide">NET SALARY PAYABLE</span>
            <span className="text-right font-mono font-black text-sm text-emerald-800">
              ₹{formatCurr(netPayable)}
            </span>
          </div>

          {/* Section 2: EMPLOYER CONTRIBUTIONS & CTC INFORMATION (Component Section) */}
          <div className="bg-[#1E50A0] text-white font-bold px-3 py-1.5 text-xs border-b border-t border-slate-800 mt-3">
            EMPLOYER CONTRIBUTIONS &amp; CTC INFORMATION
          </div>

          <div className="grid grid-cols-2 border-b border-slate-800 bg-slate-100 font-bold text-[11px]">
            <div className="grid grid-cols-2 p-1.5 border-r border-slate-800">
              <span>Component</span>
              <span className="text-right">Monthly (₹)</span>
            </div>
            <div className="grid grid-cols-2 p-1.5">
              <span>Component</span>
              <span className="text-right">Monthly (₹)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 text-[11px] border-b border-slate-800">
            <div className="border-r border-slate-800 divide-y divide-slate-800">
              <div className="grid grid-cols-2 p-1.5">
                <span>Employer PF Contribution</span>
                <span className="text-right font-mono">{formatCurr(pf)}</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>Annual Bonus*</span>
                <span className="text-right font-mono">0.00</span>
              </div>
              <div className="grid grid-cols-2 p-1.5 font-bold">
                <span>Total Additional Benefits</span>
                <span className="text-right font-mono">{formatCurr(pf)}</span>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              <div className="grid grid-cols-2 p-1.5">
                <span>Group Health Insurance</span>
                <span className="text-right font-mono">0</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>&nbsp;</span>
                <span className="text-right font-mono">&nbsp;</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>&nbsp;</span>
                <span className="text-right font-mono">&nbsp;</span>
              </div>
            </div>
          </div>

          {/* Section 3: Leave Balance */}
          <div className="bg-[#1E50A0] text-white font-bold px-3 py-1.5 text-xs border-b border-t border-slate-800 mt-3">
            Leave Balance
          </div>

          <div className="grid grid-cols-2 text-[11px] border-b border-slate-800">
            <div className="border-r border-slate-800 divide-y divide-slate-800">
              <div className="grid grid-cols-2 p-1.5">
                <span>PL Enjoyed</span>
                <span className="text-right font-mono">0</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>PL Balance</span>
                <span className="text-right font-mono">3</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>LOP</span>
                <span className="text-right font-mono">{lopDays}</span>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              <div className="grid grid-cols-2 p-1.5">
                <span>SL Enjoyed</span>
                <span className="text-right font-mono">0</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>SL Balance</span>
                <span className="text-right font-mono">3</span>
              </div>
              <div className="grid grid-cols-2 p-1.5">
                <span>&nbsp;</span>
                <span className="text-right font-mono">&nbsp;</span>
              </div>
            </div>
          </div>

          {/* Computer Generated Notice */}
          <div className="p-2 text-center italic text-[10px] text-slate-600 border-b border-slate-800">
            This is a computer-generated salary slip and does not require a physical signature.
          </div>

          {/* Signatory Box */}
          <div className="p-3 text-center font-bold text-[11px] text-slate-800">
            For Modela Technologies Pvt. Ltd. Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
};
