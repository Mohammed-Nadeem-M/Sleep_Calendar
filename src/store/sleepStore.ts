import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';

export type SleepLog = {
  id: string;
  start: string;           // ISO-8601 start date-time
  end?: string;            // ISO-8601 end date-time
  quality?: number;        // e.g. 1-5
  tags: string[];
  createdAt: string;       // ISO-8601 creation date-time
};

const STORAGE_KEY = '@sleepLogs';

type SleepStore = {
  logs: SleepLog[];
  /** Load logs from AsyncStorage – call once, e.g. in app bootstrap */
  init: () => Promise<void>;
  /** Add a new log and persist */
  add: (data: Omit<SleepLog, 'id' | 'createdAt'>) => Promise<void>;
  /** Update an existing log by id and persist */
  update: (id: string, updates: Partial<Omit<SleepLog, 'id' | 'createdAt'>>) => Promise<void>;
  /** Remove a log by id and persist */
  remove: (id: string) => Promise<void>;
  /** Remove all logs and persist */
  clear: () => Promise<void>;
  /** Rename a tag across all logs and persist */
  renameTag: (oldTag: string, newTag: string) => Promise<void>;
  /** Delete a tag from all logs and persist */
  deleteTag: (tag: string) => Promise<void>;
};

export const useSleepStore = create<SleepStore>((set, get) => ({
  logs: [],

  init: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const logs: SleepLog[] = JSON.parse(raw);
        set({ logs });
      }
    } catch (err) {
      console.warn('Failed to load sleep logs:', err);
    }
  },

  add: async (data) => {
    const newLog: SleepLog = {
      id: `${Date.now()}`,          // simple unique id
      createdAt: new Date().toISOString(),
      ...data,
    };

    const logs = [...get().logs, newLog];
    set({ logs });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  },

  update: async (id, updates) => {
    const logs = get().logs.map((log) =>
      log.id === id ? { ...log, ...updates } : log,
    );
    set({ logs });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  },

  remove: async (id) => {
    const logs = get().logs.filter((log) => log.id !== id);
    set({ logs });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  },
  clear: async () => {
    set({ logs: [] });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
  renameTag: async (oldTag, newTag) => {
    const logs = get().logs.map((log) =>
      log.tags.includes(oldTag)
        ? {
            ...log,
            tags: Array.from(
              new Set(log.tags.map((t) => (t === oldTag ? newTag : t))),
            ),
          }
        : log,
    );
    set({ logs });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  },
  deleteTag: async (tag) => {
    const logs = get().logs.map((log) => ({
      ...log,
      tags: log.tags.filter((t) => t !== tag),
    }));
    set({ logs });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  },
}));

/**
 * Helper: returns the duration of a sleep log in hours, or null if `end` is unset.
 */
export const durationHours = (log: SleepLog): number | null => {
  if (!log.end) return null;
  const start = new Date(log.start).getTime();
  const end = new Date(log.end).getTime();
  const diffMs = end - start;
  return diffMs > 0 ? diffMs / 36e5 : null; // 36e5 = 1000*60*60
};


/**
 * Import logs from a parsed JSON structure.  
 * Returns counts of how many records were added, skipped, or overwritten.
 */
export async function importLogs(json: any) {
  const flat: SleepLog[] = Array.isArray(json)
    ? json.flat()
    : Array.isArray(json.logs)
    ? json.logs.flat()
    : [];


  const { add, logs: existing } = useSleepStore.getState();

  let added = 0,
    skipped = 0;

  const intervals = existing.map((l) => ({
    start: new Date(l.start).getTime(),
    end: l.end ? new Date(l.end).getTime() : new Date(l.start).getTime(),
  }));

  for (const r of flat) {
    if (!r.start) continue;
    const rs = new Date(r.start).getTime();
    const re = r.end ? new Date(r.end).getTime() : rs;

    // skip if overlaps any existing interval
    if (intervals.some(({ start, end }) => rs < end && start < re)) {
      skipped++;
      continue;
    }

    await add({ ...(r as any), id: (r as any).id ?? r.start });
    intervals.push({ start: rs, end: re });
    added++;
  }

  return { added, skipped };
}

/**
 * Export the current logs to a temporary JSON file and return its URI.
 */
export async function exportLogs() {
  const logs = useSleepStore.getState().logs;
  const file =
    FileSystem.cacheDirectory + `sleep-export-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(
    file,
    JSON.stringify(logs, null, 2),
  );
  return file;
}
