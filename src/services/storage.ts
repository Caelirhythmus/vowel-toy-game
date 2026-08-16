/* ============================================================
 * services：存储适配器（可配置化 —— 持久化与核心解耦）
 * localStorage 不可用（隐私模式/file://）时降级为内存存储
 * ============================================================ */

export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

class MemoryStorage implements StorageAdapter {
  private map = new Map<string, string>();
  get(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
  remove(key: string): void {
    this.map.delete(key);
  }
}

function detectStorage(): StorageAdapter {
  try {
    const probe = '__vl_probe__';
    const ls = globalThis.localStorage;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      get: (key) => ls.getItem(key),
      set: (key, value) => ls.setItem(key, value),
      remove: (key) => ls.removeItem(key)
    };
  } catch {
    return new MemoryStorage();
  }
}

export const storage: StorageAdapter = detectStorage();

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = storage.get(key);
    if (raw == null) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    storage.set(key, JSON.stringify(value));
  } catch {
    /* 忽略写入失败 */
  }
}

/* ---------- 应用级键名与类型 ---------- */
export const STORAGE_KEYS = {
  lang: 'vl.lang',
  settings: 'vl.settings',
  history: 'vl.history',
  theme: 'vl.theme',
  tierStyle: 'vl.tierStyle'
} as const;

export interface HistoryEntry {
  date: string;
  correct: number;
  incorrect: number;
  total: number;
  bestStreak: number;
}

export function loadHistory(): HistoryEntry[] {
  return loadJSON<HistoryEntry[]>(STORAGE_KEYS.history, []);
}

export function appendHistory(entry: HistoryEntry): HistoryEntry[] {
  const list = loadHistory();
  list.push(entry);
  saveJSON(STORAGE_KEYS.history, list.slice(-50));
  return list;
}
