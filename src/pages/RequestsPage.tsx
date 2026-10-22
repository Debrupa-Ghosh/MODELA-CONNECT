import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { StaffWorkflowRequest, isRequestOwnedByUser } from '../types';
import { NewStaffRequestModal } from '../components/requests/NewStaffRequestModal';
import {
  Search,
  RefreshCw,
  Plus,
  Filter,
  ChevronDown,
  User as UserIcon,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const RequestsPage: React.FC = () => {
  const { staffRequests, updateStaffRequestStatus, openRequestDetails, refreshStaffRequests, showToast } = useApp();
  const { currentUser, isAdmin, isSuperAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Workflow filters for staff requests
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  // Default to ALL for Super Admin and Administrators so newly submitted staff requests are immediately visible
  const [adminScope, setAdminScope] = useState<'MINE' | 'ALL'>('ALL');

  // Verify privileged access for Super Admin, Executive Director, or HR Manager
  const isPrivilegedAdmin = Boolean(
    isAdmin ||
    isSuperAdmin ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'EXECUTIVE_DIRECTOR' ||
    currentUser?.role === 'HR_MANAGER'
  );

  // Staff workflow requests strictly owned by current user
  const myRequests = staffRequests.filter(req => isRequestOwnedByUser(req, currentUser));

  // Requirement: One employee can see only their own submitted staff request in the Requests page not all requests from other employees.
  // Super Admin & Admins toggle between 'ALL' workforce queue and 'MINE', while standard employees strictly see their own requests.
  const baseStaffRequests = isPrivilegedAdmin ? (adminScope === 'MINE' ? myRequests : staffRequests) : myRequests;

  const pendingStaffCount = baseStaffRequests.filter(r => r.status === 'PENDING').length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (refreshStaffRequests) {
      await refreshStaffRequests();
    }
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Requests Synced', 'Updated workforce workflow requisition queue from cloud database.');
    }, 300);
  };

  const handleApproveStaff = async (e: React.MouseEvent, reqId: string, title: string) => {
    e.stopPropagation();
    await updateStaffRequestStatus(reqId, 'APPROVED', 'Approved via Requests & Approvals Central');
    showToast('Request Approved', `Staff workflow request "${title}" approved.`);
  };

  const handleRejectStaff = async (e: React.MouseEvent, reqId: string, title: string) => {
    e.stopPropagation();
    await updateStaffRequestStatus(reqId, 'REJECTED', 'Administrative rejection via Requests tab');
    showToast('Request Rejected', `Staff workflow request "${title}" rejected.`, 'info');
  };

  const filteredStaffRequests = baseStaffRequests.filter(req => {
    if (categoryFilter !== 'ALL' && req.type.toUpperCase() !== categoryFilter.toUpperCase()) return false;
    if (statusFilter !== 'ALL' && req.status.toUpperCase() !== statusFilter.toUpperCase()) return false;
    if (
      searchQuery &&
      !req.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !req.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !req.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-5 max-w-[1550px] mx-auto antialiased font-sans text-white">
      
      {/* 1. Header Card: Requests & Approvals Central (Dark Navy Box matching Image) */}
      <div className="bg-[#0B1528] border border-[#1E2E4E] rounded-2xl p-6 sm:p-7 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 transition-colors">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Requests &amp; Approvals Central
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#2A1B02] border border-[#B45309]/80 text-[#FBBF24]">
              {pendingStaffCount} Pending
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm font-medium">
            {isAdmin
              ? 'Real-time management for internal employee workflow requisitions, leaves, and approvals.'
              : 'Personal workflow ledger tracking your submitted leave requisitions, equipment requests, and approval statuses.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
          {/* Submit Staff Request Button */}
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Staff Request</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-[#131E36] hover:bg-[#1E2E4E] text-slate-200 rounded-xl text-xs font-semibold border border-[#203050] transition-colors cursor-pointer disabled:opacity-60"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Workflow Bar (Dark Navy Box) */}
      <div className="bg-[#0B1528] border border-[#1E293B] rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap text-xs shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-slate-300 font-semibold shrink-0">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Filter Workflow:</span>
          </div>

          {/* All Categories Dropdown */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="appearance-none bg-[#060B18] border border-[#1E293B] hover:border-slate-700 text-slate-200 text-xs pl-3.5 pr-8 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors"
            >
              <option value="ALL">All Categories</option>
              <option value="LEAVE">Leave</option>
              <option value="EQUIPMENT">Equipment</option>
              <option value="EXPENSE">Expense</option>
              <option value="SHIFT">Shift</option>
              <option value="TRAVEL">Travel</option>
              <option value="ACCESS_CLEARANCE">Access</option>
              <option value="TRAINING">Training</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* All Statuses Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none bg-[#060B18] border border-[#1E293B] hover:border-slate-700 text-slate-200 text-xs pl-3.5 pr-8 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Admin Scope Toggle: All Workforce Queue vs My Requisitions */}
          {isPrivilegedAdmin && (
            <div className="flex items-center gap-1.5 p-1 bg-[#060B18] border border-[#1E293B] rounded-xl text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setAdminScope('ALL')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  adminScope === 'ALL'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Workforce Queue ({staffRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminScope('MINE')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  adminScope === 'MINE'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                My Requisitions ({myRequests.length})
              </button>
            </div>
          )}
        </div>

        {/* Ownership Badge */}
        <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
          <UserIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>Filing Identity: </span>
          <strong className="text-white font-bold">{currentUser?.name || 'Modelatech2026'}</strong>
          <span className="text-[#38BDF8] font-mono">({currentUser?.employeeId || 'MOD000'})</span>
        </div>
      </div>

      {/* 3. Search Bar for Staff Requests (Dark Navy Box) */}
      <div className="bg-[#0B1528] border border-[#1E293B] rounded-2xl p-3.5 shadow-sm">
        <div className="relative max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search staff requests by Title, Applicant, or Description..."
            className="w-full bg-[#060B18] border border-[#1E293B] hover:border-slate-700 text-slate-200 text-xs pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500 transition-colors"
          />
        </div>
      </div>

      {/* 4. Staff Requests Cards Grid (Dark Navy Boxes matching Image) */}
      {filteredStaffRequests.length === 0 ? (
        <div className="p-16 text-center bg-[#0B1528] rounded-2xl border border-[#1E293B] text-slate-400 text-xs space-y-3 shadow-xl">
          <Clock className="w-10 h-10 mx-auto text-slate-500" />
          <p className="font-bold text-sm text-white">No Staff Requisitions Found</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            {isAdmin
              ? 'No requests match the selected filters. Click "Submit Staff Request" to create a new leave, equipment, or workflow requisition.'
              : 'You have not submitted any staff workflow requests matching the selected filters. Click "Submit Staff Request" to file a new requisition.'}
          </p>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Submit Staff Request</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredStaffRequests.map(req => {
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';

            return (
              <div
                key={req.id}
                onClick={() => openRequestDetails(req)}
                className="bg-[#0B1528] border border-[#1E293B] hover:border-slate-600 rounded-2xl p-5 shadow-lg space-y-3.5 transition-all cursor-pointer group"
              >
                {/* Top Badges Row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-[#060B18] border border-slate-700/80 text-slate-300 font-mono text-[11px] font-bold px-2 py-0.5 rounded">
                      {req.id}
                    </span>
                    <span className="bg-[#042F20] border border-[#065F46] text-[#34D399] font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                      {req.type}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                      isPending
                        ? 'bg-[#2A1B02] border border-[#B45309]/80 text-[#FBBF24]'
                        : isApproved
                        ? 'bg-[#042F20] border border-[#065F46] text-[#34D399]'
                        : 'bg-rose-950/80 border border-rose-800 text-rose-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isPending ? 'bg-[#FBBF24]' : isApproved ? 'bg-[#34D399]' : 'bg-rose-400'
                      }`}
                    />
                    {req.status}
                  </span>
                </div>

                {/* Title & Description */}
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                    {req.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {req.description}
                  </p>
                </div>

                {/* Details: Applicant & Scope */}
                <div className="border-t border-[#1E293B]/80 pt-3 flex items-center justify-between text-xs">
                  <div className="text-slate-400 truncate pr-2">
                    <span>Applicant: </span>
                    <strong className="text-white font-bold">{req.employeeName}</strong>
                    <span className="text-slate-400 font-medium"> ({req.employeeId})</span>
                  </div>
                  <div className="text-slate-400 shrink-0">
                    <span>Scope: </span>
                    <strong className="text-white font-bold">{req.amountOrDays}</strong>
                  </div>
                </div>

                {/* Actions for Admin if Pending */}
                {isAdmin && isPending && (
                  <div className="pt-2 border-t border-[#1E293B]/60 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={e => handleRejectStaff(e, req.id, req.title)}
                      className="px-3 py-1.5 bg-transparent hover:bg-rose-950/40 text-rose-400 border border-rose-900/60 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={e => handleApproveStaff(e, req.id, req.title)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Staff Request Modal (Matching Image 2) */}
      <NewStaffRequestModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
      />
    </div>
  );
};
