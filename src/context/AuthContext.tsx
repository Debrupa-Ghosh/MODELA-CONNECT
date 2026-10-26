import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { User, UserRole, normalizeRole, hasFullAccessRole } from '../types';
import { INITIAL_USERS, INITIAL_EMPLOYEES } from '../data/initialData';
import {
  getDeletedRegistry,
  recordDeletedRecord,
  removeDeletedRecord,
  isRecordDeleted,
  recordCustomEmpId,
  resolveEmpId,
  SYNC_REGISTRY_DOC_ID,
  applyRemoteSyncRegistry,
  persistSyncRegistryToFirestore
} from '../utils/syncRegistry';

const cleanFirestoreUser = <T extends Record<string, any>>(obj: T): T => {
  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      result[key] = cleanFirestoreUser(val);
    } else {
      result[key] = val;
    }
  }
  return result;
};

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  pendingUsers: User[];
  approvedUsers: User[];
  isSuperAdmin: boolean;
  isDirector: boolean;
  isExecutiveDirector: boolean;
  isHRManager: boolean;
  isHR: boolean;
  isManager: boolean;
  isEmployee: boolean;
  hasFullAccess: boolean;
  isAdmin: boolean;
  loginAs: (email: string) => boolean;
  logout: () => void;
  submitSignupRequest: (data: { email: string; name?: string; department?: string; designation?: string }) => { success: boolean; message: string; user?: User; employee?: any; isPending?: boolean };
  approveUserRequest: (userId: string, role?: UserRole, remarks?: string) => Promise<boolean>;
  rejectUserRequest: (userId: string, reason?: string) => Promise<boolean>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<boolean>;
  updateUserFromEmployee: (empId: string, email?: string, updates?: { name?: string; department?: string; designation?: string }) => void;
  updateUserEmployeeId: (userIdOrEmail: string, newId: string) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USERS = 'modela_users_v2';
