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
const STORAGE_KEY_LIVE_REQUESTS = 'modela_live_signup_requests_v2';

const DELETED_SEED_REQUEST_EMAILS = new Set([
  'debrupa123@gmail.com',
  'deb@gmail.com',
  'vikram.sengupta@gmail.com'
]);

const DELETED_SEED_REQUEST_IDS = new Set([
  'usr-pending-debrupa',
  'req-debrupa123_gmail_com',
  'usr-qyg6aplc',
  'req-deb_gmail_com',
  'usr-pending-03',
  'req-vikram_sengupta_gmail_com'
]);

const isDeletedSeedSignupRequest = (u?: Partial<User> | null, docId?: string): boolean => {
  if (!u) return false;
  const lowerId = String(u.id || '').trim().toLowerCase();
  const lowerUid = String(u.uid || '').trim().toLowerCase();
  const lowerDocId = String(docId || '').trim().toLowerCase();
  const lowerEmail = String(u.email || '').trim().toLowerCase();
  const lowerName = String(u.name || '').trim().toLowerCase();

  if (
    DELETED_SEED_REQUEST_IDS.has(lowerId) ||
    DELETED_SEED_REQUEST_IDS.has(lowerUid) ||
    DELETED_SEED_REQUEST_IDS.has(lowerDocId)
  ) {
    return true;
  }

  if (
    DELETED_SEED_REQUEST_EMAILS.has(lowerEmail) ||
    lowerName === 'debrupa123' ||
    lowerName === 'deb chatterjee' ||
    lowerName === 'vikram sengupta'
  ) {
    return true;
  }

  return false;
};

const getLiveRequestsMap = (): Map<string, User> => {
  const map = new Map<string, User>();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIVE_REQUESTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let modified = false;
        parsed.forEach((u: User) => {
          if (u && u.email) {
            if (isDeletedSeedSignupRequest(u)) {
              modified = true;
              return;
            }
            map.set(u.email.toLowerCase().trim(), u);
          }
        });
        if (modified) {
          localStorage.setItem(STORAGE_KEY_LIVE_REQUESTS, JSON.stringify(Array.from(map.values())));
        }
      }
    }
  } catch {}
  return map;
};

const saveLiveRequestsMap = (map: Map<string, User>) => {
  try {
    const cleanValues = Array.from(map.values()).filter(u => !isDeletedSeedSignupRequest(u));
    localStorage.setItem(STORAGE_KEY_LIVE_REQUESTS, JSON.stringify(cleanValues));
  } catch {}
};

