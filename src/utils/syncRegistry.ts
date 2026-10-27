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
  'aditichakraborty2005@gmail.com',
  'aditichakrabarty2005@gmail.com',
  'usr-aditi-008',
  'mod008',
  'mod102',
  'debrupa123@gmail.com',
  'usr-pending-debrupa',
  'req-debrupa123_gmail_com',
  'deb@gmail.com',
  'usr-qyg6aplc',
  'req-deb_gmail_com',
  'vikram.sengupta@gmail.com',
  'usr-pending-03',
  'req-vikram_sengupta_gmail_com'
]);

const DEFAULT_DELETED_IDS = [
  'alex.morgan@modela.io',
  'elena.rostova@modela.io',
  'rani123@gmail.com',
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
  'aditi chakrabarty',
  'aditi chakraborty',
  'debrupa123',
  'deb chatterjee',
  'vikram sengupta',
  ...Array.from(PERMANENTLY_EXCLUDED_KEYS)
];

const SYSTEM_PROTECTED_KEYS = new Set([
  'sync-registry-global',
  'sync@system.internal'
]);

export const getUnblockedRegistry = (): Set<string> => {
  const result = new Set<string>();
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
  return result;
};

export const getDeletedRegistry = (): Set<string> => {
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
  return result;
};

export const getCustomEmpIdMap = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMP_ID_MAP);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {}
  return {};
};

export const persistSyncRegistryToFirestore = async (): Promise<void> => {
  try {
    const deletedIds = Array.from(getDeletedRegistry());
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
        empIdMap,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Firestore sync registry write notice:', e);
  }
};

export const applyRemoteSyncRegistry = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  let changed = false;

  try {
    if (Array.isArray(data.deletedIds)) {
      const unblocked = getUnblockedRegistry();
      const currentDeleted = getDeletedRegistry();
      const prevSize = currentDeleted.size;
      data.deletedIds.forEach((item: any) => {
        const clean = String(item || '').toLowerCase().trim();
        if (clean && !SYSTEM_PROTECTED_KEYS.has(clean) && !unblocked.has(clean)) {
          currentDeleted.add(clean);
        }
      });
      if (currentDeleted.size !== prevSize) {
        changed = true;
      }
      localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(Array.from(currentDeleted)));
    }

    if (data.empIdMap && typeof data.empIdMap === 'object') {
      const currentMap = getCustomEmpIdMap();
      Object.entries(data.empIdMap).forEach(([k, v]) => {
        if (k && typeof v === 'string' && v.trim()) {
          const cleanVal = v.trim().toUpperCase();
          if (currentMap[k] !== cleanVal) {
            currentMap[k] = cleanVal;
            changed = true;
          }
        }
      });
      localStorage.setItem(STORAGE_KEY_EMP_ID_MAP, JSON.stringify(currentMap));
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
    identifiers.forEach(id => {
      if (id && id.trim()) {
        const clean = id.toLowerCase().trim();
        if (!SYSTEM_PROTECTED_KEYS.has(clean)) {
          unblocked.delete(clean);
          registry.add(clean);
        }
      }
    });
    localStorage.setItem(STORAGE_KEY_UNBLOCKED, JSON.stringify(Array.from(unblocked)));
    localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(Array.from(registry)));
    persistSyncRegistryToFirestore().catch(() => {});
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
    localStorage.setItem(STORAGE_KEY_UNBLOCKED, JSON.stringify(Array.from(unblocked)));
    localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(Array.from(registry)));
    if (changed) {
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
    localStorage.setItem(STORAGE_KEY_EMP_ID_MAP, JSON.stringify(map));
    if (changed) {
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


