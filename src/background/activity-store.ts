import { browser } from 'wxt/browser';
import type { TabActivity } from '../shared/types';

const ACTIVITY_KEY = 'tabActivities';
let cache: Record<string, TabActivity> | undefined;
let mutationQueue: Promise<void> = Promise.resolve();

function normalizeActivity(value: unknown): Record<string, TabActivity> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const normalized: Record<string, TabActivity> = {};
  for (const [tabId, candidate] of Object.entries(value)) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const record = candidate as Record<string, unknown>;
    if (typeof record.lastActiveAt !== 'number' || typeof record.dirty !== 'boolean') continue;
    normalized[tabId] = { lastActiveAt: record.lastActiveAt, dirty: record.dirty };
  }
  return normalized;
}

async function hydrate(): Promise<Record<string, TabActivity>> {
  if (cache) return cache;
  const stored = await browser.storage.session.get(ACTIVITY_KEY);
  cache = normalizeActivity(stored[ACTIVITY_KEY]);
  return cache;
}

async function mutate(action: (records: Record<string, TabActivity>) => void): Promise<void> {
  mutationQueue = mutationQueue.then(async () => {
    const records = await hydrate();
    action(records);
    await browser.storage.session.set({ [ACTIVITY_KEY]: records });
  });
  await mutationQueue;
}

export async function getTabActivity(tabId: number): Promise<TabActivity | undefined> {
  await mutationQueue;
  const records = await hydrate();
  return records[String(tabId)];
}

export async function markTabActive(tabId: number, timestamp = Date.now()): Promise<void> {
  await mutate((records) => {
    records[String(tabId)] = { lastActiveAt: timestamp, dirty: records[String(tabId)]?.dirty ?? false };
  });
}

export async function setTabDirty(tabId: number, dirty: boolean): Promise<void> {
  await mutate((records) => {
    records[String(tabId)] = { lastActiveAt: records[String(tabId)]?.lastActiveAt ?? Date.now(), dirty };
  });
}

export async function removeTabActivity(tabId: number): Promise<void> {
  await mutate((records) => {
    delete records[String(tabId)];
  });
}

export async function seedUnknownTabs(tabs: Browser.tabs.Tab[], timestamp = Date.now()): Promise<void> {
  await mutate((records) => {
    for (const tab of tabs) {
      if (tab.id !== undefined && !records[String(tab.id)]) {
        records[String(tab.id)] = { lastActiveAt: timestamp, dirty: false };
      }
    }
  });
}