const isLegacyExcludedUser = (u: Partial<User>, docId?: string): boolean => {
  if (isDeletedSeedSignupRequest(u, docId)) return true;
  if ((u as any)?.isLiveRequest) return false;
  const liveMap = getLiveRequestsMap();
  const lowerEmail = (u.email || '').trim().toLowerCase();
  if (lowerEmail && liveMap.has(lowerEmail)) return false;

  const lowerName = (u.name || '').trim().toLowerCase();
  const upperEmpId = (u.employeeId || '').trim().toUpperCase();

  return (
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
    ((lowerEmail === 'modelatech2026@gmail.com' ||
      lowerEmail === 'sushoovandas@gmail.com' ||
      lowerEmail === 'ghoshdebrupa005@gmail.com' ||
      lowerEmail === 'aditichakraborty2005@gmail.com' ||
      lowerEmail === 'aditichakrabarty2005@gmail.com') &&
      isRecordDeleted(lowerEmail)) ||
    ((upperEmpId === 'MOD000' ||
      upperEmpId === 'MOD101' ||
      upperEmpId === 'MOD003' ||
      upperEmpId === 'MOD005' ||
      upperEmpId === 'MOD006' ||
      upperEmpId === 'MOD007' ||
      upperEmpId === 'MOD008' ||
      upperEmpId === 'MOD102') &&
      isRecordDeleted(upperEmpId))
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const serverUsersRef = React.useRef<User[]>([]);

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
                !isDeletedSeedSignupRequest(u) &&
                !isLegacyExcludedUser(u) &&
                ((u as any).isLiveRequest ||
                  !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId)))
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
        u =>
          !isDeletedSeedSignupRequest(u) &&
          !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId))
      ).map(u => ({
        ...u,
        employeeId: resolveEmpId(u.email, u.employeeId)
      }));
    }

    // Merge any locally submitted live sign-up requests so they never disappear
    const liveMap = getLiveRequestsMap();
    liveMap.forEach((liveUser, emailKey) => {
      if (isDeletedSeedSignupRequest(liveUser)) return;
      const idx = list.findIndex(u => u.email?.toLowerCase().trim() === emailKey);
      if (idx >= 0) {
        const curUpdated = String((list[idx] as any).updatedAt || list[idx].requestedAt || '');
        const liveUpdated = String((liveUser as any).updatedAt || liveUser.requestedAt || '');
        if (liveUpdated >= curUpdated) {
          list[idx] = { ...list[idx], ...liveUser };
        }
      } else {
        list.unshift(liveUser);
      }
    });

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
      if (email) {
        const liveMap = getLiveRequestsMap();
        if (liveMap.delete(email.toLowerCase().trim())) {
          saveLiveRequestsMap(liveMap);
        }
      }
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
      const liveMap = getLiveRequestsMap();
      setUsers(prev => {
        const next = prev
          .filter(
            u =>
              u &&
              u.id !== SYNC_REGISTRY_DOC_ID &&
              u.email !== 'sync@system.internal' &&
              !isDeletedSeedSignupRequest(u) &&
              !isLegacyExcludedUser(u) &&
              ((u as any).isLiveRequest ||
                liveMap.has(u.email.toLowerCase().trim()) ||
                !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId)))
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
      const liveMap = getLiveRequestsMap();
      const sanitized = users.filter(
        u =>
          u &&
          u.id !== SYNC_REGISTRY_DOC_ID &&
          u.email !== 'sync@system.internal' &&
          !isDeletedSeedSignupRequest(u) &&
          !isLegacyExcludedUser(u) &&
          ((u as any).isLiveRequest ||
            liveMap.has(u.email.toLowerCase().trim()) ||
            !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId)))
      );
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(sanitized));
    } catch (e) {
      console.warn('Failed saving users to localStorage:', e);
    }
  }, [users]);

  const mergeServerUsers = useCallback((incomingUsers: any[], deletedIds?: string[]) => {
    if (!Array.isArray(incomingUsers)) return;
    if (Array.isArray(deletedIds) && deletedIds.length > 0) {
      const liveMap = getLiveRequestsMap();
      deletedIds.forEach(dId => {
        const clean = String(dId || '').toLowerCase().trim();
        if (clean && !liveMap.has(clean)) {
          recordDeletedRecord(clean);
        }
      });
    }

    const liveMap = getLiveRequestsMap();
    const validServerUsers: User[] = [];

    incomingUsers.forEach((rawU: any) => {
      if (!rawU || !rawU.email || !rawU.id) return;
      const emailKey = String(rawU.email).toLowerCase().trim();
      if (emailKey === 'sync@system.internal') return;
      if (isDeletedSeedSignupRequest(rawU)) return;

      if (rawU.isLiveRequest || rawU.status === 'PENDING') {
        if (rawU.isLiveRequest) {
          removeDeletedRecord(emailKey, rawU.id, rawU.uid, rawU.employeeId);
          liveMap.set(emailKey, rawU);
        }
      }

      if (
        !rawU.isLiveRequest &&
        !liveMap.has(emailKey) &&
        (isLegacyExcludedUser(rawU) ||
          isRecordDeleted(rawU.id, rawU.uid, emailKey, rawU.employeeId, resolveEmpId(emailKey, rawU.employeeId)))
      ) {
        return;
      }

      validServerUsers.push(rawU as User);
    });

    saveLiveRequestsMap(liveMap);
    serverUsersRef.current = validServerUsers;

    setUsers(prev => {
      const map = new Map<string, User>();
      prev.forEach(u => {
        if (u && u.email && !isDeletedSeedSignupRequest(u) && !isLegacyExcludedUser(u)) {
          map.set(u.email.toLowerCase().trim(), u);
        }
      });

      // Merge server users
      validServerUsers.forEach(rawU => {
        if (isDeletedSeedSignupRequest(rawU)) return;
        const emailKey = rawU.email.toLowerCase().trim();
        const existing = map.get(emailKey);
        const rawUpdated = String((rawU as any).updatedAt || rawU.requestedAt || '');
        const exUpdated = existing ? String((existing as any).updatedAt || existing.requestedAt || '') : '';

        if (
          !existing ||
          rawUpdated >= exUpdated ||
          (rawU as any).isLiveRequest ||
          (rawU.status === 'PENDING' && existing.status !== 'APPROVED')
        ) {
          map.set(emailKey, {
            ...(existing || {}),
            ...rawU,
            employeeId: resolveEmpId(emailKey, rawU.employeeId || existing?.employeeId)
          });
        }
      });

      // Ensure all local live requests are also present
      liveMap.forEach((liveU, emailKey) => {
        if (isDeletedSeedSignupRequest(liveU)) return;
        const existing = map.get(emailKey);
        const liveUpdated = String((liveU as any).updatedAt || liveU.requestedAt || '');
        const exUpdated = existing ? String((existing as any).updatedAt || existing.requestedAt || '') : '';
        if (!existing || liveUpdated >= exUpdated) {
          map.set(emailKey, {
            ...(existing || {}),
            ...liveU,
            employeeId: resolveEmpId(emailKey, liveU.employeeId || existing?.employeeId)
          });
        }
      });

      const next = Array.from(map.values()).filter(
        u =>
          u &&
          u.id !== SYNC_REGISTRY_DOC_ID &&
          u.email !== 'sync@system.internal' &&
          !isDeletedSeedSignupRequest(u) &&
          !isLegacyExcludedUser(u) &&
          ((u as any).isLiveRequest ||
            liveMap.has(u.email.toLowerCase().trim()) ||
            !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId)))
      );
      if (JSON.stringify(prev) === JSON.stringify(next)) {
        return prev;
      }
      try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

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
              if (!isDeletedSeedSignupRequest(u) && !isRecordDeleted(u.id, u.uid, u.email)) {
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

        const liveMap = getLiveRequestsMap();
        const remoteList: User[] = [];
        snapshot.forEach(docSnap => {
          const item = docSnap.data() as User;
          if (!item || !item.id || !item.email) return;
          if (docSnap.id === SYNC_REGISTRY_DOC_ID || item.id === SYNC_REGISTRY_DOC_ID || item.email === 'sync@system.internal' || (item as any).isSystemSync) {
            return;
          }
          if (isDeletedSeedSignupRequest(item, docSnap.id)) {
            deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
            return;
          }
          const lowerEmail = (item.email || '').trim().toLowerCase();
          if ((item as any).isLiveRequest) {
            liveMap.set(lowerEmail, item);
          }
          if (
            !(item as any).isLiveRequest &&
            !liveMap.has(lowerEmail) &&
            (isLegacyExcludedUser(item, docSnap.id) ||
              isRecordDeleted(docSnap.id, item.id, item.uid, item.email, item.employeeId, resolveEmpId(item.email, item.employeeId)))
          ) {
            return;
          }
          remoteList.push(item);
        });

        const map = new Map<string, User>();
        // Ensure default accounts exist ONLY if not deleted
        INITIAL_USERS.filter(
          u =>
            !isDeletedSeedSignupRequest(u) &&
            !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId))
        ).forEach(u => {
          const emailKey = u.email.toLowerCase().trim();
          map.set(emailKey, {
            ...u,
            employeeId: resolveEmpId(emailKey, u.employeeId)
          });
        });

        // Override and add real-time remote accounts & requests from Firestore
        remoteList.forEach(u => {
          if (isDeletedSeedSignupRequest(u)) return;
          const emailKey = u.email.toLowerCase().trim();
          if (
            !(u as any).isLiveRequest &&
            !liveMap.has(emailKey) &&
            isRecordDeleted(u.id, u.uid, emailKey, u.employeeId, resolveEmpId(emailKey, u.employeeId))
          ) {
            return;
          }
          const existing = map.get(emailKey);
          const uUpdatedAt = (u as any).updatedAt || u.requestedAt || '';
          const exUpdatedAt = existing ? ((existing as any).updatedAt || existing.requestedAt || '') : '';

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

        // Merge server-backed users & updates so Firestore write quota rollbacks NEVER erase pending sign-up requests
        serverUsersRef.current.forEach(srvU => {
          if (!srvU || !srvU.email || isDeletedSeedSignupRequest(srvU)) return;
          const emailKey = srvU.email.toLowerCase().trim();
          if (
            !(srvU as any).isLiveRequest &&
            !liveMap.has(emailKey) &&
            isRecordDeleted(srvU.id, srvU.uid, emailKey, srvU.employeeId, resolveEmpId(emailKey, srvU.employeeId))
          ) {
            return;
          }
          const existing = map.get(emailKey);
          const srvUpdated = String((srvU as any).updatedAt || srvU.requestedAt || '');
          const exUpdated = existing ? String((existing as any).updatedAt || existing.requestedAt || '') : '';
          if (!existing || srvUpdated >= exUpdated || (srvU as any).isLiveRequest) {
            map.set(emailKey, {
              ...(existing || {}),
              ...srvU,
              employeeId: resolveEmpId(emailKey, srvU.employeeId || existing?.employeeId)
            });
          }
        });

        // Merge persistent local live sign-up requests
        liveMap.forEach((liveU, emailKey) => {
          if (isDeletedSeedSignupRequest(liveU)) return;
          const existing = map.get(emailKey);
          const liveUpdated = String((liveU as any).updatedAt || liveU.requestedAt || '');
          const exUpdated = existing ? String((existing as any).updatedAt || existing.requestedAt || '') : '';
          if (!existing || liveUpdated >= exUpdated) {
            map.set(emailKey, {
              ...(existing || {}),
              ...liveU,
              employeeId: resolveEmpId(emailKey, liveU.employeeId || existing?.employeeId)
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
            !isDeletedSeedSignupRequest(u) &&
            !isLegacyExcludedUser(u) &&
            ((u as any).isLiveRequest ||
              liveMap.has(u.email.toLowerCase().trim()) ||
              !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId)))
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

    const fetchFromBackend = () => {
      if (!isSubscribed) return;
      fetch('/api/users')
        .then(r => r.json())
        .then(data => {
          if (isSubscribed && data && Array.isArray(data.users)) {
            mergeServerUsers(data.users, data.deletedIds);
          }
        })
        .catch(() => {});
    };

    fetchFromBackend();

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchFromBackend();
      }
    }, 6000);

    return () => {
      isSubscribed = false;
      unsub();
      clearInterval(pollInterval);
    };
  }, [mergeServerUsers]);

  // Refresh Registry: sync immediately with backend /api/users first, then reconcile with Firestore with a non-blocking timeout
  const refreshUsers = useCallback(async () => {
    try {
      // Step 1: Fast sync from backend API so pending requests appear immediately even if Firestore is in quota backoff
      const apiRes = await fetch('/api/users')
        .then(r => r.json())
        .catch(() => null);

      if (apiRes && Array.isArray(apiRes.users)) {
        mergeServerUsers(apiRes.users, apiRes.deletedIds);
      }

      // Step 2: Query Firestore with a 2.5s timeout so a backed-off Firestore stream never blocks User Management refresh
      const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> =>
        Promise.race([
          promise.catch(() => null),
          new Promise<null>(resolve => setTimeout(() => resolve(null), ms))
        ]);

      const [userSnap, empSnap] = await Promise.all([
        withTimeout(getDocs(collection(db, 'users')), 2500),
        withTimeout(getDocs(collection(db, 'employees')), 2500)
      ]);

      if (!userSnap && !empSnap) {
        return;
      }

      if (userSnap) {
        userSnap.forEach(docSnap => {
          const raw = docSnap.data();
          if (docSnap.id === SYNC_REGISTRY_DOC_ID || raw?.id === SYNC_REGISTRY_DOC_ID || raw?.isSystemSync) {
            applyRemoteSyncRegistry(raw);
          }
        });
      }

      const empEmailToId = new Map<string, { id: string; updatedAt: string }>();
      if (empSnap) {
        empSnap.forEach(docSnap => {
          const eData = docSnap.data();
          if (!eData || !eData.id) return;
          if (isRecordDeleted(docSnap.id, eData.id, eData.email, resolveEmpId(eData.email, eData.id))) {
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
      }

      const liveMap = getLiveRequestsMap();
      const remoteUsers: User[] = [];
      if (userSnap) {
        userSnap.forEach(docSnap => {
          const uData = docSnap.data() as User;
          if (!uData || !uData.id || !uData.email) return;
          if (docSnap.id === SYNC_REGISTRY_DOC_ID || uData.id === SYNC_REGISTRY_DOC_ID || uData.email === 'sync@system.internal' || (uData as any).isSystemSync) {
            return;
          }
          if (isDeletedSeedSignupRequest(uData, docSnap.id)) {
            deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
            return;
          }
          const emailKey = uData.email.toLowerCase().trim();
          if (
            !(uData as any).isLiveRequest &&
            !liveMap.has(emailKey) &&
            (isLegacyExcludedUser(uData, docSnap.id) ||
              isRecordDeleted(docSnap.id, uData.id, uData.uid, uData.email, uData.employeeId, resolveEmpId(uData.email, uData.employeeId)))
          ) {
            return;
          }
          remoteUsers.push(uData);
        });
      }

      serverUsersRef.current.forEach(apiU => {
        if (!apiU || !apiU.id || !apiU.email || isDeletedSeedSignupRequest(apiU)) return;
        remoteUsers.push(apiU);
      });

      liveMap.forEach(liveU => {
        if (!liveU || !liveU.id || !liveU.email || isDeletedSeedSignupRequest(liveU)) return;
        remoteUsers.push(liveU);
      });

      const map = new Map<string, User>();

      INITIAL_USERS.filter(
        u =>
          !isDeletedSeedSignupRequest(u) &&
          !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId))
      ).forEach(u => {
        const emailKey = u.email.toLowerCase().trim();
        map.set(emailKey, {
          ...u,
          employeeId: resolveEmpId(emailKey, u.employeeId)
        });
      });

      remoteUsers.forEach(u => {
        if (isDeletedSeedSignupRequest(u)) return;
        const emailKey = u.email.toLowerCase().trim();
        if (
          !(u as any).isLiveRequest &&
          !liveMap.has(emailKey) &&
          isRecordDeleted(u.id, u.uid, emailKey, u.employeeId, resolveEmpId(emailKey, u.employeeId))
        ) {
          return;
        }
        const existing = map.get(emailKey);
        const uUpdatedAt = (u as any).updatedAt || u.requestedAt || '';
        const exUpdatedAt = existing ? ((existing as any).updatedAt || existing.requestedAt || '') : '';
        if (uUpdatedAt && u.employeeId) {
          recordCustomEmpId(emailKey, undefined, u.employeeId);
        }
        if (!existing || uUpdatedAt >= exUpdatedAt || (u as any).isLiveRequest) {
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
          !isDeletedSeedSignupRequest(u) &&
          !isLegacyExcludedUser(u) &&
          ((u as any).isLiveRequest ||
            liveMap.has(u.email.toLowerCase().trim()) ||
            !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId)))
      );
      setUsers(nextList);
      try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(nextList));
      } catch {}

      window.dispatchEvent(new CustomEvent('modela_sync_registry_updated'));
    } catch (err) {
      console.warn('Refresh users sync notice:', err);
    }
  }, [mergeServerUsers]);

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

    if (existing && existing.status === 'APPROVED') {
      setCurrentEmail(cleanEmail);
      return {
        success: true,
        isPending: false,
        message: 'Account verified. Signed in.',
        user: existing
      };
    }

    // If this user was previously deleted from the Approved Users Directory, unblock their email & IDs
    // so their new sign-up request can be stored and reviewed in User Management
    const initialMatch = INITIAL_USERS.find(u => u.email.toLowerCase() === cleanEmail);
    const resolvedInitialEmpId = resolveEmpId(cleanEmail, initialMatch?.employeeId);
    const reqDocId = `REQ-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    removeDeletedRecord(
      cleanEmail,
      existing?.id,
      existing?.uid,
      initialMatch?.id,
      initialMatch?.uid,
      initialMatch?.employeeId,
      resolvedInitialEmpId,
      reqDocId
    );

    const now = new Date().toISOString();
    const userId = existing?.id || initialMatch?.id || `USR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const applicantName = (data.name || existing?.name || initialMatch?.name || '').trim() || cleanEmail;

    // 1. Create User with status: PENDING so it shows in User Management page immediately
    // It will ONLY be accepted by Super Admin or HR or Executive Director
    const newUser: User = {
      id: userId,
      uid: userId,
      name: applicantName,
      email: cleanEmail,
      avatar_url: existing?.avatar_url || initialMatch?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(applicantName)}&background=0284c7&color=fff`,
      status: 'PENDING', // PENDING review in User Management!
      role: null,
      department: data.department || existing?.department || initialMatch?.department || 'General Staff',
      designation: data.designation || existing?.designation || initialMatch?.designation || 'Staff Candidate',
      requestedAt: existing?.status === 'PENDING' && existing?.requestedAt ? existing.requestedAt : now,
      notificationUnread: true,
      ...({ updatedAt: now, isLiveRequest: true } as any)
    };

    const cleanedNewUser = cleanFirestoreUser(newUser);

    // Save to persistent live sign-up requests registry and serverUsersRef so Firestore write quota rollbacks never erase it
    const liveMap = getLiveRequestsMap();
    liveMap.set(cleanEmail, cleanedNewUser);
    saveLiveRequestsMap(liveMap);

    serverUsersRef.current = [
      cleanedNewUser,
      ...serverUsersRef.current.filter(u => u.email.toLowerCase().trim() !== cleanEmail && u.id !== userId)
    ];

    // Add user to state and localStorage immediately so it appears in User Management page right away
    setUsers(prev => {
      const next = [cleanedNewUser, ...prev.filter(u => u.email.toLowerCase().trim() !== cleanEmail && u.id !== userId)];
      try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Send to backend API for instant SSE broadcast to all connected devices
    fetch('/api/users/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanedNewUser)
    }).catch(() => {});

    // Persist to Firestore in background
    setDoc(doc(db, 'users', newUser.id), cleanedNewUser, { merge: true }).catch(err => {
      console.warn('Firestore user request write notice:', err);
    });

    return {
      success: true,
      isPending: true,
      message: 'Sign-up request submitted. It will show in User Management for Super Admin, Executive Director, or HR Manager approval.',
      user: cleanedNewUser
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
            ...({ updatedAt: now, isLiveRequest: true } as any)
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
            ...({ updatedAt: now, isLiveRequest: true } as any)
          };

      if (targetEmail) {
        const liveMap = getLiveRequestsMap();
        liveMap.set(targetEmail, updatedUser);
        saveLiveRequestsMap(liveMap);
      }

      serverUsersRef.current = serverUsersRef.current.map(u =>
        u.id === userId || u.uid === userId || (targetEmail && u.email?.toLowerCase().trim() === targetEmail)
          ? updatedUser
          : u
      );

      // Update user state and localStorage immediately
      setUsers(prev => {
        const next = prev.map(u =>
          u.id === userId || u.uid === userId || (targetEmail && u.email?.toLowerCase() === targetEmail.toLowerCase())
            ? updatedUser
            : u
        );
        try {
          localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(next));
        } catch {}
        return next;
      });

      // Call API immediately so SSE broadcasts approval across all devices right away
      fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: targetEmail, role: finalRole, reviewer, remarks, employeeId: targetEmpId, user: updatedUser })
      }).catch(() => {});

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

          // Dispatch event for AppContext immediately
          window.dispatchEvent(new CustomEvent('modela_employee_added', { detail: newEmp }));

          fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEmp)
          }).catch(() => {});

          // Persist new employee to Firestore in background
          setDoc(doc(db, 'employees', targetEmpId), newEmp, { merge: true }).catch(() => {});

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

          newPayrollRecords.forEach(rec => {
            setDoc(doc(db, 'payroll', rec.id), rec, { merge: true }).catch(() => {});
          });
        } catch (e) {
          console.warn('Failed saving accepted employee:', e);
        }
      }

      // Persist user approval to Firestore in background
      const primaryDocId = targetUser ? targetUser.id : userId;
      setDoc(doc(db, 'users', primaryDocId), updatedUser, { merge: true }).catch(() => {});
      if (targetEmail) {
        setDoc(doc(db, 'users', `REQ-${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`), updatedUser, { merge: true }).catch(() => {});
      }

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
      const liveMap = getLiveRequestsMap();
      const ex = liveMap.get(targetEmail.toLowerCase().trim());
      if (ex) {
        liveMap.set(targetEmail.toLowerCase().trim(), { ...ex, employeeId: cleanNew, ...({ updatedAt: now } as any) });
        saveLiveRequestsMap(liveMap);
      }
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
      let targetEmail = '';

      setUsers(prev => {
        const next = prev.map(u => {
          if (u.id === userId || u.uid === userId) {
            targetEmail = u.email.toLowerCase().trim();
            const updated = {
              ...u,
              status: 'REJECTED' as const,
              reviewedAt: now,
              reviewedBy: reviewer,
              statusUpdatedAt: now,
              notificationUnread: false,
              remarks: reason || 'Access request rejected by security policy',
              ...({ updatedAt: now, isLiveRequest: false } as any)
            };
            setDoc(doc(db, 'users', u.id), updated).catch(() => {});
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
        const liveMap = getLiveRequestsMap();
        if (liveMap.delete(targetEmail)) {
          saveLiveRequestsMap(liveMap);
        }
      }

      serverUsersRef.current = serverUsersRef.current.map(u =>
        u.id === userId || u.uid === userId || (targetEmail && u.email?.toLowerCase().trim() === targetEmail)
          ? { ...u, status: 'REJECTED', reviewedAt: now, reviewedBy: reviewer, ...({ updatedAt: now, isLiveRequest: false } as any) }
          : u
      );

      fetch('/api/users/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: targetEmail, reviewer, reason })
      }).catch(() => {});

      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole): Promise<boolean> => {
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      let targetEmail = '';

      setUsers(prev => {
        const next = prev.map(u => {
          if (u.id === userId || u.uid === userId) {
            targetEmail = u.email.toLowerCase().trim();
            const updated = { ...u, role: newRole, ...({ updatedAt: now } as any) };
            setDoc(doc(db, 'users', u.id), updated).catch(() => {});
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
        const liveMap = getLiveRequestsMap();
        const ex = liveMap.get(targetEmail);
        if (ex) {
          liveMap.set(targetEmail, { ...ex, role: newRole, ...({ updatedAt: now } as any) });
          saveLiveRequestsMap(liveMap);
        }
      }

      serverUsersRef.current = serverUsersRef.current.map(u =>
        u.id === userId || u.uid === userId || (targetEmail && u.email?.toLowerCase().trim() === targetEmail)
          ? { ...u, role: newRole, ...({ updatedAt: now } as any) }
          : u
      );

      fetch('/api/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: targetEmail, newRole })
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
        const liveMap = getLiveRequestsMap();
        if (liveMap.delete(targetEmail)) {
          saveLiveRequestsMap(liveMap);
        }
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
      persistSyncRegistryToFirestore().catch(() => {});

      const deletedKeySet = new Set(
        [userId, target?.id, target?.uid, targetEmail, targetEmpId, resolvedEmpId, ...extraIds]
          .filter(Boolean)
          .map(s => String(s).toLowerCase().trim())
      );

      serverUsersRef.current = serverUsersRef.current.filter(
        u =>
          !deletedKeySet.has(String(u.id || '').toLowerCase().trim()) &&
          !deletedKeySet.has(String(u.uid || '').toLowerCase().trim()) &&
          !deletedKeySet.has(String(u.email || '').toLowerCase().trim()) &&
          !deletedKeySet.has(String(u.employeeId || '').toLowerCase().trim())
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

      // 5. Call server backend APIs immediately
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

      // 6. Permanently delete matching documents from Firestore in background
      deleteDoc(doc(db, 'users', userId)).catch(() => {});
      if (target?.id && target.id !== userId) {
        deleteDoc(doc(db, 'users', target.id)).catch(() => {});
      }
      if (targetEmail) {
        deleteDoc(doc(db, 'users', `REQ-${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`)).catch(() => {});
      }
      if (targetEmpId) {
        deleteDoc(doc(db, 'employees', targetEmpId)).catch(() => {});
      }
      if (resolvedEmpId && resolvedEmpId !== targetEmpId) {
        deleteDoc(doc(db, 'employees', resolvedEmpId)).catch(() => {});
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