const STORAGE_KEY_ACTIVE_USER = 'modela_active_user_email_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    let list: User[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed
            .filter(
              u =>
                u &&
                u.id !== SYNC_REGISTRY_DOC_ID &&
                u.email !== 'sync@system.internal' &&
                !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId))
            )
            .map(u => ({
              ...u,
              employeeId: resolveEmpId(u.email, u.employeeId)
            }));
        }
      }
    } catch {}

    if (list.length === 0) {
      list = INITIAL_USERS.filter(
        u => !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId))
      ).map(u => ({
        ...u,
        employeeId: resolveEmpId(u.email, u.employeeId)
      }));
    }

    const sushoovanUser: User = {
      id: "USR-Q94BIIQ5",
      uid: "USR-Q94BIIQ5",
      name: "Sushoovan Das",
      email: "sushovand@modelatech.com",
      avatar_url: "https://ui-avatars.com/api/?name=Sushoovan+Das&background=3b82f6&color=fff",
      status: "APPROVED",
      role: "SUPER_ADMIN",
      employeeId: resolveEmpId("sushovand@modelatech.com", "MOD001") || "MOD001",
      designation: "Executive Director & Super Admin",
      department: "Executive Office",
      requestedAt: "2026-09-20T08:44:15.481Z",
      reviewedAt: "2026-09-20T08:44:35.660Z",
      reviewedBy: "System Root"
    };

    if (!isRecordDeleted('USR-Q94BIIQ5', 'sushovand@modelatech.com', 'MOD001', sushoovanUser.employeeId)) {
      const idx = list.findIndex(u => u.email?.toLowerCase() === 'sushovand@modelatech.com' || u.id === 'USR-Q94BIIQ5');
      if (idx >= 0) {
        const curStatus = list[idx].status;
        list[idx] = {
          ...sushoovanUser,
          ...list[idx],
          status: curStatus || 'APPROVED',
          role: curStatus === 'PENDING' ? (list[idx].role ?? null) : (list[idx].role || 'SUPER_ADMIN'),
          employeeId: curStatus === 'PENDING' ? list[idx].employeeId : (resolveEmpId('sushovand@modelatech.com', list[idx].employeeId || 'MOD001') || 'MOD001')
        };
      } else {
        list.unshift(sushoovanUser);
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(list));
    } catch {}
    return list;
  });

  const [currentEmail, setCurrentEmail] = useState<string | null>(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
      sessionStorage.removeItem('modela_active_session_email');
      localStorage.removeItem('modela_pending_signup_email');
    } catch {
      // ignore storage errors
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

    const handleEmployeeIdChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ oldId?: string; newId?: string; email?: string }>;
      const { oldId, newId, email } = customEvent.detail || {};
      if (newId) {
        const cleanNew = newId.trim().toUpperCase();
        recordCustomEmpId(email, oldId, cleanNew);
        const now = new Date().toISOString();
        setUsers(prev => {
          const next = prev.map(u => {
            const isMatch =
              (oldId && u.employeeId?.toUpperCase() === oldId.toUpperCase()) ||
              (email && u.email?.toLowerCase() === email.toLowerCase());
            if (isMatch) {
              recordCustomEmpId(u.email, u.employeeId, cleanNew);
              const updated = cleanFirestoreUser({ ...u, employeeId: cleanNew, updatedAt: now } as any);
              setDoc(doc(db, 'users', u.id), updated, { merge: true }).catch(() => {});
              return updated;
            }
            return u;
          });
          try {
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    };

    const handleSyncRegistryUpdated = () => {
      setUsers(prev => {
        const next = prev
          .filter(
            u =>
              u &&
              u.id !== SYNC_REGISTRY_DOC_ID &&
              u.email !== 'sync@system.internal' &&
              !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId))
          )
          .map(u => ({
            ...u,
            employeeId: resolveEmpId(u.email, u.employeeId)
          }));
        try {
          localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(next));
        } catch {}
        return next;
      });
    };

    window.addEventListener('modela_user_deleted', handleUserDeleted);
    window.addEventListener('modela_employee_id_changed', handleEmployeeIdChanged);
    window.addEventListener('modela_sync_registry_updated', handleSyncRegistryUpdated);
    return () => {
      window.removeEventListener('modela_user_deleted', handleUserDeleted);
      window.removeEventListener('modela_employee_id_changed', handleEmployeeIdChanged);
      window.removeEventListener('modela_sync_registry_updated', handleSyncRegistryUpdated);
    };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      const sanitized = users.filter(
        u =>
          u &&
          u.id !== SYNC_REGISTRY_DOC_ID &&
          u.email !== 'sync@system.internal' &&
          !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId))
      );
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(sanitized));
    } catch (e) {
      console.warn('Failed saving users to localStorage:', e);
    }
  }, [users]);

  // Real-time Firestore synchronization across all browsers and devices
  useEffect(() => {
    let isSubscribed = true;

    [
      'USR-HR-MGR01',
      'USR-SUPERADMIN-01',
      'USR-SUSHOOVAN-GMAIL',
      'USR-OBOPA1GQ',
      'USR-ADITI-008',
      'REQ-modelatech2026_gmail_com',
      'REQ-sushoovandas_gmail_com',
      'REQ-ghoshdebrupa005_gmail_com',
      'REQ-aditichakraborty2005_gmail_com',
      'REQ-aditichakrabarty2005_gmail_com'
    ].forEach(removedDocId => {
      deleteDoc(doc(db, 'users', removedDocId)).catch(() => {});
    });

    const unsub = onSnapshot(
      collection(db, 'users'),
      async snapshot => {
        if (!isSubscribed) return;

        // If Firestore users collection is completely empty, initialize it with default seed users
        if (snapshot.empty) {
          try {
            for (const u of INITIAL_USERS) {
              if (!isRecordDeleted(u.id, u.uid, u.email)) {
                await setDoc(doc(db, 'users', u.id), cleanFirestoreUser({
                  ...u,
                  employeeId: resolveEmpId(u.email, u.employeeId)
                }));
              }
            }
          } catch (err) {
            console.warn('Initial Firestore seeding notice:', err);
          }
          return;
        }

        // First pass: apply global sync registry document if present so deletions/EMP IDs are synced before filtering
        snapshot.forEach(docSnap => {
          const raw = docSnap.data();
          if (docSnap.id === SYNC_REGISTRY_DOC_ID || raw?.id === SYNC_REGISTRY_DOC_ID || raw?.isSystemSync) {
            applyRemoteSyncRegistry(raw);
          }
        });

        const remoteList: User[] = [];
        snapshot.forEach(docSnap => {
          const item = docSnap.data() as User;
          if (!item || !item.id || !item.email) return;
          if (docSnap.id === SYNC_REGISTRY_DOC_ID || item.id === SYNC_REGISTRY_DOC_ID || item.email === 'sync@system.internal' || (item as any).isSystemSync) {
            return;
          }
          const lowerName = (item.name || '').trim().toLowerCase();
          const lowerEmail = (item.email || '').trim().toLowerCase();
          const upperEmpId = (item.employeeId || '').trim().toUpperCase();
          if (
            (lowerName.includes('tony') && lowerName.includes('stark')) ||
            lowerName === 'tony stark' ||
            lowerName.includes('marcus vance') ||
            lowerName.includes('sourav ganguly') ||
            lowerName.includes('pooja sharma') ||
            lowerEmail.includes('tonystark') ||
            lowerEmail.includes('tony.stark') ||
            lowerEmail === 'marcus.vance@modela.io' ||
            lowerEmail === 'sourav.ganguly@modela.io' ||
            lowerEmail === 'pooja.sharma@modela.io' ||
            lowerEmail === 'modelatech2026@gmail.com' ||
            lowerEmail === 'sushoovandas@gmail.com' ||
            lowerEmail === 'ghoshdebrupa005@gmail.com' ||
            lowerEmail === 'aditichakraborty2005@gmail.com' ||
            lowerEmail === 'aditichakrabarty2005@gmail.com' ||
            upperEmpId === 'MOD000' ||
            upperEmpId === 'MOD101' ||
            upperEmpId === 'MOD003' ||
            upperEmpId === 'MOD005' ||
            upperEmpId === 'MOD006' ||
            upperEmpId === 'MOD007' ||
            upperEmpId === 'MOD008' ||
            upperEmpId === 'MOD102' ||
            isRecordDeleted(docSnap.id, item.id, item.uid, item.email, item.employeeId, resolveEmpId(item.email, item.employeeId))
          ) {
            deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
            return;
          }
          remoteList.push(item);
        });

        const map = new Map<string, User>();
        // Ensure default accounts exist ONLY if not deleted
        INITIAL_USERS.filter(
          u => !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId))
        ).forEach(u => {
          const emailKey = u.email.toLowerCase().trim();
          map.set(emailKey, {
            ...u,
            employeeId: resolveEmpId(emailKey, u.employeeId)
          });
        });

        // Override and add real-time remote accounts & requests from Firestore
        remoteList.forEach(u => {
          const emailKey = u.email.toLowerCase().trim();
          if (isRecordDeleted(u.id, u.uid, emailKey, u.employeeId, resolveEmpId(emailKey, u.employeeId))) {
            return;
          }
          const existing = map.get(emailKey);
          const uUpdatedAt = (u as any).updatedAt || '';
          const exUpdatedAt = existing ? ((existing as any).updatedAt || '') : '';

          if (uUpdatedAt && u.employeeId) {
            recordCustomEmpId(emailKey, undefined, u.employeeId);
          }

          if (!existing || uUpdatedAt >= exUpdatedAt) {
            const resolvedId = uUpdatedAt && u.employeeId
              ? u.employeeId.trim().toUpperCase()
              : resolveEmpId(emailKey, u.employeeId || existing?.employeeId);
            map.set(emailKey, {
              ...(existing || {}),
              ...u,
              employeeId: resolvedId
            });
          } else {
            const resolvedId = resolveEmpId(emailKey, existing.employeeId || u.employeeId);
            map.set(emailKey, {
              ...u,
              ...existing,
              employeeId: resolvedId
            });
          }
        });

        // Ensure Sushoovan Das is present in users map if not deleted (preserving PENDING status if re-applying)
        if (!isRecordDeleted('USR-Q94BIIQ5', 'sushovand@modelatech.com', 'MOD001', resolveEmpId('sushovand@modelatech.com', 'MOD001'))) {
          const sushoovanUser: User = {
            id: "USR-Q94BIIQ5",
            uid: "USR-Q94BIIQ5",
            name: "Sushoovan Das",
            email: "sushovand@modelatech.com",
            avatar_url: "https://ui-avatars.com/api/?name=Sushoovan+Das&background=3b82f6&color=fff",
            status: "APPROVED",
            role: "SUPER_ADMIN",
            employeeId: "MOD001",
            designation: "Executive Director & Super Admin",
            department: "Executive Office",
            requestedAt: "2026-09-20T08:44:15.481Z",
            reviewedAt: "2026-09-20T08:44:35.660Z",
            reviewedBy: "System Root"
          };
          const curSushoovan = map.get('sushovand@modelatech.com');
          const curStatus = curSushoovan?.status;
          map.set('sushovand@modelatech.com', {
            ...sushoovanUser,
            ...(curSushoovan || {}),
            status: curStatus || 'APPROVED',
            role: curStatus === 'PENDING' ? (curSushoovan?.role ?? null) : (curSushoovan?.role || 'SUPER_ADMIN'),
            employeeId: curStatus === 'PENDING' ? curSushoovan?.employeeId : (resolveEmpId('sushovand@modelatech.com', curSushoovan?.employeeId || 'MOD001') || 'MOD001'),
            name: curSushoovan?.name || 'Sushoovan Das',
            designation: curSushoovan?.designation || 'Executive Director & Super Admin'
          });
        }

        const updatedUsers = Array.from(map.values()).filter(
          u =>
            u &&
            u.id !== SYNC_REGISTRY_DOC_ID &&
            u.email !== 'sync@system.internal' &&
            !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId))
        );
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

  // Refresh Registry: sync directly with Firestore users & employees so deleted users never come back and edited EMP IDs never vanish
  const refreshUsers = useCallback(async () => {
    try {
      const [userSnap, empSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'employees'))
      ]);

      // 1. Apply global sync registry document first so all deletions & EMP ID overrides are up to date
      userSnap.forEach(docSnap => {
        const raw = docSnap.data();
        if (docSnap.id === SYNC_REGISTRY_DOC_ID || raw?.id === SYNC_REGISTRY_DOC_ID || raw?.isSystemSync) {
          applyRemoteSyncRegistry(raw);
        }
      });

      // 2. Build authoritative email -> employeeId map from Firestore employees collection (cleaning up any deleted ones)
      const empEmailToId = new Map<string, { id: string; updatedAt: string }>();
      empSnap.forEach(docSnap => {
        const eData = docSnap.data();
        if (!eData || !eData.id) return;
        if (isRecordDeleted(docSnap.id, eData.id, eData.email, resolveEmpId(eData.email, eData.id))) {
          deleteDoc(doc(db, 'employees', docSnap.id)).catch(() => {});
          return;
        }
        if (eData.email) {
          const emailKey = String(eData.email).toLowerCase().trim();
          const cur = empEmailToId.get(emailKey);
          const eUpdatedAt = String(eData.updatedAt || '');
          const cleanId = String(eData.id).trim().toUpperCase();
          if (eUpdatedAt) {
            recordCustomEmpId(emailKey, undefined, cleanId);
          }
          if (!cur || eUpdatedAt >= cur.updatedAt) {
            empEmailToId.set(emailKey, { id: cleanId, updatedAt: eUpdatedAt });
          }
        }
      });

      // 3. Collect valid live users from Firestore (cleaning up any deleted ones)
      const remoteUsers: User[] = [];
      userSnap.forEach(docSnap => {
        const uData = docSnap.data() as User;
        if (!uData || !uData.id || !uData.email) return;
        if (docSnap.id === SYNC_REGISTRY_DOC_ID || uData.id === SYNC_REGISTRY_DOC_ID || uData.email === 'sync@system.internal' || (uData as any).isSystemSync) {
          return;
        }
        if (isRecordDeleted(docSnap.id, uData.id, uData.uid, uData.email, uData.employeeId, resolveEmpId(uData.email, uData.employeeId))) {
          deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
          return;
        }
        remoteUsers.push(uData);
      });

      const map = new Map<string, User>();

      INITIAL_USERS.filter(
        u => !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId))
      ).forEach(u => {
        const emailKey = u.email.toLowerCase().trim();
        map.set(emailKey, {
          ...u,
          employeeId: resolveEmpId(emailKey, u.employeeId)
        });
      });

      remoteUsers.forEach(u => {
        const emailKey = u.email.toLowerCase().trim();
        if (isRecordDeleted(u.id, u.uid, emailKey, u.employeeId, resolveEmpId(emailKey, u.employeeId))) {
          return;
        }
        const existing = map.get(emailKey);
        const uUpdatedAt = (u as any).updatedAt || '';
        const exUpdatedAt = existing ? ((existing as any).updatedAt || '') : '';
        if (uUpdatedAt && u.employeeId) {
          recordCustomEmpId(emailKey, undefined, u.employeeId);
        }
        if (!existing || uUpdatedAt >= exUpdatedAt) {
          map.set(emailKey, {
            ...(existing || {}),
            ...u,
            employeeId: resolveEmpId(emailKey, u.employeeId || existing?.employeeId)
          });
        }
      });

      // Reconcile with Firestore employees collection and custom EMP ID registry
      map.forEach((u, emailKey) => {
        const empEntry = empEmailToId.get(emailKey);
        const resolved = resolveEmpId(emailKey, empEntry?.id || u.employeeId);
        if (resolved && u.employeeId !== resolved) {
          map.set(emailKey, { ...u, employeeId: resolved });
        }
      });

      const nextList = Array.from(map.values()).filter(
        u =>
          u &&
          u.id !== SYNC_REGISTRY_DOC_ID &&
          u.email !== 'sync@system.internal' &&
          !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId))
      );
      setUsers(nextList);
      try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(nextList));
      } catch {}

      // Notify AppContext so Employees directory is also immediately synced and pruned
      window.dispatchEvent(new CustomEvent('modela_sync_registry_updated'));
    } catch (err) {
      console.warn('Refresh users sync notice:', err);
    }
  }, []);

  const currentUser = React.useMemo(() => {
    if (!currentEmail) return null;
    const clean = currentEmail.toLowerCase().trim();
    if (isRecordDeleted(clean)) return null;
    // 1. Live state lookup (if user exists in users state, strictly honor their status!)
    const userEntry = users.find(u => u.email.toLowerCase() === clean);
    if (userEntry) {
      return userEntry.status === 'APPROVED' ? userEntry : null;
    }
    // 2. Initial static dataset fallback during rehydration
    const initialFound = INITIAL_USERS.find(u => u.email.toLowerCase() === clean && u.status === 'APPROVED');
    if (initialFound && !isRecordDeleted(initialFound.id, initialFound.email, initialFound.employeeId)) return initialFound;
    return null;
  }, [users, currentEmail]);

  const normRole = currentUser?.role ? normalizeRole(currentUser.role) : 'EMPLOYEE';
  const isSuperAdmin = normRole === 'SUPER_ADMIN';
  const isDirector = normRole === 'DIRECTOR';
  const isExecutiveDirector = isDirector;
  const isHR = normRole === 'HR';
  const isHRManager = isHR;
  const isManager = normRole === 'MANAGER';
  const isEmployee = normRole === 'EMPLOYEE';

  // Super Admin, Director, HR, and Manager have full access; Employee only has access to Dashboard, Requests, and Settings
  const hasFullAccess = Boolean(isSuperAdmin || isDirector || isHR || isManager);
  const isAdmin = hasFullAccess;

  const pendingUsers = users.filter(u => u.status === 'PENDING');
  const approvedUsers = users.filter(u => u.status === 'APPROVED');

  const loginAs = (email: string): boolean => {
    const clean = email.toLowerCase().trim();
    if (isRecordDeleted(clean)) return false;
    const target = users.find(u => u.email.toLowerCase() === clean);

    if (target) {
      if (target.status !== 'APPROVED') {
        return false;
      }
      setCurrentEmail(target.email);
      try {
        localStorage.removeItem('modela_pending_signup_email');
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
      localStorage.removeItem('modela_pending_signup_email');
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
          message: 'Account verified. Signed in.',
          user: existing
        };
      } else if (existing.status === 'PENDING') {
        // Pending approval by Super Admin, Executive Director, or HR Manager
        return {
          success: true,
          isPending: true,
          message: 'Your sign-up verification request is already pending review in User Management.',
          user: existing
        };
      }
    }

    // If this user was previously deleted from the Approved Users Directory, unblock their email & IDs
    // so their new sign-up request can be stored and reviewed in User Management
    const initialMatch = INITIAL_USERS.find(u => u.email.toLowerCase() === cleanEmail);
    const resolvedInitialEmpId = resolveEmpId(cleanEmail, initialMatch?.employeeId);
    const reqDocId = `REQ-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    removeDeletedRecord(
      cleanEmail,
      initialMatch?.id,
      initialMatch?.uid,
      initialMatch?.employeeId,
      resolvedInitialEmpId,
      reqDocId
    );

    const now = new Date().toISOString();
    const userId = initialMatch?.id || existing?.id || `USR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const applicantName = (data.name || initialMatch?.name || '').trim() || cleanEmail;

    // 1. Create User with status: PENDING so it shows in User Management page
    // It will ONLY be accepted by Super Admin or HR or Executive Director
    const newUser: User = {
      id: userId,
      uid: userId,
      name: applicantName,
      email: cleanEmail,
      avatar_url: initialMatch?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(applicantName)}&background=0284c7&color=fff`,
      status: 'PENDING', // PENDING review in User Management!
      role: null,
      department: data.department || initialMatch?.department || 'General Staff',
      designation: data.designation || initialMatch?.designation || 'Staff Candidate',
      requestedAt: now,
      notificationUnread: true,
      ...({ updatedAt: now } as any)
    };

    // Add user to state so it appears in User Management page immediately
    setUsers(prev => [newUser, ...prev.filter(u => u.email.toLowerCase() !== cleanEmail && u.id !== userId)]);

    const cleanedNewUser = cleanFirestoreUser(newUser);

    // Persist to Firestore so every browser & device receives it immediately in real-time!
    setDoc(doc(db, 'users', newUser.id), cleanedNewUser, { merge: true }).catch(err => {
      console.warn('Firestore user request write notice:', err);
    });

    // Also persist with email key if needed for direct lookups
    if (cleanEmail) {
      setDoc(doc(db, 'users', reqDocId), cleanedNewUser, { merge: true }).catch(() => {});
    }

    // Send to backend API
    fetch('/api/users/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanedNewUser)
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
      const targetEmail = (targetUser?.email || '').trim().toLowerCase();
      const initialMatch = INITIAL_USERS.find(u => u.email.toLowerCase() === targetEmail);
      const nextEmpId = targetUser?.employeeId || resolveEmpId(targetEmail, initialMatch?.employeeId) || getNextEmpId();
      const targetEmpId = nextEmpId;
      const targetName = targetUser?.name || initialMatch?.name || '';
      const targetDept = targetUser?.department || initialMatch?.department || 'General Staff';
      const targetDesig = targetUser?.designation || initialMatch?.designation || 'Staff Associate';
      const finalRole: UserRole = targetEmail === 'sushovand@modelatech.com' && role === 'EMPLOYEE' ? 'SUPER_ADMIN' : role;

      removeDeletedRecord(targetEmail, targetEmpId, userId, targetUser?.id, initialMatch?.id);

      const updatedUser: User = targetUser
        ? {
            ...targetUser,
            status: 'APPROVED',
            role: finalRole,
            employeeId: targetEmpId,
            reviewedAt: now,
            reviewedBy: reviewer,
            statusUpdatedAt: now,
            notificationUnread: false,
            remarks: remarks || `Accepted & Approved by ${reviewer} with role ${finalRole}`,
            ...({ updatedAt: now } as any)
          }
        : {
            id: userId,
            uid: userId,
            name: targetName,
            email: targetEmail,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(targetEmail)}&background=0284c7&color=fff`,
            status: 'APPROVED',
            role: finalRole,
            employeeId: targetEmpId,
            reviewedAt: now,
            reviewedBy: reviewer,
            statusUpdatedAt: now,
            notificationUnread: false,
            remarks: remarks || `Accepted & Approved by ${reviewer} with role ${finalRole}`,
            ...({ updatedAt: now } as any)
          };

      // Update user state
      setUsers(prev =>
        prev.map(u => (u.id === userId || u.uid === userId || (targetEmail && u.email?.toLowerCase() === targetEmail.toLowerCase()) ? updatedUser : u))
      );

      // Persist user approval to Firestore with merge: true
      const primaryDocId = targetUser ? targetUser.id : userId;
      try {
        await setDoc(doc(db, 'users', primaryDocId), updatedUser, { merge: true });
        
        // Also ensure any duplicate or alternate document IDs with this email in Firestore are updated
        if (targetEmail) {
          await setDoc(doc(db, 'users', `REQ-${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`), updatedUser, { merge: true });
          const userQuery = query(collection(db, 'users'), where('email', '==', targetEmail));
          const querySnap = await getDocs(userQuery);
          for (const d of querySnap.docs) {
            if (d.id !== primaryDocId) {
              await setDoc(doc(db, 'users', d.id), updatedUser, { merge: true });
            }
          }
        }
      } catch (err) {
        console.warn('Firestore approve write error:', err);
      }

      // Immediately create and add to Employees page directory and Payroll page (Jan-Oct PAID, Nov-Dec UNPAID)
      if (targetEmail) {
        try {
          const saved = localStorage.getItem('modela_employees_v2');
          const list = saved ? JSON.parse(saved) : [];
          const nameParts = (targetName || targetEmail.split('@')[0]).trim().split(/\s+/);
          const firstName = nameParts[0] || 'Staff';
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
            avatar: targetUser?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName || targetEmail)}&background=0284c7&color=fff`
          };

          const filteredList = Array.isArray(list)
            ? list.filter((e: any) => e && e.id?.toLowerCase() !== targetEmpId.toLowerCase() && e.email?.toLowerCase() !== targetEmail.toLowerCase())
            : [];
          const updatedList = [newEmp, ...filteredList];
          localStorage.setItem('modela_employees_v2', JSON.stringify(updatedList));

          // Persist new employee to Firestore
          await setDoc(doc(db, 'employees', targetEmpId), newEmp, { merge: true });

          // Automatically generate and persist payroll records for Jan to Oct (PAID) and Nov to Dec (UNPAID)
          const allMonths = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          const fullName = `${firstName} ${lastName}`.trim() || targetEmpId;
          const payrollYear = 2026;
          const basic = 50000;
          const totalAllowances = 15000;
          const standardDeductions = 3700;
          const grossSalary = basic + totalAllowances;
          const netSalary = grossSalary - standardDeductions;

          const newPayrollRecords = allMonths.map((m, idx) => {
            const isNovDec = m === 'November' || m === 'December';
            const status = isNovDec ? 'UNPAID' : 'PAID';
            return {
              id: `PAY-${payrollYear}-${m.substring(0, 3).toUpperCase()}-${targetEmpId}`,
              employeeId: targetEmpId,
              employeeName: fullName,
              month: m,
              year: payrollYear,
              basicSalary: basic,
              allowances: totalAllowances,
              deductions: standardDeductions,
              grossSalary,
              netSalary,
              status,
              paymentDate: status === 'PAID' ? `${payrollYear}-${String(idx + 1).padStart(2, '0')}-01` : '',
              disbursedBy: status === 'PAID' ? 'System Master Disburser' : '',
              lopDays: 0,
              lopAmount: 0,
              allowanceBreakdown: {
                hra: 6000,
                medical: 2250,
                special: 5250,
                internet: 1500
              },
              deductionBreakdown: {
                professionalTax: 200,
                pfContribution: 1800,
                groupHealthInsurance: 1700,
                lop: 0
              }
            };
          });

          await Promise.all(
            newPayrollRecords.map(rec =>
              setDoc(doc(db, 'payroll', rec.id), rec, { merge: true }).catch(() => {})
            )
          );

          // Dispatch event for AppContext
          window.dispatchEvent(new CustomEvent('modela_employee_added', { detail: newEmp }));

          fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEmp)
          }).catch(() => {});
        } catch (e) {
          console.warn('Failed saving accepted employee:', e);
        }
      }

      // Call API with email as well
      fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: targetEmail, role, reviewer, remarks, employeeId: targetEmpId })
      }).catch(() => {});

      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserFromEmployee = (empId: string, email?: string, updates?: { name?: string; department?: string; designation?: string }) => {
    const cleanId = empId.trim().toUpperCase();
    if (email) {
      recordCustomEmpId(email, undefined, cleanId);
    }
    const now = new Date().toISOString();
    setUsers(prev => {
      const next = prev.map(u => {
        const isMatch =
          (u.employeeId && u.employeeId.toUpperCase() === cleanId) ||
          (email && u.email?.toLowerCase() === email.toLowerCase());
        if (isMatch) {
          recordCustomEmpId(u.email, u.employeeId, cleanId);
          const updated = cleanFirestoreUser({
            ...u,
            employeeId: cleanId,
            updatedAt: now,
            ...(updates?.name !== undefined ? { name: updates.name } : {}),
            ...(updates?.department !== undefined ? { department: updates.department } : {}),
            ...(updates?.designation !== undefined ? { designation: updates.designation } : {})
          } as any);
          setDoc(doc(db, 'users', u.id), updated, { merge: true }).catch(() => {});
          return updated;
        }
        return u;
      });
      try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const updateUserEmployeeId = async (userIdOrEmail: string, newId: string): Promise<boolean> => {
    const cleanNew = newId.trim().toUpperCase();
    if (!cleanNew) return false;

    let targetEmail = '';
    let oldEmpId = '';
    const now = new Date().toISOString();

    setUsers(prev => {
      const next = prev.map(u => {
        const isMatch =
          u.id === userIdOrEmail ||
          u.uid === userIdOrEmail ||
          (u.email && u.email.toLowerCase() === userIdOrEmail.toLowerCase()) ||
          (u.employeeId && u.employeeId.toUpperCase() === userIdOrEmail.toUpperCase());
        if (isMatch) {
          targetEmail = u.email;
          oldEmpId = u.employeeId || '';
          recordCustomEmpId(u.email, oldEmpId, cleanNew);
          const updated = cleanFirestoreUser({ ...u, employeeId: cleanNew, updatedAt: now } as any);
          setDoc(doc(db, 'users', u.id), updated, { merge: true }).catch(() => {});
          return updated;
        }
        return u;
      });
      try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (targetEmail) {
      try {
        const userQuery = query(collection(db, 'users'), where('email', '==', targetEmail));
        const querySnap = await getDocs(userQuery);
        for (const d of querySnap.docs) {
          await setDoc(doc(db, 'users', d.id), cleanFirestoreUser({ ...d.data(), employeeId: cleanNew, updatedAt: now }), { merge: true });
        }
      } catch {}
    }

    window.dispatchEvent(
      new CustomEvent('modela_employee_id_changed', {
        detail: { oldId: oldEmpId || userIdOrEmail, newId: cleanNew, email: targetEmail }
      })
    );

    return true;
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
      const target =
        users.find(
          u =>
            u.id === userId ||
            u.uid === userId ||
            (u.email && u.email.toLowerCase() === userId.toLowerCase()) ||
            (u.employeeId && u.employeeId.toLowerCase() === userId.toLowerCase())
        ) ||
        INITIAL_USERS.find(
          u =>
            u.id === userId ||
            u.uid === userId ||
            (u.email && u.email.toLowerCase() === userId.toLowerCase()) ||
            (u.employeeId && u.employeeId.toLowerCase() === userId.toLowerCase())
        );

      const targetEmail = (target?.email || (userId.includes('@') ? userId : '')).trim().toLowerCase();
      const targetEmpId = target?.employeeId ? target.employeeId.trim().toUpperCase() : undefined;
      const resolvedEmpId = targetEmail || targetEmpId ? resolveEmpId(targetEmail, targetEmpId) : undefined;

      // Also collect any baseline IDs for this email from INITIAL_USERS and INITIAL_EMPLOYEES
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

      // 1. Record in persistent deleted registry & sync to Firestore SYNC-REGISTRY-GLOBAL so all browsers/devices know
      recordDeletedRecord(userId, target?.id, target?.uid, targetEmail, targetEmpId, resolvedEmpId, ...extraIds);
      await persistSyncRegistryToFirestore();

      const deletedKeySet = new Set(
        [userId, target?.id, target?.uid, targetEmail, targetEmpId, resolvedEmpId, ...extraIds]
          .filter(Boolean)
          .map(s => String(s).toLowerCase().trim())
      );

      // 2. Remove from users state and localStorage immediately
      setUsers(prev => {
        const next = prev.filter(
          u =>
            !deletedKeySet.has(String(u.id || '').toLowerCase().trim()) &&
            !deletedKeySet.has(String(u.uid || '').toLowerCase().trim()) &&
            !deletedKeySet.has(String(u.email || '').toLowerCase().trim()) &&
            !deletedKeySet.has(String(u.employeeId || '').toLowerCase().trim()) &&
            !isRecordDeleted(u.id, u.uid, u.email, u.employeeId)
        );
        try {
          localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(next));
        } catch {}
        return next;
      });

      // 3. Directly prune from employees localStorage
      try {
        const empsSaved = localStorage.getItem('modela_employees_v2');
        if (empsSaved) {
          const emps = JSON.parse(empsSaved);
          const nextEmps = emps.filter(
            (e: any) =>
              !deletedKeySet.has(String(e.id || '').toLowerCase().trim()) &&
              !deletedKeySet.has(String(e.email || '').toLowerCase().trim()) &&
              !isRecordDeleted(e.id, e.email)
          );
          localStorage.setItem('modela_employees_v2', JSON.stringify(nextEmps));
        }
      } catch {}

      // 4. Dispatch events to inform AppContext to remove from employees state immediately
      window.dispatchEvent(
        new CustomEvent('modela_employee_deleted', {
          detail: { id: resolvedEmpId || targetEmpId || userId, email: targetEmail }
        })
      );
      window.dispatchEvent(new CustomEvent('modela_sync_registry_updated'));

      // 5. Permanently delete all matching documents from Firestore 'users' and 'employees' collections
      try {
        const deletePromises: Promise<any>[] = [];
        deletePromises.push(deleteDoc(doc(db, 'users', userId)).catch(() => {}));
        if (target?.id && target.id !== userId) {
          deletePromises.push(deleteDoc(doc(db, 'users', target.id)).catch(() => {}));
        }
        if (targetEmail) {
          deletePromises.push(
            deleteDoc(doc(db, 'users', `REQ-${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`)).catch(() => {})
          );
        }
        if (targetEmpId) {
          deletePromises.push(deleteDoc(doc(db, 'employees', targetEmpId)).catch(() => {}));
        }
        if (resolvedEmpId && resolvedEmpId !== targetEmpId) {
          deletePromises.push(deleteDoc(doc(db, 'employees', resolvedEmpId)).catch(() => {}));
        }

        const [allUsersSnap, allEmpsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'employees'))
        ]);

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

        await Promise.all(deletePromises);
      } catch (e) {
        console.warn('Firestore user/employee delete scan notice:', e);
      }

      // 6. Call server backend APIs
      if (targetEmpId) {
        fetch(`/api/employees/${encodeURIComponent(targetEmpId)}`, { method: 'DELETE' }).catch(() => {});
      }
      if (resolvedEmpId && resolvedEmpId !== targetEmpId) {
        fetch(`/api/employees/${encodeURIComponent(resolvedEmpId)}`, { method: 'DELETE' }).catch(() => {});
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
        isDirector,
        isExecutiveDirector,
        isHRManager,
        isHR,
        isManager,
        isEmployee,
        hasFullAccess,
        isAdmin,
        loginAs,
        logout,
        submitSignupRequest,
        approveUserRequest,
        rejectUserRequest,
        updateUserRole,
        updateUserFromEmployee,
        updateUserEmployeeId,
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
