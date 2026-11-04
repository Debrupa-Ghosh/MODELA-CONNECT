// Shared utility to track deletions and custom EMP ID overrides across AuthContext, AppContext, and Firestore

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const STORAGE_KEY_DELETED = 'modela_deleted_registry_v4';
const STORAGE_KEY_UNBLOCKED = 'modela_unblocked_registry_v1';
const STORAGE_KEY_EMP_ID_MAP = 'modela_emp_id_overrides_v1';
export const SYNC_REGISTRY_DOC_ID = 'SYNC-REGISTRY-GLOBAL';

const PERMANENTLY_EXCLUDED_KEYS = new Set([
  'modelatech2026@gmail.com',
  'usr-superadmin-01',
  'mod000',
  'mod101',
  'sushoovandas@gmail.com',
  'usr-sushoovan-gmail',
  'ghoshdebrupa005@gmail.com',
  'usr-obopa1gq',
  'mod007',
  'mod102',
  'debrupa123@gmail.com',
  'usr-pending-debrupa',
  'req-debrupa123_gmail_com',
  'deb@gmail.com',
  'usr-qyg6aplc',
  'req-deb_gmail_com',
  'vikram.sengupta@gmail.com',
  'usr-pending-03',
  'req-vikram_sengupta_gmail_com',
  'req-1572',
  'req-2709',
  'req-6425',
  'req-3779',
  'req-9074'
]);

const DEFAULT_DELETED_IDS = [
  'alex.morgan@modela.io',
  'elena.rostova@modela.io',
  'rani123@gmail.com',
  'req-1572',
  'req-2709',
  'req-6425',
  'req-3779',
  'req-9074',
  'req-622',
  'req-719',
  'req-1042',
  'req-1043',
  'req-1044',
  'req-stf-001',
  'req-stf-002',
  'req-stf-003',
  'req-stf-004',
  'riju1234',
  'abc123',
  'tony stark',
  'tonystark',
  'marcus vance',
  'marcus.vance@modela.io',
  'mod003',
  'usr-hr-mgr01',
  'sourav ganguly',
  'sourav.ganguly@modela.io',
  'mod005',
  'pooja sharma',
  'pooja.sharma@modela.io',
  'mod006',
  'pay-2026-09-04',
  'pay-2026-10-04',
  'pay-2026-sep-mod007',
  'pay-2026-oct-mod007',
  'pay-2026-nov-mod007',
  'pay-2026-dec-mod007',
  'pay-2026-oct-mod101',
  'pay-2026-oct-mod102',
  'pay-2026-oct-mod106',
  'debrupa123',
  'deb chatterjee',
  'vikram sengupta',
  ...Array.from(PERMANENTLY_EXCLUDED_KEYS)
];

const SYSTEM_PROTECTED_KEYS = new Set([
  'sync-registry-global',
  'sync@system.internal',
  'aditichakraborty2005@gmail.com',
  'aditichakrabarty2005@gmail.com',
  'usr-aditi-008',
  'mod008',
  'aditi chakrabarty',
  'aditi chakraborty'
]);

let cachedUnblocked: Set<string> | null = null;
let cachedDeleted: Set<string> | null = null;
let cachedEmpIdMap: Record<string, string> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

export const getUnblockedRegistry = (): Set<string> => {
  if (cachedUnblocked) return cachedUnblocked;
  const result = new Set<string>([
    'aditichakraborty2005@gmail.com',
    'aditichakrabarty2005@gmail.com',
    'usr-aditi-008',
    'mod008',
    'aditi chakrabarty',
    'aditi chakraborty'
  ]);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UNBLOCKED);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(s => {
          const clean = String(s || '').toLowerCase().trim();
          if (clean) result.add(clean);
        });
      }
    }
  } catch {}
  cachedUnblocked = result;
  return result;
};

export const getDeletedRegistry = (): Set<string> => {
  if (cachedDeleted) return cachedDeleted;
  const unblocked = getUnblockedRegistry();
  const result = new Set<string>(DEFAULT_DELETED_IDS.filter(k => !unblocked.has(k)));
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(s => {
          const clean = String(s || '').toLowerCase().trim();
          if (clean && !SYSTEM_PROTECTED_KEYS.has(clean) && !unblocked.has(clean)) {
            result.add(clean);
          }
        });
      }
    }
  } catch {}
  cachedDeleted = result;
  return result;
};

