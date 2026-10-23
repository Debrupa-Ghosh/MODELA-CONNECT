import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';

import { DashboardPage } from './pages/DashboardPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { RequestsPage } from './pages/RequestsPage';
import { EmployeesPage } from './pages/EmployeesPage';
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

// Route guard: Restricted to Super Admin, Director, HR, and Manager (Employees only have access to Dashboard, Requests, and Settings)
const RequireFullAccess: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, hasFullAccess, isEmployee } = useAuth();

  if (!currentUser || currentUser.status !== 'APPROVED') {
    return <Navigate to="/login" replace />;
  }

  if (isEmployee || !hasFullAccess) {
    return <Navigate to="/dashboard" replace />;
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

            {/* Removed Attendance & Facial Verification pages: redirect to dashboard */}
            <Route path="/attendance" element={<Navigate to="/dashboard" replace />} />
            <Route path="/facial-verification" element={<Navigate to="/dashboard" replace />} />

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
