import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPermissionStatus: vi.fn(),
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  executeScript: vi.fn(),
  query: vi.fn(),
}));

vi.mock('../../src/shared/permissions', () => ({
  getPermissionStatus: mocks.getPermissionStatus,
}));

vi.mock('../../src/shared/settings', () => ({
  loadSettings: mocks.loadSettings,
  saveSettings: mocks.saveSettings,
}));

vi.mock('wxt/browser', () => ({
  browser: {
    scripting: { executeScript: mocks.executeScript },
    tabs: { query: mocks.query },
  },
}));

import { disableUnavailableAutomations, injectAutomation } from '../../src/background/automation';

function defaultSettings() {
  return {
    schemaVersion: 1,
    theme: 'system',
    cleaner: { automaticCopy: false, excludedDomains: [], customRemoveParameters: [], customKeepParameters: [] },
    suspender: { automatic: false, inactivityMinutes: 30, excludedDomains: [] },
  };
}

describe('automation permission lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadSettings.mockResolvedValue(defaultSettings());
    mocks.getPermissionStatus.mockResolvedValue({ automationAccess: false });
    mocks.saveSettings.mockImplementation(async (settings) => settings);
    mocks.executeScript.mockResolvedValue([]);
  });

  it('turns automatic features off when optional access is revoked', async () => {
    const settings = defaultSettings();
    settings.cleaner.automaticCopy = true;
    settings.suspender.automatic = true;
    mocks.loadSettings.mockResolvedValue(settings);

    await expect(disableUnavailableAutomations()).resolves.toBe(true);
    expect(mocks.saveSettings).toHaveBeenCalledWith(expect.objectContaining({
      cleaner: expect.objectContaining({ automaticCopy: false }),
      suspender: expect.objectContaining({ automatic: false }),
    }));
  });

  it('does not inject page automation without granted access', async () => {
    const settings = defaultSettings();
    settings.cleaner.automaticCopy = true;
    mocks.loadSettings.mockResolvedValue(settings);
    await injectAutomation(7, 'https://example.com');
    expect(mocks.executeScript).not.toHaveBeenCalled();
  });

  it('injects only into web tabs when access and an automatic feature are enabled', async () => {
    const settings = defaultSettings();
    settings.suspender.automatic = true;
    mocks.loadSettings.mockResolvedValue(settings);
    mocks.getPermissionStatus.mockResolvedValue({ automationAccess: true });

    await injectAutomation(7, 'chrome://settings');
    await injectAutomation(8, 'https://example.com');
    expect(mocks.executeScript).toHaveBeenCalledTimes(1);
    expect(mocks.executeScript).toHaveBeenCalledWith({ target: { tabId: 8 }, files: ['/site-automation.js'] });
  });
});
