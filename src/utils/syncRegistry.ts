// Shared utility to track deletions across AuthContext and AppContext

const STORAGE_KEY_DELETED = 'modela_deleted_registry_v3';

export const getDeletedRegistry = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.map(s => String(s).toLowerCase().trim()));
      }
    }
  } catch {}
  return new Set([
    'alex.morgan@modela.io',
    'elena.rostova@modela.io',
    'rani123@gmail.com',
    'mod002',
    'mod004',
    'mod009',
    'req-622',
    'req-719',
    'riju1234',
    'abc123'
  ]);
};

export const recordDeletedRecord = (...identifiers: (string | undefined | null)[]): void => {
  try {
    const registry = getDeletedRegistry();
    identifiers.forEach(id => {
      if (id && id.trim()) {
        registry.add(id.toLowerCase().trim());
      }
    });
    localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(Array.from(registry)));
  } catch (e) {
    console.warn('Failed recording deleted identifier:', e);
  }
};

export const isRecordDeleted = (...identifiers: (string | undefined | null)[]): boolean => {
  const registry = getDeletedRegistry();
  return identifiers.some(id => id && registry.has(id.toLowerCase().trim()));
};
