import React, { useState } from 'react';
import { Employee, StaffWorkflowRequest } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  X,
  Edit,
  Phone,
  Calendar,
  MapPin,
  User,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  FolderOpen,
  ArrowUpRight,
  Trash2
} from 'lucide-react';

interface EmployeeDossierModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (employee: Employee) => void;
  onDelete?: (employee: Employee) => void;
}

export const EmployeeDossierModal: React.FC<EmployeeDossierModalProps> = ({
  employee,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  const { staffRequests, attendance, payroll } = useApp();
  const [activeTab, setActiveTab] = useState<
    'Personal' | 'Employment' | 'Documents' | 'Attendance History' | 'Payroll' | 'Requests'
  >('Personal');

  if (!isOpen || !employee) return null;

  const employeeRequests = staffRequests.filter(r => r.employeeId === employee.id);
  const employeeAttendance = attendance.filter(a => a.employeeId === employee.id);
  const employeePayroll = payroll.find(p => p.employeeId === employee.id);

  const tabs: Array<'Personal' | 'Employment' | 'Documents' | 'Attendance History' | 'Payroll' | 'Requests'> = [
    'Personal',
    'Employment',
    'Documents',
    'Attendance History',
    'Payroll',
    'Requests'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#080E1C] border border-[#1E2E4E] rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-white font-sans">
        
        {/* Top Header Card (Matches Image 2 Exactly) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-[#1E293B] pb-6">
          <div className="flex items-center gap-4 sm:gap-5 flex-wrap sm:flex-nowrap">
            {/* EMP ID Badge */}
            <div className="bg-[#001E3D] border border-[#00558F] px-5 py-3 rounded-2xl flex flex-col items-center justify-center min-w-[105px] shadow-[0_0_20px_rgba(0,229,255,0.12)]">
              <span className="text-[10px] text-sky-400 font-extrabold uppercase tracking-widest">
                EMP ID
              </span>
              <span className="text-xl font-black font-mono text-[#00E5FF] tracking-tight mt-0.5">
                {employee.id}
              </span>
            </div>

            {/* Profile Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-black text-white tracking-tight">
                  {(!employee.firstName?.trim() && !employee.lastName?.trim())
                    ? (employee.email || '[Name Pending]')
                    : `${employee.firstName} ${employee.lastName}`}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-[#0A2540] border border-blue-500/60 text-[#38BDF8]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
                  ACTIVE
                </span>
                {(!employee.firstName?.trim() && !employee.lastName?.trim() && !employee.joiningDate?.trim()) && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                    Details Pending
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 font-medium">
                {employee.designation || 'Staff'}
                {employee.department && employee.department.trim().toLowerCase() !== 'general staff' && (
                  <>
                    {' • '}
                    <span className="text-[#38BDF8] font-bold">
                      {employee.department}
                    </span>
                  </>
                )}
              </p>

              <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 flex-wrap font-medium">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{employee.phone || '— (Contact Pending)'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>DOJ: {employee.joiningDate || '— (Pending)'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{employee.location || 'San Francisco HQ'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5 self-end md:self-start">
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(employee)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                title="Delete Employee Record"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Record</span>
              </button>
            )}

            {onEdit && (
              <button
                onClick={() => onEdit(employee)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-950/50 transition-all cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close Dossier"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation (Matches Image 2 Exactly) */}
        <div className="flex items-center gap-1 border-b border-[#1E293B] overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap rounded-t-xl ${
                  isActive
                    ? 'bg-[#0C2340] text-sky-300 border-b-2 border-blue-500 shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#0D182E]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* TAB 1: PERSONAL (Matches Image 2 Exactly) */}
        {activeTab === 'Personal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-150">
            {/* Left Card: Biographical & Contact Data */}
            <div className="bg-[#070D1D] p-5 rounded-2xl border border-[#1E293B] space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
                <User className="w-4 h-4 text-[#00E5FF]" />
                <span>BIOGRAPHICAL & CONTACT DATA</span>
              </div>

              <div className="space-y-3.5 pt-1">
                <div className="flex items-center justify-between text-xs py-1 border-b border-[#1E293B]/60">
                  <span className="text-slate-400">Legal First Name</span>
                  <span className="text-white font-bold">{employee.firstName}</span>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-b border-[#1E293B]/60">
                  <span className="text-slate-400">Legal Last Name</span>
                  <span className="text-white font-bold">{employee.lastName}</span>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-b border-[#1E293B]/60">
                  <span className="text-slate-400">Date of Joining (DOJ)</span>
                  <span className="text-white font-mono font-bold">{employee.joiningDate}</span>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-b border-[#1E293B]/60">
                  <span className="text-slate-400">Phone Contact</span>
                  <span className="text-white font-mono font-bold">{employee.phone}</span>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-b border-[#1E293B]/60">
                  <span className="text-slate-400">Location</span>
                  <span className="text-white font-bold">{employee.location || 'San Francisco HQ'}</span>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-b border-[#1E293B]/60">
                  <span className="text-slate-400">PAN</span>
                  <span className="text-white font-mono font-bold">{employee.pan || 'ITHPK8827F'}</span>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-400">Bank A/C</span>
                  <span className="text-white font-mono font-bold">{employee.bankAccount || '815801500344'}</span>
                </div>
              </div>
            </div>

            {/* Right Card: Emergency Contact Protocol */}
            <div className="bg-[#070D1D] p-5 rounded-2xl border border-[#1E293B] space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
                  <ShieldCheck className="w-4 h-4 text-[#00E5FF]" />
                  <span>EMERGENCY CONTACT PROTOCOL</span>
                </div>

                <p className="text-xs text-slate-400 italic mt-3">
                  No emergency contact recorded on file.
                </p>
              </div>

              {/* Security Badge Warning Box (Matches Image 2 Exactly) */}
              <div className="bg-[#261503]/80 border border-amber-800/70 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="font-medium">
                  Physical access card assigned and active in facility perimeter security.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EMPLOYMENT */}
        {activeTab === 'Employment' && (
          <div className="bg-[#070D1D] p-6 rounded-2xl border border-[#1E293B] space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
              <Briefcase className="w-4 h-4 text-[#00E5FF]" />
              <span>EMPLOYMENT CONTRACT & COMPENSATION STRUCTURE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#0B132B] border border-[#1E293B] space-y-1">
                <span className="text-slate-400 text-xs">Department</span>
                <p className="text-sm font-bold text-white">
                  {employee.department && employee.department.trim().toLowerCase() !== 'general staff'
                    ? employee.department
                    : '—'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B132B] border border-[#1E293B] space-y-1">
                <span className="text-slate-400 text-xs">Designation / Rank</span>
                <p className="text-sm font-bold text-white">{employee.designation}</p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B132B] border border-[#1E293B] space-y-1">
                <span className="text-slate-400 text-xs">Employment Status</span>
                <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Full-Time Permanent
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B132B] border border-[#1E293B] space-y-1">
                <span className="text-slate-400 text-xs">Base Salary (Annual)</span>
                <p className="text-sm font-mono font-bold text-sky-300">
                  Rs. {employee.compensation.basic.toLocaleString()}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B132B] border border-[#1E293B] space-y-1">
                <span className="text-slate-400 text-xs">Monthly Allowances</span>
                <p className="text-sm font-mono font-bold text-sky-300">
                  Rs. {employee.compensation.allowances.toLocaleString()}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B132B] border border-[#1E293B] space-y-1">
                <span className="text-slate-400 text-xs">Corporate Workstation</span>
                <p className="text-sm font-bold text-white">{employee.location || 'San Francisco HQ'}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DOCUMENTS */}
        {activeTab === 'Documents' && (
          <div className="bg-[#070D1D] p-6 rounded-2xl border border-[#1E293B] space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
                <FolderOpen className="w-4 h-4 text-[#00E5FF]" />
                <span>PERSONNEL VERIFIED DOCUMENT VAULT</span>
              </div>
              <span className="text-xs text-sky-400 font-medium">4 Verified Documents</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                { name: 'Government ID & Passport', size: '2.4 MB', date: '2024-01-15', status: 'VERIFIED' },
                { name: 'Executed Employment Contract', size: '1.1 MB', date: '2024-01-15', status: 'VERIFIED' },
                { name: 'Confidentiality & IP Agreement (NDA)', size: '850 KB', date: '2024-01-15', status: 'VERIFIED' },
                { name: 'Federal Tax Withholding (Form W-4)', size: '420 KB', date: '2024-01-16', status: 'VERIFIED' }
              ].map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#0B132B] border border-[#1E293B] flex items-center justify-between hover:border-blue-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">{doc.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{doc.size} • Uploaded {doc.date}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ATTENDANCE HISTORY */}
        {activeTab === 'Attendance History' && (
          <div className="bg-[#070D1D] p-6 rounded-2xl border border-[#1E293B] space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
                <Clock className="w-4 h-4 text-[#00E5FF]" />
                <span>BIOMETRIC & FACIAL GATE VERIFICATION LOG</span>
              </div>
              <span className="text-xs text-emerald-400 font-bold">100% Present Rate (Current Cycle)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1E293B] text-slate-400">
                    <th className="py-2.5 px-3">DATE</th>
                    <th className="py-2.5 px-3">CHECK IN</th>
                    <th className="py-2.5 px-3">CHECK OUT</th>
                    <th className="py-2.5 px-3">VERIFICATION METHOD</th>
                    <th className="py-2.5 px-3 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60 text-slate-300">
                  {[
                    { date: 'Today (Oct 02)', in: '08:56 AM', out: 'In Session', method: 'Facial Biometric Kiosk #1', status: 'ON_TIME' },
                    { date: 'Yesterday (Oct 01)', in: '08:52 AM', out: '06:05 PM', method: 'Facial Biometric Kiosk #1', status: 'ON_TIME' },
                    { date: 'Sep 30, 2026', in: '09:01 AM', out: '06:12 PM', method: 'Perimeter Access Card', status: 'ON_TIME' },
                    { date: 'Sep 29, 2026', in: '08:48 AM', out: '05:58 PM', method: 'Facial Biometric Kiosk #2', status: 'ON_TIME' }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#0B132B]">
                      <td className="py-2.5 px-3 font-mono text-white font-medium">{row.date}</td>
                      <td className="py-2.5 px-3 font-mono text-emerald-400">{row.in}</td>
                      <td className="py-2.5 px-3 font-mono">{row.out}</td>
                      <td className="py-2.5 px-3 text-slate-400">{row.method}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PAYROLL */}
        {activeTab === 'Payroll' && (
          <div className="bg-[#070D1D] p-6 rounded-2xl border border-[#1E293B] space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
                <DollarSign className="w-4 h-4 text-[#00E5FF]" />
                <span>PAYROLL DISBURSEMENTS & TAX LEDGER</span>
              </div>
              <span className="text-xs text-sky-400 font-bold font-mono">
                Disbursed to Bank Account (•••• {employee.bankAccount ? employee.bankAccount.slice(-4) : '4829'})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-[#0B132B] border border-[#1E293B]">
                <span className="text-slate-400 text-xs">Last Monthly Net Pay</span>
                <p className="text-lg font-black font-mono text-emerald-400 mt-1">
                  Rs. {Math.round((employee.compensation.basic + employee.compensation.allowances) / 12 * 0.78).toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 block">Deposited via Automated Clearing House (ACH)</span>
              </div>

              <div className="p-4 rounded-xl bg-[#0B132B] border border-[#1E293B]">
                <span className="text-slate-400 text-xs">Withholding & Tax Deductions</span>
                <p className="text-lg font-black font-mono text-slate-200 mt-1">
                  Rs. {Math.round((employee.compensation.basic + employee.compensation.allowances) / 12 * 0.22).toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 block">Federal, State, and Medicare FICA</span>
              </div>

              <div className="p-4 rounded-xl bg-[#0B132B] border border-[#1E293B]">
                <span className="text-slate-400 text-xs">Next Scheduled Payroll Run</span>
                <p className="text-lg font-black font-mono text-[#38BDF8] mt-1">
                  October 15, 2026
                </p>
                <span className="text-[10px] text-emerald-400 mt-1 block">● Cycle scheduled & funded</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: REQUESTS */}
        {activeTab === 'Requests' && (
          <div className="bg-[#070D1D] p-6 rounded-2xl border border-[#1E293B] space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
                <FileText className="w-4 h-4 text-[#00E5FF]" />
                <span>WORKFLOW REQUISITIONS SUBMITTED BY PERSONNEL</span>
              </div>
              <span className="text-xs text-slate-400">{employeeRequests.length} Record(s)</span>
            </div>

            {employeeRequests.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No active workflow requisitions on file for this employee.
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {employeeRequests.map(req => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl bg-[#0B132B] border border-[#1E293B] flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-sky-400">{req.id}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {req.type}
                        </span>
                        <h4 className="text-xs font-bold text-white">{req.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{req.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-950 text-rose-400 border-rose-800'
                          : 'bg-amber-950 text-amber-400 border-amber-800'
                      }`}>
                        {req.status}
                      </span>
                      <p className="text-[10px] font-mono text-slate-400 mt-1">{req.amountOrDays}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer (Matches Image 2 Exactly) */}
        <div className="flex items-center justify-end border-t border-[#1E293B] pt-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
