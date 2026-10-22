import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';

import { DashboardPage } from './pages/DashboardPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { RequestsPage } from './pages/RequestsPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { AttendancePage } from './pages/AttendancePage';
import { FacialVerificationPage } from './pages/FacialVerificationPage';
import { PayrollPage } from './pages/PayrollPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ReportsPage } from './pages/ReportsPage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { AdminNexusPage } from './pages/AdminNexusPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { ShieldAlert } from 'lucide-react';

// Route guard: Requires verified & approved user before granting access
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  if (!currentUser || currentUser.status !== 'APPROVED') {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};

// Route guard: Super Admin, Executive Director, and HR Manager have all access. Employee has limited access.
const RequireFullAccess: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasFullAccess, currentUser } = useAuth();

  if (!currentUser || currentUser.status !== 'APPROVED') {
    return <Navigate to="/login" replace />;
  }

  if (!hasFullAccess) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto my-12 p-8 bg-[#0B1528] border border-[#1E2E4E] rounded-3xl text-center space-y-4 shadow-2xl text-white font-sans animate-in fade-in">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Access Restricted • Operational Enclave</h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
            You are logged in with the <strong>Employee</strong> role, which has limited self-service access.
            This module is reserved for <strong>Super Admin</strong>, <strong>Executive Director</strong>, and <strong>HR Manager</strong>.
          </p>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <span>Return to Employee Dashboard</span>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return <AppLayout>{children}</AppLayout>;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            {/* Public Auth & Landing Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/landing" element={<LoginPage />} />
            <Route path="/gateway" element={<LoginPage />} />
            <Route path="/starone-landing" element={<LoginPage />} />

            {/* Dashboard: strictly verified users, displayed as per assigned role */}
            <Route
              path="/"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />

            {/* Restricted to Super Admin, Executive Director, and HR Manager */}
            <Route
              path="/user-management"
              element={
                <RequireFullAccess>
                  <UserManagementPage />
                </RequireFullAccess>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireFullAccess>
                  <UserManagementPage />
                </RequireFullAccess>
              }
            />
            <Route
              path="/access-requests"
              element={
                <RequireFullAccess>
                  <UserManagementPage />
                </RequireFullAccess>
              }
            />

            {/* Requests & Approvals Central (Available to verified users; Employee files and views own requests) */}
            <Route
              path="/requests"
              element={
                <RequireAuth>
                  <RequestsPage />
                </RequireAuth>
              }
            />

            {/* Restricted to Super Admin, Executive Director, and HR Manager */}
            <Route
              path="/employees"
              element={
                <RequireFullAccess>
                  <EmployeesPage />
                </RequireFullAccess>
              }
            />

            {/* Attendance & Biometric Kiosk (Available to verified users) */}
            <Route
              path="/attendance"
              element={
                <RequireAuth>
                  <AttendancePage />
                </RequireAuth>
              }
            />
            <Route
              path="/facial-verification"
              element={
                <RequireAuth>
                  <FacialVerificationPage />
                </RequireAuth>
              }
            />

            {/* Restricted to Super Admin, Executive Director, and HR Manager */}
            <Route
              path="/payroll"
              element={
                <RequireFullAccess>
                  <PayrollPage />
                </RequireFullAccess>
              }
            />

            <Route
              path="/onboarding"
              element={
                <RequireFullAccess>
                  <OnboardingPage />
                </RequireFullAccess>
              }
            />

            <Route
              path="/reports"
              element={
                <RequireFullAccess>
                  <ReportsPage />
                </RequireFullAccess>
              }
            />

            <Route
              path="/activity-logs"
              element={
                <RequireFullAccess>
                  <ActivityLogsPage />
                </RequireFullAccess>
              }
            />

            <Route
              path="/admin-nexus"
              element={
                <RequireFullAccess>
                  <AdminNexusPage />
                </RequireFullAccess>
              }
            />

            {/* Settings */}
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <SettingsPage />
                </RequireAuth>
              }
            />

            {/* Fallback to root (which prompts for login if not verified) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
