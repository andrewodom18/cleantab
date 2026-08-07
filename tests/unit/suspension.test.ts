import { describe, expect, it } from 'vitest';
import { getSuspensionDecision, isProtectedTabUrl } from '../../src/core/suspension';
import { DEFAULT_SETTINGS } from '../../src/shared/settings';

const now = 10_000_000;

function tab(overrides: Partial<Browser.tabs.Tab> = {}): Browser.tabs.Tab {
  return {
    active: false,
    audible: false,
    discarded: false,
    highlighted: false,
    incognito: false,
    index: 0,
    pinned: false,
    selected: false,
    windowId: 1,
    url: 'https://example.com',
    ...overrides,
  } as Browser.tabs.Tab;
}

function decision(tabOverrides: Partial<Browser.tabs.Tab>, activity = { lastActiveAt: now - 31 * 60_000, dirty: false }, requireInactivePeriod = true) {
  return getSuspensionDecision({ tab: tab(tabOverrides), activity, settings: DEFAULT_SETTINGS, now, requireInactivePeriod });
}

describe('tab suspension decisions', () => {
  it.each([
    [{ active: true }, 'active'],
    [{ pinned: true }, 'pinned'],
    [{ audible: true }, 'audible'],
    [{ discarded: true }, 'discarded'],
    [{ url: 'chrome://settings' }, 'protected'],
  ] as const)('skips protected tab state %#', (overrides, reason) => {
    expect(decision(overrides)).toEqual({ eligible: false, reason });
  });

  it('skips excluded domains and dirty forms', () => {
    const settings = { ...DEFAULT_SETTINGS, suspender: { ...DEFAULT_SETTINGS.suspender, excludedDomains: ['example.com'] } };
    expect(getSuspensionDecision({ tab: tab(), activity: { lastActiveAt: 0, dirty: false }, settings, now, requireInactivePeriod: true }).reason).toBe('excluded-domain');
    expect(decision({}, { lastActiveAt: 0, dirty: true }).reason).toBe('dirty-form');
  });

  it('treats unknown and recent activity conservatively', () => {
    expect(getSuspensionDecision({ tab: tab(), activity: undefined, settings: DEFAULT_SETTINGS, now, requireInactivePeriod: true }).reason).toBe('unknown-activity');
    expect(decision({}, { lastActiveAt: now - 29 * 60_000, dirty: false }).reason).toBe('recent');
  });

  it('allows expired inactive tabs and ignores the timer for manual batches', () => {
    expect(decision({}).eligible).toBe(true);
    expect(getSuspensionDecision({ tab: tab(), activity: undefined, settings: DEFAULT_SETTINGS, now, requireInactivePeriod: false }).eligible).toBe(true);
  });

  it('protects all non-HTTP browser locations', () => {
    expect(isProtectedTabUrl('about:blank')).toBe(true);
    expect(isProtectedTabUrl('file:///tmp/test')).toBe(true);
    expect(isProtectedTabUrl('https://example.com')).toBe(false);
  });
});
