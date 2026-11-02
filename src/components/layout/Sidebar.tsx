import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { isRequestOwnedByUser, getRoleLabel } from '../../types';
import { ModelaLogo } from '../common/ModelaLogo';
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  UserPlus,
  CalendarCheck,
  ScanFace,
  DollarSign,
  UserCheck,
  BarChart3,
  History,
  Terminal,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
  Settings
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeStyle?: string;
}

export const Sidebar: React.FC = () => {
  const { currentUser, hasFullAccess, isEmployee, isHR, isDirector, pendingUsers } = useAuth();
  const { staffRequests, isSidebarCollapsed, toggleSidebar } = useApp();

  const myPendingStaffCount = staffRequests.filter(r => r.status === 'PENDING' && isRequestOwnedByUser(r, currentUser)).length;
  const pendingStaffCount = staffRequests.filter(r => r.status === 'PENDING').length;
  const pendingUsersCount = pendingUsers.length;

  // Limited access navigation for Employee role
  const employeeNavItems: NavItem[] = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      to: '/requests',
      label: 'Requests',
      icon: ShieldAlert,
      badge: myPendingStaffCount > 0 ? `${myPendingStaffCount} Pending` : undefined,
      badgeStyle: 'bg-[#FACC15] text-slate-900 font-extrabold'
    },
    {
      to: '/policy',
      label: 'Policy',
      icon: FileText
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings
    }
  ];

  // Full access navigation for Super Admin, Director, HR, and Manager
  const fullAccessNavItems: NavItem[] = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      to: '/requests',
      label: 'Requests',
      icon: ShieldAlert,
      badge: pendingStaffCount > 0 ? `${pendingStaffCount} Pending` : undefined,
      badgeStyle: 'bg-[#FACC15] text-slate-900 font-extrabold'
    },
    {
      to: '/employees',
      label: 'Employees',
      icon: Users,
      badge: 'Master',
      badgeStyle: 'bg-[#0E7490] text-sky-100 font-semibold'
    },
    {
      to: '/onboarding',
      label: 'Onboarding',
      icon: UserPlus
    },
    {
      to: '/payroll',
      label: 'Payroll',
      icon: DollarSign
    },
    {
      to: '/user-management',
      label: 'User management',
      icon: UserCheck,
      badge: !isDirector && pendingUsersCount > 0 ? `${pendingUsersCount} Pending` : undefined,
      badgeStyle: 'bg-[#FACC15] text-slate-900 font-extrabold'
    },
    {
      to: '/reports',
      label: 'Reports',
      icon: BarChart3
    },
    ...(!isHR && !isDirector
      ? [
          {
            to: '/activity-logs',
            label: 'Activity Logs',
            icon: History
          }
        ]
      : []),
    {
      to: '/policy',
      label: 'Policy',
      icon: FileText
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings
    }
  ];

  const navItems = isEmployee || !hasFullAccess ? employeeNavItems : fullAccessNavItems;

  const employeeId = currentUser?.employeeId || 'MOD000';
  const roleDisplay = getRoleLabel(currentUser?.role);

  return (
    <aside
      id="app-navigation-sidebar"
      className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#080E1C] text-slate-100 transition-all duration-300 ease-in-out border-r border-[#1E293B] shadow-2xl font-sans ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#1E293B] bg-[#0A1224]">
        <div className="flex items-center gap-3 overflow-hidden">
          <ModelaLogo className="w-8 h-8 shrink-0" />
          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-base tracking-tight text-white truncate">
                Modela Connect
              </span>
              <span className="text-[11px] text-[#38BDF8] font-medium truncate">
                Enterprise Platform
              </span>
            </div>
          )}
        </div>

        <button
          id="sidebar-collapse-toggle-btn"
          onClick={toggleSidebar}
          className="flex items-center justify-center w-7 h-7 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {!isSidebarCollapsed && (
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
            {hasFullAccess ? 'OPERATIONAL ENCLAVES' : 'STAFF SERVICES'}
          </div>
        )}

        {navItems.map(item => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={isSidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#0C2240] text-[#38BDF8] border border-[#38BDF8]/40 shadow-[0_0_15px_rgba(56,189,248,0.15)] font-bold'
                    : 'text-slate-300 hover:bg-[#0D182E] hover:text-white'
                }`
              }
            >
              <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                <Icon className={`${isSidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </div>

              {!isSidebarCollapsed && item.badge && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full shrink-0 ${item.badgeStyle}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-[#1E293B] bg-[#0A1224]">
        {/* For regular employees (Image 1): Session Status • Active */}
        {!hasFullAccess ? (
          isSidebarCollapsed ? (
            <div className="flex justify-center p-2" title="Session Status: Active (Employee)">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#0F172A] border border-[#1E293B] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Session Status</span>
                <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-slate-400">
                <span>Access Level</span>
                <span className="text-sky-300 font-bold">EMPLOYEE (LIMITED)</span>
              </div>
            </div>
          )
        ) : (
          /* For Super Admin, Executive Director, HR Manager (Images 3 & 4) */
          isSidebarCollapsed ? (
            <div className="flex justify-center p-2" title={`Clearance: ${roleDisplay}`}>
              <Shield className="w-6 h-6 text-[#38BDF8]" />
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#0F172A] border border-[#1E293B] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Identity Anchor</span>
                <span className="font-mono text-sky-300 font-bold text-[11px] bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
                  {employeeId}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Shield className="w-3 h-3 text-sky-400" />
                  Clearance
                </span>
                <span className="text-[11px] font-bold text-[#38BDF8]">
                  {roleDisplay.toUpperCase()}
                </span>
              </div>
            </div>
          )
        )}
      </div>
    </aside>
  );
};
