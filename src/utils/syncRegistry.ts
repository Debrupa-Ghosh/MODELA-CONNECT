// Shared utility to track deletions and custom EMP ID overrides across AuthContext, AppContext, and Firestore

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const STORAGE_KEY_DELETED = 'modela_deleted_registry_v5';
const STORAGE_KEY_UNBLOCKED = 'modela_unblocked_registry_v2';
const STORAGE_KEY_EMP_ID_MAP = 'modela_emp_id_overrides_v2';
export const SYNC_REGISTRY_DOC_ID = 'SYNC-REGISTRY-GLOBAL';

const PERMANENTLY_EXCLUDED_KEYS = new Set([
  'modelatech2026@gmail.com',
  'usr-superadmin-01',
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
  'tiasha@modelatechnologies.com',
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
  'tiasha@modelatechnologies.com',
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

const ACTIVE_DB_PROTECTED_KEYS = [
  'sync-registry-global',
  'sync@system.internal',
  // 1. Sushoovan Das (MTK006)
  'sushovand@modelatech.com',
  'usr-q94biiq5',
  'mtk006',
  'sushoovan das',
  // 2. Aditi Chakrabarty (MTK020)
  'aditichakraborty2005@gmail.com',
  'aditichakrabarty2005@gmail.com',
  'usr-aditi-008',
  'usr-mtk020',
  'mtk020',
  'aditi chakrabarty',
  'aditi chakraborty',
  // 3. Debrupa Ghosh (MTK023)
  'surupa008@gmail.com',
  'usr-surupa-011',
  'usr-mtk023',
  'mtk023',
  'debrupa ghosh',
  // 4. Satyajit Mazumder (MOD115)
  'jit@modelatech.com',
  'usr-satyajit-115',
  'mod115',
  'satyajit mazumder',
  // 5. Abhinandan Baitalik (MTK018)
  'abhinandanb@modelatech.com',
  'usr-mtk018',
  'mtk018',
  'abhinandan baitalik',
  // 6. Batas chandra mahato (MTK019)
  'batasm@modelatech.com',
  'usr-mtk019',
  'mtk019',
  'batas chandra mahato',
  // 7. Damayanti Chanda (MTK016)
  'damayantic@modelatech.com',
  'usr-mtk016',
  'mtk016',
  'damayanti chanda',
  // 8. Modela Tech (MOD106)
  'modelatech4@gmail.com',
  'usr-mod106',
  'mod106',
  'modela tech',
  // 9. Mosarof Hosen (MTK012)
  'mosarafh@modelatech.com',
  'usr-mtk012',
  'mtk012',
  'mosarof hosen',
  // 10. Pritam Saha (MTK003)
  'pat@modelatech.com',
  'usr-mtk003',
  'mtk003',
  'pritam saha',
  // 11. Poulami Das (MTK021)
  'poulamid@modelatech.com',
  'usr-mtk021',
  'mtk021',
  'poulami das',
  // 12. Poulami Manna (MTK017)
  'poulamim@modelatech.com',
  'usr-mtk017',
  'mtk017',
  'poulami manna',
  // 13. Sandeepan Choudhury (MTK004)
  'sandeepanc04@gmail.com',
  'usr-mtk004',
  'mtk004',
  'sandeepan choudhury',
  // 14. Shibotosh Karmakar (MTK007)
  'shibotoshk@modelatech.com',
  'usr-mtk007',
  'mtk007',
  'shibotosh karmakar',
  // 15. Shuvam Mandal (MTK009)
  'shuvamm@modelatech.com',
  'usr-mtk009',
  'mtk009',
  'shuvam mandal',
  // 16. Subhasri Mandal (MOD116)
  'smandal@modelatechnologies.com',
  'usr-mod116',
  'mod116',
  'subhasri mandal',
  // 17. Subhabrata Saha (MTK022)
  'subhabratas@modelatech.com',
  'usr-mtk022',
  'mtk022',
  'subhabrata saha',
  // 18. Swagata Chattopadhyay (MTK024)
  'swagatac@modelatech.com',
  'usr-mtk024',
  'mtk024',
  'swagata chattopadhyay'
];

const SYSTEM_PROTECTED_KEYS = new Set(ACTIVE_DB_PROTECTED_KEYS);

const DEFAULT_EMP_ID_BY_EMAIL: Record<string, string> = {
  'sushovand@modelatech.com': 'MTK006',
  'aditichakraborty2005@gmail.com': 'MTK020',
  'aditichakrabarty2005@gmail.com': 'MTK020',
  'surupa008@gmail.com': 'MTK023',
  'jit@modelatech.com': 'MOD115',
  'abhinandanb@modelatech.com': 'MTK018',
  'batasm@modelatech.com': 'MTK019',
  'damayantic@modelatech.com': 'MTK016',
  'modelatech4@gmail.com': 'MOD106',
  'mosarafh@modelatech.com': 'MTK012',
  'pat@modelatech.com': 'MTK003',
  'poulamid@modelatech.com': 'MTK021',
  'poulamim@modelatech.com': 'MTK017',
  'sandeepanc04@gmail.com': 'MTK004',
  'shibotoshk@modelatech.com': 'MTK007',
  'shuvamm@modelatech.com': 'MTK009',
  'smandal@modelatechnologies.com': 'MOD116',
  'subhabratas@modelatech.com': 'MTK022',
  'swagatac@modelatech.com': 'MTK024'
};

const OBSOLETE_FALLBACK_IDS = new Set(['MOD000', 'MOD001', 'MOD008', 'MOD011']);

let cachedUnblocked: Set<string> | null = null;
let cachedDeleted: Set<string> | null = null;
let cachedEmpIdMap: Record<string, string> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

export const getUnblockedRegistry = (): Set<string> => {
  if (cachedUnblocked) return cachedUnblocked;
  const result = new Set<string>(ACTIVE_DB_PROTECTED_KEYS);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UNBLOCKED);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(s => {
          const clean = String(s || '').toLowerCase().trim();
          if (clean && clean !== 'mod008' && clean !== 'mod011' && clean !== 'mod001') {
            result.add(clean);
          }
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
  const emailOnlyMap: Record<string, string> = { ...DEFAULT_EMP_ID_BY_EMAIL };
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMP_ID_MAP);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        let cleaned = false;
        Object.entries(parsed).forEach(([k, v]) => {
          const cleanKey = String(k || '').trim().toLowerCase();
          if (cleanKey.includes('@') && typeof v === 'string' && v.trim()) {
            const cleanVal = v.trim().toUpperCase();
            if (OBSOLETE_FALLBACK_IDS.has(cleanVal) && DEFAULT_EMP_ID_BY_EMAIL[cleanKey]) {
              emailOnlyMap[cleanKey] = DEFAULT_EMP_ID_BY_EMAIL[cleanKey];
              cleaned = true;
            } else {
              emailOnlyMap[cleanKey] = cleanVal;
            }
          } else {
            cleaned = true;
          }
        });
        if (cleaned) {
          localStorage.setItem(STORAGE_KEY_EMP_ID_MAP, JSON.stringify(emailOnlyMap));
        }
        cachedEmpIdMap = emailOnlyMap;
        return emailOnlyMap;
      }
    }
  } catch {}
  cachedEmpIdMap = emailOnlyMap;
  return emailOnlyMap;
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
        const cleanKey = String(k || '').trim().toLowerCase();
        // Only apply email-keyed overrides and never overwrite database IDs with obsolete fallback IDs (MOD000, MOD001, MOD008, MOD011)
        if (cleanKey.includes('@') && typeof v === 'string' && v.trim()) {
          const cleanVal = v.trim().toUpperCase();
          if (OBSOLETE_FALLBACK_IDS.has(cleanVal) && DEFAULT_EMP_ID_BY_EMAIL[cleanKey]) {
            return;
          }
          if (currentMap[cleanKey] !== cleanVal) {
            currentMap[cleanKey] = cleanVal;
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
    if (unblocked.has(clean) || SYSTEM_PROTECTED_KEYS.has(clean)) return false;
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
  if (OBSOLETE_FALLBACK_IDS.has(cleanNew) && cleanEmail && DEFAULT_EMP_ID_BY_EMAIL[cleanEmail]) {
    return;
  }
  removeDeletedRecord(cleanNew, oldId, email);
  try {
    const map = getCustomEmpIdMap();
    let changed = false;
    // Strictly map by email only so editing one user's employee ID never changes another user who shared oldId
    if (cleanEmail && cleanEmail.includes('@')) {
      if (map[cleanEmail] !== cleanNew) {
        map[cleanEmail] = cleanNew;
        changed = true;
      }
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
    const emailKey = email.trim().toLowerCase();
    const byEmail = map[emailKey];
    if (byEmail) {
      if (OBSOLETE_FALLBACK_IDS.has(byEmail) && DEFAULT_EMP_ID_BY_EMAIL[emailKey]) {
        return DEFAULT_EMP_ID_BY_EMAIL[emailKey];
      }
      return byEmail;
    }
    if (DEFAULT_EMP_ID_BY_EMAIL[emailKey]) {
      return DEFAULT_EMP_ID_BY_EMAIL[emailKey];
    }
  }
  if (fallbackId && fallbackId.trim()) {
    const cleanFallback = fallbackId.trim().toUpperCase();
    if (cleanFallback === 'MOD008') return 'MTK020';
    if (cleanFallback === 'MOD011') return 'MTK023';
    if (cleanFallback === 'MOD001') return 'MTK006';
    return cleanFallback;
  }
  return '';
};



