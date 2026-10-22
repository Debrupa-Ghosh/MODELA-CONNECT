import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useApp } from '../../context/AppContext';
import { RequestDetailsModal } from '../requests/RequestDetailsModal';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, removeToast, isSidebarCollapsed } = useApp();

  return (
    <div className="min-h-screen bg-[#EEF2F6] dark:bg-[#070D1D] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600/30 transition-colors duration-200">
      {/* Sidebar fixed on the left */}
      <Sidebar />

      {/* Main content wrapper shifted by the sidebar width */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10 ${
        isSidebarCollapsed ? 'pl-20' : 'pl-64'
      }`}>
        <Navbar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Global Staff Request Details Modal (Requirement 3) */}
      <RequestDetailsModal />

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start gap-3 text-xs animate-in slide-in-from-bottom-3 duration-200 bg-[#0B132B] ${
                isSuccess
                  ? 'border-emerald-500/40 text-white'
                  : isError
                  ? 'border-rose-500/40 text-white'
                  : 'border-blue-500/40 text-white'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
                {!isSuccess && !isError && <Info className="w-4 h-4 text-sky-400" />}
              </div>

              <div className="flex-1 space-y-0.5">
                <p className="font-bold">{toast.title}</p>
                <p className="text-slate-400 leading-relaxed">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
