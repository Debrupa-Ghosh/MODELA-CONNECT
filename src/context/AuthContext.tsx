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

const STORAGE_KEY_USERS = 'modela_users_v3';
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
  if ((u as any)?.isLiveRequest) return false;
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

let cachedLiveRequestsMap: Map<string, User> | null = null;
let lastSavedLiveRequestsJson = '';

const getLiveRequestsMap = (): Map<string, User> => {
  if (cachedLiveRequestsMap) return cachedLiveRequestsMap;
  const map = new Map<string, User>();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIVE_REQUESTS);
    if (raw) {
      lastSavedLiveRequestsJson = raw;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let modified = false;
        parsed.forEach((u: User) => {
          if (u && u.email) {
            const emailKey = u.email.toLowerCase().trim();
            const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
            if (
              isDeletedSeedSignupRequest(u) ||
              u.status === 'REJECTED' ||
              isRecordDeleted(u.id, u.uid, emailKey, reqDocId, u.employeeId)
            ) {
              modified = true;
              return;
            }
            map.set(emailKey, u);
          }
        });
        if (modified) {
          const nextJson = JSON.stringify(Array.from(map.values()));
          lastSavedLiveRequestsJson = nextJson;
          localStorage.setItem(STORAGE_KEY_LIVE_REQUESTS, nextJson);
        }
      }
    }
  } catch {}
  cachedLiveRequestsMap = map;
  return map;
};

const saveLiveRequestsMap = (map: Map<string, User>) => {
  cachedLiveRequestsMap = map;
  try {
    const cleanValues = Array.from(map.values()).filter(u => {
      if (!u || !u.email) return false;
      const emailKey = u.email.toLowerCase().trim();
      const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
      return (
        u.status !== 'REJECTED' &&
        !isDeletedSeedSignupRequest(u) &&
        !isRecordDeleted(u.id, u.uid, emailKey, reqDocId, u.employeeId)
      );
    });
    const nextJson = JSON.stringify(cleanValues);
    if (nextJson !== lastSavedLiveRequestsJson) {
      lastSavedLiveRequestsJson = nextJson;
      localStorage.setItem(STORAGE_KEY_LIVE_REQUESTS, nextJson);
    }
  } catch {}
};

const cleanedFirestoreUserDocIds = new Set<string>();
const seededFirestoreUserDocIds = new Set<string>();

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
    lowerName.includes('sushoovan das') ||
    lowerEmail.includes('tonystark') ||
    lowerEmail.includes('tony.stark') ||
    lowerEmail === 'marcus.vance@modela.io' ||
    lowerEmail === 'sourav.ganguly@modela.io' ||
    lowerEmail === 'pooja.sharma@modela.io' ||
    lowerEmail === 'sushovand@modelatech.com' ||
    lowerEmail === 'sushoovandas@gmail.com' ||
    upperEmpId === 'MTK006' ||
    ((lowerEmail === 'modelatech2026@gmail.com' ||
      lowerEmail === 'ghoshdebrupa005@gmail.com') &&
      isRecordDeleted(lowerEmail)) ||
    ((upperEmpId === 'MOD101' ||
      upperEmpId === 'MOD003' ||
      upperEmpId === 'MOD005' ||
      upperEmpId === 'MOD006' ||
      upperEmpId === 'MOD007' ||
      upperEmpId === 'MOD102') &&
      isRecordDeleted(upperEmpId))
  );
};

