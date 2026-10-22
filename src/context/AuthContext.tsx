import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { getDeletedRegistry, recordDeletedRecord, isRecordDeleted } from '../utils/syncRegistry';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  pendingUsers: User[];
  approvedUsers: User[];
  isSuperAdmin: boolean;
  isExecutiveDirector: boolean;
  isHRManager: boolean;
  isEmployee: boolean;
  hasFullAccess: boolean;
  isAdmin: boolean;
  isHR: boolean;
  loginAs: (email: string) => boolean;
  logout: () => void;
  submitSignupRequest: (data: { email: string; name?: string; department?: string; designation?: string }) => { success: boolean; message: string; user?: User; employee?: any };
  approveUserRequest: (userId: string, role?: UserRole, remarks?: string) => Promise<boolean>;
  rejectUserRequest: (userId: string, reason?: string) => Promise<boolean>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<boolean>;
  updateUserFromEmployee: (empId: string, email?: string, updates?: { name?: string; department?: string; designation?: string }) => void;
  deleteUser: (userId: string) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USERS = 'modela_users_v2';
const STORAGE_KEY_ACTIVE_USER = 'modela_active_user_email_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.filter(u => !isRecordDeleted(u.id, u.uid, u.email, u.employeeId));
          try {
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(sanitized));
          } catch {}
          return sanitized;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_USERS.filter(u => !isRecordDeleted(u.id, u.uid, u.email, u.employeeId));
  });

  const [currentEmail, setCurrentEmail] = useState<string | null>(() => {
    try {
      // Clear any legacy persistent auto-login so website opening always takes mail ID
      localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
      const sessionSaved = sessionStorage.getItem('modela_active_session_email');
      if (sessionSaved && !isRecordDeleted(sessionSaved)) {
        return sessionSaved;
      }
    } catch {
      // fallback
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Cross-context deletion sync: remove user when deleted from Employees page
  useEffect(() => {
    const handleUserDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string; employeeId?: string; email?: string }>;
      const { id, employeeId, email } = customEvent.detail || {};
      setUsers(prev => {
        const next = prev.filter(u => {
          if (id && (u.id === id || u.uid === id)) return false;
          if (employeeId && u.employeeId && u.employeeId.toLowerCase() === employeeId.toLowerCase()) return false;
          if (email && u.email && u.email.toLowerCase() === email.toLowerCase()) return false;
          return true;
        });
        try {
          localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(next));
        } catch {}
        return next;
      });
    };
    window.addEventListener('modela_user_deleted', handleUserDeleted);
    return () => window.removeEventListener('modela_user_deleted', handleUserDeleted);
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      const sanitized = users.filter(u => !isRecordDeleted(u.id, u.uid, u.email, u.employeeId));
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(sanitized));
    } catch (e) {
      console.warn('Failed saving users to localStorage:', e);
    }
  }, [users]);

  // Session-bound active user email (resets on browser/tab reopen)
  useEffect(() => {
    try {
      if (currentEmail) {
        sessionStorage.setItem('modela_active_session_email', currentEmail);
      } else {
        sessionStorage.removeItem('modela_active_session_email');
      }
    } catch (e) {
      console.warn('Failed saving active session email:', e);
    }
  }, [currentEmail]);

  // Real-time Firestore synchronization across all browsers and devices
  useEffect(() => {
    let isSubscribed = true;

    const unsub = onSnapshot(
      collection(db, 'users'),
      async snapshot => {
        if (!isSubscribed) return;

        // If Firestore users collection is completely empty, initialize it with default seed users
        if (snapshot.empty) {
          try {
            for (const u of INITIAL_USERS) {
              if (!isRecordDeleted(u.id, u.uid, u.email, u.employeeId)) {
                await setDoc(doc(db, 'users', u.id), u);
              }
            }
          } catch (err) {
            console.warn('Initial Firestore seeding notice:', err);
          }
          return;
        }

        const remoteList: User[] = [];
        snapshot.forEach(docSnap => {
          const item = docSnap.data() as User;
          if (item && item.id && !isRecordDeleted(item.id, item.uid, item.email, item.employeeId)) {
            remoteList.push(item);
          }
        });

        const map = new Map<string, User>();
        // Ensure default accounts exist if not deleted
        INITIAL_USERS.filter(u => !isRecordDeleted(u.id, u.uid, u.email, u.employeeId)).forEach(u => {
          map.set(u.email.toLowerCase(), u);
        });
        // Override and add real-time remote accounts & requests from Firestore
        remoteList.forEach(u => {
          map.set(u.email.toLowerCase(), { ...map.get(u.email.toLowerCase()), ...u });
        });

        const updatedUsers = Array.from(map.values());
        setUsers(updatedUsers);
        try {
          localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
        } catch {}
      },
      error => {
        console.warn('Firestore real-time sync notification:', error);
      }
    );

    return () => {
      isSubscribed = false;
      unsub();
    };
  }, []);

  // Sync with backend API if available
  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data?.users && Array.isArray(data.users)) {
          setUsers(prev => {
            const map = new Map<string, User>();
            prev
              .filter(u => !isRecordDeleted(u.id, u.uid, u.email, u.employeeId))
              .forEach(u => map.set(u.email.toLowerCase(), u));
            data.users
              .filter((u: User) => !isRecordDeleted(u.id, u.uid, u.email, u.employeeId))
              .forEach((u: User) => map.set(u.email.toLowerCase(), { ...map.get(u.email.toLowerCase()), ...u }));
            return Array.from(map.values());
          });
        }
      }
    } catch {
      // ignore network errors in pure client mode
    }
  }, []);

  const currentUser = users.find(u => u.email.toLowerCase() === currentEmail?.toLowerCase() && u.status === 'APPROVED') || null;

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isExecutiveDirector = currentUser?.role === 'EXECUTIVE_DIRECTOR';
  const isHRManager = currentUser?.role === 'HR_MANAGER';
  const isEmployee = currentUser?.role === 'EMPLOYEE';
  // Employee will have limited access and other roles will have all access
  const hasFullAccess = isSuperAdmin || isExecutiveDirector || isHRManager;
  const isAdmin = hasFullAccess;
  const isHR = isHRManager;

  const pendingUsers = users.filter(u => u.status === 'PENDING');
  const approvedUsers = users.filter(u => u.status === 'APPROVED');

  const loginAs = (email: string): boolean => {
    const target = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (target) {
      if (target.status !== 'APPROVED') {
        return false;
      }
      setCurrentEmail(target.email);
      try {
        sessionStorage.setItem('modela_active_session_email', target.email);
      } catch {}
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentEmail(null);
    try {
      sessionStorage.removeItem('modela_active_session_email');
      localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
    } catch {}
  };

  const getNextEmpId = (): string => {
    let maxNum = 6;
    try {
      const saved = localStorage.getItem('modela_employees_v2');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          list.forEach((e: any) => {
            const m = String(e.id || '').match(/^MOD0*(\d+)$/i);
            if (m) {
              const val = parseInt(m[1], 10);
              if (val > maxNum) maxNum = val;
            }
          });
        }
      }
    } catch {}
    users.forEach(u => {
      const m = String(u.employeeId || '').match(/^MOD0*(\d+)$/i);
      if (m) {
        const val = parseInt(m[1], 10);
        if (val > maxNum) maxNum = val;
      }
    });
    return `MOD${String(maxNum + 1).padStart(3, '0')}`;
  };

  // Requirement: Request of sign up from new mail id will only be accepted by Super Admin or HR or Executive Director and it will show in User management page.
  // If accepted only then added to Employees page and will get access like Employees role get.
  const submitSignupRequest = (data: { email: string; name?: string; department?: string; designation?: string }) => {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (existing) {
      if (existing.status === 'APPROVED') {
        setCurrentEmail(cleanEmail);
        return {
          success: true,
          isPending: false,
          message: 'Account verified. Signed in as Employee.',
          user: existing
        };
      } else {
        // Pending approval by Super Admin, Executive Director, or HR Manager
        return {
          success: true,
          isPending: true,
          message: 'Your sign-up verification request is already pending review in User Management.',
          user: existing
        };
      }
    }

    // 1. Create User with status: PENDING so it shows in User Management page
    // It will ONLY be accepted by Super Admin or HR or Executive Director
    const newUser: User = {
      id: `USR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      uid: `USR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      name: (data.name || '').trim(), // Full applicant name
      email: cleanEmail,
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent((data.name || '').trim() || cleanEmail)}&background=0284c7&color=fff`,
      status: 'PENDING', // PENDING review in User Management!
      role: null, // Assigned EMPLOYEE once accepted by Super Admin, Executive Director, or HR Manager
      department: data.department || 'General Staff',
      designation: data.designation || 'Staff Candidate',
      requestedAt: new Date().toISOString(),
      notificationUnread: true
    };

    // Add user to state so it appears in User Management page
    setUsers(prev => [newUser, ...prev]);

    // Persist to Firestore so every browser & device receives it immediately in real-time!
    setDoc(doc(db, 'users', newUser.id), newUser).catch(err => {
      console.warn('Firestore user request write notice:', err);
    });

    // Send to backend API
    fetch('/api/users/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    }).catch(() => {});

    return {
      success: true,
      isPending: true,
      message: 'Sign-up request submitted. It will show in User Management for Super Admin, Executive Director, or HR Manager approval.',
      user: newUser
    };
  };

  // Called when Super Admin, Executive Director, or HR Manager accepts a request
  const approveUserRequest = async (userId: string, role: UserRole = 'EMPLOYEE', remarks?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const reviewer = currentUser?.email || 'Administrator';

      // Find target user immediately and deterministically before scheduling state update
      const targetUser = users.find(u => u.id === userId || u.uid === userId);
      const nextEmpId = targetUser?.employeeId || getNextEmpId();
      const targetEmail = targetUser?.email || '';
      const targetEmpId = nextEmpId;
      const targetName = targetUser?.name || '';
      const targetDept = targetUser?.department || 'General Staff';
      const targetDesig = targetUser?.designation || 'Staff Associate';

      const updatedUser: User = targetUser
        ? {
            ...targetUser,
            status: 'APPROVED',
            role,
            employeeId: targetEmpId,
            reviewedAt: now,
            reviewedBy: reviewer,
            statusUpdatedAt: now,
            notificationUnread: false,
            remarks: remarks || `Accepted & Approved by ${reviewer} with role ${role}`
          }
        : {
            id: userId,
            uid: userId,
            name: targetName,
            email: targetEmail,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(targetEmail)}&background=0284c7&color=fff`,
            status: 'APPROVED',
            role,
            employeeId: targetEmpId,
            reviewedAt: now,
            reviewedBy: reviewer,
            statusUpdatedAt: now,
            notificationUnread: false,
            remarks: remarks || `Accepted & Approved by ${reviewer} with role ${role}`
          };

      // Update user state
      setUsers(prev =>
        prev.map(u => (u.id === userId || u.uid === userId ? updatedUser : u))
      );

      // Persist user approval to Firestore
      setDoc(doc(db, 'users', targetUser ? targetUser.id : userId), updatedUser).catch(err => {
        console.warn('Firestore approve write error:', err);
      });

      // Immediately create and add to Employees page directory
      if (targetEmail) {
        try {
          const saved = localStorage.getItem('modela_employees_v2');
          const list = saved ? JSON.parse(saved) : [];
          if (!list.some((e: any) => e.id?.toLowerCase() === targetEmpId.toLowerCase() || e.email?.toLowerCase() === targetEmail.toLowerCase())) {
            const nameParts = targetName.trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            const newEmp = {
              id: targetEmpId,
              firstName: firstName,
              lastName: lastName,
              joiningDate: new Date().toISOString().split('T')[0],
              phone: '',
              email: targetEmail,
              designation: targetDesig,
              department: targetDept,
              status: 'ACTIVE' as const,
              location: 'San Francisco HQ',
              compensation: { basic: 50000, allowances: 15000 },
              avatar: targetUser?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetEmail)}&background=0284c7&color=fff`
            };

            const updatedList = [newEmp, ...list];
            localStorage.setItem('modela_employees_v2', JSON.stringify(updatedList));

            // Persist new employee to Firestore
            setDoc(doc(db, 'employees', targetEmpId), newEmp).catch(err => {
              console.warn('Firestore employee creation error:', err);
            });

            // Dispatch event for AppContext
            window.dispatchEvent(new CustomEvent('modela_employee_added', { detail: newEmp }));

            fetch('/api/employees', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newEmp)
            }).catch(() => {});
          }
        } catch (e) {
          console.warn('Failed saving accepted employee:', e);
        }
      }

      // Call API
      fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role, reviewer, remarks, employeeId: targetEmpId })
      }).catch(() => {});

      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserFromEmployee = (empId: string, email?: string, updates?: { name?: string; department?: string; designation?: string }) => {
    setUsers(prev =>
      prev.map(u => {
        const isMatch = (u.employeeId && u.employeeId === empId) || (email && u.email?.toLowerCase() === email.toLowerCase());
        if (isMatch) {
          const updated = {
            ...u,
            ...(updates?.name !== undefined ? { name: updates.name } : {}),
            ...(updates?.department !== undefined ? { department: updates.department } : {}),
            ...(updates?.designation !== undefined ? { designation: updates.designation } : {})
          };
          setDoc(doc(db, 'users', u.id), updated).catch(() => {});
          return updated;
        }
        return u;
      })
    );
  };

  const rejectUserRequest = async (userId: string, reason?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const reviewer = currentUser?.email || 'System Super Admin';

      setUsers(prev =>
        prev.map(u => {
          if (u.id === userId || u.uid === userId) {
            const updated = {
              ...u,
              status: 'REJECTED' as const,
              reviewedAt: now,
              reviewedBy: reviewer,
              statusUpdatedAt: now,
              notificationUnread: false,
              remarks: reason || 'Access request rejected by security policy'
            };
            setDoc(doc(db, 'users', u.id), updated).catch(() => {});
            return updated;
          }
          return u;
        })
      );

      fetch('/api/users/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reviewer, reason })
      }).catch(() => {});

      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole): Promise<boolean> => {
    setIsLoading(true);
    try {
      setUsers(prev =>
        prev.map(u => {
          if (u.id === userId || u.uid === userId) {
            const updated = { ...u, role: newRole };
            setDoc(doc(db, 'users', u.id), updated).catch(() => {});
            return updated;
          }
          return u;
        })
      );

      fetch('/api/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole })
      }).catch(() => {});

      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const target = users.find(
        u => u.id === userId || u.uid === userId || (u.email && u.email.toLowerCase() === userId.toLowerCase())
      );
      const targetEmail = target?.email;
      const targetEmpId = target?.employeeId;

      // Record in persistent deleted registry so it cannot be resurrected
      recordDeletedRecord(userId, target?.id, target?.uid, targetEmail, targetEmpId);

      // Delete from Firestore
      deleteDoc(doc(db, 'users', userId)).catch(() => {});
      if (target?.id && target.id !== userId) {
        deleteDoc(doc(db, 'users', target.id)).catch(() => {});
      }
      if (targetEmpId) {
        deleteDoc(doc(db, 'employees', targetEmpId)).catch(() => {});
      }

      // Remove from users state and localStorage
      setUsers(prev => {
        const next = prev.filter(
          u =>
            u.id !== userId &&
            u.uid !== userId &&
            (!targetEmail || u.email?.toLowerCase() !== targetEmail.toLowerCase()) &&
            (!targetEmpId || u.employeeId?.toLowerCase() !== targetEmpId.toLowerCase())
        );
        try {
          localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(next));
        } catch {}
        return next;
      });

      // Directly prune from employees localStorage
      try {
        const empsSaved = localStorage.getItem('modela_employees_v2');
        if (empsSaved) {
          const emps = JSON.parse(empsSaved);
          const nextEmps = emps.filter(
            (e: any) =>
              (!targetEmail || e.email?.toLowerCase() !== targetEmail.toLowerCase()) &&
              (!targetEmpId || e.id?.toLowerCase() !== targetEmpId.toLowerCase()) &&
              e.id?.toLowerCase() !== userId.toLowerCase()
          );
          localStorage.setItem('modela_employees_v2', JSON.stringify(nextEmps));
        }
      } catch {}

      // Dispatch event to inform AppContext to remove from employees state immediately
      window.dispatchEvent(
        new CustomEvent('modela_employee_deleted', {
          detail: { id: targetEmpId || userId, email: targetEmail }
        })
      );

      // Call server backend APIs
      if (targetEmpId) {
        fetch(`/api/employees/${encodeURIComponent(targetEmpId)}`, { method: 'DELETE' }).catch(() => {});
      }
      fetch(`/api/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }).catch(() => {});
      if (targetEmail) {
        fetch(`/api/users/${encodeURIComponent(targetEmail)}`, { method: 'DELETE' }).catch(() => {});
      }

      return true;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        pendingUsers,
        approvedUsers,
        isSuperAdmin,
        isExecutiveDirector,
        isHRManager,
        isEmployee,
        hasFullAccess,
        isAdmin,
        isHR,
        loginAs,
        logout,
        submitSignupRequest,
        approveUserRequest,
        rejectUserRequest,
        updateUserRole,
        updateUserFromEmployee,
        deleteUser,
        refreshUsers,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
