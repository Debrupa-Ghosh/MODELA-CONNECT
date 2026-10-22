import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { PayrollRecord, Employee } from '../types';
import { generatePayslipPDF } from '../utils/payslipGenerator';
import { PayslipModal } from '../components/payroll/PayslipModal';
import {
  CheckCircle2,
  XCircle,
  Download,
  Eye,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Edit3,
  Check,
  Info,
  ChevronDown,
  Lock
} from 'lucide-react';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const YEARS = Array.from({ length: 11 }, (_, i) => 2026 + i); // 2026 to 2036

export const PayrollPage: React.FC = () => {
  const { payroll, employees, showToast, updatePayrollRecord, togglePayrollStatus } = useApp();
  const { isSuperAdmin, isDirector, isExecutiveDirector, isHR, isHRManager, isManager, currentUser, approvedUsers } = useAuth();

  const canEditPayroll =
    isSuperAdmin ||
    isDirector ||
    isExecutiveDirector ||
    isHR ||
    isHRManager ||
    isManager ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DIRECTOR' ||
    currentUser?.role === 'EXECUTIVE_DIRECTOR' ||
    currentUser?.role === 'HR' ||
    currentUser?.role === 'HR_MANAGER' ||
    currentUser?.role === 'MANAGER';

  // Filter state for months and years (2026-2036)
  const [selectedMonth, setSelectedMonth] = useState<string>('October');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');

  // Breakdown inspection modals
  const [allowanceModalRecord, setAllowanceModalRecord] = useState<PayrollRecord | null>(null);
  const [deductionModalRecord, setDeductionModalRecord] = useState<PayrollRecord | null>(null);

  // Payslip view modal
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);

  // Inline LOP editing state
  const [editingLopId, setEditingLopId] = useState<string | null>(null);
  const [lopInputVal, setLopInputVal] = useState<string>('0');

  // Build unified payroll ledger for the selected cycle (combining stored records and active employees)
  const cycleRecords = useMemo(() => {
    const list: PayrollRecord[] = [];
    const processedPersonKeys = new Set<string>();
    const isNovDec = selectedMonth.toLowerCase() === 'november' || selectedMonth.toLowerCase() === 'december';

    const blockedDocIds = new Set([
      'PAY-2026-OCT-MOD',
      'PAY-2026-OCT-MOD0',
      'PAY-2026-OCT-MOD00',
      'PAY-2026-OCT-MOD000',
      'PAY-2026-OCT-MOD0001',
      'PAY-2026-OCT-MOD100',
      'PAY-2026-OCT-MOD01',
      'PAY-2026-OCT-MOD0090',
      'PAY-2026-OCT-MOD008',
      'PAY-2026-09-04',
      'PAY-2026-10-04',
      'PAY-2026-SEP-MOD007',
      'PAY-2026-OCT-MOD007',
      'PAY-2026-NOV-MOD007',
      'PAY-2026-DEC-MOD007',
      'PAY-2026-OCT-MOD001'
    ]);

    const isExcluded = (name?: string, empId?: string, docId?: string, email?: string) => {
      const n = (name || '').trim().toLowerCase();
      const id = (empId || '').trim().toUpperCase();
      const dId = (docId || '').trim().toUpperCase();
      const em = (email || '').trim().toLowerCase();

      if (dId && blockedDocIds.has(dId)) return true;
      if (
        n.includes('tony stark') ||
        (n.includes('tony') && n.includes('stark')) ||
        n.includes('piu roy') ||
        (n.includes('piu') && n.includes('roy')) ||
        id === 'MOD007' ||
        id === 'MOD008' ||
        id === 'MOD0090' ||
        dId === 'PAY-2026-09-04' ||
        dId === 'PAY-2026-10-04' ||
        dId.includes('MOD007') ||
        dId.includes('MOD008') ||
        dId.includes('MOD0090') ||
        em === 'ghoshdebrupa005@gmail.com' ||
        em.includes('tonystark') ||
        em.includes('tony.stark') ||
        em.includes('piuroy') ||
        em.includes('piu.roy') ||
        (em.includes('piu') && em.includes('roy')) ||
        dId.includes('TONY') ||
        dId.includes('STARK') ||
        dId.includes('PIU')
      ) {
        return true;
      }
      if (id === 'MOD01' || dId.endsWith('-MOD01')) {
        return true;
      }
      if (
        n === 'modela tech' &&
        (id === 'MOD' || id === 'MOD0' || id === 'MOD00' || id === 'MOD0001' || id === 'MOD100')
      ) {
        return true;
      }
      return false;
    };

    const getPersonKey = (name?: string, empId?: string, docId?: string, email?: string): string => {
      const n = (name || '').trim().toLowerCase();
      const id = (empId || '').trim().toUpperCase();
      const dId = (docId || '').trim().toUpperCase();
      const em = (email || '').trim().toLowerCase();

      if (n === 'modela tech' || em === 'modelatech2026@gmail.com') return 'modela-tech';
      if (n === 'sushoovan das' || em === 'sushovand@modelatech.com') return 'sushoovan-das';
      if (n === 'debrupa ghosh') {
        if (em === 'surupa008@gmail.com' || id === 'MOD011' || dId.endsWith('-MOD011')) {
          return 'debrupa-ghosh-surupa008';
        }
        if (em === 'ghoshdebrupa005@gmail.com' || id === 'MOD007' || dId === 'PAY-2026-10-04' || dId === 'PAY-2026-09-04') {
          return 'debrupa-ghosh-primary';
        }
        return `debrupa-ghosh-${id || em}`;
      }
      return id ? `id-${id}` : `name-${n}`;
    };

    // 1. First add any existing stored payroll records for this month and year (strictly 1 per distinct person)
    payroll.forEach(p => {
      const matchMonth = Boolean(p.month && selectedMonth && p.month.toLowerCase() === selectedMonth.toLowerCase());
      const matchYear = Number(p.year) === Number(selectedYear);
      if (matchMonth && matchYear) {
        if (isExcluded(p.employeeName, p.employeeId, p.id)) return;

        const pKey = getPersonKey(p.employeeName, p.employeeId, p.id);
        if (processedPersonKeys.has(pKey)) {
          return;
        }

        list.push(p);
        processedPersonKeys.add(pKey);
      }
    });

    // 2. For any active employee without a stored record for this cycle, dynamically compute their row
    employees.forEach(emp => {
      const empFullName = `${emp.firstName} ${emp.lastName}`.trim() || emp.id;
      if (isExcluded(empFullName, emp.id, undefined, emp.email)) return;

      const pKey = getPersonKey(empFullName, emp.id, undefined, emp.email);
      if (!processedPersonKeys.has(pKey) && emp.status === 'ACTIVE') {
        processedPersonKeys.add(pKey);

        const isModela = pKey === 'modela-tech';
        const basic = isModela ? 95000 : (Number(emp.compensation?.basic) || 50000);
        const rawAllowances = isModela ? 30000 : (Number(emp.compensation?.allowances) || 15000);
        const hra = Number(emp.compensation?.allowanceBreakdown?.hra) || Math.round(rawAllowances * 0.4);
        const medical = Number(emp.compensation?.allowanceBreakdown?.medical) || Math.round(rawAllowances * 0.15);
        const special = Number(emp.compensation?.allowanceBreakdown?.special) || Math.round(rawAllowances * 0.35);
        const internet = Number(emp.compensation?.allowanceBreakdown?.internet) || Math.max(0, rawAllowances - (hra + medical + special));
        const totalAllowances = hra + medical + special + internet;

        const pt = Number(emp.compensation?.deductionBreakdown?.professionalTax) || 200;
        const pf = Number(emp.compensation?.deductionBreakdown?.pfContribution) || 1800;
        const health = Number(emp.compensation?.deductionBreakdown?.groupHealthInsurance) || 1700;
        const standardDeductions = pt + pf + health;

        const grossSalary = basic + totalAllowances;
        const netSalary = grossSalary - standardDeductions;

        const defaultCycleStatus: 'PAID' | 'UNPAID' = isNovDec ? 'UNPAID' : 'PAID';
        const paymentDate = defaultCycleStatus === 'PAID'
          ? `${selectedYear}-${String(MONTHS.indexOf(selectedMonth) + 1).padStart(2, '0')}-01`
          : '';

        list.push({
          id: `PAY-${selectedYear}-${selectedMonth.substring(0, 3).toUpperCase()}-${emp.id}`,
          employeeId: emp.id,
          employeeName: empFullName,
          month: selectedMonth,
          year: selectedYear,
          basicSalary: basic,
          allowances: totalAllowances,
          deductions: standardDeductions,
          grossSalary,
          netSalary,
          status: defaultCycleStatus,
          paymentDate,
          disbursedBy: defaultCycleStatus === 'PAID' ? 'System Master Disburser' : '',
          lopDays: 0,
          lopAmount: 0,
          allowanceBreakdown: { hra, medical, special, internet },
          deductionBreakdown: { professionalTax: pt, pfContribution: pf, groupHealthInsurance: health, lop: 0 }
        });
      }
    });

    // 3. Ensure any approved user in User Management is also visible even if employee sync is still in flight
    (approvedUsers || []).forEach(u => {
      const empId = (u.employeeId || '').trim().toUpperCase();
      const userFullName = (u.name || u.email?.split('@')[0] || empId).trim();
      if (!empId || isExcluded(userFullName, empId, undefined, u.email)) return;

      const pKey = getPersonKey(userFullName, empId, undefined, u.email);
      if (!processedPersonKeys.has(pKey)) {
        processedPersonKeys.add(pKey);

        const isModela = pKey === 'modela-tech';
        const isSushoovan = pKey === 'sushoovan-das';
        const basic = isModela ? 95000 : isSushoovan ? 85000 : 50000;
        const totalAllowances = isModela ? 30000 : isSushoovan ? 25000 : 15000;
        const hra = Math.round(totalAllowances * 0.4);
        const medical = Math.round(totalAllowances * 0.15);
        const special = Math.round(totalAllowances * 0.35);
        const internet = Math.max(0, totalAllowances - (hra + medical + special));

        const pt = 200;
        const pf = 1800;
        const health = 1700;
        const standardDeductions = pt + pf + health;
        const grossSalary = basic + totalAllowances;
        const netSalary = grossSalary - standardDeductions;

        const defaultCycleStatus: 'PAID' | 'UNPAID' = isNovDec ? 'UNPAID' : 'PAID';
        const paymentDate = defaultCycleStatus === 'PAID'
          ? `${selectedYear}-${String(MONTHS.indexOf(selectedMonth) + 1).padStart(2, '0')}-01`
          : '';

        list.push({
          id: `PAY-${selectedYear}-${selectedMonth.substring(0, 3).toUpperCase()}-${empId}`,
          employeeId: empId,
          employeeName: userFullName,
          month: selectedMonth,
          year: selectedYear,
          basicSalary: basic,
          allowances: totalAllowances,
          deductions: standardDeductions,
          grossSalary,
          netSalary,
          status: defaultCycleStatus,
          paymentDate,
          disbursedBy: defaultCycleStatus === 'PAID' ? 'System Master Disburser' : '',
          lopDays: 0,
          lopAmount: 0,
          allowanceBreakdown: { hra, medical, special, internet },
          deductionBreakdown: { professionalTax: pt, pfContribution: pf, groupHealthInsurance: health, lop: 0 }
        });
      }
    });

    return list;
  }, [payroll, employees, approvedUsers, selectedMonth, selectedYear]);

  // Filtered by status
  const filteredRecords = useMemo(() => {
    return cycleRecords.filter(r => {
      if (statusFilter === 'ALL') return true;
      return r.status === statusFilter;
    });
  }, [cycleRecords, statusFilter]);

  // Has at least one paid row in current view
  const hasPaidRecords = filteredRecords.some(r => r.status === 'PAID');

  const totalDisbursed = filteredRecords
    .filter(p => p.status === 'PAID')
    .reduce((acc, p) => acc + (p.netSalary || 0), 0);

  const handleDownloadPayslip = (p: PayrollRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const emp = employees.find(e => e.id === p.employeeId);
      generatePayslipPDF({
        record: p,
        employee: emp,
        autoDownload: true
      });
      showToast(
        'Payslip Generated & Downloaded',
        `Official PDF salary slip for ${p.employeeName} (${p.month} ${p.year}) downloaded.`
      );
    } catch (err) {
      console.error('Error generating payslip:', err);
      showToast('Generation Failed', 'Could not create payslip PDF.', 'error');
    }
  };

  // Requirement 2: after status to be paid and salary slip generation LOP can't be edited.
  const handleStartEditLop = (p: PayrollRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEditPayroll) return;
    if (p.status === 'PAID') {
      showToast('LOP Locked', 'LOP cannot be edited after status is PAID and salary slip is generated.', 'error');
      return;
    }
    setEditingLopId(p.id);
    setLopInputVal(String(p.lopDays || 0));
  };

  const handleSaveLop = async (p: PayrollRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (p.status === 'PAID') {
      showToast('LOP Locked', 'LOP cannot be edited after status is PAID and salary slip is generated.', 'error');
      setEditingLopId(null);
      return;
    }
    const rawVal = parseFloat(lopInputVal);
    const parsedDays = isNaN(rawVal) ? 0 : Math.max(0, Math.min(31, parseFloat(rawVal.toFixed(2))));
    await updatePayrollRecord(p.id, { lopDays: parsedDays }, p);
    setEditingLopId(null);
    showToast('LOP Updated', `Recalculated deductions & net compensation for ${p.employeeName} (${parsedDays} LOP days).`);
  };

  const handleToggleStatus = async (p: PayrollRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEditPayroll) return;
    await togglePayrollStatus(p.id, p);
  };

  const selectedEmployee = selectedRecord
    ? employees.find(
        e =>
          e.id === selectedRecord.employeeId ||
          `${e.firstName} ${e.lastName}`.trim().toLowerCase() === selectedRecord.employeeName.trim().toLowerCase()
      )
    : undefined;

  return (
    <div className="space-y-6 max-w-[1550px] mx-auto antialiased font-sans text-white">
      
      {/* Header (Dark Navy Box matching design) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0B1528] p-6 rounded-2xl border border-[#1E2E4E] shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Master Payroll Ledger
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {selectedMonth} {selectedYear} Cycle
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Master compensation disbursements, allowance breakdowns, statutory deductions, LOP calculations, and payslips.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right bg-[#080E1C] px-4 py-2.5 rounded-xl border border-[#1E2E4E]">
            <span className="text-[10px] text-slate-400 block font-mono">TOTAL DISBURSED ({selectedMonth} {selectedYear})</span>
            <span className="text-xl font-mono font-black text-emerald-400">
              ₹{totalDisbursed.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* FILTER BUTTONS BAR FOR MONTHS & YEARS (2026-2036) */}
      <div className="bg-[#080E1C] p-4 sm:p-5 rounded-2xl border border-[#1E2E4E] shadow-xl space-y-4">
        
        {/* Row 1: Year Selector (2026 - 2036) & Status Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-3.5">
          <div className="flex items-center gap-2.5">
            <label htmlFor="payroll-year-select" className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Year:
            </label>
            <div className="relative">
              <select
                id="payroll-year-select"
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-[#131E36] hover:bg-[#1A2846] text-white font-mono font-bold text-xs pl-3.5 pr-8 py-1.5 rounded-xl border border-[#203050] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors appearance-none shadow-xs"
              >
                {YEARS.map(yr => (
                  <option key={yr} value={yr} className="bg-[#0B1528] text-white font-mono font-medium py-1">
                    {yr}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#0B1528] p-1 rounded-xl border border-[#1E2E4E]">
            {(['ALL', 'PAID', 'UNPAID'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Month Filter Buttons (January - December) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            Month:
          </span>
          {MONTHS.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedMonth === m
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-900/40 ring-1 ring-blue-400'
                  : 'bg-[#131E36] hover:bg-[#1E2E4E] text-slate-300 border border-[#203050]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* LEDGER TABLE (Dark Navy Card matching screenshot) */}
      <div className="bg-[#080E1C] rounded-2xl border border-[#1E293B] shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060B18] border-b border-[#1E293B] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Employee Name</th>
                <th className="py-3.5 px-4">Cycle</th>
                <th className="py-3.5 px-4">Employee ID</th>
                <th className="py-3.5 px-4">Basic Pay</th>
                <th className="py-3.5 px-4">
                  <span className="flex items-center gap-1">
                    Allowances
                    <Info className="w-3 h-3 text-sky-400" />
                  </span>
                </th>
                <th className="py-3.5 px-4">
                  <span className="flex items-center gap-1">
                    Deduction
                    <Info className="w-3 h-3 text-rose-400" />
                  </span>
                </th>
                <th className="py-3.5 px-4">Net Compensation</th>
                <th className="py-3.5 px-4">
                  <span className="flex items-center gap-1">
                    LOP (Days)
                    {canEditPayroll && <Edit3 className="w-3 h-3 text-amber-400" />}
                  </span>
                </th>
                <th className="py-3.5 px-4">Status</th>
                {/* Payslip column ONLY visible if there are PAID records */}
                {hasPaidRecords && (
                  <th className="py-3.5 px-4 text-right">PaySlip</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/70">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={hasPaidRecords ? 10 : 9}
                    className="py-12 text-center text-slate-400"
                  >
                    No payroll entries found for {selectedMonth} {selectedYear} ({statusFilter}).
                  </td>
                </tr>
              ) : (
                filteredRecords.map(p => {
                  const isPaid = p.status === 'PAID';
                  const lopDaysVal = p.lopDays || 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#0E1B33]/60 transition-colors group"
                    >
                      {/* Employee Name */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-white group-hover:text-sky-300 transition-colors">
                            {p.employeeName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Rec ID: {p.id}
                          </p>
                        </div>
                      </td>

                      {/* Cycle */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-300 whitespace-nowrap">
                        {p.month} {p.year}
                      </td>

                      {/* Employee ID */}
                      <td className="py-3.5 px-4 font-mono text-sky-400 font-bold whitespace-nowrap">
                        {p.employeeId}
                      </td>

                      {/* Basic Pay */}
                      <td className="py-3.5 px-4 font-mono text-slate-200">
                        ₹{p.basicSalary.toLocaleString()}
                      </td>

                      {/* Allowances (Clickable to view breakdown) */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setAllowanceModalRecord(p)}
                          className="inline-flex items-center gap-1 font-mono text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40"
                          title="Click to view all allowances configured in Employees page"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                          <span>+₹{p.allowances.toLocaleString()}</span>
                        </button>
                      </td>

                      {/* Deduction (Clickable to view breakdown) */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setDeductionModalRecord(p)}
                          className="inline-flex items-center gap-1 font-mono text-rose-400 hover:text-rose-300 hover:underline cursor-pointer bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-800/40"
                          title="Click to view all deductions configured in Employees page"
                        >
                          <ArrowDownRight className="w-3 h-3" />
                          <span>-₹{p.deductions.toLocaleString()}</span>
                        </button>
                      </td>

                      {/* Net Compensation (Gross Salary - Total Deduction) */}
                      <td className="py-3.5 px-4 font-mono font-black text-white text-sm">
                        ₹{p.netSalary.toLocaleString()}
                      </td>

                      {/* LOP (Editable by HR and Super admin) */}
                      <td className="py-3.5 px-4">
                        {editingLopId === p.id ? (
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <input
                              type="number"
                              min="0"
                              max="31"
                              step="any"
                              value={lopInputVal}
                              onChange={e => setLopInputVal(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveLop(p, e as any);
                                } else if (e.key === 'Escape') {
                                  setEditingLopId(null);
                                }
                              }}
                              className="w-16 px-1.5 py-1 bg-[#060B18] border border-blue-500 rounded text-center text-white font-mono text-xs focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={e => handleSaveLop(p, e)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
                              title="Save LOP"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingLopId(null)}
                              className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-amber-300">
                              {lopDaysVal} {lopDaysVal === 1 ? 'day' : 'days'}
                            </span>
                            {canEditPayroll && (
                              isPaid ? (
                                <span
                                  className="p-1 text-slate-500 cursor-not-allowed inline-flex items-center"
                                  title="LOP locked: Status is PAID and salary slip is generated"
                                >
                                  <Lock className="w-3 h-3 text-slate-500" />
                                </span>
                              ) : (
                                <button
                                  onClick={e => handleStartEditLop(p, e)}
                                  className="p-1 hover:bg-[#131E36] rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                                  title="Edit LOP Days (HR Manager & Super Admin clearance)"
                                >
                                  <Edit3 className="w-3 h-3 text-amber-400" />
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status (PAID / UNPAID) */}
                      <td className="py-3.5 px-4">
                        <button
                          disabled={!canEditPayroll}
                          onClick={e => handleToggleStatus(p, e)}
                          title={
                            !canEditPayroll
                              ? undefined
                              : isPaid
                              ? "Click to revert to UNPAID"
                              : "Click to mark as PAID"
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                            !canEditPayroll
                              ? 'cursor-default'
                              : 'cursor-pointer hover:scale-105'
                          } ${
                            isPaid
                              ? 'bg-[#042F20] text-[#34D399] border border-[#065F46]'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>PAID</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>UNPAID</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* PaySlip column */}
                      {hasPaidRecords && (
                        <td className="py-3.5 px-4 text-right">
                          {isPaid ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedRecord(p)}
                                title="View Official Salary Slip"
                                className="p-1.5 rounded-lg bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-300 hover:text-white transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button
                                onClick={e => handleDownloadPayslip(p, e)}
                                title="Download PDF Salary Slip"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#131E36] hover:bg-blue-600 hover:border-blue-500 border border-[#203050] text-slate-200 hover:text-white text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
                              >
                                <Download className="w-3 h-3 text-sky-400" />
                                <span>Payslip</span>
                              </button>
                            </div>
                          ) : null}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ALLOWANCES BREAKDOWN MODAL (Shows all allowances set by Super Admin / HR) */}
      {allowanceModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#080E1C] border border-[#1E2E4E] rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Allowances Breakdown</h3>
              </div>
              <button
                onClick={() => setAllowanceModalRecord(null)}
                className="p-1.5 rounded-xl bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <p className="text-slate-400">
                Employee: <strong className="text-white">{allowanceModalRecord.employeeName}</strong> ({allowanceModalRecord.employeeId})
              </p>
              <p className="text-slate-400 font-mono">
                Cycle: {allowanceModalRecord.month} {allowanceModalRecord.year}
              </p>
            </div>

            <div className="bg-[#0B1528] rounded-xl border border-[#1E293B] p-4 divide-y divide-[#1E293B] text-xs">
              <div className="flex justify-between py-2">
                <span className="text-slate-300">House Rent Allowance (HRA)</span>
                <span className="font-mono font-bold text-emerald-400">
                  +₹{(allowanceModalRecord.allowanceBreakdown?.hra ?? Math.round(allowanceModalRecord.allowances * 0.4)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-300">Medical Allowance</span>
                <span className="font-mono font-bold text-emerald-400">
                  +₹{(allowanceModalRecord.allowanceBreakdown?.medical ?? Math.round(allowanceModalRecord.allowances * 0.15)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-300">Special Allowance</span>
                <span className="font-mono font-bold text-emerald-400">
                  +₹{(allowanceModalRecord.allowanceBreakdown?.special ?? Math.round(allowanceModalRecord.allowances * 0.35)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-300">Internet Allowance</span>
                <span className="font-mono font-bold text-emerald-400">
                  +₹{(allowanceModalRecord.allowanceBreakdown?.internet ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-3 font-bold text-sm">
                <span className="text-white">Total Allowances</span>
                <span className="font-mono text-emerald-400">
                  +₹{allowanceModalRecord.allowances.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAllowanceModalRecord(null)}
                className="px-4 py-2 bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDUCTIONS BREAKDOWN MODAL (Shows all deductions set by Super Admin / HR + LOP) */}
      {deductionModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#080E1C] border border-[#1E2E4E] rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base text-white">Deductions Breakdown</h3>
              </div>
              <button
                onClick={() => setDeductionModalRecord(null)}
                className="p-1.5 rounded-xl bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <p className="text-slate-400">
                Employee: <strong className="text-white">{deductionModalRecord.employeeName}</strong> ({deductionModalRecord.employeeId})
              </p>
              <p className="text-slate-400 font-mono">
                Cycle: {deductionModalRecord.month} {deductionModalRecord.year}
              </p>
            </div>

            <div className="bg-[#0B1528] rounded-xl border border-[#1E293B] p-4 divide-y divide-[#1E293B] text-xs">
              <div className="flex justify-between py-2">
                <span className="text-slate-300">Professional Tax</span>
                <span className="font-mono font-bold text-rose-400">
                  -₹{(deductionModalRecord.deductionBreakdown?.professionalTax ?? 200).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-300">Employee PF Contribution</span>
                <span className="font-mono font-bold text-rose-400">
                  -₹{(deductionModalRecord.deductionBreakdown?.pfContribution ?? 1800).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-300">Group Health Insurance</span>
                <span className="font-mono font-bold text-rose-400">
                  -₹{(deductionModalRecord.deductionBreakdown?.groupHealthInsurance ?? 1700).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <div>
                  <span className="text-slate-300 block">Loss of Pay (LOP)</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Net / 30 × {deductionModalRecord.lopDays || 0} days
                  </span>
                </div>
                <span className="font-mono font-bold text-rose-400">
                  -₹{(deductionModalRecord.lopAmount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-3 font-bold text-sm">
                <span className="text-white">Total Deductions</span>
                <span className="font-mono text-rose-400">
                  -₹{deductionModalRecord.deductions.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDeductionModalRecord(null)}
                className="px-4 py-2 bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Official Salary Slip Voucher Modal */}
      <PayslipModal
        record={selectedRecord}
        employee={selectedEmployee}
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        onNotify={showToast}
      />
    </div>
  );
};
