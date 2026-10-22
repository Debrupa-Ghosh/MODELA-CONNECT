import React, { useState, useEffect } from 'react';
import { Employee } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { X, Save, Lock, DollarSign, Calculator, ArrowUpRight, ArrowDownRight, ShieldCheck } from 'lucide-react';

interface EditEmployeeModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  employee,
  isOpen,
  onClose
}) => {
  const { updateEmployee, showToast } = useApp();
  const { hasFullAccess, isSuperAdmin, isHRManager, isExecutiveDirector, currentUser } = useAuth();

  const canEditCompensation =
    hasFullAccess ||
    isSuperAdmin ||
    isHRManager ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DIRECTOR' ||
    currentUser?.role === 'HR' ||
    currentUser?.role === 'MANAGER' ||
    currentUser?.role === 'HR_MANAGER' ||
    isExecutiveDirector;

  const canEditEmployeeId = canEditCompensation;

  const [employeeId, setEmployeeId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'ON_LEAVE' | 'PROBATION' | 'TERMINATED'>('ACTIVE');
  const [basic, setBasic] = useState('0');
  const [pan, setPan] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  // Allowances state
  const [hra, setHra] = useState('0');
  const [medical, setMedical] = useState('0');
  const [special, setSpecial] = useState('0');
  const [internet, setInternet] = useState('0');

  // Deductions state
  const [professionalTax, setProfessionalTax] = useState('200');
  const [pfContribution, setPfContribution] = useState('1800');
  const [groupHealthInsurance, setGroupHealthInsurance] = useState('1700');

  useEffect(() => {
    if (employee) {
      setEmployeeId(employee.id || '');
      setFirstName(employee.firstName || '');
      setLastName(employee.lastName || '');
      setJoiningDate(employee.joiningDate || '');
      setPhone(employee.phone || '');
      setDesignation(employee.designation || '');
      setDepartment(employee.department || 'Engineering');
      setLocation(employee.location || 'San Francisco HQ');
      setStatus(employee.status || 'ACTIVE');
      setPan(employee.pan || '');
      setBankAccount(employee.bankAccount || '');

      const basicVal = employee.compensation?.basic ?? 50000;
      setBasic(String(basicVal));

      if (employee.compensation?.allowanceBreakdown) {
        setHra(String(employee.compensation.allowanceBreakdown.hra ?? 0));
        setMedical(String(employee.compensation.allowanceBreakdown.medical ?? 0));
        setSpecial(String(employee.compensation.allowanceBreakdown.special ?? 0));
        setInternet(String(employee.compensation.allowanceBreakdown.internet ?? 0));
      } else {
        const totalAll = employee.compensation?.allowances ?? 15000;
        const hraVal = Math.round(totalAll * 0.4);
        const medVal = Math.round(totalAll * 0.15);
        const specVal = Math.round(totalAll * 0.35);
        const netVal = Math.max(0, totalAll - (hraVal + medVal + specVal));
        setHra(String(hraVal));
        setMedical(String(medVal));
        setSpecial(String(specVal));
        setInternet(String(netVal));
      }

      if (employee.compensation?.deductionBreakdown) {
        setProfessionalTax(String(employee.compensation.deductionBreakdown.professionalTax ?? 200));
        setPfContribution(String(employee.compensation.deductionBreakdown.pfContribution ?? 1800));
        setGroupHealthInsurance(String(employee.compensation.deductionBreakdown.groupHealthInsurance ?? 1700));
      } else {
        setProfessionalTax('200');
        setPfContribution('1800');
        setGroupHealthInsurance('1700');
      }
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  // Real-time automatic calculations
  const numBasic = Number(basic) || 0;
  const numHra = Number(hra) || 0;
  const numMedical = Number(medical) || 0;
  const numSpecial = Number(special) || 0;
  const numInternet = Number(internet) || 0;
  const totalAllowances = numHra + numMedical + numSpecial + numInternet;

  const numPT = Number(professionalTax) || 0;
  const numPF = Number(pfContribution) || 0;
  const numHealth = Number(groupHealthInsurance) || 0;
  const totalDeductions = numPT + numPF + numHealth;

  const grossSalary = numBasic + totalAllowances;
  const netCompensation = grossSalary - totalDeductions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNewId = employeeId.trim().toUpperCase();
    if (!cleanNewId) {
      showToast('Validation Error', 'Employee ID cannot be empty.', 'error');
      return;
    }

    const isSuccess = await updateEmployee(employee.id, {
      id: cleanNewId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      joiningDate: joiningDate.trim(),
      phone: phone.trim(),
      designation: designation.trim(),
      department,
      location: location.trim(),
      status,
      pan: pan.trim().toUpperCase(),
      bankAccount: bankAccount.trim(),
      compensation: {
        basic: numBasic,
        allowances: totalAllowances,
        allowanceBreakdown: {
          hra: numHra,
          medical: numMedical,
          special: numSpecial,
          internet: numInternet
        },
        deductionBreakdown: {
          professionalTax: numPT,
          pfContribution: numPF,
          groupHealthInsurance: numHealth
        },
        totalDeductions,
        grossSalary,
        netCompensation
      }
    });

    if (isSuccess) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#080E1C] border border-[#1E2E4E] rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-white font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
          <div className="flex items-center gap-3">
            <div>
              <label htmlFor="edit-emp-id-input" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Employee ID {canEditEmployeeId && <span className="text-[#00E5FF] font-semibold">(Editable)</span>}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="edit-emp-id-input"
                  type="text"
                  disabled={!canEditEmployeeId}
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="e.g. MOD000"
                  className="w-28 px-3 py-1.5 bg-[#001E3D] border border-[#00558F] focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] rounded-xl font-mono text-sm font-bold text-[#00E5FF] tracking-wider outline-none disabled:opacity-60 uppercase shadow-inner"
                  title="Super Admin or HR can edit the Employee ID"
                />
              </div>
            </div>
            <div className="pt-2">
              <h3 className="text-lg font-bold text-white">Edit Employee Profile</h3>
              <p className="text-xs text-slate-400">
                Super Admin, Executive Director, or HR Manager clearance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clearance alert if non-privileged */}
        {!canEditCompensation && (
          <div className="p-3 bg-rose-950/40 border border-rose-700/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Only HR Manager and Super Admin are authorized to add or edit allowances and deductions.</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Row 1: Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">
                First Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. John"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">
                Last Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Doe"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 2: Date of Joining (DOJ) & Contact (Phone) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">
                Date of Joining (DOJ) <span className="text-amber-400">*</span>
              </label>
              <input
                type="date"
                value={joiningDate}
                onChange={e => setJoiningDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">
                Contact (Phone) <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Row 3: Designation & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Designation</label>
              <input
                type="text"
                placeholder="e.g. Senior Software Engineer"
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Location</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. San Francisco HQ"
                className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 4: Employment Status & Basic Pay */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Employment Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="ON_LEAVE">ON LEAVE</option>
                <option value="PROBATION">PROBATION</option>
                <option value="TERMINATED">TERMINATED</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Basic Salary / Base Pay</label>
              <input
                type="number"
                disabled={!canEditCompensation}
                value={basic}
                onChange={e => setBasic(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono disabled:opacity-50"
              />
            </div>
          </div>

          {/* Row 5: PAN Number & A/C Number (Before Allowance Configuration) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">
                PAN Number
              </label>
              <input
                type="text"
                placeholder="e.g. ABCDE1234F"
                value={pan}
                onChange={e => setPan(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono tracking-wider"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">
                A/C Number
              </label>
              <input
                type="text"
                placeholder="e.g. 815801500344"
                value={bankAccount}
                onChange={e => setBankAccount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B132B] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* ALLOWANCES SECTION (Requested by User) */}
          <div className="p-4 bg-[#0B1528] border border-blue-900/40 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E2E4E] pb-2">
              <span className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                Allowances Configuration
              </span>
              <span className="font-mono text-emerald-400 font-bold text-xs">
                Total: +{totalAllowances.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1 text-[11px]">House Rent Allowance (HRA)</label>
                <input
                  type="number"
                  disabled={!canEditCompensation}
                  value={hra}
                  onChange={e => setHra(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-[#080E1C] border border-[#1E293B] rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1 text-[11px]">Medical Allowance</label>
                <input
                  type="number"
                  disabled={!canEditCompensation}
                  value={medical}
                  onChange={e => setMedical(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-[#080E1C] border border-[#1E293B] rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1 text-[11px]">Special Allowance</label>
                <input
                  type="number"
                  disabled={!canEditCompensation}
                  value={special}
                  onChange={e => setSpecial(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-[#080E1C] border border-[#1E293B] rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1 text-[11px]">Internet Allowance</label>
                <input
                  type="number"
                  disabled={!canEditCompensation}
                  value={internet}
                  onChange={e => setInternet(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-[#080E1C] border border-[#1E293B] rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* DEDUCTIONS SECTION (Requested by User) */}
          <div className="p-4 bg-[#0B1528] border border-rose-900/40 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E2E4E] pb-2">
              <span className="font-bold text-rose-400 flex items-center gap-1.5 text-xs">
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
                Deductions Configuration
              </span>
              <span className="font-mono text-rose-400 font-bold text-xs">
                Total: -{totalDeductions.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1 text-[11px]">Professional Tax</label>
                <input
                  type="number"
                  disabled={!canEditCompensation}
                  value={professionalTax}
                  onChange={e => setProfessionalTax(e.target.value)}
                  placeholder="200"
                  className="w-full px-3 py-2 bg-[#080E1C] border border-[#1E293B] rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1 text-[11px]">Employee PF Contribution</label>
                <input
                  type="number"
                  disabled={!canEditCompensation}
                  value={pfContribution}
                  onChange={e => setPfContribution(e.target.value)}
                  placeholder="1800"
                  className="w-full px-3 py-2 bg-[#080E1C] border border-[#1E293B] rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1 text-[11px]">Group Health Insurance</label>
                <input
                  type="number"
                  disabled={!canEditCompensation}
                  value={groupHealthInsurance}
                  onChange={e => setGroupHealthInsurance(e.target.value)}
                  placeholder="1700"
                  className="w-full px-3 py-2 bg-[#080E1C] border border-[#1E293B] rounded-xl text-white font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* LIVE NET COMPENSATION SUMMARY BANNER */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-950/60 via-[#0B1528] to-slate-900 border border-emerald-600/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Calculated Net Compensation</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Gross ({numBasic.toLocaleString()} + {totalAllowances.toLocaleString()}) - Deductions ({totalDeductions.toLocaleString()})
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-xl text-emerald-400">
                {netCompensation.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-300 rounded-xl font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canEditCompensation}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