const normalizeCanonicalUser = (u: User): User => {
  if (!u) return u;
  const emailLower = (u.email || '').toLowerCase().trim();
  const empIdUpper = (u.employeeId || '').toUpperCase().trim();
  let next = u;
  if (emailLower === 'aditichakraborty2005@gmail.com' || emailLower === 'aditichakrabarty2005@gmail.com') {
    const cleanId = (!empIdUpper || empIdUpper === 'MOD008') ? 'MTK020' : empIdUpper;
    next = {
      ...next,
      name: 'Aditi Chakrabarty',
      employeeId: cleanId,
      designation: 'Staff Candidate'
    };
  }
  if (emailLower === 'surupa008@gmail.com') {
    const cleanId = (!empIdUpper || empIdUpper === 'MOD011') ? 'MTK023' : empIdUpper;
    next = {
      ...next,
      name: 'Debrupa Ghosh',
      employeeId: cleanId,
      designation: 'Staff Candidate'
    };
  }
  if (emailLower === 'poulamim@modelatech.com' || empIdUpper === 'MTK017') {
    const cleanId = (!empIdUpper || empIdUpper === 'MOD000') ? 'MTK017' : empIdUpper;
    next = {
      ...next,
      name: 'Poulami Manna',
      employeeId: cleanId,
      designation: 'Staff Candidate',
      avatar_url: 'https://ui-avatars.com/api/?name=Poulami+Manna&background=0284c7&color=fff'
    };
  }
  if (emailLower === 'smandal@modelatechnologies.com' || empIdUpper === 'MOD116') {
    const cleanId = (!empIdUpper || empIdUpper === 'MOD000' || empIdUpper === 'MOD001') ? 'MOD116' : empIdUpper;
    next = {
      ...next,
      name: 'Subhasri Mandal',
      employeeId: cleanId,
      designation: 'Staff Candidate',
      avatar_url: 'https://ui-avatars.com/api/?name=Subhasri+Mandal&background=0284c7&color=fff'
    };
  }
  if (emailLower === 'tiasha@modelatechnologies.com' || (empIdUpper === 'MOD001' && emailLower !== 'smandal@modelatechnologies.com')) {
    const cleanId = (!empIdUpper || empIdUpper === 'MOD000') ? 'MOD001' : empIdUpper;
    next = {
      ...next,
      name: 'Tiasha Chakraborty',
      employeeId: cleanId,
      designation: 'Staff Candidate',
      avatar_url: 'https://ui-avatars.com/api/?name=Tiasha+Chakraborty&background=0284c7&color=fff'
    };
  }
  return next;
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
          parsed.forEach((u: any) => {
            if (u && u.status === 'REJECTED' && u.id !== SYNC_REGISTRY_DOC_ID && u.email !== 'sync@system.internal') {
              const emailKey = String(u.email || '').toLowerCase().trim();
              const reqDocId = emailKey ? `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}` : undefined;
              recordDeletedRecord(u.id, u.uid, emailKey, reqDocId);
            }
          });
          list = parsed
            .filter(u => {
              if (!u || u.id === SYNC_REGISTRY_DOC_ID || u.email === 'sync@system.internal') return false;
              if (u.status === 'REJECTED') return false;
              const emailKey = String(u.email || '').toLowerCase().trim();
              const reqDocId = emailKey ? `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}` : undefined;
              const isPending = u.status === 'PENDING';
              return (
                !isDeletedSeedSignupRequest(u) &&
                !isLegacyExcludedUser(u) &&
                !isRecordDeleted(u.id, u.uid, emailKey, reqDocId, isPending ? undefined : u.employeeId, isPending ? undefined : resolveEmpId(emailKey, u.employeeId))
              );
            })
            .map(u => normalizeCanonicalUser({
              ...u,
              employeeId: u.status === 'PENDING' ? undefined : resolveEmpId(u.email, u.employeeId)
            }));
        }
      }
    } catch {}

    const baselineUsers = INITIAL_USERS.filter(
      u =>
        !isDeletedSeedSignupRequest(u) &&
        !isLegacyExcludedUser(u) &&
        !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId))
    ).map(u => ({
      ...u,
      employeeId: resolveEmpId(u.email, u.employeeId)
    }));

    if (list.length === 0) {
      list = baselineUsers;
    } else {
      baselineUsers.forEach(baseU => {
        const emailKey = baseU.email.toLowerCase().trim();
        if (!list.some(u => u.email?.toLowerCase().trim() === emailKey)) {
          list.push(baseU);
        }
      });
    }

    // Merge any locally submitted live sign-up requests that have not been rejected or deleted
    const liveMap = getLiveRequestsMap();
    let liveCleaned = false;
    liveMap.forEach((liveUser, emailKey) => {
      const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
      if (
        isDeletedSeedSignupRequest(liveUser) ||
        isLegacyExcludedUser(liveUser) ||
        liveUser.status === 'REJECTED' ||
        isRecordDeleted(liveUser.id, liveUser.uid, emailKey, reqDocId, liveUser.employeeId)
      ) {
        liveMap.delete(emailKey);
        liveCleaned = true;
        return;
      }
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
    if (liveCleaned) {
      saveLiveRequestsMap(liveMap);
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
        const cleanEmail = email ? email.trim().toLowerCase() : '';
        recordCustomEmpId(cleanEmail || undefined, oldId, cleanNew);
        const now = new Date().toISOString();
        setUsers(prev => {
          const next = prev.map(u => {
            // If email is known, match strictly by email so other users who had oldId are never modified
            const isMatch = cleanEmail
              ? u.email?.toLowerCase().trim() === cleanEmail
              : Boolean(oldId && u.employeeId?.toUpperCase() === oldId.toUpperCase());
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
      let liveModified = false;
      liveMap.forEach((liveU, emailKey) => {
        const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
        if (
          liveU.status === 'REJECTED' ||
          isRecordDeleted(liveU.id, liveU.uid, emailKey, reqDocId, liveU.employeeId)
        ) {
          liveMap.delete(emailKey);
          liveModified = true;
        }
      });
      if (liveModified) {
        saveLiveRequestsMap(liveMap);
      }

      setUsers(prev => {
        const next = prev
          .filter(u => {
            if (!u || u.id === SYNC_REGISTRY_DOC_ID || u.email === 'sync@system.internal') return false;
            if (u.status === 'REJECTED') return false;
            const emailKey = String(u.email || '').toLowerCase().trim();
            const reqDocId = emailKey ? `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}` : undefined;
            const isPending = u.status === 'PENDING';
            return (
              !isDeletedSeedSignupRequest(u) &&
              !isLegacyExcludedUser(u) &&
              !isRecordDeleted(u.id, u.uid, emailKey, reqDocId, isPending ? undefined : u.employeeId, isPending ? undefined : resolveEmpId(emailKey, u.employeeId))
            );
          })
          .map(u => ({
            ...u,
            employeeId: u.status === 'PENDING' ? undefined : resolveEmpId(u.email, u.employeeId)
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
      const sanitized = users.filter(u => {
        if (!u || u.id === SYNC_REGISTRY_DOC_ID || u.email === 'sync@system.internal') return false;
        if (u.status === 'REJECTED') return false;
        const emailKey = String(u.email || '').toLowerCase().trim();
        const reqDocId = emailKey ? `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}` : undefined;
        const isPending = u.status === 'PENDING';
        return (
          !isDeletedSeedSignupRequest(u) &&
          !isLegacyExcludedUser(u) &&
          !isRecordDeleted(u.id, u.uid, emailKey, reqDocId, isPending ? undefined : u.employeeId, isPending ? undefined : resolveEmpId(emailKey, u.employeeId))
        );
      });
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(sanitized));
    } catch (e) {
      console.warn('Failed saving users to localStorage:', e);
    }
  }, [users]);

  const mergeServerUsers = useCallback((incomingUsers: any[], deletedIds?: string[]) => {
    if (!Array.isArray(incomingUsers)) return;
    const liveMap = getLiveRequestsMap();
    let liveModified = false;

    const serverDeletedSet = new Set<string>(
      Array.isArray(deletedIds)
        ? deletedIds.map(d => String(d || '').toLowerCase().trim()).filter(Boolean)
        : []
    );

    const activeLiveRequestKeys = new Set<string>();
    incomingUsers.forEach((rawU: any) => {
      if (!rawU || !rawU.email || !rawU.id) return;
      const emailKey = String(rawU.email).toLowerCase().trim();
      if (
        rawU.isLiveRequest &&
        (rawU.status === 'PENDING' || rawU.status === 'APPROVED') &&
        !serverDeletedSet.has(emailKey) &&
        !serverDeletedSet.has(String(rawU.id || '').toLowerCase().trim())
      ) {
        const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
        activeLiveRequestKeys.add(emailKey);
        activeLiveRequestKeys.add(String(rawU.id || '').toLowerCase().trim());
        if (rawU.uid) activeLiveRequestKeys.add(String(rawU.uid).toLowerCase().trim());
        activeLiveRequestKeys.add(reqDocId.toLowerCase());
        removeDeletedRecord(rawU.id, rawU.uid, emailKey, reqDocId, rawU.employeeId);
      }
    });

    if (Array.isArray(deletedIds) && deletedIds.length > 0) {
      deletedIds.forEach(dId => {
        const clean = String(dId || '').toLowerCase().trim();
        if (clean && !activeLiveRequestKeys.has(clean)) {
          if (liveMap.delete(clean)) liveModified = true;
          liveMap.forEach((val, key) => {
            if (
              String(val.id || '').toLowerCase().trim() === clean ||
              String(val.uid || '').toLowerCase().trim() === clean
            ) {
              liveMap.delete(key);
              liveModified = true;
            }
          });
          recordDeletedRecord(clean);
        }
      });
    }

    const validServerUsers: User[] = [];

    incomingUsers.forEach((rawU: any) => {
      if (!rawU || !rawU.email || !rawU.id) return;
      const emailKey = String(rawU.email).toLowerCase().trim();
      if (emailKey === 'sync@system.internal') return;
      if (isDeletedSeedSignupRequest(rawU)) return;

      const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const isPending = rawU.status === 'PENDING';
      const empIdToCheck = isPending ? undefined : resolveEmpId(emailKey, rawU.employeeId);

      if (
        rawU.status === 'REJECTED' ||
        isLegacyExcludedUser(rawU) ||
        isRecordDeleted(rawU.id, rawU.uid, emailKey, reqDocId, isPending ? undefined : rawU.employeeId, empIdToCheck)
      ) {
        if (rawU.status === 'REJECTED') {
          recordDeletedRecord(rawU.id, rawU.uid, emailKey, reqDocId);
        }
        if (liveMap.delete(emailKey)) liveModified = true;
        return;
      }

      const normalizedServerUser: User = isPending
        ? { ...rawU, employeeId: undefined }
        : (rawU as User);

      if (rawU.isLiveRequest && isPending) {
        liveMap.set(emailKey, normalizedServerUser);
        liveModified = true;
      }

      validServerUsers.push(normalizedServerUser);
    });

    if (liveModified) {
      saveLiveRequestsMap(liveMap);
    }
    serverUsersRef.current = validServerUsers;

    setUsers(prev => {
      const map = new Map<string, User>();
      prev.forEach(u => {
        if (!u || !u.email || u.status === 'REJECTED') return;
        const emailKey = u.email.toLowerCase().trim();
        const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const isPending = u.status === 'PENDING';
        if (
          !isDeletedSeedSignupRequest(u) &&
          !isLegacyExcludedUser(u) &&
          !isRecordDeleted(u.id, u.uid, emailKey, reqDocId, isPending ? undefined : u.employeeId, isPending ? undefined : resolveEmpId(emailKey, u.employeeId))
        ) {
          map.set(emailKey, u);
        }
      });

      // Merge server users
      validServerUsers.forEach(rawU => {
        if (isDeletedSeedSignupRequest(rawU) || rawU.status === 'REJECTED') return;
        const emailKey = rawU.email.toLowerCase().trim();
        const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const isPending = rawU.status === 'PENDING';
        if (isRecordDeleted(rawU.id, rawU.uid, emailKey, reqDocId, isPending ? undefined : rawU.employeeId, isPending ? undefined : resolveEmpId(emailKey, rawU.employeeId))) {
          return;
        }
        const existing = map.get(emailKey);
        const rawUpdated = String((rawU as any).updatedAt || rawU.requestedAt || '');
        const exUpdated = existing ? String((existing as any).updatedAt || existing.requestedAt || '') : '';

        if (!existing || rawUpdated >= exUpdated) {
          map.set(emailKey, {
            ...(existing || {}),
            ...rawU,
            employeeId: isPending ? undefined : resolveEmpId(emailKey, rawU.employeeId || existing?.employeeId)
          });
        }
      });

      // Ensure all valid local live requests are also present
      liveMap.forEach((liveU, emailKey) => {
        const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const isPending = liveU.status === 'PENDING';
        if (
          isDeletedSeedSignupRequest(liveU) ||
          liveU.status === 'REJECTED' ||
          isRecordDeleted(liveU.id, liveU.uid, emailKey, reqDocId, isPending ? undefined : liveU.employeeId)
        ) {
          return;
        }
        const existing = map.get(emailKey);
        const liveUpdated = String((liveU as any).updatedAt || liveU.requestedAt || '');
        const exUpdated = existing ? String((existing as any).updatedAt || existing.requestedAt || '') : '';
        if (!existing || liveUpdated >= exUpdated) {
          map.set(emailKey, {
            ...(existing || {}),
            ...liveU,
            employeeId: isPending ? undefined : resolveEmpId(emailKey, liveU.employeeId || existing?.employeeId)
          });
        }
      });

      const next = Array.from(map.values())
        .filter(u => {
          if (!u || u.id === SYNC_REGISTRY_DOC_ID || u.email === 'sync@system.internal') return false;
          if (u.status === 'REJECTED') return false;
          const emailKey = u.email.toLowerCase().trim();
          const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const isPending = u.status === 'PENDING';
          return (
            !isDeletedSeedSignupRequest(u) &&
            !isLegacyExcludedUser(u) &&
            !isRecordDeleted(u.id, u.uid, emailKey, reqDocId, isPending ? undefined : u.employeeId, isPending ? undefined : resolveEmpId(emailKey, u.employeeId))
          );
        })
        .map(u => normalizeCanonicalUser(u));
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

    deleteDoc(doc(db, 'users', 'USR-Q94BIIQ5')).catch(() => {});
    deleteDoc(doc(db, 'users', 'USR-MTK006')).catch(() => {});
    deleteDoc(doc(db, 'users', 'REQ-sushovand_modelatech_com')).catch(() => {});
    fetch('/api/users/USR-Q94BIIQ5', { method: 'DELETE' }).catch(() => {});

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

        // First pass: apply global sync registry document and record any REJECTED user docs before filtering
        snapshot.forEach(docSnap => {
          const raw = docSnap.data();
          if (docSnap.id === SYNC_REGISTRY_DOC_ID || raw?.id === SYNC_REGISTRY_DOC_ID || raw?.isSystemSync) {
            applyRemoteSyncRegistry(raw);
            return;
          }
          if (raw && raw.status === 'REJECTED') {
            const emailKey = String(raw.email || '').toLowerCase().trim();
            const reqDocId = emailKey ? `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}` : undefined;
            recordDeletedRecord(docSnap.id, raw.id, raw.uid, emailKey, reqDocId);
            if (!cleanedFirestoreUserDocIds.has(docSnap.id)) {
              cleanedFirestoreUserDocIds.add(docSnap.id);
              deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
            }
          }
        });

        const liveMap = getLiveRequestsMap();
        let liveModified = false;
        const remoteList: User[] = [];
        snapshot.forEach(docSnap => {
          const rawItem = docSnap.data() as User;
          if (!rawItem || (!rawItem.id && !docSnap.id) || !rawItem.email) return;
          const item: User = { ...rawItem, id: rawItem.id || docSnap.id };
          if (docSnap.id === SYNC_REGISTRY_DOC_ID || item.id === SYNC_REGISTRY_DOC_ID || item.email === 'sync@system.internal' || (item as any).isSystemSync) {
            return;
          }
          if (isDeletedSeedSignupRequest(item, docSnap.id)) {
            if (!cleanedFirestoreUserDocIds.has(docSnap.id)) {
              cleanedFirestoreUserDocIds.add(docSnap.id);
              deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
            }
            return;
          }
          const lowerEmail = (item.email || '').trim().toLowerCase();
          const reqDocId = `REQ-${lowerEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const isPending = item.status === 'PENDING';
          if ((item as any).isLiveRequest && (isPending || item.status === 'APPROVED')) {
            removeDeletedRecord(docSnap.id, item.id, item.uid, lowerEmail, reqDocId, item.employeeId);
          }
          if (
            item.status === 'REJECTED' ||
            isLegacyExcludedUser(item, docSnap.id) ||
            isRecordDeleted(docSnap.id, item.id, item.uid, lowerEmail, reqDocId, isPending ? undefined : item.employeeId, isPending ? undefined : resolveEmpId(lowerEmail, item.employeeId))
          ) {
            if (liveMap.delete(lowerEmail)) {
              liveModified = true;
            }
            if (
              item.status === 'REJECTED' ||
              isRecordDeleted(docSnap.id, item.id, item.uid, lowerEmail, reqDocId)
            ) {
              if (!cleanedFirestoreUserDocIds.has(docSnap.id)) {
                cleanedFirestoreUserDocIds.add(docSnap.id);
                deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
              }
            }
            return;
          }
          if ((item as any).isLiveRequest && isPending) {
            liveMap.set(lowerEmail, { ...item, employeeId: undefined });
            liveModified = true;
          }
          remoteList.push(isPending ? { ...item, employeeId: undefined } : item);
        });

        if (liveModified) {
          saveLiveRequestsMap(liveMap);
        }

        const map = new Map<string, User>();
        // Ensure default accounts exist ONLY if not deleted, and persist missing baseline users (such as MOD008) to Firestore once
        INITIAL_USERS.filter(
          u =>
            !isDeletedSeedSignupRequest(u) &&
            !isRecordDeleted(u.id, u.uid, u.email, u.employeeId, resolveEmpId(u.email, u.employeeId))
        ).forEach(u => {
          const emailKey = u.email.toLowerCase().trim();
          const resolvedId = resolveEmpId(emailKey, u.employeeId);
          const userObj = {
            ...u,
            employeeId: resolvedId
          };
          map.set(emailKey, userObj);
          if (!remoteList.some(r => r.email?.toLowerCase().trim() === emailKey) && !seededFirestoreUserDocIds.has(u.id)) {
            seededFirestoreUserDocIds.add(u.id);
            setDoc(doc(db, 'users', u.id), cleanFirestoreUser(userObj), { merge: true }).catch(() => {});
          }
        });

        // Override and add real-time remote accounts & requests from Firestore
        remoteList.forEach(u => {
          if (isDeletedSeedSignupRequest(u) || u.status === 'REJECTED') return;
          const emailKey = u.email.toLowerCase().trim();
          const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const isPending = u.status === 'PENDING';
          if (isRecordDeleted(u.id, u.uid, emailKey, reqDocId, isPending ? undefined : u.employeeId, isPending ? undefined : resolveEmpId(emailKey, u.employeeId))) {
            return;
          }
          const existing = map.get(emailKey);
          const uUpdatedAt = (u as any).updatedAt || u.requestedAt || '';
          const exUpdatedAt = existing ? ((existing as any).updatedAt || existing.requestedAt || '') : '';

          if (!isPending && uUpdatedAt && u.employeeId) {
            recordCustomEmpId(emailKey, undefined, u.employeeId);
          }

          if (!existing || uUpdatedAt >= exUpdatedAt) {
            const resolvedId = isPending
              ? undefined
              : (uUpdatedAt && u.employeeId
                ? u.employeeId.trim().toUpperCase()
                : resolveEmpId(emailKey, u.employeeId || existing?.employeeId));
            map.set(emailKey, {
              ...(existing || {}),
              ...u,
              employeeId: resolvedId
            });
          } else {
            const resolvedId = existing.status === 'PENDING' ? undefined : resolveEmpId(emailKey, existing.employeeId || u.employeeId);
            map.set(emailKey, {
              ...u,
              ...existing,
              employeeId: resolvedId
            });
          }
        });

        // Merge server-backed users & updates so Firestore write quota rollbacks NEVER erase pending sign-up requests
        serverUsersRef.current.forEach(srvU => {
          if (!srvU || !srvU.email || isDeletedSeedSignupRequest(srvU) || srvU.status === 'REJECTED') return;
          const emailKey = srvU.email.toLowerCase().trim();
          const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const isPending = srvU.status === 'PENDING';
          if (isRecordDeleted(srvU.id, srvU.uid, emailKey, reqDocId, isPending ? undefined : srvU.employeeId, isPending ? undefined : resolveEmpId(emailKey, srvU.employeeId))) {
            return;
          }
          const existing = map.get(emailKey);
          const srvUpdated = String((srvU as any).updatedAt || srvU.requestedAt || '');
          const exUpdated = existing ? String((existing as any).updatedAt || existing.requestedAt || '') : '';
          if (!existing || srvUpdated >= exUpdated) {
            map.set(emailKey, {
              ...(existing || {}),
              ...srvU,
              employeeId: isPending ? undefined : resolveEmpId(emailKey, srvU.employeeId || existing?.employeeId)
            });
          }
        });

        // Merge persistent local live sign-up requests
        liveMap.forEach((liveU, emailKey) => {
          const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const isPending = liveU.status === 'PENDING';
          if (
            isDeletedSeedSignupRequest(liveU) ||
            liveU.status === 'REJECTED' ||
            isRecordDeleted(liveU.id, liveU.uid, emailKey, reqDocId, isPending ? undefined : liveU.employeeId)
          ) {
            return;
          }
          const existing = map.get(emailKey);
          const liveUpdated = String((liveU as any).updatedAt || liveU.requestedAt || '');
          const exUpdated = existing ? String((existing as any).updatedAt || existing.requestedAt || '') : '';
          if (!existing || liveUpdated >= exUpdated) {
            map.set(emailKey, {
              ...(existing || {}),
              ...liveU,
              employeeId: isPending ? undefined : resolveEmpId(emailKey, liveU.employeeId || existing?.employeeId)
            });
          }
        });

        const surupaEntry = map.get('surupa008@gmail.com');
        if (surupaEntry && surupaEntry.employeeId !== 'MTK023') {
          const fixedSurupa = normalizeCanonicalUser({ ...surupaEntry, employeeId: 'MTK023' });
          map.set('surupa008@gmail.com', fixedSurupa);
          if (fixedSurupa.id && !seededFirestoreUserDocIds.has(`fix-surupa-${fixedSurupa.id}`)) {
            seededFirestoreUserDocIds.add(`fix-surupa-${fixedSurupa.id}`);
            setDoc(doc(db, 'users', fixedSurupa.id), { employeeId: 'MTK023' }, { merge: true }).catch(() => {});
          }
        }

        const smandalEntry = map.get('smandal@modelatechnologies.com');
        if (smandalEntry) {
          const fixedSmandal = normalizeCanonicalUser(smandalEntry);
          map.set('smandal@modelatechnologies.com', fixedSmandal);
          if (
            fixedSmandal.id &&
            (smandalEntry.name !== 'Subhasri Mandal' || smandalEntry.employeeId !== 'MOD116') &&
            !seededFirestoreUserDocIds.has(`fix-smandal-${fixedSmandal.id}`)
          ) {
            seededFirestoreUserDocIds.add(`fix-smandal-${fixedSmandal.id}`);
            setDoc(doc(db, 'users', fixedSmandal.id), cleanFirestoreUser(fixedSmandal), { merge: true }).catch(() => {});
          }
        }

        const aditiEntry = map.get('aditichakraborty2005@gmail.com');
        if (aditiEntry && aditiEntry.employeeId !== 'MTK020') {
          const fixedAditi = normalizeCanonicalUser({ ...aditiEntry, employeeId: 'MTK020' });
          map.set('aditichakraborty2005@gmail.com', fixedAditi);
          if (fixedAditi.id && !seededFirestoreUserDocIds.has(`fix-aditi-${fixedAditi.id}`)) {
            seededFirestoreUserDocIds.add(`fix-aditi-${fixedAditi.id}`);
            setDoc(doc(db, 'users', fixedAditi.id), { employeeId: 'MTK020' }, { merge: true }).catch(() => {});
          }
        }
        // Clean up any duplicate user doc in Firestore for aditichakraborty2005@gmail.com that still had MOD008
        remoteList.forEach(ru => {
          const em = (ru.email || '').toLowerCase().trim();
          if (
            (em === 'aditichakraborty2005@gmail.com' || em === 'aditichakrabarty2005@gmail.com') &&
            String(ru.employeeId || '').toUpperCase() === 'MOD008'
          ) {
            const keptId = map.get('aditichakraborty2005@gmail.com')?.id;
            if (ru.id && keptId && ru.id !== keptId && !cleanedFirestoreUserDocIds.has(ru.id)) {
              cleanedFirestoreUserDocIds.add(ru.id);
              deleteDoc(doc(db, 'users', ru.id)).catch(() => {});
            } else if (ru.id && !seededFirestoreUserDocIds.has(`upd-aditi-${ru.id}`)) {
              seededFirestoreUserDocIds.add(`upd-aditi-${ru.id}`);
              setDoc(doc(db, 'users', ru.id), { employeeId: 'MTK020' }, { merge: true }).catch(() => {});
            }
          }
        });

        const poulamiEntry = map.get('poulamim@modelatech.com');
        if (poulamiEntry) {
          const fixedPoulami = normalizeCanonicalUser(poulamiEntry);
          map.set('poulamim@modelatech.com', fixedPoulami);
          if (
            fixedPoulami.id &&
            (poulamiEntry.name !== 'Poulami Manna' || poulamiEntry.employeeId !== 'MTK017' || !remoteList.some(r => r.email?.toLowerCase().trim() === 'poulamim@modelatech.com')) &&
            !seededFirestoreUserDocIds.has(`fix-poulami-${fixedPoulami.id}`)
          ) {
            seededFirestoreUserDocIds.add(`fix-poulami-${fixedPoulami.id}`);
            setDoc(doc(db, 'users', fixedPoulami.id), cleanFirestoreUser(fixedPoulami), { merge: true }).catch(() => {});
          }
        }

        const updatedUsers = Array.from(map.values())
          .filter(u => {
            if (!u || u.id === SYNC_REGISTRY_DOC_ID || u.email === 'sync@system.internal') return false;
            if (u.status === 'REJECTED') return false;
            const emailKey = u.email.toLowerCase().trim();
            const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const isPending = u.status === 'PENDING';
            return (
              !isDeletedSeedSignupRequest(u) &&
              !isLegacyExcludedUser(u) &&
              !isRecordDeleted(u.id, u.uid, emailKey, reqDocId, isPending ? undefined : u.employeeId, isPending ? undefined : resolveEmpId(emailKey, u.employeeId))
            );
          })
          .map(u => normalizeCanonicalUser(u));
        setUsers(prev => {
          if (JSON.stringify(prev) === JSON.stringify(updatedUsers)) {
            return prev;
          }
          try {
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
          } catch {}
          return updatedUsers;
        });
      },
      error => {
        console.warn('Firestore real-time sync notification:', error);
      }
    );

    const unsubEmployees = onSnapshot(
      collection(db, 'employees'),
      empSnapshot => {
        if (!isSubscribed || empSnapshot.empty) return;
        const empRecords: Array<{ id: string; email: string; name: string; designation?: string; department?: string; avatar?: string }> = [];
        empSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (!data) return;
          const empId = String(data.id || docSnap.id || '').trim().toUpperCase();
          const email = String(data.email || '').trim().toLowerCase();
          if (docSnap.id.toUpperCase() === 'MOD008' || empId === 'MOD008') {
            if (!cleanedFirestoreUserDocIds.has(`emp-${docSnap.id}`)) {
              cleanedFirestoreUserDocIds.add(`emp-${docSnap.id}`);
              deleteDoc(doc(db, 'employees', docSnap.id)).catch(() => {});
            }
            return;
          }
          if (!empId || !email) return;
          if (isRecordDeleted(docSnap.id, empId, email, resolveEmpId(email, empId))) return;
          const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || String(data.name || email.split('@')[0]);
          empRecords.push({
            id: resolveEmpId(email, empId) || empId,
            email,
            name: fullName,
            designation: data.designation,
            department: data.department,
            avatar: data.avatar
          });
        });

        if (empRecords.length === 0) return;

        setUsers(prev => {
          let changed = false;
          const next = [...prev];
          empRecords.forEach(emp => {
            const existingIdx = next.findIndex(u => u.email?.toLowerCase().trim() === emp.email);
            if (existingIdx === -1) {
              const newUser: User = normalizeCanonicalUser({
                id: `USR-${emp.id}`,
                uid: `USR-${emp.id}`,
                name: emp.name,
                email: emp.email,
                avatar_url: emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=0284c7&color=fff`,
                status: 'APPROVED',
                role: 'EMPLOYEE',
                employeeId: emp.id,
                designation: emp.designation || 'Staff Candidate',
                department: emp.department || 'General Staff',
                requestedAt: '2026-10-15T09:00:00.000Z',
                reviewedAt: '2026-10-15T09:30:00.000Z',
                reviewedBy: 'System Root'
              });
              next.push(newUser);
              changed = true;
              if (!seededFirestoreUserDocIds.has(newUser.id)) {
                seededFirestoreUserDocIds.add(newUser.id);
                setDoc(doc(db, 'users', newUser.id), cleanFirestoreUser(newUser), { merge: true }).catch(() => {});
              }
            } else if (next[existingIdx].status === 'APPROVED') {
              const curU = next[existingIdx];
              const nextEmpId =
                emp.id && emp.id !== 'MOD000' && emp.id !== 'MOD008' && emp.id !== 'MOD011'
                  ? emp.id
                  : (resolveEmpId(emp.email, curU.employeeId || emp.id) || curU.employeeId || emp.id);
              const nextName =
                emp.email === 'poulamim@modelatech.com' || emp.id === 'MTK017'
                  ? 'Poulami Manna'
                  : (emp.name && emp.name !== emp.email.split('@')[0] ? emp.name : curU.name);
              const nextDesig = curU.email?.toLowerCase().trim() === 'sushovand@modelatech.com'
                ? 'Staff Candidate'
                : (curU.designation || emp.designation || 'Staff Candidate');
              const nextDept = curU.department || emp.department || 'General Staff';
              if (
                curU.employeeId !== nextEmpId ||
                curU.name !== nextName ||
                curU.designation !== nextDesig ||
                curU.department !== nextDept
              ) {
                const updatedU = normalizeCanonicalUser({
                  ...curU,
                  employeeId: nextEmpId,
                  name: nextName,
                  designation: nextDesig,
                  department: nextDept
                });
                next[existingIdx] = updatedU;
                changed = true;
                if (updatedU.id && !seededFirestoreUserDocIds.has(`emp-sync-${updatedU.id}-${nextEmpId}-${nextName}`)) {
                  seededFirestoreUserDocIds.add(`emp-sync-${updatedU.id}-${nextEmpId}-${nextName}`);
                  setDoc(
                    doc(db, 'users', updatedU.id),
                    {
                      employeeId: updatedU.employeeId,
                      name: updatedU.name,
                      designation: updatedU.designation,
                      department: updatedU.department,
                      avatar_url: updatedU.avatar_url
                    },
                    { merge: true }
                  ).catch(() => {});
                }
              }
            }
          });
          if (changed) {
            try {
              localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(next));
            } catch {}
            return next;
          }
          return prev;
        });
      },
      () => {}
    );

    const fetchFromBackend = () => {
      if (!isSubscribed) return;
      fetch(`/api/users?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
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
      fetchFromBackend();
    }, 3000);

    return () => {
      isSubscribed = false;
      unsub();
      unsubEmployees();
      clearInterval(pollInterval);
    };
  }, [mergeServerUsers]);

  // Refresh Registry: sync immediately with backend /api/users first, then reconcile with Firestore with a non-blocking timeout
  const refreshUsers = useCallback(async () => {
    try {
      // Step 1: Fast sync from backend API so pending requests appear immediately even if Firestore is in quota backoff
      const apiRes = await fetch(`/api/users?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
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
            return;
          }
          if (raw && raw.status === 'REJECTED') {
            const emailKey = String(raw.email || '').toLowerCase().trim();
            const reqDocId = emailKey ? `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}` : undefined;
            recordDeletedRecord(docSnap.id, raw.id, raw.uid, emailKey, reqDocId);
            deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
          }
        });
      }

      const empEmailToId = new Map<string, { id: string; updatedAt: string; name?: string; designation?: string; department?: string; avatar?: string }>();
      if (empSnap) {
        empSnap.forEach(docSnap => {
          const eData = docSnap.data();
          if (!eData) return;
          const rawId = eData.id || docSnap.id;
          if (!rawId) return;
          const cleanId = String(rawId).trim().toUpperCase();
          if (docSnap.id.toUpperCase() === 'MOD008' || cleanId === 'MOD008') {
            deleteDoc(doc(db, 'employees', docSnap.id)).catch(() => {});
            return;
          }
          if (isRecordDeleted(docSnap.id, rawId, eData.email, resolveEmpId(eData.email, rawId))) {
            return;
          }
          if (eData.email) {
            const emailKey = String(eData.email).toLowerCase().trim();
            const cur = empEmailToId.get(emailKey);
            const eUpdatedAt = String(eData.updatedAt || '');
            const fullName = `${eData.firstName || ''} ${eData.lastName || ''}`.trim() || String(eData.name || emailKey.split('@')[0]);
            if (eUpdatedAt) {
              recordCustomEmpId(emailKey, undefined, cleanId);
            }
            if (!cur || eUpdatedAt >= cur.updatedAt) {
              empEmailToId.set(emailKey, {
                id: cleanId,
                updatedAt: eUpdatedAt,
                name: fullName,
                designation: eData.designation,
                department: eData.department,
                avatar: eData.avatar
              });
            }
          }
        });
      }

      const liveMap = getLiveRequestsMap();
      let liveModified = false;
      const remoteUsers: User[] = [];
      if (userSnap) {
        userSnap.forEach(docSnap => {
          const rawUData = docSnap.data() as User;
          if (!rawUData || (!rawUData.id && !docSnap.id) || !rawUData.email) return;
          const uData: User = { ...rawUData, id: rawUData.id || docSnap.id };
          if (docSnap.id === SYNC_REGISTRY_DOC_ID || uData.id === SYNC_REGISTRY_DOC_ID || uData.email === 'sync@system.internal' || (uData as any).isSystemSync) {
            return;
          }
          if (isDeletedSeedSignupRequest(uData, docSnap.id)) {
            deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
            return;
          }
          const emailKey = uData.email.toLowerCase().trim();
          const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const isPending = uData.status === 'PENDING';
          if ((uData as any).isLiveRequest && (isPending || uData.status === 'APPROVED')) {
            removeDeletedRecord(docSnap.id, uData.id, uData.uid, emailKey, reqDocId, uData.employeeId);
          }
          if (
            uData.status === 'REJECTED' ||
            isLegacyExcludedUser(uData, docSnap.id) ||
            isRecordDeleted(docSnap.id, uData.id, uData.uid, emailKey, reqDocId, isPending ? undefined : uData.employeeId, isPending ? undefined : resolveEmpId(emailKey, uData.employeeId))
          ) {
            if (liveMap.delete(emailKey)) liveModified = true;
            if (
              uData.status === 'REJECTED' ||
              isRecordDeleted(docSnap.id, uData.id, uData.uid, emailKey, reqDocId)
            ) {
              deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
            }
            return;
          }
          remoteUsers.push(isPending ? { ...uData, employeeId: undefined } : uData);
        });
      }

      if (liveModified) {
        saveLiveRequestsMap(liveMap);
      }

      serverUsersRef.current.forEach(apiU => {
        if (!apiU || !apiU.id || !apiU.email || isDeletedSeedSignupRequest(apiU) || apiU.status === 'REJECTED') return;
        remoteUsers.push(apiU);
      });

      liveMap.forEach(liveU => {
        if (!liveU || !liveU.id || !liveU.email || isDeletedSeedSignupRequest(liveU) || liveU.status === 'REJECTED') return;
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
        if (isDeletedSeedSignupRequest(u) || u.status === 'REJECTED') return;
        const emailKey = u.email.toLowerCase().trim();
        const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const isPending = u.status === 'PENDING';
        if (isRecordDeleted(u.id, u.uid, emailKey, reqDocId, isPending ? undefined : u.employeeId, isPending ? undefined : resolveEmpId(emailKey, u.employeeId))) {
          return;
        }
        const existing = map.get(emailKey);
        const uUpdatedAt = (u as any).updatedAt || u.requestedAt || '';
        const exUpdatedAt = existing ? ((existing as any).updatedAt || existing.requestedAt || '') : '';
        if (!isPending && uUpdatedAt && u.employeeId) {
          recordCustomEmpId(emailKey, undefined, u.employeeId);
        }
        if (!existing || uUpdatedAt >= exUpdatedAt) {
          map.set(emailKey, {
            ...(existing || {}),
            ...u,
            employeeId: isPending ? undefined : resolveEmpId(emailKey, u.employeeId || existing?.employeeId)
          });
        }
      });

      // Reconcile with Firestore employees collection and custom EMP ID registry
      empEmailToId.forEach((empInfo, emailKey) => {
        if (!map.has(emailKey)) {
          const resolvedId = resolveEmpId(emailKey, empInfo.id) || empInfo.id;
          map.set(emailKey, {
            id: `USR-${resolvedId}`,
            uid: `USR-${resolvedId}`,
            name: empInfo.name || emailKey.split('@')[0],
            email: emailKey,
            avatar_url: empInfo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(empInfo.name || emailKey)}&background=0284c7&color=fff`,
            status: 'APPROVED',
            role: 'EMPLOYEE',
            employeeId: resolvedId,
            designation: empInfo.designation || 'Staff Member',
            department: empInfo.department || 'Engineering',
            requestedAt: '2026-10-15T09:00:00.000Z',
            reviewedAt: '2026-10-15T09:30:00.000Z',
            reviewedBy: 'System Root'
          });
        }
      });

      map.forEach((u, emailKey) => {
        if (u.status === 'PENDING') return;
        const empEntry = empEmailToId.get(emailKey);
        const resolved = resolveEmpId(emailKey, empEntry?.id || u.employeeId);
        const targetName =
          emailKey === 'poulamim@modelatech.com' || resolved === 'MTK017'
            ? 'Poulami Manna'
            : (empEntry?.name && empEntry.name !== emailKey.split('@')[0] ? empEntry.name : u.name);
        if ((resolved && u.employeeId !== resolved) || u.name !== targetName) {
          map.set(emailKey, normalizeCanonicalUser({ ...u, employeeId: resolved || u.employeeId, name: targetName }));
        }
      });

      const nextList = Array.from(map.values())
        .filter(u => {
          if (!u || u.id === SYNC_REGISTRY_DOC_ID || u.email === 'sync@system.internal') return false;
          if (u.status === 'REJECTED') return false;
          const emailKey = u.email.toLowerCase().trim();
          const reqDocId = `REQ-${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const isPending = u.status === 'PENDING';
          return (
            !isDeletedSeedSignupRequest(u) &&
            !isLegacyExcludedUser(u) &&
            !isRecordDeleted(u.id, u.uid, emailKey, reqDocId, isPending ? undefined : u.employeeId, isPending ? undefined : resolveEmpId(emailKey, u.employeeId))
          );
        })
        .map(u => normalizeCanonicalUser(u));
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

    // Send to backend API for instant sync across all connected browsers and devices
    fetch('/api/users/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
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
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (cleanEmail) {
      recordCustomEmpId(cleanEmail, undefined, cleanId);
    }
    const now = new Date().toISOString();
    setUsers(prev => {
      const next = prev.map(u => {
        // Strictly match by email when email is provided so other users sharing the same employeeId are untouched
        const isMatch = cleanEmail
          ? u.email?.toLowerCase().trim() === cleanEmail
          : Boolean(u.employeeId && u.employeeId.toUpperCase() === cleanId);
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
    const cleanTarget = String(userIdOrEmail || '').trim();
    if (!cleanNew || !cleanTarget) return false;

    const existingTarget = users.find(
      u =>
        u.id === cleanTarget ||
        u.uid === cleanTarget ||
        (u.email && u.email.toLowerCase().trim() === cleanTarget.toLowerCase())
    );
    const targetEmail = (existingTarget?.email || (cleanTarget.includes('@') ? cleanTarget : '')).trim().toLowerCase();
    const oldEmpId = existingTarget?.employeeId || '';
    const now = new Date().toISOString();

    if (targetEmail) {
      recordCustomEmpId(targetEmail, oldEmpId, cleanNew);
    }

    setUsers(prev => {
      const next = prev.map(u => {
        // Match strictly by user ID, UID, or email (never by shared employeeId!)
        const isMatch =
          u.id === cleanTarget ||
          u.uid === cleanTarget ||
          (targetEmail && u.email && u.email.toLowerCase().trim() === targetEmail);
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

    if (targetEmail) {
      const liveMap = getLiveRequestsMap();
      const ex = liveMap.get(targetEmail);
      if (ex) {
        liveMap.set(targetEmail, { ...ex, employeeId: cleanNew, ...({ updatedAt: now } as any) });
        saveLiveRequestsMap(liveMap);
      }
    }

    window.dispatchEvent(
      new CustomEvent('modela_employee_id_changed', {
        detail: { oldId: oldEmpId, newId: cleanNew, email: targetEmail }
      })
    );

    return true;
  };

  const rejectUserRequest = async (userId: string, reason?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const reviewer = currentUser?.email || 'System Super Admin';
      const cleanUserId = String(userId || '').trim();
      const lowerUserId = cleanUserId.toLowerCase();

      const liveMap = getLiveRequestsMap();
      let liveMatchedUser: User | undefined;
      liveMap.forEach(u => {
        if (
          u.id === cleanUserId ||
          u.uid === cleanUserId ||
          u.email?.toLowerCase().trim() === lowerUserId
        ) {
          liveMatchedUser = u;
        }
      });

      const targetUser =
        users.find(
          u =>
            u.id === cleanUserId ||
            u.uid === cleanUserId ||
            (u.email && u.email.toLowerCase().trim() === lowerUserId)
        ) ||
        serverUsersRef.current.find(
          u =>
            u.id === cleanUserId ||
            u.uid === cleanUserId ||
            (u.email && u.email.toLowerCase().trim() === lowerUserId)
        ) ||
        liveMatchedUser;

      const targetEmail = (targetUser?.email || (cleanUserId.includes('@') ? cleanUserId : '')).trim().toLowerCase();
      const reqDocId = targetEmail ? `REQ-${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}` : '';

      // 1. Record in persistent deleted registry & sync to Firestore SYNC-REGISTRY-GLOBAL immediately
      recordDeletedRecord(
        cleanUserId,
        targetUser?.id,
        targetUser?.uid,
        targetEmail,
        reqDocId
      );
      persistSyncRegistryToFirestore().catch(() => {});

      // 2. Remove from live sign-up requests registry immediately
      let liveChanged = false;
      if (targetEmail && liveMap.delete(targetEmail)) {
        liveChanged = true;
      }
      liveMap.forEach((val, key) => {
        if (
          val.id === cleanUserId ||
          val.uid === cleanUserId ||
          (targetUser?.id && val.id === targetUser.id) ||
          (targetEmail && key === targetEmail)
        ) {
          liveMap.delete(key);
          liveChanged = true;
        }
      });
      if (liveChanged) {
        saveLiveRequestsMap(liveMap);
      }

      const rejectedKeys = new Set(
        [cleanUserId, targetUser?.id, targetUser?.uid, targetEmail, reqDocId]
          .filter(Boolean)
          .map(s => String(s).toLowerCase().trim())
      );

      // 3. Remove from serverUsersRef immediately
      serverUsersRef.current = serverUsersRef.current.filter(
        u =>
          !rejectedKeys.has(String(u.id || '').toLowerCase().trim()) &&
          !rejectedKeys.has(String(u.uid || '').toLowerCase().trim()) &&
          !rejectedKeys.has(String(u.email || '').toLowerCase().trim())
      );

      // 4. Remove from users state and localStorage immediately
      setUsers(prev => {
        const next = prev.filter(
          u =>
            !rejectedKeys.has(String(u.id || '').toLowerCase().trim()) &&
            !rejectedKeys.has(String(u.uid || '').toLowerCase().trim()) &&
            !rejectedKeys.has(String(u.email || '').toLowerCase().trim())
        );
        try {
          localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(next));
        } catch {}
        return next;
      });

      // 5. Notify backend server to reject and record in serverDeletedIds
      fetch('/api/users/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: cleanUserId,
          targetId: targetUser?.id,
          email: targetEmail,
          reviewer,
          reason
        })
      }).catch(() => {});

      // 6. Permanently delete all matching pending request documents from Firestore
      deleteDoc(doc(db, 'users', cleanUserId)).catch(() => {});
      if (targetUser?.id && targetUser.id !== cleanUserId) {
        deleteDoc(doc(db, 'users', targetUser.id)).catch(() => {});
      }
      if (targetUser?.uid && targetUser.uid !== cleanUserId && targetUser.uid !== targetUser?.id) {
        deleteDoc(doc(db, 'users', targetUser.uid)).catch(() => {});
      }
      if (reqDocId) {
        deleteDoc(doc(db, 'users', reqDocId)).catch(() => {});
      }
      if (targetEmail) {
        getDocs(query(collection(db, 'users'), where('email', '==', targetEmail)))
          .then(snap => {
            snap.forEach(d => {
              deleteDoc(doc(db, 'users', d.id)).catch(() => {});
            });
          })
          .catch(() => {});
      }

      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole): Promise<boolean> => {
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const targetUser = users.find(u => u.id === userId || u.uid === userId);
      const targetEmail = (targetUser?.email || '').toLowerCase().trim();

      setUsers(prev => {
        const next = prev.map(u => {
          if (u.id === userId || u.uid === userId) {
            const updated = cleanFirestoreUser({ ...u, role: newRole, ...({ updatedAt: now } as any) });
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
