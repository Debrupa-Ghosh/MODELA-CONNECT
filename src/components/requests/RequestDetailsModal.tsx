import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { canUserApproveRequest, isBucketHolidayRequest } from '../../types';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  Building,
  Tag,
  ShieldCheck,
  AlertTriangle,
  FileText,
  DollarSign,
  Send,
  UserCheck,
  Sparkles
} from 'lucide-react';

export const RequestDetailsModal: React.FC = () => {
  const { selectedStaffRequest, isDetailsModalOpen, closeRequestDetails, updateStaffRequestStatus, showToast } = useApp();
  const { isAdmin, currentUser, hasFullAccess } = useAuth();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isDetailsModalOpen || !selectedStaffRequest) return null;

  const req = selectedStaffRequest;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await updateStaffRequestStatus(req.id, 'APPROVED');
      showToast('Requisition Approved', `Requisition ${req.id} for ${req.employeeName} has been approved.`);
      closeRequestDetails();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast('Reason Required', 'Please specify a reason for rejecting this staff requisition.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      await updateStaffRequestStatus(req.id, 'REJECTED', rejectReason.trim());
      showToast('Requisition Rejected', `Requisition ${req.id} was rejected and logged.`, 'info');
      setShowRejectForm(false);
      setRejectReason('');
      closeRequestDetails();
    } finally {
      setIsProcessing(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'HIGH':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'MEDIUM':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'APPROVED':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'REJECTED':
        return 'bg-rose-950 text-rose-400 border-rose-800';
      default:
        return 'bg-amber-950 text-amber-400 border-amber-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0B132B] border border-[#1E293B] rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-white">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#1E293B] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#070D1D] border border-[#1E293B] text-slate-300">
                {req.id}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                {req.type}
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded border ${getStatusBadge(req.status)}`}>
                {req.status}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-2">
              {req.title}
            </h2>
          </div>

          <button
            onClick={closeRequestDetails}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Applicant / Verified Staff Card */}
        <div className="bg-[#070D1D] p-4 rounded-xl border border-[#1E293B] flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-900/40 border-2 border-emerald-500/80 flex items-center justify-center shrink-0">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(req.employeeName)}&background=0284c7&color=fff`}
                alt={req.employeeName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">
                  {req.employeeName}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Verified Staff
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {req.designation} • ID: <strong className="font-mono text-slate-200">{req.employeeId}</strong>
              </p>
              <p className="text-xs text-slate-400">
                {req.employeeEmail}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {req.type === 'LEAVE' && (req.startDate || req.endDate) ? (
            <>
              <div className="p-3.5 rounded-xl bg-[#070D1D] border border-[#1E293B] space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  Start Date:
                </span>
                <p className="text-sm font-bold text-white font-mono">
                  {req.startDate || '-'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#070D1D] border border-[#1E293B] space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  End Date:
                </span>
                <p className="text-sm font-bold text-white font-mono">
                  {req.endDate || '-'}
                </p>
              </div>
            </>
          ) : req.requestDate ? (
            <>
              <div className="p-3.5 rounded-xl bg-[#070D1D] border border-[#1E293B] space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Date:
                </span>
                <p className="text-sm font-bold text-white font-mono">
                  {req.requestDate}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#070D1D] border border-[#1E293B] space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                  Scope / Requisition Date:
                </span>
                <p className="text-sm font-bold text-white font-mono">
                  {req.amountOrDays || req.requestDate}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="p-3.5 rounded-xl bg-[#070D1D] border border-[#1E293B] space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                  Scope / Amount / Duration:
                </span>
                <p className="text-sm font-bold text-white font-mono">
                  {req.amountOrDays}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#070D1D] border border-[#1E293B] space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Target Dates / Requisition Timeframe:
                </span>
                <p className="text-sm font-bold text-white font-mono">
                  {req.targetDates || 'Immediate Requisition'}
                </p>
              </div>
            </>
          )}

          <div className="p-3.5 rounded-xl bg-[#070D1D] border border-[#1E293B] space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              Submission Timestamp:
            </span>
            <p className="font-semibold text-slate-200 font-mono text-[11px]">
              {new Date(req.submittedAt).toLocaleString()}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#070D1D] border border-[#1E293B] space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              Requisition Category:
            </span>
            <p className="font-semibold text-slate-200">
              {req.type.replace('_', ' ')} Workflow Requisition
            </p>
          </div>
        </div>

        {/* Narrative / Business Justification */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            Detailed Description & Requisition Scope
          </label>
          <div className="p-4 rounded-xl bg-[#070D1D] border border-[#1E293B] text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
            {req.description}
          </div>
        </div>

        {/* Justification if provided */}
        {req.justification && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Business Justification & Handover Notes
            </label>
            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-900/50 text-xs text-sky-200 leading-relaxed">
              {req.justification}
            </div>
          </div>
        )}

        {/* Review metadata if reviewed */}
        {req.status !== 'PENDING' && (
          <div className="p-4 rounded-xl bg-[#070D1D] border border-[#1E293B] space-y-1 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>Reviewed by: <strong className="text-white">{req.reviewedBy}</strong></span>
              <span className="font-mono text-slate-400">{req.reviewedAt ? new Date(req.reviewedAt).toLocaleString() : ''}</span>
            </div>
            {req.remarks && (
              <p className="text-slate-400 text-xs italic mt-1">
                Note: "{req.remarks}"
              </p>
            )}
          </div>
        )}

        {/* Rejection notice if previously rejected */}
        {req.status === 'REJECTED' && req.rejectionReason && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 space-y-1">
            <span className="font-bold flex items-center gap-1 text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              Administrative Rejection Reason:
            </span>
            <p className="text-rose-200">{req.rejectionReason}</p>
          </div>
        )}

        {/* Reject form drawer */}
        {showRejectForm && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
              <AlertTriangle className="w-4 h-4" />
              Specify Rejection Reason (Mandatory for Audit Trail)
            </div>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Budget limit exceeded for Q4, or insufficient coverage on requested dates..."
              className="w-full p-2.5 text-xs rounded-lg bg-[#070D1D] border border-rose-800 text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              rows={2}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectForm(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessing}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#1E293B] pt-4 flex-wrap gap-3">
          <div className="text-[11px] text-slate-400">
            Status: <span className="font-bold text-white">{req.status}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={closeRequestDetails}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-300 transition-colors cursor-pointer"
            >
              Close
            </button>

            {req.status === 'PENDING' && (hasFullAccess || isAdmin) && (
              <>
                {canUserApproveRequest(currentUser?.role, req.type, req) ? (
                  <>
                    {!showRejectForm && (
                      <button
                        onClick={() => setShowRejectForm(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject Request
                      </button>
                    )}

                    <button
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isProcessing ? 'Approving...' : 'Approve Request'}
                    </button>
                  </>
                ) : (
                  <div className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800/80 px-3 py-1.5 rounded-xl font-medium">
                    {isBucketHolidayRequest(req.type, req)
                      ? 'View Only • Only Super Admin or HR can approve Bucket Holiday Requests'
                      : req.type === 'LEAVE'
                      ? 'View Only • Only Manager can approve Leave Requests'
                      : 'View Only • Administrative Approval Required'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
