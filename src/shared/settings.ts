import { browser } from 'wxt/browser';
import {
  SETTINGS_SCHEMA_VERSION,
  type CleanTabSettings,
  type ThemePreference,
} from './types';

export const SETTINGS_KEY = 'settings';

export const DEFAULT_SETTINGS: CleanTabSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  theme: 'system',
  cleaner: {
    automaticCopy: false,
    excludedDomains: [],
    customRemoveParameters: [],
    customKeepParameters: [],
  },
  suspender: {
    automatic: false,
    inactivityMinutes: 30,
    excludedDomains: [],
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

function asTheme(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : DEFAULT_SETTINGS.theme;
}

export function normalizeSettings(value: unknown): CleanTabSettings {
  const root = isRecord(value) ? value : {};
  const cleaner = isRecord(root.cleaner) ? root.cleaner : {};
  const suspender = isRecord(root.suspender) ? root.suspender : {};
  const rawMinutes = typeof suspender.inactivityMinutes === 'number' ? suspender.inactivityMinutes : DEFAULT_SETTINGS.suspender.inactivityMinutes;

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    theme: asTheme(root.theme),
    cleaner: {
      automaticCopy: asBoolean(cleaner.automaticCopy, false),
      excludedDomains: asStringArray(cleaner.excludedDomains),
      customRemoveParameters: asStringArray(cleaner.customRemoveParameters),
      customKeepParameters: asStringArray(cleaner.customKeepParameters),
    },
    suspender: {
      automatic: asBoolean(suspender.automatic, false),
      inactivityMinutes: Math.min(1440, Math.max(5, Math.round(rawMinutes))),
      excludedDomains: asStringArray(suspender.excludedDomains),
    },
  };
}

export async function loadSettings(): Promise<CleanTabSettings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(stored[SETTINGS_KEY]);
}

export async function saveSettings(settings: CleanTabSettings): Promise<CleanTabSettings> {
  const normalized = normalizeSettings(settings);
  await browser.storage.local.set({ [SETTINGS_KEY]: normalized });
  return normalized;
}

export async function resetSettings(): Promise<CleanTabSettings> {
  const settings = normalizeSettings(DEFAULT_SETTINGS);
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
  return settings;
}
