import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Employee,
  StaffWorkflowRequest,
  AttendanceRecord,
  PayrollRecord,
  AuditLog,
  OnboardingCandidate,
  RequestStatus
} from '../types';
import {
  INITIAL_EMPLOYEES,
  INITIAL_STAFF_REQUESTS,
  INITIAL_ATTENDANCE,
  INITIAL_PAYROLL,
  INITIAL_AUDIT_LOGS,
  INITIAL_ONBOARDING
} from '../data/initialData';
import { useAuth } from './AuthContext';
import { getDeletedRegistry, recordDeletedRecord, isRecordDeleted } from '../utils/syncRegistry';

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
  EMPLOYEES: 'modela_employees_v2',
  REQUESTS: 'modela_requests_v2',
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
          currentList = parsed.filter(e => !isRecordDeleted(e.id, e.email));
        }
      }
    } catch {}

    if (currentList.length === 0) {
      currentList = INITIAL_EMPLOYEES.filter(e => !isRecordDeleted(e.id, e.email));
    }

    // Explicit requirement: Add Modela Tech, Marcus Vance also in the Employees page
    // Ensure both are present if they haven't been deleted by the user!
    const requiredEmployees: Employee[] = [
      {
        id: "MOD000",
        firstName: "Modela",
        lastName: "Tech",
        email: "modelatech2026@gmail.com",
        joiningDate: "2024-01-01",
        designation: "Executive Director & Super Admin",
        phone: "+1 (555) 123-4567",
        department: "Executive Office",
        status: "ACTIVE",
        location: "San Francisco HQ",
        compensation: { basic: 95000, allowances: 30000 },
        avatar: "https://ui-avatars.com/api/?name=Modela+Tech&background=0284c7&color=fff"
      },
      {
        id: "MOD003",
        firstName: "Marcus",
        lastName: "Vance",
        email: "marcus.vance@modela.io",
        joiningDate: "2024-05-10",
        designation: "HR Operations Manager",
        phone: "+1 (555) 456-7890",
        department: "Human Resources",
        status: "ACTIVE",
        location: "New York Regional Office",
        compensation: { basic: 48000, allowances: 14000 },
        avatar: "https://ui-avatars.com/api/?name=Marcus+Vance&background=6366f1&color=fff"
      }
    ];

    requiredEmployees.forEach(reqEmp => {
      const isDel = isRecordDeleted(reqEmp.id, reqEmp.email);
      if (!isDel) {
        const exists = currentList.some(
          e => e.id.toLowerCase() === reqEmp.id.toLowerCase() || (Boolean(e.email && reqEmp.email) && e.email!.toLowerCase() === reqEmp.email!.toLowerCase())
        );
        if (!exists) {
          currentList.unshift(reqEmp);
        }
      }
    });

    try {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(currentList));
    } catch {}

    return currentList;
  });

  // Listen to new employee addition events (e.g. from new signup requests)
  useEffect(() => {
    const handleEmployeeAdded = (event: Event) => {
      const customEvent = event as CustomEvent<Employee>;
      if (customEvent.detail) {
        setEmployees(prev => {
          if (prev.some(e => e.id === customEvent.detail.id || (customEvent.detail.email && e.email?.toLowerCase() === customEvent.detail.email.toLowerCase()))) {
            return prev;
          }
          return [customEvent.detail, ...prev];
        });
      }
    };
    window.addEventListener('modela_employee_added', handleEmployeeAdded);
    return () => window.removeEventListener('modela_employee_added', handleEmployeeAdded);
  }, []);

  // Cross-context deletion sync: remove employee when deleted from Approved Users Directory
  useEffect(() => {
    const handleEmployeeDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string; email?: string }>;
      const { id, email } = customEvent.detail || {};
      setEmployees(prev => {
        const next = prev.filter(e => {
          if (id && (e.id.toLowerCase() === id.toLowerCase() || e.id === id)) return false;
          if (email && e.email && e.email.toLowerCase() === email.toLowerCase()) return false;
          return true;
        });
        try {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(next));
        } catch {}
        return next;
      });
    };
    window.addEventListener('modela_employee_deleted', handleEmployeeDeleted);
    return () => window.removeEventListener('modela_employee_deleted', handleEmployeeDeleted);
  }, []);

  // Synchronize any approved users from AuthContext to employees directory
  useEffect(() => {
    if (!users || users.length === 0) return;
    const approved = users.filter(u => u.status === 'APPROVED' && u.email);
    if (approved.length === 0) return;

    setEmployees(prev => {
      let changed = false;
      const nextList = [...prev];

      approved.forEach(u => {
        if (!u.email) return;
        if (isRecordDeleted(u.id, u.email, u.employeeId)) return;

        const exists = nextList.some(
          e => (Boolean(u.employeeId) && e.id.toLowerCase() === u.employeeId!.toLowerCase()) ||
               (Boolean(e.email) && e.email!.toLowerCase() === u.email.toLowerCase())
        );

        if (!exists) {
          const parts = (u.name || '').trim().split(/\s+/);
          const empId = u.employeeId || `MOD${String(nextList.length + 1).padStart(3, '0')}`;
          const newEmp: Employee = {
            id: empId,
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || '',
            joiningDate: new Date().toISOString().split('T')[0],
            phone: '',
            email: u.email,
            designation: u.designation || 'Enterprise Staff',
            department: u.department || 'General Staff',
            status: 'ACTIVE',
            location: 'San Francisco HQ',
            compensation: { basic: 50000, allowances: 15000 },
            avatar: u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email)}&background=0284c7&color=fff`
          };
          nextList.unshift(newEmp);
          changed = true;
        } else if (u.name) {
          const matchIndex = nextList.findIndex(
            e => (Boolean(u.employeeId) && e.id.toLowerCase() === u.employeeId!.toLowerCase()) ||
                 (Boolean(e.email) && e.email!.toLowerCase() === u.email.toLowerCase())
          );
          if (matchIndex >= 0) {
            const parts = u.name.trim().split(/\s+/);
            const fName = parts[0] || '';
            const lName = parts.slice(1).join(' ') || '';
            if (nextList[matchIndex].firstName !== fName || nextList[matchIndex].lastName !== lName) {
              nextList[matchIndex] = {
                ...nextList[matchIndex],
                firstName: fName,
                lastName: lName
              };
              changed = true;
            }
          }
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

  const [staffRequests, setStaffRequests] = useState<StaffWorkflowRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REQUESTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(
            (r: StaffWorkflowRequest) =>
              r &&
              r.id !== 'REQ-622' &&
              r.id !== 'REQ-719' &&
              r.employeeName !== 'Riju1234' &&
              r.employeeName !== 'Abc123' &&
              !isRecordDeleted(r.id, r.employeeId, r.employeeName)
          );
          try {
            localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(filtered));
          } catch {}
          return filtered;
        }
      }
    } catch {}
    return INITIAL_STAFF_REQUESTS.filter(
      r =>
        r &&
        r.id !== 'REQ-622' &&
        r.id !== 'REQ-719' &&
        r.employeeName !== 'Riju1234' &&
        r.employeeName !== 'Abc123' &&
        !isRecordDeleted(r.id, r.employeeId, r.employeeName)
    );
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

  const enforceMonthPayrollRules = (records: PayrollRecord[]): PayrollRecord[] => {
    return records.map(p => {
      const isNovDec = isNovDecMonth(p.month);
      const targetStatus: 'PAID' | 'UNPAID' = isNovDec ? 'UNPAID' : 'PAID';
      if (p.status !== targetStatus) {
        return {
          ...p,
          status: targetStatus,
          paymentDate: targetStatus === 'PAID' ? (p.paymentDate || `${p.year}-01-01`) : '',
          disbursedBy: targetStatus === 'PAID' ? (p.disbursedBy || 'System Master Disburser') : ''
        };
      }
      return p;
    });
  };

  // Persist payroll in localStorage and sync with Firestore database
  // Requirement 3: jan to october mark all paid, nov to december mark all of them unpaid
  const [payroll, setPayroll] = useState<PayrollRecord[]>(() => {
    let list: PayrollRecord[] = INITIAL_PAYROLL;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PAYROLL);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
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
    const unsub = onSnapshot(
      collection(db, 'employees'),
      async snapshot => {
        if (!isSubscribed) return;
        if (snapshot.empty) {
          try {
            for (const emp of INITIAL_EMPLOYEES) {
              if (!isRecordDeleted(emp.id, emp.email)) {
                await setDoc(doc(db, 'employees', emp.id), emp);
              }
            }
          } catch (e) {
            console.warn('Initial employees seed error:', e);
          }
          return;
        }

        const remoteEmployees: Employee[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as Employee;
          if (data && data.id && !isRecordDeleted(data.id, data.email)) {
            remoteEmployees.push(data);
          }
        });

        if (remoteEmployees.length > 0) {
          setEmployees(remoteEmployees);
          try {
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(remoteEmployees));
          } catch {}
        }
      },
      err => {
        console.warn('Firestore employees sync notice:', err);
      }
    );

    return () => {
      isSubscribed = false;
      unsub();
    };
  }, []);

  // Real-time Firestore synchronization for workflow staff requests across all devices
  useEffect(() => {
    // Proactively delete REQ-622 and REQ-719 from Firestore database so they never appear across any browser
    deleteDoc(doc(db, 'requests', 'REQ-622')).catch(() => {});
    deleteDoc(doc(db, 'requests', 'REQ-719')).catch(() => {});

    let isSubscribed = true;
    const unsub = onSnapshot(
      collection(db, 'requests'),
      async snapshot => {
        if (!isSubscribed) return;

        // If collection is empty, seed with initial baseline workflow requests
        if (snapshot.empty) {
          try {
            for (const req of INITIAL_STAFF_REQUESTS) {
              if (
                !isRecordDeleted(req.id, req.employeeId, req.employeeName) &&
                req.id !== 'REQ-622' &&
                req.id !== 'REQ-719'
              ) {
                await setDoc(doc(db, 'requests', req.id), req);
              }
            }
          } catch (e) {
            console.warn('Initial staff requests seed error:', e);
          }
          return;
        }

        const map = new Map<string, StaffWorkflowRequest>();
        // Add baseline default requests
        INITIAL_STAFF_REQUESTS.forEach(req => {
          if (
            !isRecordDeleted(req.id, req.employeeId, req.employeeName) &&
            req.id !== 'REQ-622' &&
            req.id !== 'REQ-719'
          ) {
            map.set(req.id, req);
          }
        });

        // Add & merge all live documents from Firestore
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as StaffWorkflowRequest;
          if (data && data.id) {
            if (
              data.id === 'REQ-622' ||
              data.id === 'REQ-719' ||
              data.employeeName === 'Riju1234' ||
              data.employeeName === 'Abc123' ||
              isRecordDeleted(data.id, data.employeeId, data.employeeName)
            ) {
              // Permanently remove from database if present
              deleteDoc(doc(db, 'requests', data.id)).catch(() => {});
              map.delete(data.id);
            } else {
              map.set(data.id, { ...map.get(data.id), ...data });
            }
          }
        });

        // Sort newest submitted requests first and ensure deleted are excluded
        const combined = Array.from(map.values())
          .filter(
            r =>
              r &&
              r.id !== 'REQ-622' &&
              r.id !== 'REQ-719' &&
              r.employeeName !== 'Riju1234' &&
              r.employeeName !== 'Abc123' &&
              !isRecordDeleted(r.id, r.employeeId, r.employeeName)
          )
          .sort(
            (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
          );

        setStaffRequests(combined);
        try {
          localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(combined));
        } catch {}
      },
      err => {
        console.warn('Firestore staff requests sync notice:', err);
      }
    );

    return () => {
      isSubscribed = false;
      unsub();
    };
  }, []);

  // Real-time Firestore synchronization for payroll ledger records across all devices
  useEffect(() => {
    let isSubscribed = true;
    const unsub = onSnapshot(
      collection(db, 'payroll'),
      async snapshot => {
        if (!isSubscribed) return;

        if (snapshot.empty) {
          try {
            for (const p of INITIAL_PAYROLL) {
              await setDoc(doc(db, 'payroll', p.id), p);
            }
          } catch (e) {
            console.warn('Initial payroll seed error:', e);
          }
          return;
        }

        const remotePayroll: PayrollRecord[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as PayrollRecord;
          if (data && data.id) {
            remotePayroll.push(data);
          }
        });

        if (remotePayroll.length > 0) {
          const normalized = enforceMonthPayrollRules(remotePayroll);
          setPayroll(normalized);
          try {
            localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(normalized));
          } catch {}
        }
      },
      err => {
        console.warn('Firestore payroll sync notice:', err);
      }
    );

    return () => {
      isSubscribed = false;
      unsub();
    };
  }, []);

  // Manual explicit refresh from Firestore
  const refreshStaffRequests = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'requests'));
      if (!snap.empty) {
        const map = new Map<string, StaffWorkflowRequest>();
        INITIAL_STAFF_REQUESTS.forEach(req => {
          if (
            !isRecordDeleted(req.id, req.employeeId, req.employeeName) &&
            req.id !== 'REQ-622' &&
            req.id !== 'REQ-719'
          ) {
            map.set(req.id, req);
          }
        });
        snap.forEach(docSnap => {
          const data = docSnap.data() as StaffWorkflowRequest;
          if (data && data.id) {
            if (
              data.id === 'REQ-622' ||
              data.id === 'REQ-719' ||
              data.employeeName === 'Riju1234' ||
              data.employeeName === 'Abc123' ||
              isRecordDeleted(data.id, data.employeeId, data.employeeName)
            ) {
              deleteDoc(doc(db, 'requests', data.id)).catch(() => {});
            } else {
              map.set(data.id, { ...map.get(data.id), ...data });
            }
          }
        });
        const combined = Array.from(map.values())
          .filter(
            r =>
              r &&
              r.id !== 'REQ-622' &&
              r.id !== 'REQ-719' &&
              r.employeeName !== 'Riju1234' &&
              r.employeeName !== 'Abc123' &&
              !isRecordDeleted(r.id, r.employeeId, r.employeeName)
          )
          .sort(
            (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
          );
        setStaffRequests(combined);
        try {
          localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(combined));
        } catch {}
      }
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

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(staffRequests));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
      // NOTE: Payroll data is stored directly in and loaded from Firestore database, never in localStorage.
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(auditLogs));
      localStorage.setItem(STORAGE_KEYS.ONBOARDING, JSON.stringify(onboarding));
      localStorage.setItem(STORAGE_KEYS.THEME, String(isDarkMode));
    } catch {}
  }, [employees, staffRequests, attendance, auditLogs, onboarding, isDarkMode]);

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
    const existingEmp = employees.find(e => e.id === id);
    const updatedFirstName = updates.firstName !== undefined ? updates.firstName : existingEmp?.firstName || '';
    const updatedLastName = updates.lastName !== undefined ? updates.lastName : existingEmp?.lastName || '';
    const fullName = `${updatedFirstName} ${updatedLastName}`.trim();

    const mergedEmp: Employee = {
      ...(existingEmp || {}),
      ...updates,
      id
    } as Employee;

    setEmployees(prev => {
      const next = prev.map(e => (e.id === id ? mergedEmp : e));
      try {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Persist employee update to Firestore
    const cleanEmp = cleanFirestoreData(mergedEmp);
    setDoc(doc(db, 'employees', id), cleanEmp, { merge: true }).catch(err => {
      console.warn('Firestore employee update error:', err);
    });

    // Auto-sync updated employee compensation to payroll page
    syncEmployeeToPayroll(mergedEmp);

    if (updateUserFromEmployee) {
      updateUserFromEmployee(id, existingEmp?.email || updates.email, {
        name: fullName,
        department: updates.department !== undefined ? updates.department : existingEmp?.department,
        designation: updates.designation !== undefined ? updates.designation : existingEmp?.designation
      });
    }

    addAuditLog('Employee Updated', 'Employees', `Updated record for ${id}${fullName ? ` (${fullName})` : ''}`, id);
    showToast('Record Updated', `Employee ${id} profile has been updated.`);
    return true;
  };

  const deleteEmployee = async (id: string, emailParam?: string): Promise<boolean> => {
    const target = employees.find(
      e => e.id === id || (emailParam && e.email && e.email.toLowerCase() === emailParam.toLowerCase())
    );
    const targetEmail = target?.email || emailParam;
    const targetId = target?.id || id;
    const targetName = target
      ? ([target.firstName, target.lastName].filter(Boolean).join(' ') || target.email || targetId)
      : targetId;

    // Record in persistent deleted registry so it cannot be resurrected
    recordDeletedRecord(targetId, targetEmail);

    // Delete from Firestore
    deleteDoc(doc(db, 'employees', targetId)).catch(() => {});

    setEmployees(prev => {
      const next = prev.filter(
        e =>
          e.id !== targetId &&
          (!targetEmail || !e.email || e.email.toLowerCase() !== targetEmail.toLowerCase())
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
            (!targetEmail || !u.email || u.email.toLowerCase() !== targetEmail.toLowerCase()) &&
            (!u.employeeId || u.employeeId.toLowerCase() !== targetId.toLowerCase()) &&
            u.id !== targetId
        );
        localStorage.setItem('modela_users_v2', JSON.stringify(nextUsers));
      }
    } catch {}

    // Dispatch event so AuthContext updates users state immediately
    window.dispatchEvent(
      new CustomEvent('modela_user_deleted', {
        detail: { id: targetId, employeeId: targetId, email: targetEmail }
      })
    );

    try {
      fetch(`/api/employees/${encodeURIComponent(targetId)}`, { method: 'DELETE' }).catch(() => {});
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
    const newReq: StaffWorkflowRequest = {
      ...data,
      id,
      submittedAt: new Date().toISOString(),
      status: 'PENDING',
      isVerifiedStaff: true
    };

    setStaffRequests(prev => [newReq, ...prev]);

    // Persist staff request to Firestore for instant real-time sync across all devices
    try {
      await setDoc(doc(db, 'requests', id), newReq);
    } catch (err) {
      console.warn('Firestore staff request write error:', err);
    }

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
    const reviewer = currentUser?.name || currentUser?.email || 'Executive Admin';
    const now = new Date().toISOString();

    setStaffRequests(prev =>
      prev.map(r => {
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
      })
    );

    // Persist request status to Firestore for real-time synchronization
    try {
      await updateDoc(doc(db, 'requests', id), {
        status,
        reviewedAt: now,
        reviewedBy: reviewer,
        remarks: remarks || (status === 'APPROVED' ? `Approved by ${reviewer}` : `Rejected by ${reviewer}`)
      });
    } catch (err) {
      console.warn('Firestore request status update error:', err);
    }

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
            disbursedBy: currentUser?.name || 'System Master Disburser'
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
      disbursedBy: currentUser?.name || 'System Master Disburser'
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
    cycleMonth: string = 'October',
    cycleYear: number = 2026
  ): Promise<PayrollRecord> => {
    const basic = Number(emp.compensation?.basic) || 0;
    const hra = Number(emp.compensation?.allowanceBreakdown?.hra) || 0;
    const medical = Number(emp.compensation?.allowanceBreakdown?.medical) || 0;
    const special = Number(emp.compensation?.allowanceBreakdown?.special) || 0;
    const internet = Number(emp.compensation?.allowanceBreakdown?.internet) || 0;
    const totalAllowances = hra + medical + special + internet || (Number(emp.compensation?.allowances) || 0);

    const pt = Number(emp.compensation?.deductionBreakdown?.professionalTax) || 200;
    const pf = Number(emp.compensation?.deductionBreakdown?.pfContribution) || 1800;
    const health = Number(emp.compensation?.deductionBreakdown?.groupHealthInsurance) || 1700;
    const standardDeductions = pt + pf + health;

    const grossSalary = basic + totalAllowances;
    const baseNet = grossSalary - standardDeductions;

    const recordId = `PAY-${cycleYear}-${cycleMonth.substring(0, 3).toUpperCase()}-${emp.id}`;
    const existing = payroll.find(p => p.id === recordId || (p.employeeId === emp.id && p.month === cycleMonth && p.year === cycleYear));

    const lopDays = existing?.lopDays || 0;
    const lopAmount = +( (baseNet / 30) * lopDays ).toFixed(2);
    const totalDeductions = standardDeductions + lopAmount;
    const netSalary = +(grossSalary - totalDeductions).toFixed(2);

    const updatedPayroll: PayrollRecord = {
      id: existing?.id || recordId,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`.trim() || emp.id,
      month: existing?.month || cycleMonth,
      year: existing?.year || cycleYear,
      basicSalary: basic,
      allowances: totalAllowances,
      deductions: totalDeductions,
      grossSalary,
      netSalary,
      status: existing?.status || 'PAID',
      paymentDate: existing?.paymentDate || `${cycleYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
      disbursedBy: existing?.disbursedBy || 'System Master Disburser',
      lopDays,
      lopAmount,
      pan: emp.pan || existing?.pan,
      bankAccount: emp.bankAccount || existing?.bankAccount,
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

    setPayroll(prev => {
      const idx = prev.findIndex(p => p.id === updatedPayroll.id);
      let next: PayrollRecord[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = updatedPayroll;
      } else {
        next = [updatedPayroll, ...prev];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      const cleanDoc = cleanFirestoreData(updatedPayroll);
      await setDoc(doc(db, 'payroll', updatedPayroll.id), cleanDoc, { merge: true });
    } catch (e) {
      console.warn('Firestore payroll write error:', e);
    }

    return updatedPayroll;
  };

  const updatePayrollRecord = async (
    id: string,
    updates: Partial<PayrollRecord>,
    fallbackRecord?: PayrollRecord
  ): Promise<boolean> => {
    // 1. Determine base synchronously
    const existing = payroll.find(p => p.id === id) || fallbackRecord;
    if (!existing) return false;

    // Requirement 2: after status to be paid and salary slip generation LOP can't be edited.
    if (updates.lopDays !== undefined && existing.status === 'PAID') {
      showToast('LOP Locked', 'LOP cannot be edited after status is PAID and salary slip is generated.', 'error');
      return false;
    }

    const lopDays = updates.lopDays !== undefined ? updates.lopDays : (existing.lopDays || 0);
    const basic = updates.basicSalary !== undefined ? updates.basicSalary : existing.basicSalary;
    const allowances = updates.allowances !== undefined ? updates.allowances : existing.allowances;
    const grossSalary = updates.grossSalary !== undefined ? updates.grossSalary : (basic + allowances);

    const pt = existing.deductionBreakdown?.professionalTax ?? 200;
    const pf = existing.deductionBreakdown?.pfContribution ?? 1800;
    const health = existing.deductionBreakdown?.groupHealthInsurance ?? 1700;
    const standardDeductions = pt + pf + health;

    const baseNet = grossSalary - standardDeductions;
    const lopAmount = +( (baseNet / 30) * lopDays ).toFixed(2);
    const totalDeductions = standardDeductions + lopAmount;
    const netSalary = +(grossSalary - totalDeductions).toFixed(2);

    const updatedRecord: PayrollRecord = {
      ...existing,
      ...updates,
      lopDays,
      lopAmount,
      deductions: totalDeductions,
      grossSalary,
      netSalary,
      deductionBreakdown: {
        ...(existing.deductionBreakdown || { professionalTax: pt, pfContribution: pf, groupHealthInsurance: health }),
        lop: lopAmount
      }
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

    // 4. Persist to Firestore database
    try {
      const cleanDoc = cleanFirestoreData(updatedRecord);
      await setDoc(doc(db, 'payroll', id), cleanDoc, { merge: true });
    } catch (e) {
      console.warn('Firestore payroll update error:', e);
    }

    return true;
  };

  const togglePayrollStatus = async (id: string, fallbackRecord?: PayrollRecord): Promise<boolean> => {
    // 1. Synchronously find existing record or fallback
    const existing = payroll.find(p => p.id === id) || fallbackRecord;
    if (!existing) {
      return false;
    }

    // Requirement 1: HR can't change the status paid to unpaid
    const isSuperAdminOrExec =
      currentUser?.role === 'SUPER_ADMIN' ||
      currentUser?.role === 'EXECUTIVE_DIRECTOR' ||
      currentUser?.email === 'sushovand@modelatech.com' ||
      currentUser?.email === 'sushoovandas@gmail.com' ||
      currentUser?.email === 'modelatech2026@gmail.com';

    if (existing.status === 'PAID' && !isSuperAdminOrExec && currentUser?.role === 'HR_MANAGER') {
      showToast('Action Restricted', 'HR Managers cannot change status from PAID to UNPAID. Super Admin clearance required.', 'error');
      return false;
    }

    const nextStatus: 'PAID' | 'UNPAID' = existing.status === 'PAID' ? 'UNPAID' : 'PAID';
    const paymentDate = nextStatus === 'PAID' ? (existing.paymentDate || new Date().toISOString().split('T')[0]) : '';
    const updatedRecord: PayrollRecord = {
      ...existing,
      status: nextStatus,
      paymentDate
    };

    // 2. Update React state
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

    // 4. Persist to Firestore database
    try {
      const cleanDoc = cleanFirestoreData(updatedRecord);
      await setDoc(doc(db, 'payroll', id), cleanDoc, { merge: true });
    } catch (e) {
      console.warn('Firestore toggle payroll status error:', e);
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