export const getCustomEmpIdMap = (): Record<string, string> => {
  if (cachedEmpIdMap) return cachedEmpIdMap;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMP_ID_MAP);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const validMap = parsed as Record<string, string>;
        cachedEmpIdMap = validMap;
        return validMap;
      }
    }
  } catch {}
  const emptyMap: Record<string, string> = {};
  cachedEmpIdMap = emptyMap;
  return emptyMap;
};

export const persistSyncRegistryToFirestore = async (): Promise<void> => {
  if (persistTimer) clearTimeout(persistTimer);
  return new Promise(resolve => {
    persistTimer = setTimeout(async () => {
      persistTimer = null;
      try {
        const deletedIds = Array.from(getDeletedRegistry());
        const unblockedIds = Array.from(getUnblockedRegistry());
        const empIdMap = getCustomEmpIdMap();
        await setDoc(
          doc(db, 'users', SYNC_REGISTRY_DOC_ID),
          {
            id: SYNC_REGISTRY_DOC_ID,
            uid: SYNC_REGISTRY_DOC_ID,
            name: 'System Sync Registry',
            email: 'sync@system.internal',
            status: 'REJECTED',
            isSystemSync: true,
            deletedIds,
            unblockedIds,
            empIdMap,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Firestore sync registry write notice:', e);
      }
      resolve();
    }, 150);
  });
};

export const applyRemoteSyncRegistry = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  let changed = false;

  try {
    const unblocked = getUnblockedRegistry();
    const currentDeleted = getDeletedRegistry();
    let unblockedChanged = false;
    let deletedChanged = false;

    const remoteUnblockedSet = Array.isArray(data.unblockedIds)
      ? new Set(data.unblockedIds.map((x: any) => String(x || '').toLowerCase().trim()).filter(Boolean))
      : null;

    if (Array.isArray(data.deletedIds)) {
      data.deletedIds.forEach((item: any) => {
        const clean = String(item || '').toLowerCase().trim();
        if (clean && !SYSTEM_PROTECTED_KEYS.has(clean)) {
          if (remoteUnblockedSet && !remoteUnblockedSet.has(clean) && unblocked.has(clean)) {
            unblocked.delete(clean);
            unblockedChanged = true;
          }
          if (!unblocked.has(clean) && !currentDeleted.has(clean)) {
            currentDeleted.add(clean);
            deletedChanged = true;
          }
        }
      });
    }

    if (unblockedChanged) {
      changed = true;
      localStorage.setItem(STORAGE_KEY_UNBLOCKED, JSON.stringify(Array.from(unblocked)));
    }
    if (deletedChanged) {
      changed = true;
      localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(Array.from(currentDeleted)));
    }

    if (data.empIdMap && typeof data.empIdMap === 'object') {
      const currentMap = getCustomEmpIdMap();
      let mapChanged = false;
      Object.entries(data.empIdMap).forEach(([k, v]) => {
        if (k && typeof v === 'string' && v.trim()) {
          const cleanVal = v.trim().toUpperCase();
          if (currentMap[k] !== cleanVal) {
            currentMap[k] = cleanVal;
            changed = true;
            mapChanged = true;
          }
        }
      });
      if (mapChanged) {
        localStorage.setItem(STORAGE_KEY_EMP_ID_MAP, JSON.stringify(currentMap));
      }
    }
  } catch (e) {
    console.warn('Failed applying remote sync registry:', e);
  }

  if (changed && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('modela_sync_registry_updated'));
  }
  return changed;
};

export const recordDeletedRecord = (...identifiers: (string | undefined | null)[]): void => {
  try {
    const unblocked = getUnblockedRegistry();
    const registry = getDeletedRegistry();
    let changed = false;
    identifiers.forEach(id => {
      if (id && id.trim()) {
        const clean = id.toLowerCase().trim();
        if (!SYSTEM_PROTECTED_KEYS.has(clean)) {
          if (unblocked.delete(clean)) changed = true;
          if (!registry.has(clean)) {
            registry.add(clean);
            changed = true;
          }
        }
      }
    });
    if (changed) {
      localStorage.setItem(STORAGE_KEY_UNBLOCKED, JSON.stringify(Array.from(unblocked)));
      localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(Array.from(registry)));
      persistSyncRegistryToFirestore().catch(() => {});
    }
  } catch (e) {
    console.warn('Failed recording deleted identifier:', e);
  }
};

