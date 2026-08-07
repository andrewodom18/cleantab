import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
  discard: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: mocks,
  },
}));

vi.mock('../../src/shared/settings', () => ({
  loadSettings: vi.fn(async () => ({
    schemaVersion: 1,
    theme: 'system',
    cleaner: { automaticCopy: false, excludedDomains: [], customRemoveParameters: [], customKeepParameters: [] },
    suspender: { automatic: false, inactivityMinutes: 30, excludedDomains: [] },
  })),
}));

vi.mock('../../src/background/activity-store', () => ({
  getTabActivity: vi.fn(async () => ({ lastActiveAt: Date.now(), dirty: false })),
  markTabActive: vi.fn(),
  seedUnknownTabs: vi.fn(),
}));

import { suspendCurrentTab } from '../../src/background/suspender';

describe('suspendCurrentTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ id: 8, active: true, windowId: 2, index: 3, url: 'https://example.com', pinned: false, audible: false, discarded: false });
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
});
