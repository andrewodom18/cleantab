import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { DEFAULT_SETTINGS, loadSettings, normalizeSettings, saveSettings } from '../../src/shared/settings';

describe('settings', () => {
  beforeEach(() => fakeBrowser.reset());

  it('recovers from missing or corrupt settings', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ theme: 'neon', cleaner: 'bad', suspender: [] })).toEqual(DEFAULT_SETTINGS);
  });

  it('migrates partial settings and clamps inactivity limits', () => {
    const settings = normalizeSettings({
      theme: 'dark',
      cleaner: { automaticCopy: true, excludedDomains: [' Example.com ', 5] },
      suspender: { automatic: true, inactivityMinutes: 2 },
    });
    expect(settings.theme).toBe('dark');
    expect(settings.cleaner.excludedDomains).toEqual(['example.com']);
    expect(settings.suspender.inactivityMinutes).toBe(5);
    expect(settings.schemaVersion).toBe(1);
  });

  it('round-trips normalized values through local extension storage', async () => {
    const saved = await saveSettings({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      cleaner: { ...DEFAULT_SETTINGS.cleaner, customRemoveParameters: [' Campaign_ID ', 'campaign_id'] },
    });
    expect(saved.cleaner.customRemoveParameters).toEqual(['campaign_id']);
    expect(await loadSettings()).toEqual(saved);
  });
});
