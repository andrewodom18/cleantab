import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
  discard: vi.fn(),
  query: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  loadSettings: vi.fn(),
  getTabActivity: vi.fn(),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: mocks,
  },
}));

vi.mock('../../src/shared/settings', () => ({
  loadSettings: mocks.loadSettings,
}));

vi.mock('../../src/background/activity-store', () => ({
  getTabActivity: mocks.getTabActivity,
  markTabActive: vi.fn(),
  seedUnknownTabs: vi.fn(),
}));

import { suspendCurrentTab, suspendOtherTabs } from '../../src/background/suspender';

function defaultSettings() {
  return {
    schemaVersion: 1,
    theme: 'system',
    cleaner: { automaticCopy: false, excludedDomains: [], customRemoveParameters: [], customKeepParameters: [] },
    suspender: { automatic: false, inactivityMinutes: 30, excludedDomains: [] },
  };
}

describe('suspendCurrentTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadSettings.mockResolvedValue(defaultSettings());
    mocks.getTabActivity.mockResolvedValue({ lastActiveAt: Date.now(), dirty: false });
    mocks.get.mockResolvedValue({ id: 8, active: true, windowId: 2, index: 3, url: 'https://example.com', pinned: false, audible: false, discarded: false });
    mocks.query.mockResolvedValue([]);
    mocks.create.mockResolvedValue({ id: 9 });
    mocks.discard.mockResolvedValue({ id: 8, discarded: true });
    mocks.update.mockResolvedValue({ id: 8, active: true });
    mocks.remove.mockResolvedValue(undefined);
  });

  it('opens an adjacent tab before discarding the original active tab', async () => {
    await expect(suspendCurrentTab(8)).resolves.toEqual({ suspended: 1, skipped: {} });
    expect(mocks.create).toHaveBeenCalledWith({ active: true, index: 4, windowId: 2 });
    expect(mocks.create.mock.invocationCallOrder[0]!).toBeLessThan(mocks.discard.mock.invocationCallOrder[0]!);
  });

  it('switches to the nearest existing tab instead of creating a blank tab', async () => {
    mocks.query.mockResolvedValue([
      { id: 7, active: false, windowId: 2, index: 2 },
      { id: 8, active: true, windowId: 2, index: 3 },
      { id: 10, active: false, windowId: 2, index: 5 },
    ]);

    await expect(suspendCurrentTab(8)).resolves.toEqual({ suspended: 1, skipped: {} });
    expect(mocks.update).toHaveBeenCalledWith(7, { active: true });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update.mock.invocationCallOrder[0]!).toBeLessThan(mocks.discard.mock.invocationCallOrder[0]!);
  });

  it('reactivates the original and removes the helper if discard fails', async () => {
    mocks.discard.mockRejectedValue(new Error('refused'));
    await expect(suspendCurrentTab(8)).rejects.toThrow('refused');
    expect(mocks.update).toHaveBeenCalledWith(8, { active: true });
    expect(mocks.remove).toHaveBeenCalledWith(9);
  });

  it('refuses stale requests before creating another tab', async () => {
    mocks.get.mockResolvedValue({ id: 8, active: false, windowId: 2, index: 3, url: 'https://example.com' });
    await expect(suspendCurrentTab(8)).rejects.toThrow('no longer active');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('protects pinned tabs even when suspension is requested manually', async () => {
    mocks.get.mockResolvedValue({ id: 8, active: true, windowId: 2, index: 3, url: 'https://example.com', pinned: true });
    await expect(suspendCurrentTab(8)).rejects.toThrow('pinned');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('reports suspended and safety-skipped tabs for a manual batch', async () => {
    mocks.query.mockResolvedValue([
      { id: 1, active: true, pinned: false, audible: false, discarded: false, url: 'https://active.example', windowId: 2, index: 0 },
      { id: 2, active: false, pinned: true, audible: false, discarded: false, url: 'https://pinned.example', windowId: 2, index: 1 },
      { id: 3, active: false, pinned: false, audible: false, discarded: false, url: 'https://eligible.example', windowId: 2, index: 2 },
    ]);
    mocks.discard.mockResolvedValue({ id: 3, discarded: true });

    await expect(suspendOtherTabs(2)).resolves.toEqual({ suspended: 1, skipped: { active: 1, pinned: 1 } });
    expect(mocks.discard).toHaveBeenCalledWith(3);
  });
});
