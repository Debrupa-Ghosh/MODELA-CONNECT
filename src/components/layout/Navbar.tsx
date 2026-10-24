import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useNavigate, Link } from 'react-router-dom';
import { ModelaLogo } from '../common/ModelaLogo';
import { getRoleLabel } from '../../types';
import {
  Bell,
  Moon,
  Sun,
  Search,
  Shield,
  ChevronDown,
  LogOut,
  ExternalLink
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, hasFullAccess, isHR, isDirector, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useApp();
  const navigate = useNavigate();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const userName = currentUser?.name?.trim() || currentUser?.email || 'Modela User';
  const roleDisplay = getRoleLabel(currentUser?.role);
  const employeeId = currentUser?.employeeId || 'MOD000';

  // Sample operational alerts matching Image 4
  const alerts = [
    {
      action: 'Auth • Admin Sign In',
      time: '01:37 PM',
      details: 'Authorized HR Admin/Super Admin logged in: modelatech2026@gmail.com'
    },
    {
      action: 'Auth • Logout',
      time: '01:37 PM',
      details: 'User initiated sign out session termination.'
    },
    {
      action: 'Auth • New Access Request Created',
      time: '01:23 PM',
      details: 'Initial access request submitted by Debrupa123 (debrupa123@gmail.com)...'
    },
    {
      action: 'Auth • Logout',
      time: '01:23 PM',
      details: 'User initiated sign out session termination.'
    }
  ];

  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#070D1A] px-4 sm:px-6 flex items-center justify-between gap-4 transition-colors font-sans">
      
      {/* Brand & Platform title (Matches Image 1 Exactly) */}
      <div className="flex items-center gap-3">
        <ModelaLogo className="w-8 h-8 shrink-0" />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white truncate">
              Modela Connect
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E0F2FE] dark:bg-[#0A2540] border border-sky-300/80 dark:border-blue-500/60 text-[#0284C7] dark:text-[#38BDF8] shrink-0">
              Active Session
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
            Enterprise Workforce Platform
          </span>
        </div>
      </div>

      {/* Center Search Input (Matches Image 1 Exactly) */}
      <div className="relative hidden md:block w-72 lg:w-[420px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search employees..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-[#F1F5F9] dark:bg-[#0B132B] hover:bg-slate-200/60 dark:hover:bg-[#0E1836] focus:bg-white dark:focus:bg-[#0B132B] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200 dark:border-[#1E293B] rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Dark / Light Mode Icon Toggle (Image 1 displays Sun icon in light theme) */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
        </button>

        {/* Notification Bell with Operational Alerts dropdown (Matches Image 4) */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(prev => !prev);
              setShowUserMenu(false);
            }}
            className={`relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
              showNotifications ? 'bg-blue-100 dark:bg-blue-950 text-sky-600 dark:text-sky-400 border border-blue-300 dark:border-blue-700' : ''
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </button>

          {/* Operational Alerts Dropdown Panel (Matches Image 4 Exactly) */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#080E1C] border border-[#1E2E4E] rounded-2xl shadow-2xl p-4 z-50 text-xs animate-in fade-in zoom-in-95 space-y-3 font-sans text-white">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Bell className="w-4 h-4 text-sky-400" />
                  <span>Operational Alerts</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-600/30 text-sky-400 border border-blue-500/40">
                  Live Audit Feed
                </span>
              </div>

              {/* Alerts List (Image 4) */}
              <div className="space-y-3 divide-y divide-[#1E293B]/70 max-h-72 overflow-y-auto pr-1">
                {alerts.map((item, idx) => (
                  <div key={idx} className={`pt-2.5 first:pt-0 space-y-1`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{item.action}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{item.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {item.details}
                    </p>
                  </div>
                ))}
              </div>

              {/* Footer Link */}
              {hasFullAccess && !isHR && !isDirector && (
                <div className="pt-2 border-t border-[#1E293B] text-center">
                  <Link
                    to="/activity-logs"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold inline-flex items-center gap-1.5"
                  >
                    <span>View complete audit logs</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Pill Button (Matches Image 1, 3, 4) */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(prev => !prev);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 pl-3 py-1.5 pr-2.5 rounded-xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-[#1E293B] hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer text-left shadow-xs"
          >
            <div className="flex flex-col text-right">
              <span className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                {userName}
              </span>
              <span className="text-[10px] text-blue-600 dark:text-[#38BDF8] flex items-center justify-end gap-1 font-semibold leading-tight">
                <Shield className="w-2.5 h-2.5" />
                {roleDisplay}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {/* User Profile Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-[#0B132B] border border-[#1E293B] rounded-2xl shadow-2xl p-3.5 z-50 text-xs animate-in fade-in zoom-in-95 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">{userName}</h3>
                  <p className="text-[11px] text-slate-400">Enterprise Staff</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
                  {roleDisplay}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Employee Anchor:</span>
                <span className="font-mono text-[#38BDF8] font-bold bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800 text-[11px]">
                  {employeeId}
                </span>
              </div>

              <div className="border-t border-[#1E293B]" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span>2FA Security</span>
                </div>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Set Up
                </button>
              </div>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full flex items-center gap-2 pt-1 text-rose-500 hover:text-rose-400 font-semibold transition-colors cursor-pointer text-xs"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
