import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { User, UserRole, getRoleLabel, USER_ROLES } from '../types';
import {
  Users,
  Search,
  RefreshCw,
  CheckCircle2,
  Shield,
  Mail,
  AlertCircle,
  Trash2,
  X
} from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const { pendingUsers, approvedUsers, approveUserRequest, rejectUserRequest, updateUserRole, deleteUser, refreshUsers } = useAuth();
  const { showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'SIGNUP_QUEUE' | 'APPROVED_USERS'>('SIGNUP_QUEUE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUsers();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Directory Refreshed', 'Synced with backend identity verification registry.');
    }, 400);
  };

  // Automatically assign Employee role on approval and add to Employees page
  const handleApproveUser = async (userId: string, targetIdentifier: string) => {
    await approveUserRequest(userId, 'EMPLOYEE');
    showToast(
      'Request Accepted as Employee',
      `Accepted sign-up request for ${targetIdentifier}. Added to Employees directory with Employee access role.`
    );
  };

  const handleRoleChange = async (userId: string, newRole: UserRole, userEmail: string) => {
    await updateUserRole(userId, newRole);
    showToast(
      'Role Updated',
      `Updated ${userEmail} clearance to ${getRoleLabel(newRole)}.`
    );
  };

  const handleRejectUser = async (userId: string, targetIdentifier: string) => {
    await rejectUserRequest(userId, 'Administrative security policy rejection');
    showToast('Request Rejected', `Signup request for ${targetIdentifier} was rejected.`, 'info');
  };

  const handleDeleteApprovedUser = (user: User) => {
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    const target = userToDelete;
    const nameDisplay = target.name?.trim() || target.email;
    setUserToDelete(null);
    await deleteUser(target.id);
    showToast('Record Removed', `Successfully removed ${nameDisplay} from Approved Users and Employees page.`, 'info');
  };

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.trim().substring(0, 2).toUpperCase();
    }
    if (email && email.trim()) {
      return email.trim().substring(0, 2).toUpperCase();
    }
    return 'MC';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '10/2/2026';
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    } catch {
      return '10/2/2026';
    }
  };

  const filteredPendingUsers = pendingUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredApproved = approvedUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-[1550px] mx-auto antialiased font-sans text-white">
      
      {/* 1. Header Card: User Management & Access Control (Dark Navy Box matching Image) */}
      <div className="bg-[#0B1528] border border-[#1E2E4E] rounded-2xl p-6 sm:p-7 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 transition-colors">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              User Management &amp; Access Control
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#2A1B02] border border-[#B45309]/80 text-[#FBBF24]">
              {pendingUsers.length} Pending
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Identity verification queue, mail ID access authorizations, and enterprise RBAC access permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#131E36] hover:bg-[#1E2E4E] text-slate-200 rounded-xl text-xs font-semibold border border-[#203050] transition-colors cursor-pointer disabled:opacity-60"
            title="Refresh Registry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Search Bar & Enclave Header Controls (Dark Navy Box) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#080E1C] p-3 rounded-2xl border border-[#1E293B] shadow-inner">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'SIGNUP_QUEUE'
                ? "Search pending sign-up requests by Name or Email..."
                : "Search approved users by Name or Department..."
            }
            className="w-full pl-9 pr-4 py-2 bg-transparent border-0 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="hidden md:flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#38BDF8]" />
            <span>Role Policy Enforced: Enterprise RBAC v2.4</span>
          </div>
        </div>
      </div>

      {/* 3. Sub-Tabs Bar: Identity Sign-Up Requests and Approved Users Directory (Dark Navy Box) */}
      <div className="bg-[#0B1528] border border-[#1E293B] rounded-2xl p-1.5 flex items-center gap-1.5 overflow-x-auto shadow-sm text-xs">
        <button
          onClick={() => setActiveTab('SIGNUP_QUEUE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'SIGNUP_QUEUE'
              ? 'bg-[#2563EB] text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-[#131E36]'
          }`}
        >
          <Mail className="w-4 h-4 text-amber-400" />
          <span>Identity Sign-Up Requests</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'SIGNUP_QUEUE' ? 'bg-[#1D4ED8] text-white' : 'bg-slate-800 text-slate-300'
          }`}>
            {pendingUsers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('APPROVED_USERS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'APPROVED_USERS'
              ? 'bg-[#2563EB] text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-[#131E36]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Approved Users Directory</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'APPROVED_USERS' ? 'bg-[#1D4ED8] text-white' : 'bg-slate-800 text-slate-300'
          }`}>
            {approvedUsers.length}
          </span>
        </button>
      </div>

      {/* 4. TAB 1: Identity Sign-Up Requests Queue (Matches image.png Exactly) */}
      {activeTab === 'SIGNUP_QUEUE' && (
        <div className="space-y-5">
          {/* Identity Verification Queue Orange Notice Box */}
          <div className="p-4 rounded-2xl bg-[#261503]/85 border border-amber-800/80 text-xs text-amber-200 flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-amber-300">Identity Verification Queue (Sign-Up Clearance)</p>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                New requests of mail ID for sign-up are routed here and to Admin Nexus for clearance. Approving a request verifies their Google mail credentials and provisions their role.
              </p>
            </div>
          </div>

          {/* Pending User Requests Cards Grid (Dark Navy Cards matching Image) */}
          {filteredPendingUsers.length === 0 ? (
            <div className="p-16 text-center bg-[#080E1C] rounded-2xl border border-[#1E293B] text-slate-400 text-xs shadow-xl">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
              <p className="font-bold text-sm text-white">All Identity Requests Authorized</p>
              <p className="text-[11px] mt-1 text-slate-400">
                No pending Google mail ID verification requests at this time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPendingUsers.map((u, idx) => {
                const avatarBg =
                  idx % 4 === 0
                    ? 'bg-[#0284c7]'
                    : idx % 4 === 1
                    ? 'bg-[#f59e0b]'
                    : idx % 4 === 2
                    ? 'bg-[#2563eb]'
                    : 'bg-[#10b981]';

                return (
                  <div
                    key={u.id}
                    className="p-5 bg-[#080E1C] rounded-2xl border border-[#1E293B] shadow-xl flex flex-col justify-between space-y-4 hover:border-blue-500/40 transition-colors"
                  >
                    <div className="space-y-3.5">
                      {/* Top: Avatar circle, Name, Email, and PENDING badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-full ${avatarBg} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md`}>
                            {getInitials(u.name, u.email)}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-white leading-tight">
                              {u.name?.trim() || <span className="text-amber-300 font-semibold">[Sign-Up Mail: {u.email.split('@')[0]}]</span>}
                            </h3>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              {u.email}
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-950/90 text-amber-400 border border-amber-700/80">
                          PENDING
                        </span>
                      </div>

                      {/* Target Details */}
                      <div className="p-3 rounded-xl bg-[#0B132B] border border-[#1E293B] text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Requisition Date:</span>
                          <span className="font-mono text-slate-300">
                            {formatDate(u.requestedAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Role Upon Acceptance:</span>
                          <span className="text-emerald-400 font-bold text-[11px]">Employee</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions: Reject and Accept Request */}
                    <div className="pt-2 border-t border-[#1E293B] flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => handleRejectUser(u.id, u.name || u.email)}
                        className="px-4 py-2 bg-transparent hover:bg-rose-950/40 text-rose-400 border border-rose-900/60 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Reject
                      </button>

                      <button
                        onClick={() => handleApproveUser(u.id, u.name || u.email)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept Request</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: Approved Users Directory (Dark Navy Box) */}
      {activeTab === 'APPROVED_USERS' && (
        <div className="bg-[#080E1C] rounded-2xl border border-[#1E293B] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#060B18] border-b border-[#1E293B] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">PERSONNEL NAME</th>
                  <th className="py-3.5 px-6">EMAIL</th>
                  <th className="py-3.5 px-6">DESIGNATION</th>
                  <th className="py-3.5 px-6">ASSIGNED ROLE</th>
                  <th className="py-3.5 px-6">EMPLOYEE ID</th>
                  <th className="py-3.5 px-6">STATUS</th>
                  <th className="py-3.5 px-6 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/70">
                {filteredApproved.map(u => (
                  <tr key={u.id} className="hover:bg-[#0E1B33]/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-white text-xs">
                      {u.name?.trim() || <span className="text-amber-400/90 italic">[Name Pending]</span>}
                    </td>
                    <td className="py-4 px-6 text-slate-300 font-mono text-xs">
                      {u.email}
                    </td>
                    <td className="py-4 px-6 text-slate-300 text-xs">
                      {u.designation || 'Enterprise Staff'}
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={u.role || 'EMPLOYEE'}
                        onChange={e => handleRoleChange(u.id, e.target.value as UserRole, u.email)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#0B1528] border border-blue-500/40 text-[#38BDF8] focus:outline-none focus:border-blue-400 cursor-pointer"
                      >
                        {USER_ROLES.map(r => (
                          <option key={r.role} value={r.role} className="bg-[#080E1C] text-white">
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 px-6 font-mono text-sky-400 text-xs font-bold">
                      {u.employeeId || 'MOD-AUTH'}
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-[#042F20] border border-[#065F46] text-[#34D399] font-bold text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                        Active Staff
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteApprovedUser(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title={`Delete ${u.name || u.email} from directory`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#080E1C] border border-[#1E2E4E] rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 text-white font-sans">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete User &amp; Personnel</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{userToDelete.email}</p>
                </div>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="p-1.5 rounded-xl bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete user{' '}
                <strong className="text-white">
                  {userToDelete.name?.trim() || userToDelete.email}
                </strong>
                ?
              </p>

              <div className="p-3 bg-[#0B132B] rounded-xl border border-[#1E2E4E] space-y-1.5 font-mono text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>EMAIL:</span>
                  <span className="text-sky-300 font-bold">{userToDelete.email}</span>
                </div>
                {userToDelete.employeeId && (
                  <div className="flex justify-between">
                    <span>EMP ID:</span>
                    <span className="text-slate-200">{userToDelete.employeeId}</span>
                  </div>
                )}
                {userToDelete.designation && (
                  <div className="flex justify-between">
                    <span>DESIGNATION:</span>
                    <span className="text-slate-200">{userToDelete.designation}</span>
                  </div>
                )}
                {userToDelete.role && (
                  <div className="flex justify-between">
                    <span>ROLE:</span>
                    <span className="text-amber-400 font-semibold">{getRoleLabel(userToDelete.role)}</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-rose-300/90 leading-relaxed">
                This record will be immediately removed from both the <strong>Approved Users Directory</strong> and the <strong>Employees</strong> page.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-[#131E36] hover:bg-[#1E2E4E] border border-[#203050] text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-950/50 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Record</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
