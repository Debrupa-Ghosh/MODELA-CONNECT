import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Employee,
  StaffWorkflowRequest,
  AttendanceRecord,
  PayrollRecord,
  AuditLog,
  OnboardingCandidate,
  RequestStatus,
  User,
  canUserApproveRequest
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_EMPLOYEES,
  INITIAL_STAFF_REQUESTS,
  INITIAL_ATTENDANCE,
  INITIAL_PAYROLL,
  INITIAL_AUDIT_LOGS,
  INITIAL_ONBOARDING
} from '../data/initialData';
import { useAuth } from './AuthContext';
import {
  getDeletedRegistry,
  recordDeletedRecord,
  removeDeletedRecord,
  isRecordDeleted,
  recordCustomEmpId,
  resolveEmpId,
  SYNC_REGISTRY_DOC_ID,
  persistSyncRegistryToFirestore
} from '../utils/syncRegistry';

const cleanFirestoreData = <T extends Record<string, any>>(obj: T): T => {
  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      result[key] = cleanFirestoreData(val);
    } else {
      result[key] = val;
    }
  }
  return result;
};

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  employees: Employee[];
  staffRequests: StaffWorkflowRequest[];
  attendance: AttendanceRecord[];
  payroll: PayrollRecord[];
  auditLogs: AuditLog[];
  onboarding: OnboardingCandidate[];
  toasts: ToastMessage[];
  showToast: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  // Employee methods
  addEmployee: (emp: Omit<Employee, 'id'>) => Promise<Employee>;
  bulkAddEmployees: (employees: Employee[]) => Promise<number>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<boolean>;
  deleteEmployee: (id: string, email?: string) => Promise<boolean>;
  addStaffRequest: (data: Omit<StaffWorkflowRequest, 'id' | 'submittedAt' | 'status' | 'isVerifiedStaff'>) => Promise<StaffWorkflowRequest>;
  updateStaffRequestStatus: (id: string, status: RequestStatus, remarks?: string) => Promise<boolean>;
  deleteStaffRequest: (id: string) => Promise<boolean>;
  refreshStaffRequests: () => Promise<void>;
  selectedStaffRequest: StaffWorkflowRequest | null;
  setSelectedStaffRequest: (req: StaffWorkflowRequest | null) => void;
  isDetailsModalOpen: boolean;
  setIsDetailsModalOpen: (open: boolean) => void;
  openRequestDetails: (req: StaffWorkflowRequest) => void;
  closeRequestDetails: () => void;
  // Attendance methods
  logAttendance: (employeeId: string, method?: 'FACIAL_AI' | 'BIOMETRIC' | 'MANUAL_OVERRIDE') => Promise<{ success: boolean; message: string; record?: AttendanceRecord }>;
  // Payroll methods
  disbursePayroll: (id: string) => Promise<boolean>;
  updatePayrollRecord: (id: string, updates: Partial<PayrollRecord>, fallbackRecord?: PayrollRecord) => Promise<boolean>;
  togglePayrollStatus: (id: string, fallbackRecord?: PayrollRecord) => Promise<boolean>;
  syncEmployeeToPayroll: (employee: Employee, cycleMonth?: string, cycleYear?: number) => Promise<PayrollRecord>;
  // Audit log helper
  addAuditLog: (action: string, module: string, details: string, recordId?: string, result?: 'SUCCESS' | 'FAILURE' | 'WARNING') => void;
  // Theme state
  isDarkMode: boolean;
  toggleTheme: () => void;
  // Sidebar state
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  EMPLOYEES: 'modela_employees_v3',
  REQUESTS: 'modela_requests_v3_clean',
  ATTENDANCE: 'modela_attendance_v2',
  PAYROLL: 'modela_payroll_v2',
  LOGS: 'modela_logs_v2',
  ONBOARDING: 'modela_onboarding_v2',
  THEME: 'modela_theme_dark'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, users, updateUserFromEmployee } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>(() => {
    let currentList: Employee[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentList = parsed
            .filter(e => !isRecordDeleted(e.id, e.email))
            .map(e => ({
              ...e,
              id: resolveEmpId(e.email, e.id) || e.id
            }));
        }
      }
    } catch {}

    if (currentList.length === 0) {
      currentList = INITIAL_EMPLOYEES.filter(e => !isRecordDeleted(e.id, e.email)).map(e => ({
        ...e,
        id: resolveEmpId(e.email, e.id) || e.id
      }));
    }

    // Ensure Sushoovan Das (Super Admin MTK006) and all 18 active database employees are always in the Employees page
    const sushoovanEmployee: Employee = {
      id: resolveEmpId("sushovand@modelatech.com", "MTK006") || "MTK006",
      firstName: "Sushoovan",
      lastName: "Das",
      email: "sushovand@modelatech.com",
      joiningDate: "2024-01-15",
      designation: "Executive Director & Super Admin",
      phone: "+1 (555) 234-5678",
      department: "Executive Office",
      status: "ACTIVE",
      location: "San Francisco HQ",
      compensation: { basic: 85000, allowances: 25000 },
      pan: "DASSV1989K",
      bankAccount: "815801500111",
      avatar: "https://ui-avatars.com/api/?name=Sushoovan+Das&background=3b82f6&color=fff"
    };

    const isTonyStark = (firstName?: string, lastName?: string, email?: string, id?: string): boolean => {
      const full = `${firstName || ''} ${lastName || ''}`.trim().toLowerCase();
      const em = (email || '').trim().toLowerCase();
      const i = (id || '').trim().toLowerCase();
      return (
        full.includes('tony stark') ||
        (full.includes('tony') && full.includes('stark')) ||
        full.includes('marcus vance') ||
        (full.includes('marcus') && full.includes('vance')) ||
        full.includes('sourav ganguly') ||
        (full.includes('sourav') && full.includes('ganguly')) ||
        full.includes('pooja sharma') ||
        (full.includes('pooja') && full.includes('sharma')) ||
        em.includes('tonystark') ||
        em.includes('tony.stark') ||
        em.includes('marcus.vance') ||
        em.includes('sourav.ganguly') ||
        em.includes('pooja.sharma') ||
        em === 'modelatech2026@gmail.com' ||
        em === 'sushoovandas@gmail.com' ||
        em === 'ghoshdebrupa005@gmail.com' ||
        (em.includes('tony') && em.includes('stark')) ||
        i.includes('tonystark') ||
        i === 'mod000' ||
        i === 'mod008' ||
        i === 'mod011' ||
        i === 'mod101' ||
        i === 'mod003' ||
        i === 'mod005' ||
        i === 'mod006' ||
        i === 'mod007' ||
        i === 'mod102'
      );
    };

    currentList = currentList.filter(e => !isTonyStark(e.firstName, e.lastName, e.email, e.id));

    const requiredEmployees: Employee[] = [
      sushoovanEmployee,
      ...INITIAL_EMPLOYEES.filter(e => e.email?.toLowerCase() !== 'sushovand@modelatech.com').map(e => ({
        ...e,
        id: resolveEmpId(e.email, e.id) || e.id
      }))
    ];

    const nonApprovedUserEmails = new Set(
      users
        .filter(u => u.status !== 'APPROVED' && u.email)
        .map(u => u.email.toLowerCase().trim())
    );

    currentList = currentList.filter(
      e => !(e.email && nonApprovedUserEmails.has(e.email.toLowerCase().trim()))
    );

    requiredEmployees.forEach(reqEmp => {
      const isDel = isRecordDeleted(reqEmp.id, reqEmp.email);
      const isPendingOrUnapproved = Boolean(reqEmp.email && nonApprovedUserEmails.has(reqEmp.email.toLowerCase().trim()));
      if (!isDel && !isPendingOrUnapproved) {
        const exists = currentList.some(
          e => e.id.toLowerCase() === reqEmp.id.toLowerCase() || (Boolean(e.email && reqEmp.email) && e.email!.toLowerCase() === reqEmp.email!.toLowerCase())
        );
        if (!exists) {
          currentList.unshift(reqEmp);
        }
      }
    });

    // Merge in any approved users from localStorage or initial dataset so they appear immediately
    try {
      const savedUsers = localStorage.getItem('modela_users_v3') || localStorage.getItem('modela_users_v2');
      const usersArray = savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS;
      if (Array.isArray(usersArray)) {
        usersArray
          .filter((u: any) => u.status === 'APPROVED' && u.email && !isRecordDeleted(u.id, u.email, u.name))
          .forEach((u: any) => {
            if (isTonyStark(u.name, '', u.email, u.employeeId)) return;
            const empId = resolveEmpId(u.email, u.employeeId || u.id) || u.employeeId || u.id;
            const exists = currentList.some(
              e => (e.id && e.id.toLowerCase() === empId.toLowerCase()) ||
                   (e.email && e.email.toLowerCase() === u.email.toLowerCase())
            );
            if (!exists) {
              const parts = (u.name || '').trim().split(/\s+/);
              currentList.push({
                id: empId,
                firstName: parts[0] || (u.name || '').trim() || 'Staff',
                lastName: parts.slice(1).join(' ') || '',
                joiningDate: new Date().toISOString().split('T')[0],
                phone: '',
                email: u.email,
                designation: u.designation || (u.role === 'SUPER_ADMIN' ? 'Executive Director & Super Admin' : 'Enterprise Staff'),
                department: u.department || (u.role === 'SUPER_ADMIN' ? 'Executive Office' : 'General Staff'),
                status: 'ACTIVE',
                location: 'San Francisco HQ',
                compensation: u.role === 'SUPER_ADMIN' ? { basic: 95000, allowances: 30000 } : { basic: 50000, allowances: 15000 },
                avatar: u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email)}&background=0284c7&color=fff`
              });
            }
          });
      }
    } catch {}

    // Deduplicate by email and ensure custom EMP ID is applied
    const dedupMap = new Map<string, Employee>();
    currentList.forEach(e => {
      if (isTonyStark(e.firstName, e.lastName, e.email, e.id)) return;
      const key = e.email ? e.email.toLowerCase().trim() : e.id.toUpperCase().trim();
      const resolvedId = resolveEmpId(e.email, e.id) || e.id;
      dedupMap.set(key, { ...e, id: resolvedId });
    });
    const finalInitialList = Array.from(dedupMap.values());

    try {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(finalInitialList));
    } catch {}

    return finalInitialList;
  });

  // Listen to new employee addition events (e.g. from new signup requests)
  useEffect(() => {
    const handleEmployeeAdded = (event: Event) => {
      const customEvent = event as CustomEvent<Employee>;
      if (customEvent.detail) {
        setEmployees(prev => {
          const filtered = prev.filter(
            e =>
              e.id.toLowerCase() !== customEvent.detail.id.toLowerCase() &&
              (!customEvent.detail.email || !e.email || e.email.toLowerCase() !== customEvent.detail.email.toLowerCase())
          );
          const next = [customEvent.detail, ...filtered];
          try {
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(next));
          } catch {}
          return next;
        });
        syncEmployeeToPayroll(customEvent.detail);
      }
    };
    window.addEventListener('modela_employee_added', handleEmployeeAdded);
    return () => window.removeEventListener('modela_employee_added', handleEmployeeAdded);
  }, []);

  // Cross-context deletion sync: remove employee when deleted from Approved Users Directory or remote sync registry
  useEffect(() => {
    const handleEmployeeDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string; email?: string }>;
      const { id, email } = customEvent.detail || {};
      setEmployees(prev => {
        const next = prev.filter(e => {
          if (id && (e.id.toLowerCase() === id.toLowerCase() || e.id === id)) return false;
          if (email && e.email && e.email.toLowerCase() === email.toLowerCase()) return false;
          if (isRecordDeleted(e.id, e.email, resolveEmpId(e.email, e.id))) return false;
          return true;
        });
        try {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(next));
        } catch {}
        return next;
      });
    };

    const handleSyncRegistryUpdated = () => {
      setEmployees(prev => {
        const next = prev
          .filter(e => !isRecordDeleted(e.id, e.email, resolveEmpId(e.email, e.id)))
          .map(e => ({
            ...e,
            id: resolveEmpId(e.email, e.id) || e.id
          }));
        try {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(next));
        } catch {}
        return next;
      });
    };

    window.addEventListener('modela_employee_deleted', handleEmployeeDeleted);
    window.addEventListener('modela_sync_registry_updated', handleSyncRegistryUpdated);
    return () => {
      window.removeEventListener('modela_employee_deleted', handleEmployeeDeleted);
      window.removeEventListener('modela_sync_registry_updated', handleSyncRegistryUpdated);
    };
  }, []);

  // Cross-context EMP ID change listener: immediately update personnel ID in AppContext
  useEffect(() => {
    const handleEmpIdChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ oldId?: string; newId?: string; email?: string }>;
      const { oldId, newId, email } = customEvent.detail || {};
      if (!newId) return;
      const cleanNew = newId.trim().toUpperCase();
      const cleanOld = oldId ? oldId.trim().toUpperCase() : '';
      const cleanEmail = email ? email.trim().toLowerCase() : '';

      recordCustomEmpId(cleanEmail, cleanOld, cleanNew);

      setEmployees(prev => {
        const target = prev.find(
          e => (cleanOld && e.id.toUpperCase() === cleanOld) || (cleanEmail && e.email?.toLowerCase() === cleanEmail)
        );
        if (!target) return prev;

        const updatedTarget: Employee = { ...target, id: cleanNew };
        const next = [
          updatedTarget,
          ...prev.filter(
            e => (cleanOld ? e.id.toUpperCase() !== cleanOld : true) &&
                 e.id.toUpperCase() !== cleanNew &&
                 (cleanEmail ? (!e.email || e.email.toLowerCase() !== cleanEmail) : true)
          )
        ];
        try {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(next));
        } catch {}
        return next;
      });
    };

    window.addEventListener('modela_employee_id_changed', handleEmpIdChanged);
    return () => window.removeEventListener('modela_employee_id_changed', handleEmpIdChanged);
  }, []);

  // Synchronize any newly approved users from AuthContext to employees directory and ensure their 12-month payroll exists
  useEffect(() => {
    if (!users || users.length === 0) return;
    const approved = users.filter(u => u.status === 'APPROVED' && u.email);
    if (approved.length === 0) return;

    setEmployees(prev => {
      let changed = false;
      const nextList = [...prev];

      approved.forEach(u => {
        if (!u.email || u.id === SYNC_REGISTRY_DOC_ID || u.email === 'sync@system.internal') return;
        const resolvedUserId = resolveEmpId(u.email, u.employeeId);
        if (isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolvedUserId)) return;

        const existingIdx = nextList.findIndex(
          e => (Boolean(resolvedUserId) && e.id.toLowerCase() === resolvedUserId!.toLowerCase()) ||
               (Boolean(e.email) && e.email!.toLowerCase() === u.email.toLowerCase())
        );

        if (existingIdx === -1) {
          const parts = (u.name || '').trim().split(/\s+/);
          const empId = resolvedUserId || `MOD${String(nextList.length + 1).padStart(3, '0')}`;
          const newEmp: Employee = {
            id: empId,
            firstName: parts[0] || (u.name || '').trim() || 'Staff',
            lastName: parts.slice(1).join(' ') || '',
            joiningDate: new Date().toISOString().split('T')[0],
            phone: '',
            email: u.email,
            designation: u.designation || (u.role === 'SUPER_ADMIN' ? 'Executive Director & Super Admin' : 'Enterprise Staff'),
            department: u.department || (u.role === 'SUPER_ADMIN' ? 'Executive Office' : 'General Staff'),
            status: 'ACTIVE',
            location: 'San Francisco HQ',
            compensation: u.role === 'SUPER_ADMIN' ? { basic: 95000, allowances: 30000 } : { basic: 50000, allowances: 15000 },
            avatar: u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email)}&background=0284c7&color=fff`
          };
          nextList.unshift(newEmp);
          changed = true;

          // Persist newly approved user to Firestore employees collection
          setDoc(doc(db, 'employees', empId), cleanFirestoreData(newEmp), { merge: true }).catch(() => {});
          fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEmp)
          }).catch(() => {});
        } else if (resolvedUserId && nextList[existingIdx].id !== resolvedUserId) {
          nextList[existingIdx] = { ...nextList[existingIdx], id: resolvedUserId };
          changed = true;
        }
      });

      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(nextList));
        } catch {}
        return nextList;
      }
      return prev;
    });
  }, [users]);

  const isExcludedStaffRequest = (r?: Partial<StaffWorkflowRequest> | null): boolean => {
    if (!r) return true;
    if (isRecordDeleted(r.id)) return true;

    const reqId = String(r.id || '').trim().toUpperCase();
    const empId = String(r.employeeId || '').trim().toUpperCase();
    const empEmail = String(r.employeeEmail || '').trim().toLowerCase();
    const empName = String(r.employeeName || '').trim().toLowerCase();
    const reqTitle = String(r.title || '').trim().toLowerCase();
    const reqStatus = String(r.status || 'PENDING').trim().toUpperCase();

    // Permanently exclude deleted pending request(s) of MTK023 (including REQ-6677 / title "ABC" or any pending request of MTK023 created on or before 2026-11-06T10:28:00.000Z)
    if (
      reqId === 'REQ-6677' ||
      (empId === 'MTK023' &&
        reqStatus === 'PENDING' &&
        (reqTitle === 'abc' ||
          !r.submittedAt ||
          new Date(r.submittedAt).getTime() <= new Date('2026-11-06T10:28:00.000Z').getTime()))
    ) {
      return true;
    }

    // Never exclude newly submitted live requests or requests with To mentions
    if (
      r.isLiveStaffRequest ||
      Boolean(r.to && String(r.to).trim()) ||
      (Array.isArray(r.toUsers) && r.toUsers.length > 0)
    ) {
      return false;
    }

    // Always exclude mock / seed requests and specifically deleted requests (including REQ-1572, REQ-3779, REQ-9074, REQ-2709, REQ-6425)
    if (
      reqId === 'REQ-1572' ||
      reqId === 'REQ-2709' ||
      reqId === 'REQ-6425' ||
      reqId === 'REQ-3779' ||
      reqId === 'REQ-9074' ||
      reqId === 'REQ-622' ||
      reqId === 'REQ-719' ||
      reqId === 'REQ-1042' ||
      reqId === 'REQ-1043' ||
      reqId === 'REQ-1044' ||
      reqId === 'REQ-STF-001' ||
      reqId === 'REQ-STF-002' ||
      reqId === 'REQ-STF-003' ||
      reqId === 'REQ-STF-004' ||
      ((empId === 'MOD106' || empName === 'modela tech') && (reqTitle === 'bhaifota' || reqTitle === 'laptop')) ||
      ((empId === 'MOD011' || empName === 'debrupa ghosh') && (reqTitle === 'laptop needed' || reqTitle === 'device needed' || reqTitle === 'sick leave')) ||
      empId === 'MOD116' ||
      empId === 'MOD003' ||
      empId === 'MOD005' ||
      empId === 'MOD006' ||
      empName === 'sourav ganguly' ||
      empName === 'pooja sharma' ||
      empName === 'marcus vance' ||
      r.employeeName === 'Riju1234' ||
      r.employeeName === 'Abc123'
    ) {
      return true;
    }

    // Exclude legacy MOD007 / ghoshdebrupa005@gmail.com seed requests that do not have calendar dates from the form
    if ((empId === 'MOD007' || empEmail === 'ghoshdebrupa005@gmail.com') && !r.startDate && !r.requestDate) {
      return true;
    }

    return false;
  };

  const [staffRequests, setStaffRequests] = useState<StaffWorkflowRequest[]>(() => {
    try {
      localStorage.removeItem('modela_requests_v2');
      const saved = localStorage.getItem(STORAGE_KEYS.REQUESTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((r: StaffWorkflowRequest) => !isExcludedStaffRequest(r));
          try {
            localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(filtered));
          } catch {}
          return filtered;
        }
      }
    } catch {}
    return [];
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_ATTENDANCE;
  });

  // Helper for Requirement 3: Jan to Oct mark all PAID, Nov to Dec mark all UNPAID
  const isNovDecMonth = (m?: string): boolean => {
    const lower = (m || '').trim().toLowerCase();
    return lower === 'november' || lower === 'december' || lower === 'nov' || lower === 'dec';
  };

  const BLOCKED_PAYROLL_DOC_IDS = new Set([
    'PAY-2026-OCT-MOD',
    'PAY-2026-OCT-MOD0',
    'PAY-2026-OCT-MOD00',
    'PAY-2026-OCT-MOD000',
    'PAY-2026-OCT-MOD0001',
    'PAY-2026-OCT-MOD100',
    'PAY-2026-OCT-MOD101',
    'PAY-2026-OCT-MOD102',
    'PAY-2026-OCT-MOD106',
    'PAY-2026-OCT-MOD01',
    'PAY-2026-OCT-MOD0090',
    'PAY-2026-OCT-MOD003',
    'PAY-2026-OCT-MOD005',
    'PAY-2026-OCT-MOD006',
    'PAY-2026-09-04',
    'PAY-2026-10-04',
    'PAY-2026-SEP-MOD007',
    'PAY-2026-OCT-MOD007',
    'PAY-2026-NOV-MOD007',
    'PAY-2026-DEC-MOD007',
    'PAY-2026-OCT-MOD001',
    ...['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].flatMap(m => [
      `PAY-2026-${m}-MOD000`,
      `PAY-2026-${m}-MOD101`,
      `PAY-2026-${m}-MOD102`,
      `PAY-2026-${m}-MOD106`,
      `PAY-2026-${m}-MOD003`,
      `PAY-2026-${m}-MOD005`,
      `PAY-2026-${m}-MOD006`
    ])
  ]);

  const isExcludedPayrollRecord = (p: Partial<PayrollRecord>): boolean => {
    if (!p) return true;
    const docId = String(p.id || '').trim().toUpperCase();
    const empId = String(p.employeeId || '').trim().toUpperCase();
    const empName = String(p.employeeName || '').trim().toLowerCase();

    if (BLOCKED_PAYROLL_DOC_IDS.has(docId)) return true;

    // Exclude EMP ID MOD101, MOD102, MOD106 (Modela Tech), MOD000, MOD003, MOD005, MOD006, MOD007, legacy MOD0090, Marcus Vance, Sourav Ganguly, Pooja Sharma, Tony Stark, and Piu Roy salary slips
    if (
      empName === 'modela tech' ||
      empName.includes('modela tech') ||
      empName.includes('tony stark') ||
      (empName.includes('tony') && empName.includes('stark')) ||
      empName.includes('piu roy') ||
      (empName.includes('piu') && empName.includes('roy')) ||
      empName.includes('marcus vance') ||
      (empName.includes('marcus') && empName.includes('vance')) ||
      empName.includes('sourav ganguly') ||
      (empName.includes('sourav') && empName.includes('ganguly')) ||
      empName.includes('pooja sharma') ||
      (empName.includes('pooja') && empName.includes('sharma')) ||
      empId === 'MOD000' ||
      empId === 'MOD008' ||
      empId === 'MOD101' ||
      empId === 'MOD102' ||
      empId === 'MOD106' ||
      empId === 'MOD003' ||
      empId === 'MOD005' ||
      empId === 'MOD006' ||
      empId === 'MOD007' ||
      empId === 'MOD0090' ||
      docId === 'PAY-2026-09-04' ||
      docId === 'PAY-2026-10-04' ||
      docId.includes('MOD000') ||
      docId.includes('MOD008') ||
      docId.includes('MOD101') ||
      docId.includes('MOD102') ||
      docId.includes('MOD106') ||
      docId.includes('MOD003') ||
      docId.includes('MOD005') ||
      docId.includes('MOD006') ||
      docId.includes('MOD007') ||
      docId.includes('MOD0090') ||
      docId.includes('TONY') ||
      docId.includes('STARK') ||
      docId.includes('PIU') ||
      docId.includes('MARCUS') ||
      docId.includes('SOURAV') ||
      docId.includes('POOJA')
    ) {
      return true;
    }

    // Exclude old intermediate MOD01 record (keep MOD011 for Debrupa Ghosh surupa008@gmail.com!)
    if (empId === 'MOD01' || docId.endsWith('-MOD01')) {
      return true;
    }

    return false;
  };

  const getPayrollPersonKey = (p: Partial<PayrollRecord>): string => {
    const nameLower = String(p.employeeName || '').trim().toLowerCase();
    const empIdUpper = String(p.employeeId || '').trim().toUpperCase();
    const docIdUpper = String(p.id || '').trim().toUpperCase();

    if (nameLower === 'sushoovan das') {
      return 'sushoovan-das';
    }
    if (nameLower === 'debrupa ghosh') {
      const surupaResolved = (resolveEmpId('surupa008@gmail.com', 'MOD011') || 'MOD011').toUpperCase();
      if (
        empIdUpper === 'MOD011' ||
        empIdUpper === surupaResolved ||
        docIdUpper.endsWith('-MOD011') ||
        docIdUpper.endsWith(`-${surupaResolved}`)
      ) {
        return 'debrupa-ghosh-surupa008';
      }
      return 'debrupa-ghosh-primary';
    }
    return empIdUpper ? `id-${empIdUpper}` : `name-${nameLower}`;
  };

  const enforceMonthPayrollRules = (records: PayrollRecord[]): PayrollRecord[] => {
    const filtered = records.filter(p => !isExcludedPayrollRecord(p));

    // Deduplicate so each distinct employee has at most 1 payslip per (month, year)
    const cyclePersonMap = new Map<string, PayrollRecord>();

    filtered.forEach(rawP => {
      const isNovDec = isNovDecMonth(rawP.month);
      const isFutureUnpaidYear = Number(rawP.year) >= 2027 && Number(rawP.year) <= 2036;
      const personKey = getPayrollPersonKey(rawP);
      const defaultStatus: 'PAID' | 'UNPAID' = (isNovDec || isFutureUnpaidYear) ? 'UNPAID' : 'PAID';

      let finalStatus: 'PAID' | 'UNPAID' =
        rawP.manualStatusOverride && (rawP.status === 'PAID' || rawP.status === 'UNPAID')
          ? rawP.status
          : isFutureUnpaidYear
          ? 'UNPAID'
          : (rawP.status === 'PAID' || rawP.status === 'UNPAID' ? rawP.status : defaultStatus);

      if (personKey === 'debrupa-ghosh-surupa008' && isNovDec && !rawP.manualStatusOverride) {
        finalStatus = 'UNPAID';
      }

      const otAmt = Number(rawP.otAmount) || 0;
      const baseBasic = Number(rawP.basicSalary) || 0;
      const baseAllowances = Number(rawP.allowances) || 0;
      const computedGross = baseBasic + baseAllowances + otAmt;
      const computedDed = Number(rawP.deductions) || 0;
      const computedNet = +(computedGross - computedDed).toFixed(2);

      let p: PayrollRecord = {
        ...rawP,
        otAmount: otAmt,
        grossSalary: computedGross,
        netSalary: computedNet,
        status: finalStatus,
        paymentDate: finalStatus === 'PAID' ? (rawP.paymentDate || `${rawP.year}-01-01`) : '',
        disbursedBy: finalStatus === 'PAID' ? (rawP.disbursedBy || 'System Master Disburser') : ''
      };

      if (personKey === 'debrupa-ghosh-surupa008') {
        const resolvedId = resolveEmpId('surupa008@gmail.com', p.employeeId || 'MOD011') || 'MOD011';
        p = {
          ...p,
          employeeId: resolvedId
        };
      } else if (personKey === 'debrupa-ghosh-primary') {
        const resolvedId = resolveEmpId('ghoshdebrupa005@gmail.com', p.employeeId || 'MOD007') || 'MOD007';
        p = {
          ...p,
          employeeId: resolvedId
        };
      } else if (personKey === 'sushoovan-das') {
        const resolvedId = resolveEmpId('sushovand@modelatech.com', p.employeeId || 'MOD001') || 'MOD001';
        p = {
          ...p,
          employeeId: resolvedId
        };
      }

      const cycleKey = `${(p.month || '').trim().toLowerCase()}-${p.year}-${personKey}`;
      const existing = cyclePersonMap.get(cycleKey);

      if (!existing) {
        cyclePersonMap.set(cycleKey, p);
      } else {
        const pUpdated = String((p as any).updatedAt || '');
        const exUpdated = String((existing as any).updatedAt || '');
        const isPCanonical = /^PAY-\d{4}-\d{2}-\d{2}$/.test(p.id);
        const isExCanonical = /^PAY-\d{4}-\d{2}-\d{2}$/.test(existing.id);
        const pMatchesResolvedId = p.id.toUpperCase().endsWith(`-${p.employeeId.toUpperCase()}`);
        const exMatchesResolvedId = existing.id.toUpperCase().endsWith(`-${existing.employeeId.toUpperCase()}`);

        if (pUpdated && (!exUpdated || pUpdated > exUpdated)) {
          cyclePersonMap.set(cycleKey, p);
        } else if (!exUpdated && p.manualStatusOverride && !existing.manualStatusOverride) {
          cyclePersonMap.set(cycleKey, p);
        } else if (
          !exUpdated &&
          !existing.manualStatusOverride &&
          ((isPCanonical && !isExCanonical) || (!isExCanonical && pMatchesResolvedId && !exMatchesResolvedId))
        ) {
          cyclePersonMap.set(cycleKey, p);
        }
      }
    });

    return Array.from(cyclePersonMap.values());
  };

  // Persist payroll in localStorage and sync with Firestore database
  const [payroll, setPayroll] = useState<PayrollRecord[]>(() => {
    let list: PayrollRecord[] = INITIAL_PAYROLL;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PAYROLL);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = [...parsed, ...INITIAL_PAYROLL];
        }
      }
    } catch {}
    const normalized = enforceMonthPayrollRules(list);
    try {
      localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(normalized));
    } catch {}
    return normalized;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_AUDIT_LOGS;
  });

  const [onboarding, setOnboarding] = useState<OnboardingCandidate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ONBOARDING);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_ONBOARDING;
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved !== null) return saved === 'true';
    } catch {}
    return true; // default dark mode matching screenshots
  });

  // Real-time Firestore synchronization for employees across all devices
  useEffect(() => {
    let isSubscribed = true;
    const cleanedEmpIds = new Set<string>();
    const seededEmpIds = new Set<string>();

    // Immediately delete legacy duplicate MOD008 from Firestore employees and backend
    deleteDoc(doc(db, 'employees', 'MOD008')).catch(() => {});
    fetch('/api/employees/MOD008', { method: 'DELETE' }).catch(() => {});

    const unsub = onSnapshot(
      collection(db, 'employees'),
      async snapshot => {
        if (!isSubscribed) return;
        if (snapshot.empty) {
          try {
            for (const emp of INITIAL_EMPLOYEES) {
              if (!isRecordDeleted(emp.id, emp.email)) {
                const resolvedId = resolveEmpId(emp.email, emp.id) || emp.id;
                if (!seededEmpIds.has(resolvedId)) {
                  seededEmpIds.add(resolvedId);
                  await setDoc(doc(db, 'employees', resolvedId), cleanFirestoreData({ ...emp, id: resolvedId }));
                }
              }
            }
          } catch (e) {
            console.warn('Initial employees seed error:', e);
          }
          return;
        }

        const remoteDocs: { docId: string; data: Employee }[] = [];
        snapshot.forEach(docSnap => {
          const rawData = docSnap.data() as any;
          if (!rawData) return;
          const rawId = String(rawData.id || docSnap.id || '').trim();
          if (!rawId) return;
          const lowerEmail = String(rawData.email || '').trim().toLowerCase();
          const isPoulamiManna = lowerEmail === 'poulamim@modelatech.com' || rawId.toUpperCase() === 'MTK017';
          const nameParts = String(rawData.name || '').trim().split(/\s+/);
          const firstName = isPoulamiManna ? 'Poulami' : (rawData.firstName || nameParts[0] || 'Staff');
          const lastName = isPoulamiManna ? 'Manna' : (rawData.lastName !== undefined ? rawData.lastName : nameParts.slice(1).join(' '));
          const data: Employee = {
            ...rawData,
            id: isPoulamiManna ? 'MTK017' : rawId,
            firstName,
            lastName,
            email: rawData.email || '',
            joiningDate: rawData.joiningDate || '2026-10-15',
            designation: rawData.designation || 'Staff Candidate',
            department: rawData.department || 'General Staff',
            phone: rawData.phone || '',
            status: rawData.status || 'ACTIVE',
            location: rawData.location || 'San Francisco HQ',
            compensation: rawData.compensation && typeof rawData.compensation.basic === 'number'
              ? rawData.compensation
              : { basic: 50000, allowances: 15000 },
            avatar: isPoulamiManna
              ? 'https://ui-avatars.com/api/?name=Poulami+Manna&background=0284c7&color=fff'
              : (rawData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${firstName} ${lastName}`.trim())}&background=0284c7&color=fff`)
          };
          const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim().toLowerCase();
          const upperId = (data.id || '').trim().toUpperCase();
          const isRemovedEmployee =
            fullName.includes('marcus vance') ||
            (fullName.includes('marcus') && fullName.includes('vance')) ||
            fullName.includes('sourav ganguly') ||
            (fullName.includes('sourav') && fullName.includes('ganguly')) ||
            fullName.includes('pooja sharma') ||
            (fullName.includes('pooja') && fullName.includes('sharma')) ||
            lowerEmail === 'marcus.vance@modela.io' ||
            lowerEmail === 'sourav.ganguly@modela.io' ||
            lowerEmail === 'pooja.sharma@modela.io' ||
            lowerEmail === 'modelatech2026@gmail.com' ||
            lowerEmail === 'sushoovandas@gmail.com' ||
            lowerEmail === 'ghoshdebrupa005@gmail.com' ||
            docSnap.id.toUpperCase() === 'MOD008' ||
            docSnap.id.toUpperCase() === 'MOD011' ||
            upperId === 'MOD008' ||
            upperId === 'MOD011' ||
            upperId === 'MOD101' ||
            upperId === 'MOD003' ||
            upperId === 'MOD005' ||
            upperId === 'MOD006' ||
            upperId === 'MOD007' ||
            upperId === 'MOD102';
          const isPiu =
            fullName.includes('piu roy') ||
            (fullName.includes('piu') && fullName.includes('roy')) ||
            lowerEmail.includes('piuroy') ||
            lowerEmail.includes('piu.roy');
          if ((isPiu || isRemovedEmployee) && !cleanedEmpIds.has(`pay-${upperId}`)) {
            cleanedEmpIds.add(`pay-${upperId}`);
            ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].forEach(mCode => {
              deleteDoc(doc(db, 'payroll', `PAY-2026-${mCode}-${upperId}`)).catch(() => {});
            });
          }
          if (
            isRemovedEmployee ||
            fullName.includes('tony stark') ||
            (fullName.includes('tony') && fullName.includes('stark')) ||
            lowerEmail.includes('tonystark') ||
            lowerEmail.includes('tony.stark') ||
            isRecordDeleted(docSnap.id, data.id, data.email, resolveEmpId(data.email, data.id))
          ) {
            if (!cleanedEmpIds.has(docSnap.id)) {
              cleanedEmpIds.add(docSnap.id);
              deleteDoc(doc(db, 'employees', docSnap.id)).catch(() => {});
            }
            return;
          }
          remoteDocs.push({ docId: docSnap.id, data });
        });

        // 1. Authoritative Map: remote employees currently stored in Firestore database
        // Keyed by person email (or uppercase ID if no email) to strictly guarantee 1 person = 1 employee
        // If duplicate docs exist for the same email (e.g. old ID doc vs new ID doc), pick the most recently updated / custom resolved ID and delete the stale duplicate!
        const personMap = new Map<string, Employee>();
        const personDocIdMap = new Map<string, string>();
        const seenIds = new Set<string>();

        remoteDocs.forEach(({ docId, data: e }) => {
          const cleanEmail = e.email ? e.email.toLowerCase().trim() : '';
          const upperId = e.id.toUpperCase().trim();
          const key = cleanEmail || upperId;
          const existing = personMap.get(key);

          const eUpdatedAt = String((e as any).updatedAt || '');
          if (eUpdatedAt && cleanEmail) {
            recordCustomEmpId(cleanEmail, undefined, upperId);
          }

          if (!existing) {
            const resolvedId = cleanEmail ? (resolveEmpId(cleanEmail, upperId) || upperId) : upperId;
            personMap.set(key, { ...e, id: resolvedId });
            personDocIdMap.set(key, docId);
            seenIds.add(resolvedId);
          } else {
            const exUpdatedAt = String((existing as any).updatedAt || '');
            const preferredId = cleanEmail ? resolveEmpId(cleanEmail) : undefined;
            const eMatchesPreferred = preferredId && upperId === preferredId;
            const exMatchesPreferred = preferredId && existing.id.toUpperCase() === preferredId;

            const shouldReplace =
              (eUpdatedAt && (!exUpdatedAt || eUpdatedAt > exUpdatedAt)) ||
              (eMatchesPreferred && !exMatchesPreferred);

            if (shouldReplace) {
              const oldDocId = personDocIdMap.get(key);
              if (oldDocId && oldDocId !== docId && !cleanedEmpIds.has(oldDocId)) {
                cleanedEmpIds.add(oldDocId);
                deleteDoc(doc(db, 'employees', oldDocId)).catch(() => {});
              }
              const resolvedId = cleanEmail ? (resolveEmpId(cleanEmail, upperId) || upperId) : upperId;
              personMap.set(key, { ...existing, ...e, id: resolvedId });
              personDocIdMap.set(key, docId);
              seenIds.add(resolvedId);
            } else {
              // Current doc is stale duplicate of existing; clean it up from Firestore
              if (docId !== personDocIdMap.get(key) && !cleanedEmpIds.has(docId)) {
                cleanedEmpIds.add(docId);
                deleteDoc(doc(db, 'employees', docId)).catch(() => {});
              }
            }
          }
        });

        // 2. Initial baseline personnel (ONLY added if this person does NOT already exist in live database, is NOT deleted, and is NOT in PENDING status)
        INITIAL_EMPLOYEES.filter(
          e => !isRecordDeleted(e.id, e.email, resolveEmpId(e.email, e.id))
        ).forEach(initEmp => {
          const cleanEmail = initEmp.email ? initEmp.email.toLowerCase().trim() : '';
          const resolvedInitId = (resolveEmpId(cleanEmail, initEmp.id) || initEmp.id).toUpperCase().trim();

          if (cleanEmail && users.some(u => u.email?.toLowerCase().trim() === cleanEmail && u.status !== 'APPROVED')) {
            return;
          }

          // If this person already exists in live database (even under an edited EMP ID), DO NOT add initial record!
          if ((cleanEmail && personMap.has(cleanEmail)) || seenIds.has(resolvedInitId)) {
            return;
          }

          const initRecord: Employee = { ...initEmp, id: resolvedInitId };
          personMap.set(cleanEmail || resolvedInitId, initRecord);
          seenIds.add(resolvedInitId);
          // Persist missing baseline employee (such as MOD008) to Firestore employees collection once
          if (
            !seededEmpIds.has(resolvedInitId) &&
            !remoteDocs.some(d => d.docId.toUpperCase() === resolvedInitId || (cleanEmail && d.data.email?.toLowerCase().trim() === cleanEmail))
          ) {
            seededEmpIds.add(resolvedInitId);
            setDoc(doc(db, 'employees', resolvedInitId), cleanFirestoreData(initRecord), { merge: true }).catch(() => {});
          }
        });

        // 3. Approved users from AuthContext / User Management
        let savedUsersList: User[] = [];
        try {
          const rawU = localStorage.getItem('modela_users_v3') || localStorage.getItem('modela_users_v2');
          if (rawU) {
            const parsed = JSON.parse(rawU);
            if (Array.isArray(parsed)) savedUsersList = parsed;
          }
        } catch {}

        const allApprovedMap = new Map<string, User>();
        users
          .filter(
            u =>
              u.status === 'APPROVED' &&
              u.email &&
              u.id !== SYNC_REGISTRY_DOC_ID &&
              u.email !== 'sync@system.internal' &&
              !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId))
          )
          .forEach(u => allApprovedMap.set(u.email.toLowerCase().trim(), u));
        savedUsersList
          .filter(
            u =>
              u.status === 'APPROVED' &&
              u.email &&
              u.id !== SYNC_REGISTRY_DOC_ID &&
              u.email !== 'sync@system.internal' &&
              !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId))
          )
          .forEach(u => {
            if (!allApprovedMap.has(u.email.toLowerCase().trim())) {
              allApprovedMap.set(u.email.toLowerCase().trim(), u);
            }
          });

        allApprovedMap.forEach(u => {
          const cleanEmail = u.email.toLowerCase().trim();
          const targetEmp = personMap.get(cleanEmail);

          if (targetEmp) {
            // Ensure custom resolved EMP ID is respected without letting stale initial user state overwrite Firestore
            const resolvedId = resolveEmpId(cleanEmail, targetEmp.id) || targetEmp.id;
            if (targetEmp.id !== resolvedId) {
              targetEmp.id = resolvedId;
            }
            // If this employee is not yet saved under resolvedId in Firestore employees collection, persist it
            const existsInRemote = remoteDocs.some(
              d => d.docId.toUpperCase() === targetEmp.id.toUpperCase()
            );
            if (!existsInRemote && !seededEmpIds.has(targetEmp.id)) {
              seededEmpIds.add(targetEmp.id);
              setDoc(doc(db, 'employees', targetEmp.id), cleanFirestoreData(targetEmp), { merge: true }).catch(() => {});
            }
            // Also notify AuthContext if targetEmp.id in Firestore is newer than u.employeeId
            if (u.employeeId !== targetEmp.id) {
              window.dispatchEvent(
                new CustomEvent('modela_employee_id_changed', {
                  detail: { oldId: u.employeeId, newId: targetEmp.id, email: cleanEmail }
                })
              );
            }
          } else {
            // New approved user not yet in directory
            const isPoulami = cleanEmail === 'poulamim@modelatech.com';
            const parts = (isPoulami ? 'Poulami Manna' : (u.name || '')).trim().split(/\s+/);
            const empId = (resolveEmpId(cleanEmail, u.employeeId || u.id) || u.employeeId || u.id).toUpperCase().trim();
            if (isRecordDeleted(empId, cleanEmail, u.id, u.uid)) return;
            const newEmp: Employee = {
              id: empId,
              firstName: parts[0] || (u.name || '').trim() || 'Staff',
              lastName: parts.slice(1).join(' ') || '',
              joiningDate: cleanEmail === 'aditichakraborty2005@gmail.com' ? '2026-10-29' : new Date().toISOString().split('T')[0],
              phone: '',
              email: u.email,
              designation: u.designation || (u.role === 'SUPER_ADMIN' ? 'Executive Director & Super Admin' : 'Staff Candidate'),
              department: u.department || (u.role === 'SUPER_ADMIN' ? 'Executive Office' : 'General Staff'),
              status: 'ACTIVE',
              location: 'San Francisco HQ',
              compensation: u.role === 'SUPER_ADMIN' ? { basic: 95000, allowances: 30000 } : { basic: 50000, allowances: 15000 },
              avatar: isPoulami
                ? 'https://ui-avatars.com/api/?name=Poulami+Manna&background=0284c7&color=fff'
                : (u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email)}&background=0284c7&color=fff`)
            };
            personMap.set(cleanEmail, newEmp);
            if (!seededEmpIds.has(empId)) {
              seededEmpIds.add(empId);
              setDoc(doc(db, 'employees', empId), cleanFirestoreData(newEmp), { merge: true }).catch(() => {});
            }
          }
        });

        // 4. Overlay server-synced employee updates (leave balances, compensation, etc.) so real-time updates persist across all browsers
        try {
          const empRes = await fetch('/api/employees');
          if (empRes.ok) {
            const empJson = await empRes.json();
            const serverEmps: Employee[] = Array.isArray(empJson?.employees) ? empJson.employees : [];
            serverEmps.forEach(srvEmp => {
              if (!srvEmp || !srvEmp.id) return;
              const cleanEmail = srvEmp.email ? srvEmp.email.toLowerCase().trim() : '';
              const upperId = srvEmp.id.toUpperCase().trim();
              if (isRecordDeleted(upperId, cleanEmail)) return;
              const key = cleanEmail || upperId;
              const existing = personMap.get(key) || Array.from(personMap.values()).find(item => item.id.toUpperCase() === upperId);
              const srvUpdatedAt = String((srvEmp as any).updatedAt || '');
              const exUpdatedAt = existing ? String((existing as any).updatedAt || '') : '';
              if (!existing) {
                personMap.set(key, srvEmp);
              } else if (srvUpdatedAt && (!exUpdatedAt || srvUpdatedAt >= exUpdatedAt)) {
                const mapKey = existing.email ? existing.email.toLowerCase().trim() : existing.id.toUpperCase().trim();
                personMap.set(mapKey, { ...existing, ...srvEmp });
              }
            });
          }
        } catch {}

        const mergedEmployees = Array.from(personMap.values()).filter(
          e => !isRecordDeleted(e.id, e.email, resolveEmpId(e.email, e.id))
        );
        setEmployees(prev => {
          if (JSON.stringify(prev) === JSON.stringify(mergedEmployees)) {
            return prev;
          }
          try {
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(mergedEmployees));
          } catch {}
          return mergedEmployees;
        });
      },
      err => {
        console.warn('Firestore employees sync notice:', err);
      }
    );

    const pollServerEmployees = async () => {
      try {
        const res = await fetch('/api/employees');
        if (!res.ok) return;
        const json = await res.json();
        const serverEmps: Employee[] = Array.isArray(json?.employees) ? json.employees : [];
        if (serverEmps.length === 0) return;
        setEmployees(prev => {
          let changed = false;
          const next = prev.map(e => {
            const match = serverEmps.find(
              se =>
                se &&
                ((se.id && se.id.toUpperCase() === e.id.toUpperCase()) ||
                  (se.email && e.email && se.email.toLowerCase().trim() === e.email.toLowerCase().trim()))
            );
            if (!match) return e;
            const mUpdated = String((match as any).updatedAt || '');
            const eUpdated = String((e as any).updatedAt || '');
            if (mUpdated && (!eUpdated || mUpdated > eUpdated)) {
              changed = true;
              return { ...e, ...match };
            }
            return e;
          });
          serverEmps.forEach(se => {
            if (!se || !se.id) return;
            const cleanEmail = se.email ? se.email.toLowerCase().trim() : '';
            const upperId = se.id.toUpperCase().trim();
            if (isRecordDeleted(upperId, cleanEmail)) return;
            const exists = next.some(
              e =>
                (e.id && e.id.toUpperCase() === upperId) ||
                (cleanEmail && e.email && e.email.toLowerCase().trim() === cleanEmail)
            );
            if (!exists) {
              next.push(se);
              changed = true;
            }
          });
          if (changed) {
            try {
              localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(next));
            } catch {}
            return next;
          }
          return prev;
        });
      } catch {}
    };

    pollServerEmployees();
    const empPollTimer = setInterval(pollServerEmployees, 15000);

    return () => {
      isSubscribed = false;
      clearInterval(empPollTimer);
      unsub();
    };
  }, []);

  // Real-time Firestore + backend synchronization for workflow staff requests across all devices
  useEffect(() => {
    let isSubscribed = true;

    const mergeAndSaveRequests = (firestoreList: StaffWorkflowRequest[], apiList: StaffWorkflowRequest[]) => {
      if (!isSubscribed) return;
      const map = new Map<string, StaffWorkflowRequest>();

      // 1. Seed from localStorage so locally submitted requests are preserved during Firestore quota backoff
      try {
        const savedRaw = localStorage.getItem(STORAGE_KEYS.REQUESTS);
        const savedList: StaffWorkflowRequest[] = savedRaw ? JSON.parse(savedRaw) : [];
        if (Array.isArray(savedList)) {
          savedList.forEach(r => {
            if (r && r.id && !isExcludedStaffRequest(r)) {
              map.set(r.id, r);
            }
          });
        }
      } catch {}

      // 2. Merge Firestore documents
      firestoreList.forEach(data => {
        if (data && data.id && !isExcludedStaffRequest(data)) {
          map.set(data.id, { ...map.get(data.id), ...data });
        }
      });

      // 3. Merge backend API requests (most recent cross-browser state during Firestore write backoff)
      apiList.forEach(data => {
        if (data && data.id && !isExcludedStaffRequest(data)) {
          map.set(data.id, { ...map.get(data.id), ...data });
        }
      });

      const combined = Array.from(map.values())
        .filter(r => !isExcludedStaffRequest(r))
        .sort(
          (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
        );

      setStaffRequests(prev => {
        if (JSON.stringify(prev) === JSON.stringify(combined)) {
          return prev;
        }
        try {
          localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(combined));
        } catch {}
        return combined;
      });
    };

    let latestFirestoreRequests: StaffWorkflowRequest[] = [];
    const cleanedReqIds = new Set<string>();

    const pollApiRequests = async () => {
      try {
        const res = await fetch(`/api/requests?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const apiReqs: StaffWorkflowRequest[] = Array.isArray(json?.requests) ? json.requests : [];
          mergeAndSaveRequests(latestFirestoreRequests, apiReqs);
        }
      } catch {}
    };

    // Immediately purge REQ-1572, REQ-6677 (pending request of MTK023), and other excluded requests from Firestore and backend
    deleteDoc(doc(db, 'requests', 'REQ-1572')).catch(() => {});
    fetch('/api/requests/REQ-1572', { method: 'DELETE' }).catch(() => {});
    deleteDoc(doc(db, 'requests', 'REQ-6677')).catch(() => {});
    fetch('/api/requests/REQ-6677', { method: 'DELETE' }).catch(() => {});

    const unsub = onSnapshot(
      collection(db, 'requests'),
      async snapshot => {
        if (!isSubscribed) return;

        const fsReqs: StaffWorkflowRequest[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as StaffWorkflowRequest;
          const mergedData = { ...data, id: data?.id || docSnap.id };
          if (isExcludedStaffRequest(mergedData)) {
            if (!cleanedReqIds.has(docSnap.id)) {
              cleanedReqIds.add(docSnap.id);
              deleteDoc(doc(db, 'requests', docSnap.id)).catch(() => {});
              fetch(`/api/requests/${encodeURIComponent(docSnap.id)}`, { method: 'DELETE' }).catch(() => {});
              if (data?.id && data.id !== docSnap.id) {
                deleteDoc(doc(db, 'requests', data.id)).catch(() => {});
                fetch(`/api/requests/${encodeURIComponent(data.id)}`, { method: 'DELETE' }).catch(() => {});
              }
            }
          } else if (data && data.id) {
            fsReqs.push(data);
          }
        });

        latestFirestoreRequests = fsReqs;
        let apiReqs: StaffWorkflowRequest[] = [];
        try {
          const res = await fetch(`/api/requests?t=${Date.now()}`, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json?.requests)) apiReqs = json.requests;
          }
        } catch {}

        mergeAndSaveRequests(fsReqs, apiReqs);
      },
      err => {
        console.warn('Firestore staff requests sync notice:', err);
      }
    );

    pollApiRequests();
    const pollTimer = setInterval(pollApiRequests, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(pollTimer);
      unsub();
    };
  }, []);

  // Real-time Firestore synchronization for payroll ledger records across all devices
  useEffect(() => {
    let isSubscribed = true;
    const cleanedPayrollIds = new Set<string>();
    const seededPayrollIds = new Set<string>();

    const unsub = onSnapshot(
      collection(db, 'payroll'),
      async snapshot => {
        if (!isSubscribed) return;

        if (snapshot.empty) {
          try {
            for (const p of INITIAL_PAYROLL) {
              if (!seededPayrollIds.has(p.id)) {
                seededPayrollIds.add(p.id);
                await setDoc(doc(db, 'payroll', p.id), p);
              }
            }
          } catch (e) {
            console.warn('Initial payroll seed error:', e);
          }
          return;
        }

        const validDocs: { docId: string; data: PayrollRecord }[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as PayrollRecord;
          if (!data || !data.id || isExcludedPayrollRecord(data) || BLOCKED_PAYROLL_DOC_IDS.has(docSnap.id.toUpperCase())) {
            // Permanently remove excluded / duplicate payslips from Firestore database once
            if (!cleanedPayrollIds.has(docSnap.id)) {
              cleanedPayrollIds.add(docSnap.id);
              deleteDoc(doc(db, 'payroll', docSnap.id)).catch(() => {});
            }
            return;
          }
          validDocs.push({ docId: docSnap.id, data });
        });

        // Deduplicate per (month, year, person) and delete any extra duplicate documents from Firestore database
        const cycleWinnerMap = new Map<string, { docId: string; data: PayrollRecord }>();
        validDocs.forEach(({ docId, data }) => {
          const personKey = getPayrollPersonKey(data);
          const cycleKey = `${(data.month || '').trim().toLowerCase()}-${data.year}-${personKey}`;
          const existing = cycleWinnerMap.get(cycleKey);

          if (!existing) {
            cycleWinnerMap.set(cycleKey, { docId, data });
          } else {
            const isNewCanonical = /^PAY-\d{4}-\d{2}-\d{2}$/.test(data.id);
            const isExCanonical = /^PAY-\d{4}-\d{2}-\d{2}$/.test(existing.data.id);
            const preferredEmpId =
              personKey === 'debrupa-ghosh-surupa008'
                ? resolveEmpId('surupa008@gmail.com', data.employeeId || 'MOD011')
                : personKey === 'debrupa-ghosh-primary'
                ? resolveEmpId('ghoshdebrupa005@gmail.com', data.employeeId || 'MOD007')
                : undefined;

            const newMatchesPreferred = preferredEmpId && data.id.toUpperCase().endsWith(`-${preferredEmpId.toUpperCase()}`);
            const exMatchesPreferred = preferredEmpId && existing.data.id.toUpperCase().endsWith(`-${preferredEmpId.toUpperCase()}`);

            const shouldReplace =
              (isNewCanonical && !isExCanonical) ||
              (!isExCanonical && newMatchesPreferred && !exMatchesPreferred);

            if (shouldReplace) {
              if (!cleanedPayrollIds.has(existing.docId)) {
                cleanedPayrollIds.add(existing.docId);
                deleteDoc(doc(db, 'payroll', existing.docId)).catch(() => {});
              }
              cycleWinnerMap.set(cycleKey, { docId, data });
            } else {
              if (!cleanedPayrollIds.has(docId)) {
                cleanedPayrollIds.add(docId);
                deleteDoc(doc(db, 'payroll', docId)).catch(() => {});
              }
            }
          }
        });

        // Ensure required INITIAL_PAYROLL entries (especially Debrupa Ghosh surupa008@gmail.com for Oct, Nov, Dec) exist in Firestore
        INITIAL_PAYROLL.forEach(initP => {
          if (isExcludedPayrollRecord(initP)) return;
          const personKey = getPayrollPersonKey(initP);
          const cycleKey = `${(initP.month || '').trim().toLowerCase()}-${initP.year}-${personKey}`;
          const existing = cycleWinnerMap.get(cycleKey);
          if (!existing) {
            const resolvedId =
              personKey === 'debrupa-ghosh-surupa008'
                ? resolveEmpId('surupa008@gmail.com', initP.employeeId || 'MOD011') || 'MOD011'
                : initP.employeeId;
            const seededRecord: PayrollRecord = { ...initP, employeeId: resolvedId };
            cycleWinnerMap.set(cycleKey, { docId: seededRecord.id, data: seededRecord });
            if (!seededPayrollIds.has(seededRecord.id)) {
              seededPayrollIds.add(seededRecord.id);
              setDoc(doc(db, 'payroll', seededRecord.id), seededRecord, { merge: true }).catch(() => {});
            }
          }
        });

        // Ensure all approved users in User Management have their 12-month payroll (Jan-Oct PAID, Nov-Dec UNPAID) in Firestore
        try {
          const rawSavedUsers = localStorage.getItem('modela_users_v2');
          const parsedSavedUsers: User[] = rawSavedUsers ? JSON.parse(rawSavedUsers) : [];
          const combinedApprovedUsers = new Map<string, User>();
          [...users, ...(Array.isArray(parsedSavedUsers) ? parsedSavedUsers : [])].forEach(u => {
            if (
              u &&
              u.status === 'APPROVED' &&
              u.email &&
              u.id !== SYNC_REGISTRY_DOC_ID &&
              u.email !== 'sync@system.internal'
            ) {
              const resolvedId = resolveEmpId(u.email, u.employeeId) || u.employeeId || '';
              if (!isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolvedId)) {
                combinedApprovedUsers.set(u.email.toLowerCase().trim(), { ...u, employeeId: resolvedId });
              }
            }
          });

          const allMonthsList = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];

          combinedApprovedUsers.forEach(u => {
            const empId = (u.employeeId || '').trim().toUpperCase();
            const fullName = (u.name || u.email.split('@')[0]).trim();
            const isModelaUser = fullName.toLowerCase() === 'modela tech' || u.email.toLowerCase() === 'modelatech4@gmail.com' || empId === 'MOD106';
            if (
              !empId ||
              isModelaUser ||
              empId === 'MOD000' ||
              empId === 'MOD101' ||
              empId === 'MOD102' ||
              empId === 'MOD106' ||
              empId === 'MOD003' ||
              empId === 'MOD005' ||
              empId === 'MOD006' ||
              empId === 'MOD007' ||
              empId === 'MOD0090' ||
              empId === 'MOD01'
            ) return;
            const isSushoovanUser = fullName.toLowerCase() === 'sushoovan das' || u.email.toLowerCase() === 'sushovand@modelatech.com';
            const basic = isSushoovanUser ? 85000 : 50000;
            const allowances = isSushoovanUser ? 25000 : 15000;
            const deductions = 3700;
            const grossSalary = basic + allowances;
            const netSalary = grossSalary - deductions;

            allMonthsList.forEach((m, idx) => {
              const docId = `PAY-2026-${m.substring(0, 3).toUpperCase()}-${empId}`;
              const candidateRecord: PayrollRecord = {
                id: docId,
                employeeId: empId,
                employeeName: fullName,
                month: m,
                year: 2026,
                basicSalary: basic,
                allowances,
                deductions,
                grossSalary,
                netSalary,
                status: isNovDecMonth(m) ? 'UNPAID' : 'PAID',
                paymentDate: isNovDecMonth(m) ? '' : `2026-${String(idx + 1).padStart(2, '0')}-01`,
                disbursedBy: isNovDecMonth(m) ? '' : 'System Master Disburser',
                lopDays: 0,
                lopAmount: 0,
                allowanceBreakdown: {
                  hra: Math.round(allowances * 0.4),
                  medical: Math.round(allowances * 0.15),
                  special: Math.round(allowances * 0.35),
                  internet: allowances - (Math.round(allowances * 0.4) + Math.round(allowances * 0.15) + Math.round(allowances * 0.35))
                },
                deductionBreakdown: {
                  professionalTax: 200,
                  pfContribution: 1800,
                  groupHealthInsurance: 1700,
                  lop: 0
                }
              };

              if (isExcludedPayrollRecord(candidateRecord)) return;
              const pKey = getPayrollPersonKey(candidateRecord);
              const cycleKey = `${m.toLowerCase()}-2026-${pKey}`;
              if (!cycleWinnerMap.has(cycleKey)) {
                cycleWinnerMap.set(cycleKey, { docId: candidateRecord.id, data: candidateRecord });
                if (!seededPayrollIds.has(candidateRecord.id)) {
                  seededPayrollIds.add(candidateRecord.id);
                  setDoc(doc(db, 'payroll', candidateRecord.id), candidateRecord, { merge: true }).catch(() => {});
                }
              }
            });
          });
        } catch {}

        // Ensure Debrupa Ghosh (MOD011) November and December records in Firestore are UNPAID unless manually toggled
        cycleWinnerMap.forEach((item, cycleKey) => {
          const personKey = getPayrollPersonKey(item.data);
          if (
            personKey === 'debrupa-ghosh-surupa008' &&
            isNovDecMonth(item.data.month) &&
            !item.data.manualStatusOverride &&
            item.data.status !== 'UNPAID'
          ) {
            const updatedRecord: PayrollRecord = {
              ...item.data,
              status: 'UNPAID',
              paymentDate: '',
              disbursedBy: ''
            };
            cycleWinnerMap.set(cycleKey, { docId: item.docId, data: updatedRecord });
            if (!seededPayrollIds.has(`unpaid-${item.docId}`)) {
              seededPayrollIds.add(`unpaid-${item.docId}`);
              setDoc(doc(db, 'payroll', item.docId), cleanFirestoreData(updatedRecord), { merge: true }).catch(() => {});
            }
          }
        });

        // Overlay server-synced payroll overrides (OT, LOP, Status) so real-time updates persist across all browsers even during Firestore quota backoff
        try {
          const payRes = await fetch('/api/payroll');
          if (payRes.ok) {
            const payJson = await payRes.json();
            const apiPayroll: PayrollRecord[] = Array.isArray(payJson?.payroll) ? payJson.payroll : [];
            apiPayroll.forEach(ap => {
              if (!ap || !ap.id || isExcludedPayrollRecord(ap)) return;
              const personKey = getPayrollPersonKey(ap);
              const cycleKey = `${(ap.month || '').trim().toLowerCase()}-${ap.year}-${personKey}`;
              const existing = cycleWinnerMap.get(cycleKey);
              if (!existing) {
                cycleWinnerMap.set(cycleKey, { docId: ap.id, data: ap });
              } else {
                const apUpdated = String((ap as any).updatedAt || '');
                const exUpdated = String((existing.data as any).updatedAt || '');
                if (apUpdated && (!exUpdated || apUpdated >= exUpdated)) {
                  cycleWinnerMap.set(cycleKey, { docId: ap.id, data: { ...existing.data, ...ap } });
                }
              }
            });
          }
        } catch {}

        const remotePayroll = Array.from(cycleWinnerMap.values()).map(item => item.data);
        const normalized = enforceMonthPayrollRules(remotePayroll.length > 0 ? remotePayroll : INITIAL_PAYROLL);
        setPayroll(prev => {
          if (JSON.stringify(prev) === JSON.stringify(normalized)) {
            return prev;
          }
          try {
            localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(normalized));
          } catch {}
          return normalized;
        });
      },
      err => {
        console.warn('Firestore payroll sync notice:', err);
      }
    );

    const pollServerPayroll = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/payroll');
        if (!res.ok) return;
        const json = await res.json();
        const apiPayroll: PayrollRecord[] = Array.isArray(json?.payroll) ? json.payroll : [];
        if (apiPayroll.length === 0) return;

        setPayroll(prev => {
          const map = new Map<string, PayrollRecord>();
          prev.forEach(p => {
            const cKey = `${(p.month || '').trim().toLowerCase()}-${p.year}-${getPayrollPersonKey(p)}`;
            map.set(cKey, p);
          });
          let changed = false;
          apiPayroll.forEach(ap => {
            if (!ap || !ap.id || isExcludedPayrollRecord(ap)) return;
            const cKey = `${(ap.month || '').trim().toLowerCase()}-${ap.year}-${getPayrollPersonKey(ap)}`;
            const ex = map.get(cKey);
            if (!ex) {
              map.set(cKey, ap);
              changed = true;
            } else {
              const apUpdated = String((ap as any).updatedAt || '');
              const exUpdated = String((ex as any).updatedAt || '');
              if (
                (apUpdated && (!exUpdated || apUpdated > exUpdated)) ||
                ex.otAmount !== ap.otAmount ||
                ex.lopDays !== ap.lopDays ||
                ex.status !== ap.status ||
                ex.netSalary !== ap.netSalary
              ) {
                if (!exUpdated || (apUpdated && apUpdated >= exUpdated)) {
                  map.set(cKey, { ...ex, ...ap });
                  changed = true;
                }
              }
            }
          });
          if (changed) {
            const next = enforceMonthPayrollRules(Array.from(map.values()));
            if (JSON.stringify(prev) === JSON.stringify(next)) {
              return prev;
            }
            try {
              localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(next));
            } catch {}
            return next;
          }
          return prev;
        });
      } catch {}
    };

    pollServerPayroll();
    const payrollPollTimer = setInterval(pollServerPayroll, 15000);

    return () => {
      isSubscribed = false;
      clearInterval(payrollPollTimer);
      unsub();
    };
  }, []);

  // Manual explicit refresh from Firestore & backend API
  const refreshStaffRequests = useCallback(async () => {
    try {
      const map = new Map<string, StaffWorkflowRequest>();

      try {
        const savedRaw = localStorage.getItem(STORAGE_KEYS.REQUESTS);
        const savedList: StaffWorkflowRequest[] = savedRaw ? JSON.parse(savedRaw) : [];
        if (Array.isArray(savedList)) {
          savedList.forEach(r => {
            if (r && r.id && !isExcludedStaffRequest(r)) {
              map.set(r.id, r);
            }
          });
        }
      } catch {}

      try {
        const snap = await getDocs(collection(db, 'requests'));
        snap.forEach(docSnap => {
          const data = docSnap.data() as StaffWorkflowRequest;
          if (data && data.id) {
            if (isExcludedStaffRequest(data)) {
              deleteDoc(doc(db, 'requests', docSnap.id)).catch(() => {});
              deleteDoc(doc(db, 'requests', data.id)).catch(() => {});
            } else {
              map.set(data.id, { ...map.get(data.id), ...data });
            }
          }
        });
      } catch {}

      try {
        const res = await fetch('/api/requests');
        if (res.ok) {
          const json = await res.json();
          const apiList: StaffWorkflowRequest[] = Array.isArray(json?.requests) ? json.requests : [];
          apiList.forEach(data => {
            if (data && data.id && !isExcludedStaffRequest(data)) {
              map.set(data.id, { ...map.get(data.id), ...data });
            }
          });
        }
      } catch {}

      const combined = Array.from(map.values())
        .filter(r => !isExcludedStaffRequest(r))
        .sort(
          (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
        );
      setStaffRequests(combined);
      try {
        localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(combined));
      } catch {}
    } catch (e) {
      console.warn('Manual staff requests refresh error:', e);
    }
  }, []);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('modela_sidebar_collapsed') === 'true';
    } catch {}
    return false;
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('modela_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedStaffRequest, setSelectedStaffRequest] = useState<StaffWorkflowRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Sync individual slices to localStorage only when that specific slice changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
    } catch {}
  }, [attendance]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ONBOARDING, JSON.stringify(onboarding));
    } catch {}
  }, [onboarding]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, String(isDarkMode));
    } catch {}
  }, [isDarkMode]);

  // Handle dark mode class on document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const showToast = useCallback((title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addAuditLog = useCallback(
    (action: string, module: string, details: string, recordId?: string, result: 'SUCCESS' | 'FAILURE' | 'WARNING' = 'SUCCESS') => {
      const newLog: AuditLog = {
        id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        action,
        module,
        details,
        recordId,
        result,
        executedBy: currentUser?.email || 'System Root',
        userRole: currentUser?.role || 'SYSTEM',
        targetUser: currentUser?.email
      };
      setAuditLogs(prev => [newLog, ...prev]);
    },
    [currentUser]
  );

  // Employee methods
  const addEmployee = async (empData: Omit<Employee, 'id'>): Promise<Employee> => {
    // Generate next ID like MOD008
    let maxId = 7;
    employees.forEach(e => {
      const match = e.id.match(/^MOD0*(\d+)$/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxId) maxId = val;
      }
    });
    const newId = `MOD${String(maxId + 1).padStart(3, '0')}`;
    const newEmp: Employee = {
      ...empData,
      id: newId,
      avatar: empData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(empData.firstName + ' ' + empData.lastName)}&background=0284c7&color=fff`
    };

    setEmployees(prev => {
      const next = [newEmp, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(next));
      } catch {}
      return next;
    });
    // Persist new employee to Firestore
    const cleanNewEmp = cleanFirestoreData(newEmp);
    setDoc(doc(db, 'employees', newId), cleanNewEmp).catch(err => {
      console.warn('Firestore employee creation error:', err);
    });

    // Auto-sync employee to payroll page
    syncEmployeeToPayroll(newEmp);

    addAuditLog('Employee Created', 'Employees', `Added employee ${newEmp.firstName} ${newEmp.lastName} (${newId})`, newId);
    showToast('Employee Added', `${newEmp.firstName} ${newEmp.lastName} has been registered under ${newId}.`);
    return newEmp;
  };

  const bulkAddEmployees = async (newEmployees: Employee[]): Promise<number> => {
    if (!newEmployees || newEmployees.length === 0) return 0;

    // 1. Persist each to Firestore 'employees' collection
    for (const emp of newEmployees) {
      const cleanEmp = cleanFirestoreData(emp);
      await setDoc(doc(db, 'employees', emp.id), cleanEmp, { merge: true }).catch(err => {
        console.warn('Firestore employee bulk import error:', err);
      });
      // 2. Sync to Firestore payroll records
      syncEmployeeToPayroll(emp);
    }

    // 3. Update local state & localStorage
    setEmployees(prev => {
      const updated = [...prev];
      newEmployees.forEach(newEmp => {
        const index = updated.findIndex(e => e.id.toLowerCase() === newEmp.id.toLowerCase());
        if (index >= 0) {
          updated[index] = { ...updated[index], ...newEmp };
        } else {
          updated.push(newEmp);
        }
      });
      try {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    addAuditLog(
      'Bulk Employees Imported',
      'Employees',
      `Imported and saved ${newEmployees.length} personnel records to database`,
      newEmployees.map(e => e.id).join(', ')
    );

    return newEmployees.length;
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>): Promise<boolean> => {
    const cleanInputEmail = updates.email ? updates.email.toLowerCase().trim() : '';

    // When email is provided, match strictly by email first so we never grab another employee who shared the same fallback ID (e.g. MOD000)
    let existingEmp = cleanInputEmail
      ? employees.find(e => e.email && e.email.toLowerCase().trim() === cleanInputEmail)
      : employees.find(e => e.id.toUpperCase() === id.toUpperCase());

    if (!existingEmp && cleanInputEmail) {
      const matchedUser = users.find(u => u.email.toLowerCase().trim() === cleanInputEmail);
      const nameParts = (matchedUser?.name || '').trim().split(/\s+/);
      existingEmp = {
        id: id.trim().toUpperCase(),
        firstName: updates.firstName || nameParts[0] || 'Staff',
        lastName: updates.lastName !== undefined ? updates.lastName : (nameParts.slice(1).join(' ') || ''),
        email: updates.email!,
        joiningDate: new Date().toISOString().split('T')[0],
        phone: '',
        designation: updates.designation || matchedUser?.designation || 'Enterprise Staff',
        department: updates.department || matchedUser?.department || 'General Staff',
        status: 'ACTIVE',
        location: 'San Francisco HQ',
        compensation: { basic: 50000, allowances: 15000 },
        avatar: matchedUser?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(updates.email!)}&background=0284c7&color=fff`
      };
    }

    if (!existingEmp) return false;

    const rawNewId = updates.id ? updates.id.trim().toUpperCase() : existingEmp.id.toUpperCase();
    const isIdChanging = Boolean(rawNewId && rawNewId !== existingEmp.id.toUpperCase());
    const targetEmail = (existingEmp.email || updates.email || '').trim();
    const cleanTargetEmail = targetEmail.toLowerCase();

    if (isIdChanging && rawNewId !== 'MOD000') {
      // Validate uniqueness: check if another person (different email) already has rawNewId
      const conflictInEmployees = employees.some(
        e =>
          e.id.toUpperCase() === rawNewId &&
          (!cleanTargetEmail || !e.email || e.email.toLowerCase().trim() !== cleanTargetEmail)
      );
      const conflictInUsers = users.some(
        u =>
          u.status === 'APPROVED' &&
          u.employeeId?.toUpperCase() === rawNewId &&
          (!cleanTargetEmail || !u.email || u.email.toLowerCase().trim() !== cleanTargetEmail)
      );
      if (conflictInEmployees || conflictInUsers) {
        showToast('ID Conflict', `Employee ID ${rawNewId} is already assigned to another employee.`, 'error');
        return false;
      }
    }

    const finalId = rawNewId;
    const oldEmpId = existingEmp.id;
    const updatedFirstName = updates.firstName !== undefined ? updates.firstName : existingEmp.firstName || '';
    const updatedLastName = updates.lastName !== undefined ? updates.lastName : existingEmp.lastName || '';
    const fullName = `${updatedFirstName} ${updatedLastName}`.trim();
    const now = new Date().toISOString();

    // Ensure the new ID is never blocked in deleted registry and is recorded in custom EMP ID registry for this specific email
    removeDeletedRecord(finalId, targetEmail);
    recordCustomEmpId(targetEmail, oldEmpId, finalId);

    const mergedEmp: Employee = {
      ...existingEmp,
      ...updates,
      id: finalId,
      firstName: updatedFirstName,
      lastName: updatedLastName,
      ...({ updatedAt: now } as any)
    };

    // 1. Immediately update in-memory and localStorage employees state without touching other employees who shared oldEmpId
    setEmployees(prev => {
      const filtered = prev.filter(e => {
        if (cleanTargetEmail && e.email) {
          return e.email.toLowerCase().trim() !== cleanTargetEmail;
        }
        return e.id.toUpperCase() !== oldEmpId.toUpperCase() && e.id.toUpperCase() !== finalId.toUpperCase();
      });
      const next = [mergedEmp, ...filtered];
      try {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Immediately notify AuthContext & update user state for this specific email
    window.dispatchEvent(
      new CustomEvent('modela_employee_id_changed', {
        detail: { oldId: oldEmpId, newId: finalId, email: targetEmail }
      })
    );

    if (updateUserFromEmployee) {
      updateUserFromEmployee(finalId, targetEmail, {
        name: fullName || undefined,
        department: updates.department !== undefined ? updates.department : existingEmp.department,
        designation: updates.designation !== undefined ? updates.designation : existingEmp.designation
      });
    }

    // 3. Persist to backend API immediately & Firestore employees collection non-blockingly
    fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mergedEmp)
    }).catch(() => {});

    const cleanEmp = cleanFirestoreData(mergedEmp);
    setDoc(doc(db, 'employees', finalId), cleanEmp, { merge: true }).catch(err => {
      console.warn('Firestore employee update error:', err);
    });

    // Only delete oldEmpId doc in Firestore if no other employee with a different email still uses oldEmpId
    const otherEmpStillUsesOldId = employees.some(
      e =>
        e.id.toUpperCase() === oldEmpId.toUpperCase() &&
        cleanTargetEmail &&
        e.email &&
        e.email.toLowerCase().trim() !== cleanTargetEmail
    );

    if (isIdChanging && !otherEmpStillUsesOldId) {
      if (oldEmpId !== finalId) {
        deleteDoc(doc(db, 'employees', oldEmpId)).catch(() => {});
      }
      if (oldEmpId.toUpperCase() !== finalId) {
        deleteDoc(doc(db, 'employees', oldEmpId.toUpperCase())).catch(() => {});
      }
    }

    if (cleanTargetEmail) {
      getDocs(collection(db, 'employees'))
        .then(allEmpDocs => {
          for (const eDoc of allEmpDocs.docs) {
            if (eDoc.id === finalId) continue;
            const eData = eDoc.data();
            const sameEmail =
              eData.email && String(eData.email).toLowerCase().trim() === cleanTargetEmail;
            if (sameEmail) {
              deleteDoc(doc(db, 'employees', eDoc.id)).catch(() => {});
            }
          }
        })
        .catch(() => {});
    }

    // 4. Cascade ID change in Firestore users collection strictly for this user's email
    getDocs(collection(db, 'users'))
      .then(userDocs => {
        let updatedUserInFirestore = false;
        for (const uDoc of userDocs.docs) {
          if (uDoc.id === SYNC_REGISTRY_DOC_ID) continue;
          const uData = uDoc.data();
          const matches = cleanTargetEmail
            ? uData.email?.toLowerCase().trim() === cleanTargetEmail
            : Boolean(oldEmpId && uData.employeeId?.toUpperCase() === oldEmpId.toUpperCase());
          if (matches) {
            updatedUserInFirestore = true;
            setDoc(
              doc(db, 'users', uDoc.id),
              cleanFirestoreData({ ...uData, employeeId: finalId, updatedAt: now }),
              { merge: true }
            ).catch(() => {});
          }
        }

        if (!updatedUserInFirestore && cleanTargetEmail) {
          const matchedU =
            users.find(u => u.email.toLowerCase().trim() === cleanTargetEmail) ||
            INITIAL_USERS.find(u => u.email.toLowerCase().trim() === cleanTargetEmail);
          if (matchedU) {
            setDoc(
              doc(db, 'users', matchedU.id),
              cleanFirestoreData({ ...matchedU, employeeId: finalId, updatedAt: now }),
              { merge: true }
            ).catch(() => {});
          }
        }
      })
      .catch(() => {});

    if (isIdChanging) {
      // B. Cascade update payroll records for this specific employee
      setPayroll(prev => {
        const updated = prev.map(p => {
          const sameOldId = p.employeeId?.toUpperCase() === oldEmpId.toUpperCase();
          const sameName = !fullName || !p.employeeName || p.employeeName.toLowerCase().trim() === fullName.toLowerCase();
          if ((sameOldId && sameName) || (targetEmail && p.employeeId === targetEmail)) {
            return { ...p, employeeId: finalId };
          }
          return p;
        });
        try {
          localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // C. Cascade update attendance records
      setAttendance(prev => {
        const updated = prev.map(a =>
          a.employeeId?.toUpperCase() === oldEmpId.toUpperCase() ? { ...a, employeeId: finalId } : a
        );
        try {
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // D. Cascade update staff workflow requests for this specific employee
      setStaffRequests(prev => {
        const updated = prev.map(r => {
          const matchesReq = cleanTargetEmail
            ? r.employeeEmail?.toLowerCase().trim() === cleanTargetEmail
            : r.employeeId?.toUpperCase() === oldEmpId.toUpperCase();
          return matchesReq ? { ...r, employeeId: finalId } : r;
        });
        try {
          localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      getDocs(collection(db, 'requests'))
        .then(reqDocs => {
          for (const rDoc of reqDocs.docs) {
            const rData = rDoc.data();
            const matchesReq = cleanTargetEmail
              ? rData.employeeEmail?.toLowerCase().trim() === cleanTargetEmail
              : rData.employeeId?.toUpperCase() === oldEmpId.toUpperCase();
            if (matchesReq) {
              updateDoc(doc(db, 'requests', rDoc.id), { employeeId: finalId }).catch(() => {});
            }
          }
        })
        .catch(() => {});

      // E. Update Express server backend
      fetch('/api/employees/update-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldId: oldEmpId, newId: finalId, employee: mergedEmp, email: targetEmail })
      }).catch(() => {});
    }

    // Auto-sync updated employee compensation to payroll page
    syncEmployeeToPayroll(mergedEmp);

    addAuditLog(
      'Employee Updated',
      'Employees',
      `Updated record for ${finalId}${isIdChanging ? ` (ID changed from ${oldEmpId})` : ''}${fullName ? ` (${fullName})` : ''}`,
      finalId
    );
    showToast(
      'Record Updated',
      `Employee profile for ${fullName || finalId} updated and synced across all pages in real time.`
    );
    return true;
  };

  const deleteEmployee = async (id: string, emailParam?: string): Promise<boolean> => {
    const target =
      employees.find(
        e => e.id.toLowerCase() === id.toLowerCase() || (emailParam && e.email && e.email.toLowerCase() === emailParam.toLowerCase())
      ) ||
      INITIAL_EMPLOYEES.find(
        e => e.id.toLowerCase() === id.toLowerCase() || (emailParam && e.email && e.email.toLowerCase() === emailParam.toLowerCase())
      );

    const targetEmail = (target?.email || emailParam || '').trim().toLowerCase();
    const targetId = (target?.id || id).trim().toUpperCase();
    const resolvedId = targetEmail || targetId ? resolveEmpId(targetEmail, targetId) : targetId;
    const targetName = target
      ? ([target.firstName, target.lastName].filter(Boolean).join(' ') || target.email || targetId)
      : targetId;

    const extraIds: (string | undefined)[] = [];
    if (targetEmail) {
      INITIAL_USERS.forEach(iu => {
        if (iu.email.toLowerCase().trim() === targetEmail) {
          extraIds.push(iu.id, iu.uid, iu.employeeId);
        }
      });
      INITIAL_EMPLOYEES.forEach(ie => {
        if (ie.email && ie.email.toLowerCase().trim() === targetEmail) {
          extraIds.push(ie.id);
        }
      });
    }

    // Record in persistent deleted registry and sync to Firestore SYNC-REGISTRY-GLOBAL
    recordDeletedRecord(id, targetId, resolvedId, targetEmail, ...extraIds);
    await persistSyncRegistryToFirestore();

    const deletedKeySet = new Set(
      [id, targetId, resolvedId, targetEmail, ...extraIds]
        .filter(Boolean)
        .map(s => String(s).toLowerCase().trim())
    );

    setEmployees(prev => {
      const next = prev.filter(
        e =>
          !deletedKeySet.has(String(e.id || '').toLowerCase().trim()) &&
          !deletedKeySet.has(String(e.email || '').toLowerCase().trim()) &&
          !isRecordDeleted(e.id, e.email)
      );
      try {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Directly prune from users localStorage as well
    try {
      const usersSaved = localStorage.getItem('modela_users_v2');
      if (usersSaved) {
        const userList = JSON.parse(usersSaved);
        const nextUsers = userList.filter(
          (u: any) =>
            !deletedKeySet.has(String(u.id || '').toLowerCase().trim()) &&
            !deletedKeySet.has(String(u.uid || '').toLowerCase().trim()) &&
            !deletedKeySet.has(String(u.email || '').toLowerCase().trim()) &&
            !deletedKeySet.has(String(u.employeeId || '').toLowerCase().trim()) &&
            !isRecordDeleted(u.id, u.uid, u.email, u.employeeId)
        );
        localStorage.setItem('modela_users_v2', JSON.stringify(nextUsers));
      }
    } catch {}

    // Dispatch events so AuthContext updates users state immediately
    window.dispatchEvent(
      new CustomEvent('modela_user_deleted', {
        detail: { id: targetId, employeeId: resolvedId || targetId, email: targetEmail }
      })
    );
    window.dispatchEvent(new CustomEvent('modela_sync_registry_updated'));

    // Permanently delete all matching documents from Firestore 'employees' and 'users' collections
    try {
      const deletePromises: Promise<any>[] = [];
      deletePromises.push(deleteDoc(doc(db, 'employees', targetId)).catch(() => {}));
      if (resolvedId && resolvedId !== targetId) {
        deletePromises.push(deleteDoc(doc(db, 'employees', resolvedId)).catch(() => {}));
      }
      if (targetEmail) {
        deletePromises.push(
          deleteDoc(doc(db, 'users', `REQ-${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`)).catch(() => {})
        );
      }

      const [allEmpsSnap, allUsersSnap] = await Promise.all([
        getDocs(collection(db, 'employees')),
        getDocs(collection(db, 'users'))
      ]);

      allEmpsSnap.forEach(d => {
        const eData = d.data();
        if (
          deletedKeySet.has(d.id.toLowerCase().trim()) ||
          deletedKeySet.has(String(eData.id || '').toLowerCase().trim()) ||
          deletedKeySet.has(String(eData.email || '').toLowerCase().trim())
        ) {
          deletePromises.push(deleteDoc(doc(db, 'employees', d.id)).catch(() => {}));
        }
      });

      allUsersSnap.forEach(d => {
        if (d.id === SYNC_REGISTRY_DOC_ID) return;
        const uData = d.data();
        if (
          deletedKeySet.has(d.id.toLowerCase().trim()) ||
          deletedKeySet.has(String(uData.id || '').toLowerCase().trim()) ||
          deletedKeySet.has(String(uData.uid || '').toLowerCase().trim()) ||
          deletedKeySet.has(String(uData.email || '').toLowerCase().trim()) ||
          deletedKeySet.has(String(uData.employeeId || '').toLowerCase().trim())
        ) {
          deletePromises.push(deleteDoc(doc(db, 'users', d.id)).catch(() => {}));
        }
      });

      await Promise.all(deletePromises);
    } catch (e) {
      console.warn('Firestore employee/user delete scan notice:', e);
    }

    try {
      fetch(`/api/employees/${encodeURIComponent(targetId)}`, { method: 'DELETE' }).catch(() => {});
      if (resolvedId && resolvedId !== targetId) {
        fetch(`/api/employees/${encodeURIComponent(resolvedId)}`, { method: 'DELETE' }).catch(() => {});
      }
      if (targetEmail) {
        fetch(`/api/users/${encodeURIComponent(targetEmail)}`, { method: 'DELETE' }).catch(() => {});
      }
    } catch {}

    addAuditLog('Employee Removed', 'Employees', `Deleted employee record for ${targetName} (${targetId})`, targetId);
    showToast('Employee Removed', `Employee record ${targetId} removed from directory and user access.`, 'info');
    return true;
  };

  // Staff Workflow Request methods
  const addStaffRequest = async (
    data: Omit<StaffWorkflowRequest, 'id' | 'submittedAt' | 'status' | 'isVerifiedStaff'>
  ): Promise<StaffWorkflowRequest> => {
    const id = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReq: StaffWorkflowRequest = cleanFirestoreData({
      ...data,
      id,
      submittedAt: new Date().toISOString(),
      status: 'PENDING',
      isVerifiedStaff: true,
      isLiveStaffRequest: true
    });

    setStaffRequests(prev => {
      const updated = [newReq, ...prev.filter(r => r.id !== id)];
      try {
        localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Persist staff request to Firestore non-blocking so UI never freezes during quota backoff
    setDoc(doc(db, 'requests', id), cleanFirestoreData(newReq)).catch(err => {
      console.warn('Firestore staff request write error:', err);
    });

    // Dual-write to Express server backend if present
    fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReq)
    }).catch(() => {});

    addAuditLog('Staff Request Submitted', 'Requests', `${data.employeeName} submitted ${data.type} request: ${data.title}`, id);
    showToast('Request Submitted', `Your request ${id} has been dispatched for management review.`);
    return newReq;
  };

  const updateStaffRequestStatus = async (id: string, status: RequestStatus, remarks?: string): Promise<boolean> => {
    const targetReq = staffRequests.find(r => r.id === id) || selectedStaffRequest;
    if (!canUserApproveRequest(currentUser?.role, targetReq?.type, targetReq, currentUser)) {
      showToast(
        'Permission Denied',
        'Only the user mentioned in "To" or a Super Admin can accept or reject this request.',
        'error'
      );
      return false;
    }
    const reviewer = currentUser?.name || currentUser?.email || 'Executive Admin';
    const now = new Date().toISOString();

    setStaffRequests(prev => {
      const next = prev.map(r => {
        if (r.id === id) {
          const updated: StaffWorkflowRequest = {
            ...r,
            status,
            reviewedAt: now,
            reviewedBy: reviewer,
            remarks: remarks || (status === 'APPROVED' ? `Approved by ${reviewer}` : `Rejected by ${reviewer}`)
          };
          if (selectedStaffRequest?.id === id) {
            setSelectedStaffRequest(updated);
          }
          return updated;
        }
        return r;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Persist request status to Firestore non-blocking
    updateDoc(doc(db, 'requests', id), {
      status,
      reviewedAt: now,
      reviewedBy: reviewer,
      remarks: remarks || (status === 'APPROVED' ? `Approved by ${reviewer}` : `Rejected by ${reviewer}`)
    }).catch(err => {
      console.warn('Firestore request status update error:', err);
    });

    // Dual-write to Express server backend if present
    fetch('/api/requests/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, remarks, reviewer })
    }).catch(() => {});

    addAuditLog(
      status === 'APPROVED' ? 'Staff Request Approved' : 'Staff Request Rejected',
      'Requests',
      `Request ${id} marked as ${status} by ${reviewer}${remarks ? ` (${remarks})` : ''}`,
      id,
      status === 'APPROVED' ? 'SUCCESS' : 'WARNING'
    );

    showToast(
      status === 'APPROVED' ? 'Request Approved' : 'Request Rejected',
      `Staff workflow requisition ${id} has been ${status.toLowerCase()}.`,
      status === 'APPROVED' ? 'success' : 'info'
    );

    return true;
  };

  const deleteStaffRequest = async (id: string): Promise<boolean> => {
    recordDeletedRecord(id);
    persistSyncRegistryToFirestore().catch(() => {});
    deleteDoc(doc(db, 'requests', id)).catch(() => {});
    fetch(`/api/requests/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});

    setStaffRequests(prev => {
      const next = prev.filter(r => r.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(next));
      } catch {}
      return next;
    });

    addAuditLog('Staff Request Deleted', 'Requests', `Deleted staff request ${id}`, id);
    showToast('Request Deleted', `Staff workflow requisition ${id} has been removed.`, 'info');
    return true;
  };

  // Requirement 3: View details action
  const openRequestDetails = (req: StaffWorkflowRequest) => {
    setSelectedStaffRequest(req);
    setIsDetailsModalOpen(true);
  };

  const closeRequestDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedStaffRequest(null);
  };

  // Attendance
  const logAttendance = async (
    employeeId: string,
    method: 'FACIAL_AI' | 'BIOMETRIC' | 'MANUAL_OVERRIDE' = 'FACIAL_AI'
  ) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) {
      return { success: false, message: `Employee ID ${employeeId} not found.` };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Check if already checked in today
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === todayStr);
    if (existing) {
      return {
        success: true,
        message: `${emp.firstName} ${emp.lastName} is already checked in for today at ${existing.checkInTime}.`,
        record: existing
      };
    }

    const confidenceScore = method === 'FACIAL_AI' ? +(97.5 + Math.random() * 2.4).toFixed(1) : 100;
    const newRecord: AttendanceRecord = {
      id: `ATT-${Math.floor(1000 + Math.random() * 9000)}`,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      department: emp.department,
      date: todayStr,
      checkInTime: timeStr,
      checkOutTime: '--:--',
      verificationMethod: method,
      status: 'PRESENT',
      confidenceScore
    };

    setAttendance(prev => [newRecord, ...prev]);
    addAuditLog('Biometric Verification', 'Attendance', `Check-in recorded for ${emp.firstName} ${emp.lastName} via ${method} (Score: ${confidenceScore}%)`, newRecord.id);
    showToast('Check-In Verified', `${emp.firstName} ${emp.lastName} checked in successfully (${confidenceScore}% match).`);
    return { success: true, message: 'Check-in recorded successfully.', record: newRecord };
  };

  // Payroll
  const disbursePayroll = async (id: string): Promise<boolean> => {
    let updatedRecord: PayrollRecord | undefined;

    setPayroll(prev => {
      const next = prev.map(p => {
        if (p.id === id) {
          updatedRecord = {
            ...p,
            status: 'PAID' as const,
            paymentDate: new Date().toISOString().split('T')[0],
            disbursedBy: currentUser?.name || 'System Master Disburser',
            manualStatusOverride: true
          };
          return updatedRecord;
        }
        return p;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(next));
      } catch {}
      return next;
    });

    const existing = payroll.find(p => p.id === id);
    const target = updatedRecord || (existing ? {
      ...existing,
      status: 'PAID' as const,
      paymentDate: new Date().toISOString().split('T')[0],
      disbursedBy: currentUser?.name || 'System Master Disburser',
      manualStatusOverride: true
    } : undefined);

    if (target) {
      try {
        const cleanDoc = cleanFirestoreData(target);
        await setDoc(doc(db, 'payroll', id), cleanDoc, { merge: true });
      } catch (e) {
        console.warn('Firestore disburse payroll write error:', e);
      }
    }

    addAuditLog('Payroll Disbursed', 'Payroll', `Compensation disbursement cleared for record ${id}`, id);
    showToast('Payment Disbursed', `Payroll record ${id} has been marked as PAID.`);
    return true;
  };

  const syncEmployeeToPayroll = async (
    emp: Employee,
    cycleMonth?: string,
    cycleYear: number = 2026
  ): Promise<PayrollRecord> => {
    const fullName = `${emp.firstName} ${emp.lastName}`.trim() || emp.id;
    const lowerName = fullName.toLowerCase();
    const lowerEmail = (emp.email || '').trim().toLowerCase();
    const upperEmpId = (emp.id || '').trim().toUpperCase();

    // Do not generate or sync payslips for MOD101, MOD102, MOD106 (Modela Tech), MOD000, MOD003, MOD005, MOD006, MOD007, legacy MOD0090, Marcus Vance, Sourav Ganguly, Pooja Sharma, Tony Stark, Piu Roy, intermediate MOD01, or deleted employees
    if (
      lowerName === 'modela tech' ||
      lowerName.includes('modela tech') ||
      lowerName.includes('tony stark') ||
      (lowerName.includes('tony') && lowerName.includes('stark')) ||
      lowerName.includes('piu roy') ||
      (lowerName.includes('piu') && lowerName.includes('roy')) ||
      lowerName.includes('marcus vance') ||
      (lowerName.includes('marcus') && lowerName.includes('vance')) ||
      lowerName.includes('sourav ganguly') ||
      (lowerName.includes('sourav') && lowerName.includes('ganguly')) ||
      lowerName.includes('pooja sharma') ||
      (lowerName.includes('pooja') && lowerName.includes('sharma')) ||
      upperEmpId === 'MOD000' ||
      upperEmpId === 'MOD101' ||
      upperEmpId === 'MOD102' ||
      upperEmpId === 'MOD106' ||
      upperEmpId === 'MOD003' ||
      upperEmpId === 'MOD005' ||
      upperEmpId === 'MOD006' ||
      upperEmpId === 'MOD007' ||
      upperEmpId === 'MOD0090' ||
      upperEmpId === 'MOD01' ||
      lowerEmail === 'modelatech4@gmail.com' ||
      lowerEmail === 'modelatech2026@gmail.com' ||
      lowerEmail === 'sushoovandas@gmail.com' ||
      lowerEmail === 'ghoshdebrupa005@gmail.com' ||
      lowerEmail === 'marcus.vance@modela.io' ||
      lowerEmail === 'sourav.ganguly@modela.io' ||
      lowerEmail === 'pooja.sharma@modela.io' ||
      lowerEmail.includes('tonystark') ||
      lowerEmail.includes('tony.stark') ||
      lowerEmail.includes('piuroy') ||
      lowerEmail.includes('piu.roy') ||
      isRecordDeleted(emp.id, emp.email)
    ) {
      return {} as PayrollRecord;
    }

    const ALL_MONTHS = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    const targetMonths = cycleMonth ? [cycleMonth] : ALL_MONTHS;

    const isModela = lowerName === 'modela tech' || lowerEmail === 'modelatech2026@gmail.com';
    const basic = isModela ? 95000 : (Number(emp.compensation?.basic) || 50000);
    const hra = Number(emp.compensation?.allowanceBreakdown?.hra) || 0;
    const medical = Number(emp.compensation?.allowanceBreakdown?.medical) || 0;
    const special = Number(emp.compensation?.allowanceBreakdown?.special) || 0;
    const internet = Number(emp.compensation?.allowanceBreakdown?.internet) || 0;
    const totalAllowances = isModela
      ? 30000
      : (hra + medical + special + internet || (Number(emp.compensation?.allowances) || 15000));

    const pt = Number(emp.compensation?.deductionBreakdown?.professionalTax) || 200;
    const pf = Number(emp.compensation?.deductionBreakdown?.pfContribution) || 1800;
    const health = Number(emp.compensation?.deductionBreakdown?.groupHealthInsurance) || 1700;
    const standardDeductions = pt + pf + health;

    const grossSalary = basic + totalAllowances;
    const baseNet = grossSalary - standardDeductions;

    const generatedRecords: PayrollRecord[] = [];
    const oldIdsToDelete: string[] = [];

    targetMonths.forEach(m => {
      const monthIdx = ALL_MONTHS.findIndex(item => item.toLowerCase() === m.toLowerCase());
      const monthNumberStr = String((monthIdx >= 0 ? monthIdx : new Date().getMonth()) + 1).padStart(2, '0');
      const defaultRecordId = `PAY-${cycleYear}-${m.substring(0, 3).toUpperCase()}-${emp.id}`;
      const targetPersonKey = getPayrollPersonKey({ employeeName: fullName, employeeId: emp.id, id: defaultRecordId });
      const existing = payroll.find(
        p =>
          p.month?.toLowerCase() === m.toLowerCase() &&
          Number(p.year) === Number(cycleYear) &&
          (p.id === defaultRecordId ||
            p.employeeId?.toUpperCase() === upperEmpId ||
            getPayrollPersonKey(p) === targetPersonKey)
      );

      const isCanonicalExisting = existing && /^PAY-\d{4}-\d{2}-\d{2}$/.test(existing.id);
      const finalRecordId = isCanonicalExisting ? existing!.id : defaultRecordId;
      if (existing && existing.id !== finalRecordId) {
        oldIdsToDelete.push(existing.id);
      }

      const lopDays = existing?.lopDays || 0;
      const otAmount = existing?.otAmount || 0;
      const lopAmount = +((baseNet / 30) * lopDays).toFixed(2);
      const totalDeductions = standardDeductions + lopAmount;
      const cycleGrossSalary = grossSalary + otAmount;
      const netSalary = +(cycleGrossSalary - totalDeductions).toFixed(2);

      const isNovDec = isNovDecMonth(m);
      const isFutureUnpaidYear = Number(cycleYear) >= 2027 && Number(cycleYear) <= 2036;
      const defaultStatus: 'PAID' | 'UNPAID' = (isNovDec || isFutureUnpaidYear) ? 'UNPAID' : 'PAID';
      const finalStatus: 'PAID' | 'UNPAID' = existing?.manualStatusOverride
        ? (existing.status === 'UNPAID' ? 'UNPAID' : 'PAID')
        : defaultStatus;

      const updatedPayroll: PayrollRecord = {
        id: finalRecordId,
        employeeId: emp.id,
        employeeName: fullName,
        month: existing?.month || m,
        year: existing?.year || cycleYear,
        basicSalary: basic,
        allowances: totalAllowances,
        deductions: totalDeductions,
        grossSalary: cycleGrossSalary,
        netSalary,
        status: finalStatus,
        paymentDate: finalStatus === 'PAID' ? (existing?.paymentDate || `${cycleYear}-${monthNumberStr}-01`) : '',
        disbursedBy: finalStatus === 'PAID' ? (existing?.disbursedBy || 'System Master Disburser') : '',
        lopDays,
        lopAmount,
        otAmount,
        pan: emp.pan || existing?.pan,
        bankAccount: emp.bankAccount || existing?.bankAccount,
        ...(existing?.manualStatusOverride ? { manualStatusOverride: true } : {}),
        allowanceBreakdown: {
          hra: hra || Math.round(totalAllowances * 0.4),
          medical: medical || Math.round(totalAllowances * 0.15),
          special: special || Math.round(totalAllowances * 0.35),
          internet: internet || Math.max(0, totalAllowances - Math.round(totalAllowances * 0.9))
        },
        deductionBreakdown: {
          professionalTax: pt,
          pfContribution: pf,
          groupHealthInsurance: health,
          lop: lopAmount
        }
      };

      generatedRecords.push(updatedPayroll);
    });

    const targetMonthSet = new Set(targetMonths.map(m => m.toLowerCase()));
    const samplePersonKey = getPayrollPersonKey({ employeeName: fullName, employeeId: emp.id });

    setPayroll(prev => {
      const filtered = prev.filter(
        p =>
          !(
            p.month &&
            targetMonthSet.has(p.month.toLowerCase()) &&
            Number(p.year) === Number(cycleYear) &&
            (p.employeeId?.toUpperCase() === upperEmpId || getPayrollPersonKey(p) === samplePersonKey)
          )
      );
      const next = enforceMonthPayrollRules([...generatedRecords, ...filtered]);
      try {
        localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(next));
      } catch {}
      return next;
    });

    oldIdsToDelete.forEach(oldId => {
      deleteDoc(doc(db, 'payroll', oldId)).catch(() => {});
    });
    generatedRecords.forEach(rec => {
      const cleanDoc = cleanFirestoreData(rec);
      setDoc(doc(db, 'payroll', rec.id), cleanDoc, { merge: true }).catch(() => {});
    });

    return generatedRecords.find(r => r.month.toLowerCase() === 'october') || generatedRecords[0] || ({} as PayrollRecord);
  };

  const updatePayrollRecord = async (
    id: string,
    updates: Partial<PayrollRecord>,
    fallbackRecord?: PayrollRecord
  ): Promise<boolean> => {
    // 1. Determine base synchronously
    const existing = payroll.find(p => p.id === id) || fallbackRecord;
    if (!existing) return false;

    // Requirement: once status is PAID, LOP and OT inputs are locked
    if (updates.lopDays !== undefined && existing.status === 'PAID') {
      showToast('LOP Locked', 'LOP cannot be edited after status is PAID and salary slip is generated.', 'error');
      return false;
    }
    if (updates.otAmount !== undefined && existing.status === 'PAID') {
      showToast('OT Locked', 'OT cannot be edited after status is PAID.', 'error');
      return false;
    }

    const lopDays = updates.lopDays !== undefined ? updates.lopDays : (existing.lopDays || 0);
    const otAmount = updates.otAmount !== undefined ? updates.otAmount : (existing.otAmount || 0);
    const basic = updates.basicSalary !== undefined ? updates.basicSalary : existing.basicSalary;
    const allowances = updates.allowances !== undefined ? updates.allowances : existing.allowances;
    const baseCompensation = basic + allowances;
    const grossSalary = baseCompensation + otAmount;

    const pt = existing.deductionBreakdown?.professionalTax ?? 200;
    const pf = existing.deductionBreakdown?.pfContribution ?? 1800;
    const health = existing.deductionBreakdown?.groupHealthInsurance ?? 1700;
    const standardDeductions = pt + pf + health;

    const baseNet = baseCompensation - standardDeductions;
    const lopAmount = +((baseNet / 30) * lopDays).toFixed(2);
    const totalDeductions = standardDeductions + lopAmount;
    const netSalary = +(grossSalary - totalDeductions).toFixed(2);
    const now = new Date().toISOString();

    const updatedRecord: PayrollRecord = {
      ...existing,
      ...updates,
      lopDays,
      lopAmount,
      otAmount,
      deductions: totalDeductions,
      grossSalary,
      netSalary,
      deductionBreakdown: {
        ...(existing.deductionBreakdown || { professionalTax: pt, pfContribution: pf, groupHealthInsurance: health }),
        lop: lopAmount
      },
      ...({ updatedAt: now } as any)
    };

    // 2. Update React state immediately
    setPayroll(prev => {
      const idx = prev.findIndex(p => p.id === id);
      let next: PayrollRecord[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = updatedRecord;
      } else {
        next = [updatedRecord, ...prev];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 3. Persist to localStorage directly as resilient backup
    try {
      const currentSaved = localStorage.getItem(STORAGE_KEYS.PAYROLL);
      let list: PayrollRecord[] = currentSaved ? JSON.parse(currentSaved) : [];
      if (!Array.isArray(list)) list = [];
      const i = list.findIndex(p => p.id === id);
      if (i >= 0) {
        list[i] = updatedRecord;
      } else {
        list.unshift(updatedRecord);
      }
      localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(list));
    } catch {}

    // 4. Sync to backend API & Firestore database non-blockingly for real-time cross-device sync
    fetch('/api/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRecord)
    }).catch(() => {});

    const cleanDoc = cleanFirestoreData(updatedRecord);
    setDoc(doc(db, 'payroll', id), cleanDoc, { merge: true }).catch(e => {
      console.warn('Firestore payroll update error:', e);
    });

    return true;
  };

  const togglePayrollStatus = async (id: string, fallbackRecord?: PayrollRecord): Promise<boolean> => {
    // 1. Synchronously find existing record or fallback
    const targetPersonKey = fallbackRecord ? getPayrollPersonKey(fallbackRecord) : '';
    const existing =
      payroll.find(
        p =>
          p.id === id ||
          (fallbackRecord &&
            p.month?.toLowerCase() === fallbackRecord.month?.toLowerCase() &&
            Number(p.year) === Number(fallbackRecord.year) &&
            getPayrollPersonKey(p) === targetPersonKey)
      ) || fallbackRecord;
    if (!existing) {
      return false;
    }

    const canManagePayrollStatus =
      currentUser?.role === 'SUPER_ADMIN' ||
      currentUser?.role === 'HR' ||
      currentUser?.role === 'HR_MANAGER' ||
      currentUser?.email === 'sushovand@modelatech.com' ||
      currentUser?.email === 'sushoovandas@gmail.com' ||
      currentUser?.email === 'modelatech2026@gmail.com';

    if (!canManagePayrollStatus) {
      showToast('Action Restricted', 'Only HR or Super Admin can update payroll status.', 'error');
      return false;
    }

    const nextStatus: 'PAID' | 'UNPAID' = existing.status === 'PAID' ? 'UNPAID' : 'PAID';
    const paymentDate = nextStatus === 'PAID' ? (existing.paymentDate || new Date().toISOString().split('T')[0]) : '';
    const disbursedBy = nextStatus === 'PAID' ? (currentUser?.name || 'System Master Disburser') : '';
    const canonicalDocId = existing.id || id;
    const now = new Date().toISOString();
    const updatedRecord: PayrollRecord = {
      ...existing,
      id: canonicalDocId,
      status: nextStatus,
      paymentDate,
      disbursedBy,
      manualStatusOverride: true,
      ...({ updatedAt: now } as any)
    };

    const recordPersonKey = getPayrollPersonKey(updatedRecord);

    // 2. Update React state
    setPayroll(prev => {
      const idx = prev.findIndex(
        p =>
          p.id === canonicalDocId ||
          p.id === id ||
          (p.month?.toLowerCase() === updatedRecord.month?.toLowerCase() &&
            Number(p.year) === Number(updatedRecord.year) &&
            getPayrollPersonKey(p) === recordPersonKey)
      );
      let next: PayrollRecord[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = updatedRecord;
      } else {
        next = [updatedRecord, ...prev];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 3. Persist to localStorage directly as resilient backup
    try {
      const currentSaved = localStorage.getItem(STORAGE_KEYS.PAYROLL);
      let list: PayrollRecord[] = currentSaved ? JSON.parse(currentSaved) : [];
      if (!Array.isArray(list)) list = [];
      const i = list.findIndex(
        p =>
          p.id === canonicalDocId ||
          p.id === id ||
          (p.month?.toLowerCase() === updatedRecord.month?.toLowerCase() &&
            Number(p.year) === Number(updatedRecord.year) &&
            getPayrollPersonKey(p) === recordPersonKey)
      );
      if (i >= 0) {
        list[i] = updatedRecord;
      } else {
        list.unshift(updatedRecord);
      }
      localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(list));
    } catch {}

    // 4. Sync to backend API & Firestore database non-blockingly for real-time cross-device sync
    fetch('/api/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRecord)
    }).catch(() => {});

    const cleanDoc = cleanFirestoreData(updatedRecord);
    setDoc(doc(db, 'payroll', canonicalDocId), cleanDoc, { merge: true }).catch(e => {
      console.warn('Firestore toggle payroll status error:', e);
    });
    if (id !== canonicalDocId) {
      setDoc(doc(db, 'payroll', id), cleanDoc, { merge: true }).catch(() => {});
    }

    showToast('Status Updated', `Payroll record marked as ${updatedRecord.status}.`);
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        employees,
        staffRequests,
        attendance,
        payroll,
        auditLogs,
        onboarding,
        toasts,
        showToast,
        removeToast,
        addEmployee,
        bulkAddEmployees,
        updateEmployee,
        deleteEmployee,
        addStaffRequest,
        updateStaffRequestStatus,
        deleteStaffRequest,
        refreshStaffRequests,
        selectedStaffRequest,
        setSelectedStaffRequest,
        isDetailsModalOpen,
        setIsDetailsModalOpen,
        openRequestDetails,
        closeRequestDetails,
        logAttendance,
        disbursePayroll,
        updatePayrollRecord,
        togglePayrollStatus,
        syncEmployeeToPayroll,
        addAuditLog,
        isDarkMode,
        toggleTheme,
        isSidebarCollapsed,
        toggleSidebar
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
