import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import { NewStaffRequestModal } from '../components/requests/NewStaffRequestModal';
import { isRequestOwnedByUser, getRoleLabel, canUserApproveRequest, isBucketHolidayRequest } from '../types';
import {
  Users,
  Calendar,
  Clock,
  CreditCard,
  ScanFace,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  FileText,
  Eye,
  ShieldCheck,
  XCircle,
  Building,
  User,
  Send,
  Plus
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { currentUser, hasFullAccess, isHR, isDirector } = useAuth();
  const { employees, staffRequests, openRequestDetails, updateStaffRequestStatus } = useApp();
  const navigate = useNavigate();

  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);

  const userName = currentUser?.name?.trim() || currentUser?.email || 'Valued Team Member';
  const roleName = getRoleLabel(currentUser?.role);
  const userDept = currentUser?.department || 'Operations';

  const myRequests = staffRequests.filter(req => isRequestOwnedByUser(req, currentUser));
  const myPendingRequests = myRequests.filter(r => r.status === 'PENDING');

  const pendingRequests = staffRequests.filter(r => r.status === 'PENDING');
  const pendingRequestsCount = pendingRequests.length;

  /* =========================================================================
     1. EMPLOYEE SELF-SERVICE DASHBOARD (Matches Image 1 Exactly for Employees)
     ========================================================================= */
  if (!hasFullAccess) {
    return (
      <div className="space-y-6 max-w-[1500px] mx-auto antialiased font-sans text-white">
        
        {/* Top Hero Card (Matches Image 1 Exactly) */}
        <div className="bg-[#0B152B] border border-[#1E2E4E] rounded-3xl p-7 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-600/60 text-xs font-semibold text-[#38BDF8]">
                <User className="w-3.5 h-3.5" />
                <span>Modela Connect Self-Service</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Welcome back, {userName}
              </h1>

              <p className="text-slate-300 text-xs sm:text-sm font-medium">
                Department:{' '}
                <strong className="text-white font-bold">{userDept}</strong> • Workplace Status:{' '}
                <span className="text-[#10B981] font-semibold">Synchronized</span>
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setIsNewRequestModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-950/50 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit Request</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Workplace Identity Status */}
          <div
            className="p-5 bg-[#080E1C] rounded-2xl border border-[#1E293B] shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Workplace Status</span>
              <div className="w-8 h-8 rounded-xl bg-blue-950 text-blue-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-xl font-black text-white tracking-tight">ACTIVE</span>
            </div>
            <div className="mt-2 text-xs text-[#38BDF8] flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Identity synchronized</span>
            </div>
          </div>

          {/* Card 2: My Requests Status */}
          <div
            onClick={() => setIsNewRequestModalOpen(true)}
            className="p-5 bg-[#080E1C] rounded-2xl border border-[#1E293B] shadow-sm hover:border-blue-500/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">My Requests Status</span>
              <div className="w-8 h-8 rounded-xl bg-amber-950/80 text-amber-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{myPendingRequests.length}</span>
              <span className="text-xs font-bold text-amber-400">Pending Review</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 font-medium">
              {myRequests.length} total requests filed
            </div>
          </div>

          {/* Card 4: Working Schedule */}
          <div className="p-5 bg-[#080E1C] rounded-2xl border border-[#1E293B] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Working Schedule</span>
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                <Building className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-sm font-bold text-white">General Shift</span>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">09:30 AM - 06:45 PM • Mon - Fri</p>
            </div>
            <div className="mt-2 text-xs text-emerald-400 font-medium">
              Flexible check-in window
            </div>
          </div>
        </div>

        {/* Bottom Split (Matches Image 1 Exactly) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: My Active Requests & Filings (Span 2) */}
          <div className="lg:col-span-2 bg-[#080E1C] border border-[#1E293B] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div>
                <h2 className="text-sm font-bold text-white">My Active Requests &amp; Filings</h2>
                <p className="text-xs text-slate-400 mt-0.5">Track leaves, expense claims, and workplace requests</p>
              </div>

              <button
                onClick={() => setIsNewRequestModalOpen(true)}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>New Request</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {myRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs border border-dashed border-[#1E293B] rounded-xl">
                No active requests submitted yet. Click "New Request" to create a leave or expense filing.
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {myRequests.map(req => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl bg-[#0B132B] border border-[#1E293B] flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-sky-400">{req.id}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {req.type}
                        </span>
                        <h4 className="text-xs font-bold text-white">{req.title}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{req.description}</p>
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

          {/* Right: Self-Service Hub (Span 1) */}
          <div className="bg-[#080E1C] border border-[#1E293B] rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white border-b border-[#1E293B] pb-3">
              Self-Service Hub
            </h2>

            <div className="space-y-2 pt-1 text-xs">


              <button
                onClick={() => navigate('/requests')}
                className="w-full p-3.5 rounded-xl bg-[#0B132B] hover:bg-[#131E36] border border-[#1E293B] flex items-center justify-between text-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold">Requests &amp; Approvals Central</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setIsNewRequestModalOpen(true)}
                className="w-full p-3.5 rounded-xl bg-[#0B132B] hover:bg-[#131E36] border border-[#1E293B] flex items-center justify-between text-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span className="font-semibold">File Leave or Expense</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => navigate('/settings')}
                className="w-full p-3.5 rounded-xl bg-[#0B132B] hover:bg-[#131E36] border border-[#1E293B] flex items-center justify-between text-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold">Personal Preferences</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* New Request Modal */}
        <NewStaffRequestModal
          isOpen={isNewRequestModalOpen}
          onClose={() => setIsNewRequestModalOpen(false)}
        />
      </div>
    );
  }

  /* =========================================================================
     2. ADMIN DASHBOARD (For HR Admin & Super Admin)
     ========================================================================= */
  return (
    <div className="space-y-6 max-w-[1500px] mx-auto antialiased font-sans text-white">
      {/* Top Hero Card */}
      <div className="bg-[#0D182E] border border-[#1E2E4E] rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800 text-xs font-semibold text-sky-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modela Connect Workforce Ecosystem</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {userName}
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Operating under <span className="text-[#38BDF8] font-semibold">{roleName}</span> clearance. All workforce records, departmental workflows, and payroll disbursements are synchronized.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate('/employees')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Employee Master</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Active Workforce */}
        <div
          onClick={() => navigate('/employees')}
          className="p-5 bg-[#0B132B] rounded-2xl border border-[#1E293B] shadow-sm hover:border-blue-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Workforce</span>
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{employees.length}</span>
            <span className="text-xs text-slate-400">/ {employees.length} Total</span>
          </div>
          <div className="mt-2 text-[11px] text-[#38BDF8] flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" />
            <span>100% Identity Synchronization</span>
          </div>
        </div>

        {/* Card 2: Pending Requests */}
        <div
          onClick={() => navigate('/requests')}
          className="p-5 bg-[#0B132B] rounded-2xl border-2 border-amber-500/80 shadow-sm hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Pending Requests</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-900 transition-colors">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{pendingRequestsCount}</span>
            <span className="text-xs text-amber-400 font-semibold">Requires Action</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            Leaves &amp; expense reimbursements
          </div>
        </div>
      </div>

      {/* Verified Staff Workflow Requisitions (Pending Action) */}
      {pendingRequests.length > 0 && (
        <div className="bg-[#0B132B] border-2 border-amber-500/60 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Pending Staff Requisitions (Requires Action)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {pendingRequests.length} Pending
              </span>
            </div>

            <Link
              to="/requests"
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>View All in Requests Central</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {pendingRequests.slice(0, 2).map(req => (
              <div
                key={req.id}
                className="p-4 bg-[#070D1D] rounded-xl border border-[#1E293B] flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-slate-300 px-1.5 py-0.5 bg-[#0B132B] border border-[#1E293B] rounded">
                          {req.id}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {req.type}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1.5">
                        {req.title}
                      </h3>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800">
                      PENDING
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2">
                    {req.description}
                  </p>

                  <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span>Applicant:</span>
                      <strong className="text-white font-semibold">{req.employeeName}</strong>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        Staff
                      </span>
                    </div>
                    <span className="font-mono text-slate-300 font-semibold">{req.amountOrDays}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between gap-2">
                  <button
                    onClick={() => openRequestDetails(req)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/80 hover:bg-blue-900 text-sky-300 text-xs font-bold rounded-xl border border-blue-800 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                    <span>View details</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {canUserApproveRequest(currentUser?.role, req.type, req) ? (
                      <>
                        <button
                          onClick={() => updateStaffRequestStatus(req.id, 'REJECTED')}
                          className="px-2.5 py-1 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold rounded-lg border border-rose-800/60 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </button>
                        <button
                          onClick={() => updateStaffRequestStatus(req.id, 'APPROVED')}
                          className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white text-xs font-semibold rounded-lg shadow transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Approve
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] font-medium text-amber-400/90 bg-[#2A1B02] border border-[#B45309]/60 px-2.5 py-1 rounded-lg">
                        View Only • HR, Super Admin, or Director Approval Required
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
