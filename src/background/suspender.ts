import { browser } from 'wxt/browser';
import { getSuspensionDecision } from '../core/suspension';
import { loadSettings } from '../shared/settings';
import type { SuspensionSkipReason, SuspensionSummary } from '../shared/types';
import { getTabActivity, markTabActive, seedUnknownTabs } from './activity-store';

function increment(summary: SuspensionSummary, reason: SuspensionSkipReason | 'failed'): void {
  summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1;
}

export async function suspendCurrentTab(tabId: number): Promise<SuspensionSummary> {
  const [tab, settings, activity] = await Promise.all([
    browser.tabs.get(tabId),
    loadSettings(),
    getTabActivity(tabId),
  ]);
  if (!tab.active || tab.windowId === undefined || tab.index === undefined) {
    throw new Error('The selected tab is no longer active.');
  }

  const safetyDecision = getSuspensionDecision({
    tab: { ...tab, active: false },
    activity,
    settings,
    now: Date.now(),
    requireInactivePeriod: false,
  });
  if (!safetyDecision.eligible) {
    const labels: Partial<Record<SuspensionSkipReason, string>> = {
      pinned: 'pinned',
      audible: 'playing audio',
      discarded: 'already suspended',
      protected: 'a protected browser page',
      'excluded-domain': 'excluded in Settings',
      'dirty-form': 'holding unsaved form changes',
    };
    throw new Error(`This tab stayed open because it is ${labels[safetyDecision.reason ?? 'protected'] ?? 'protected'}.`);
  }

  let helperTabId: number | undefined;
  try {
    const helper = await browser.tabs.create({
      active: true,
      index: tab.index + 1,
      windowId: tab.windowId,
    });
    helperTabId = helper.id;
    const discarded = await browser.tabs.discard(tabId);
    if (!discarded?.discarded) throw new Error('The browser refused to suspend this tab.');
    return { suspended: 1, skipped: {} };
  } catch (error) {
    try {
      await browser.tabs.update(tabId, { active: true });
      if (helperTabId !== undefined) await browser.tabs.remove(helperTabId);
    } catch {
      // Preserve the original suspension error if rollback is partially unavailable.
    }
    throw error;
  }
}

export async function suspendOtherTabs(windowId: number): Promise<SuspensionSummary> {
  const [tabs, settings] = await Promise.all([browser.tabs.query({ windowId }), loadSettings()]);
  const summary: SuspensionSummary = { suspended: 0, skipped: {} };
  const now = Date.now();

  for (const tab of tabs) {
    if (tab.id === undefined) continue;
    const activity = await getTabActivity(tab.id);
    const decision = getSuspensionDecision({ tab, activity, settings, now, requireInactivePeriod: false });
    if (!decision.eligible) {
      increment(summary, decision.reason ?? 'failed');
      continue;
    }
    try {
      const discarded = await browser.tabs.discard(tab.id);
      if (discarded?.discarded) summary.suspended += 1;
      else increment(summary, 'failed');
    } catch {
      increment(summary, 'failed');
    }
  }

  return summary;
}

export async function runAutomaticSuspension(): Promise<SuspensionSummary> {
  const settings = await loadSettings();
  const summary: SuspensionSummary = { suspended: 0, skipped: {} };
  if (!settings.suspender.automatic) return summary;

  const tabs = await browser.tabs.query({});
  await seedUnknownTabs(tabs);
  const now = Date.now();

  for (const tab of tabs) {
    if (tab.id === undefined) continue;
    const activity = await getTabActivity(tab.id);
    const decision = getSuspensionDecision({ tab, activity, settings, now, requireInactivePeriod: true });
    if (!decision.eligible) {
      increment(summary, decision.reason ?? 'failed');
      continue;
    }
    try {
      const discarded = await browser.tabs.discard(tab.id);
      if (discarded?.discarded) summary.suspended += 1;
      else increment(summary, 'failed');
    } catch {
      increment(summary, 'failed');
    }
  }

  return summary;
}

export async function seedActivity(): Promise<void> {
  const tabs = await browser.tabs.query({});
  await seedUnknownTabs(tabs);
  for (const tab of tabs) {
    if (tab.active && tab.id !== undefined) await markTabActive(tab.id);
  }
}