export const removeDeletedRecord = (...identifiers: (string | undefined | null)[]): void => {
  try {
    const unblocked = getUnblockedRegistry();
    const registry = getDeletedRegistry();
    let changed = false;
    identifiers.forEach(id => {
      if (id && id.trim()) {
        const clean = id.toLowerCase().trim();
        if (!unblocked.has(clean)) {
          unblocked.add(clean);
          changed = true;
        }
        if (registry.has(clean)) {
          registry.delete(clean);
          changed = true;
        }
      }
    });
    if (changed) {
      localStorage.setItem(STORAGE_KEY_UNBLOCKED, JSON.stringify(Array.from(unblocked)));
      localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(Array.from(registry)));
      persistSyncRegistryToFirestore().catch(() => {});
    }
  } catch (e) {
    console.warn('Failed removing deleted identifier:', e);
  }
};

export const isRecordDeleted = (...identifiers: (string | undefined | null)[]): boolean => {
  const unblocked = getUnblockedRegistry();
  const registry = getDeletedRegistry();
  return identifiers.some(id => {
    if (!id) return false;
    const clean = id.toLowerCase().trim();
    if (!clean) return false;
    if (unblocked.has(clean)) return false;
    if (
      PERMANENTLY_EXCLUDED_KEYS.has(clean) ||
      clean.includes('tony stark') ||
      clean.includes('tonystark') ||
      clean.includes('tony.stark') ||
      clean.includes('marcus vance') ||
      clean.includes('marcus.vance') ||
      clean.includes('sourav ganguly') ||
      clean.includes('sourav.ganguly') ||
      clean.includes('pooja sharma') ||
      clean.includes('pooja.sharma') ||
      clean === 'mod003' ||
      clean === 'mod005' ||
      clean === 'mod006' ||
      clean === 'usr-hr-mgr01'
    ) {
      return true;
    }
    return registry.has(clean);
  });
};

export const recordCustomEmpId = (email?: string | null, oldId?: string | null, newId?: string | null): void => {
  if (!newId || !newId.trim()) return;
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const cleanNewLower = newId.trim().toLowerCase();
  const unblocked = getUnblockedRegistry();
  if (
    ((cleanEmail && PERMANENTLY_EXCLUDED_KEYS.has(cleanEmail) && !unblocked.has(cleanEmail)) ||
    (PERMANENTLY_EXCLUDED_KEYS.has(cleanNewLower) && !unblocked.has(cleanNewLower)))
  ) {
    return;
  }
  const cleanNew = newId.trim().toUpperCase();
  removeDeletedRecord(cleanNew, oldId, email);
  try {
    const map = getCustomEmpIdMap();
    let changed = false;
    if (email && email.trim()) {
      const emailKey = email.trim().toLowerCase();
      if (map[emailKey] !== cleanNew) {
        map[emailKey] = cleanNew;
        changed = true;
      }
    }
    if (oldId && oldId.trim()) {
      const cleanOld = oldId.trim().toUpperCase();
      if (map[cleanOld] !== cleanNew) {
        map[cleanOld] = cleanNew;
        changed = true;
      }
      Object.keys(map).forEach(k => {
        if (map[k] === cleanOld) {
          map[k] = cleanNew;
          changed = true;
        }
      });
    }
    if (changed) {
      localStorage.setItem(STORAGE_KEY_EMP_ID_MAP, JSON.stringify(map));
      persistSyncRegistryToFirestore().catch(() => {});
    }
  } catch (e) {
    console.warn('Failed recording custom EMP ID:', e);
  }
};

export const resolveEmpId = (email?: string | null, fallbackId?: string | null): string => {
  const map = getCustomEmpIdMap();
  if (email && email.trim()) {
    const byEmail = map[email.trim().toLowerCase()];
    if (byEmail) return byEmail;
  }
  if (fallbackId && fallbackId.trim()) {
    const cleanFallback = fallbackId.trim().toUpperCase();
    const byId = map[cleanFallback];
    if (byId) return byId;
    return cleanFallback;
  }
  return '';
};


