import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { canUserApproveRequest } from '../types';
import {
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Mail,
  Briefcase,
  Lock
} from 'lucide-react';

export const AdminNexusPage: React.FC = () => {
  const { pendingUsers, approveUserRequest, rejectUserRequest, currentUser } = useAuth();
  const { staffRequests, updateStaffRequestStatus, showToast } = useApp();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingStaffId, setProcessingStaffId] = useState<string | null>(null);
  const [ipWhitelist, setIpWhitelist] = useState('192.168.1.0/24\n10.0.0.0/16');

  const pendingStaffRequests = staffRequests.filter(r => r.status === 'PENDING');

  const handleAuthorize = async (userId: string) => {
    setProcessingId(userId);
    try {
      await approveUserRequest(userId, 'EMPLOYEE', 'Cleared via Admin Nexus Primary Terminal');
      showToast('Clearance Granted', 'Identity clearance [Staff / Employee] authorized.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (userId: string) => {
    setProcessingId(userId);
    try {
      await rejectUserRequest(userId, 'Denied via Admin Nexus Terminal clearance protocol');
      showToast('Clearance Denied', 'Identity authorization denied and logged.', 'info');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAuthorizeStaffRequest = async (requestId: string, title: string) => {
    setProcessingStaffId(requestId);
    try {
      await updateStaffRequestStatus(requestId, 'APPROVED', 'Authorized via Admin Nexus Primary Terminal Clearance');
      showToast('Requisition Authorized', `Staff workflow requisition "${title}" has been authorized.`);
    } finally {
      setProcessingStaffId(null);
    }
  };

  const handleDenyStaffRequest = async (requestId: string, title: string) => {
    setProcessingStaffId(requestId);
    try {
      await updateStaffRequestStatus(requestId, 'REJECTED', 'Denied via Admin Nexus Terminal clearance policy');
      showToast('Requisition Denied', `Staff workflow requisition "${title}" was denied.`, 'info');
    } finally {
      setProcessingStaffId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto antialiased font-sans text-white">
      {/* Nexus Header (Dark Navy Box matching Image) */}
      <div className="p-6 rounded-2xl bg-[#0D182E] border border-emerald-500/30 shadow-2xl relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              <h1 className="text-xl sm:text-2xl font-black tracking-tight font-mono text-emerald-400">
                ADMIN NEXUS • Primary Architect Terminal
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                CLEARANCE: LVL 5
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Restricted clearance zone. High-security identity authorization, staff workflow approvals, neural biometric policies, and master personnel provisioning.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#080E1C] border border-[#1E293B] text-[11px] font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>TERMINAL ID: <strong className="text-white">NEXUS-01-ROOT</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Queue 1: Sign-Up Mail Verification Queue in Admin Nexus (Dark Navy Box) */}
      <div className="bg-[#0B1528] border border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-4 text-white transition-colors">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold font-mono tracking-wide text-white">
              IDENTITY AUTHORIZATION QUEUE (New Mail Sign-Up Requests)
            </h2>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {pendingUsers.length} PENDING CLEARANCE
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Protocol: Real-time Sign-Up Identity Gateway
          </span>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="p-8 text-center bg-[#080E1C] rounded-xl border border-[#1E293B] font-mono text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-white font-bold">ALL IDENTITY REQUESTS AUTHORIZED</p>
            <p className="text-[11px] mt-1 text-slate-400">
              The sign-up identity queue is currently idle. No pending Google mail verifications.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingUsers.map(user => (
              <div
                key={user.id}
                className="p-5 rounded-xl bg-[#080E1C] border border-[#1E293B] space-y-3 font-mono text-xs shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-10 h-10 rounded-full border border-slate-700"
                    />
                    <div>
                      <p className="font-bold text-white text-sm">{user.name}</p>
                      <p className="text-emerald-400 text-xs font-semibold">{user.email}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    PENDING CLEARANCE
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#0B132B] border border-[#1E293B] text-[11px] flex items-center justify-between">
                  <span className="text-slate-400">Assigned Clearance Role:</span>
                  <span className="text-emerald-400 font-bold text-xs">Employee</span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    disabled={processingId === user.id}
                    onClick={() => handleDeny(user.id)}
                    className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Deny Request
                  </button>
                  <button
                    disabled={processingId === user.id}
                    onClick={() => handleAuthorize(user.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Authorize Clearance
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Queue 2: Staff Workflow Requisitions Queue in Admin Nexus (Dark Navy Box) */}
      <div className="bg-[#0B1528] border border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-4 text-white transition-colors">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-4 h-4 text-sky-400" />
            <h2 className="text-base font-bold font-mono tracking-wide text-white">
              STAFF WORKFLOW REQUISITIONS QUEUE (Administrative Staff Requests)
            </h2>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
              {pendingStaffRequests.length} PENDING CLEARANCE
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Protocol: Multi-Tier Operational Workflow Dispatch
          </span>
        </div>

        {pendingStaffRequests.length === 0 ? (
          <div className="p-8 text-center bg-[#080E1C] rounded-xl border border-[#1E293B] font-mono text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-white font-bold">ALL STAFF REQUISITIONS CLEARED</p>
            <p className="text-[11px] mt-1 text-slate-400">
              No pending employee leave, expense, or hardware requisitions awaiting terminal clearance.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingStaffRequests.map(req => (
              <div
                key={req.id}
                className="p-5 rounded-xl bg-[#080E1C] border border-[#1E293B] space-y-3 font-mono text-xs shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{req.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold uppercase">
                        {req.type}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">
                      Applicant: <strong className="text-white">{req.employeeName}</strong> ({req.employeeId})
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {req.description}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shrink-0">
                    PENDING
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#0B132B] border border-[#1E293B] text-[11px] flex items-center justify-between">
                  <span className="text-slate-400">
                    Scope / Value: <strong className="text-sky-400">{req.amountOrDays}</strong>
                  </span>
                  <span className="text-slate-400">
                    Target: <strong className="text-slate-200">{req.targetDates || 'Immediate'}</strong>
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 flex-wrap">
                  {canUserApproveRequest(currentUser?.role, req.type) ? (
                    <>
                      <button
                        disabled={processingStaffId === req.id}
                        onClick={() => handleDenyStaffRequest(req.id, req.title)}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Deny Requisition
                      </button>
                      <button
                        disabled={processingStaffId === req.id}
                        onClick={() => handleAuthorizeStaffRequest(req.id, req.title)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Authorize Requisition
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] font-mono text-amber-400/90 bg-[#2A1B02] border border-[#B45309]/60 px-2.5 py-1 rounded-lg">
                      {req.type === 'LEAVE'
                        ? 'VIEW ONLY • MANAGER CLEARANCE REQUIRED'
                        : 'VIEW ONLY • ADMIN CLEARANCE REQUIRED'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Policies & Network Controls (Dark Navy Boxes) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Enterprise Session Verification Policy */}
        <div className="p-5 rounded-2xl bg-[#0B1528] border border-[#1E293B] shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">
                Enterprise Session Verification Policy
              </h3>
            </div>
            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
              STRICT ENFORCEMENT
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time identity verification token lifecycle and cross-enclave RBAC authorization guard for authorized workforce accounts.
          </p>
          <div className="p-3 bg-[#080E1C] rounded-xl border border-[#1E293B] flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">STATUS:</span>
            <span className="text-emerald-400 font-bold">SYNCHRONIZED ACTIVE</span>
          </div>
        </div>

        {/* IP Range Whitelist */}
        <div className="p-5 rounded-2xl bg-[#0B1528] border border-[#1E293B] shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-sm text-white">
                Authorized Subnet CIDR
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              ACTIVE ENFORCEMENT
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Restricted IP subnets permitted to initiate direct biometric verification and payroll batch execution.
          </p>
          <textarea
            rows={2}
            value={ipWhitelist}
            onChange={e => setIpWhitelist(e.target.value)}
            className="w-full p-2 text-xs font-mono rounded-xl bg-[#080E1C] border border-[#1E293B] text-slate-200"
          />
        </div>
      </div>
    </div>
  );
};
