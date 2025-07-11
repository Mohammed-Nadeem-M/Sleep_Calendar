import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = '@themeMode';

type ThemeStore = {
  mode: ThemeMode;
  /** Load persisted mode, falling back to the system preference. */
  init: () => Promise<void>;
  /** Toggle between light and dark modes and persist the new value. */
  toggle: () => Promise<void>;
};

const defaultMode: ThemeMode =
  Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: defaultMode,

  init: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        set({ mode: saved as ThemeMode });
      }
    } catch (err) {
      console.warn('Failed to load theme mode:', err);
    }
  },

  toggle: async () => {
    const next: ThemeMode = get().mode === 'light' ? 'dark' : 'light';
    set({ mode: next });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (err) {
      console.warn('Failed to persist theme mode:', err);
    }
  },
}));

export const colours = {
  light: { background: '#ffffff', card: '#fafafa', text: '#000000' },
  dark: { background: '#000000', card: '#121212', text: '#ffffff' },
} as const;

export const useColours = () =>
  useThemeStore((s) => (s.mode === 'dark' ? colours.dark : colours.light));
