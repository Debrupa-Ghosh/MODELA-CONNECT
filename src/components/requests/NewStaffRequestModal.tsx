import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { StaffRequestType, RequestPriority } from '../../types';
import { Send, ChevronDown } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewStaffRequestModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { addStaffRequest, employees, showToast } = useApp();
  const { currentUser } = useAuth();

  const [requestType, setRequestType] = useState<string>('Leave / Paid Time Off');
  const [title, setTitle] = useState('');
  const [valueOrDuration, setValueOrDuration] = useState('3 Days');
  const [detailedExplanation, setDetailedExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Validation Error', 'Please enter a Title / Subject for the request.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Map user friendly type to StaffRequestType enum
      let mappedType: StaffRequestType = 'LEAVE';
      if (requestType.includes('Expense')) mappedType = 'EXPENSE';
      else if (requestType.includes('Equipment') || requestType.includes('Hardware')) mappedType = 'EQUIPMENT';
      else if (requestType.includes('Shift')) mappedType = 'SHIFT';
      else if (requestType.includes('Travel')) mappedType = 'TRAVEL';
      else if (requestType.includes('Access')) mappedType = 'ACCESS_CLEARANCE';
      else if (requestType.includes('Training')) mappedType = 'TRAINING';

      const empId = currentUser?.employeeId || 'MOD000';
      const empName = currentUser?.name || 'Modelatech2026';
      const empEmail = currentUser?.email || 'modelatech2026@gmail.com';
      const empDept = currentUser?.department || 'Executive Office';
      const empDesignation = currentUser?.designation || 'Staff / Super Admin';

      await addStaffRequest({
        employeeId: empId,
        employeeName: empName,
        employeeEmail: empEmail,
        department: empDept,
        designation: empDesignation,
        type: mappedType,
        title: title.trim(),
        description: detailedExplanation.trim() || `${requestType} requisition filed by ${empName}`,
        amountOrDays: valueOrDuration.trim() || '3 Days',
        targetDates: 'Immediate Scheduling',
        priority: 'MEDIUM',
        justification: detailedExplanation.trim() || 'Administrative request submission',
        supervisorName: 'Alex Morgan'
      });

      showToast('Request Submitted', 'Your administrative staff request has been filed successfully.');
      onClose();
      // Reset form
      setTitle('');
      setValueOrDuration('3 Days');
      setDetailedExplanation('');
    } catch {
      showToast('Submission Failed', 'Could not record staff request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-[#1E293B] rounded-2xl shadow-2xl p-6 sm:p-7 text-white font-sans space-y-5">
        
        {/* Modal Title (Matches Image 2 Exactly) */}
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          Submit Administrative Request
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* 1. Request Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Request Type
            </label>
            <div className="relative">
              <select
                value={requestType}
                onChange={e => setRequestType(e.target.value)}
                className="w-full bg-[#080E1C] border border-[#1E293B] text-slate-100 rounded-xl pl-3.5 pr-9 py-2.5 text-xs appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors"
              >
                <option value="Leave / Paid Time Off">Leave / Paid Time Off</option>
                <option value="Expense Reimbursement">Expense Reimbursement</option>
                <option value="Hardware / Equipment Requisition">Hardware / Equipment Requisition</option>
                <option value="Shift / Core Hours Adjustment">Shift / Core Hours Adjustment</option>
                <option value="Business Travel Clearance">Business Travel Clearance</option>
                <option value="Elevated Access Clearance">Elevated Access Clearance</option>
                <option value="Training & Professional Development">Training & Professional Development</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. Title / Subject * */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Title / Subject <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Annual Vacation or External Conference Pass"
              className="w-full bg-[#080E1C] border border-[#1E293B] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* 3. Value or Duration */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Value or Duration
            </label>
            <input
              type="text"
              value={valueOrDuration}
              onChange={e => setValueOrDuration(e.target.value)}
              placeholder="3 Days"
              className="w-full bg-[#080E1C] border border-[#1E293B] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* 4. Detailed Explanation */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Detailed Explanation
            </label>
            <textarea
              rows={4}
              value={detailedExplanation}
              onChange={e => setDetailedExplanation(e.target.value)}
              placeholder="Provide context for managerial evaluation..."
              className="w-full bg-[#080E1C] border border-[#1E293B] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
            />
          </div>

          {/* Footer Buttons (Matches Image 2 Exactly) */}
          <div className="border-t border-[#1E293B] pt-4 mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#202D44] hover:bg-[#2B3C5A] text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
