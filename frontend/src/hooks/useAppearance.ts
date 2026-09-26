import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'system';
export type SidebarVariant = 'aurora' | 'onyx' | 'frost';
export type Density = 'compact' | 'comfortable';

export interface AppearanceSettings {
  theme: Theme;
  sidebarVariant: SidebarVariant;
  density: Density;
  animations: boolean;
}

const STORAGE_KEY = 'nexuspos-appearance';

const defaults: AppearanceSettings = {
  theme: 'dark',
  sidebarVariant: 'aurora',
  density: 'compact',
  animations: true,
};

function load(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
  return defaults;
}

function save(s: AppearanceSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function applyToDOM(s: AppearanceSettings) {
  const root = document.documentElement;

  // Theme
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const useDark = s.theme === 'dark' || (s.theme === 'system' && prefersDark);
  root.setAttribute('data-theme', useDark ? 'dark' : 'light');

  // Sidebar variant
  root.setAttribute('data-sidebar', s.sidebarVariant);

  // Density
  root.setAttribute('data-density', s.density);

  // Animations
  root.setAttribute('data-animations', s.animations ? 'on' : 'off');
}

// --- Context ---
interface AppearanceContextValue {
  settings: AppearanceSettings;
  update: (patch: Partial<AppearanceSettings>) => void;
}

export const AppearanceContext = createContext<AppearanceContextValue>({
  settings: defaults,
  update: () => {},
});

export function useAppearance() {
  return useContext(AppearanceContext);
}

export function useAppearanceState(): AppearanceContextValue {
  const [settings, setSettings] = useState<AppearanceSettings>(load);

  useEffect(() => {
    applyToDOM(settings);
  }, [settings]);

  // Also watch system preference changes when theme === 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (settings.theme === 'system') applyToDOM(settings); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings]);

  const update = (patch: Partial<AppearanceSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  };

  return { settings, update };
}
