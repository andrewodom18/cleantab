import { browser } from 'wxt/browser';
import { getPermissionStatus } from '../src/shared/permissions';
import type { BackgroundRequest, BackgroundResponse, PreviewPayload } from '../src/shared/types';
import { markTabActive, removeTabActivity, setTabDirty } from '../src/background/activity-store';
import { disableUnavailableAutomations, injectAutomation, injectAutomationIntoOpenTabs } from '../src/background/automation';
import { runAutomaticSuspension, seedActivity, suspendCurrentTab, suspendOtherTabs } from '../src/background/suspender';
import { selectContextMenuUrl } from '../src/core/context-menu';

const AUTO_SUSPEND_ALARM = 'automatic-tab-suspension';
const PREVIEW_PREFIX = 'preview:';
const PREVIEW_TTL_MS = 10 * 60_000;

async function createContextMenus(): Promise<void> {
  await browser.contextMenus.removeAll();
  browser.contextMenus.create({
    id: 'preview-clean-url',
    title: 'Preview URL with CleanTab',
    contexts: ['page', 'link', 'selection'],
  });
}

async function cleanupStalePreviews(): Promise<void> {
  const all = await browser.storage.session.get(null);
  const now = Date.now();
  const staleKeys = Object.entries(all)
    .filter(([key, value]) => key.startsWith(PREVIEW_PREFIX) && (!value || typeof value !== 'object' || now - Number((value as PreviewPayload).createdAt) > PREVIEW_TTL_MS))
    .map(([key]) => key);
  if (staleKeys.length > 0) await browser.storage.session.remove(staleKeys);
}

async function openPreview(url: string): Promise<void> {
  const id = crypto.randomUUID();
  await browser.storage.session.set({ [`${PREVIEW_PREFIX}${id}`]: { url, createdAt: Date.now() } satisfies PreviewPayload });
  await browser.tabs.create({ url: browser.runtime.getURL(`/preview.html?id=${encodeURIComponent(id)}`) });
}

async function initialize(): Promise<void> {
  await Promise.all([
    createContextMenus(),
    cleanupStalePreviews(),
    seedActivity(),
    disableUnavailableAutomations(),
  ]);
  await browser.alarms.create(AUTO_SUSPEND_ALARM, { periodInMinutes: 1 });
  await injectAutomationIntoOpenTabs();
}

let initializationQueue: Promise<void> = Promise.resolve();

function scheduleInitialization(): void {
  initializationQueue = initializationQueue.then(initialize, initialize);
  void initializationQueue.catch(() => {
    // A later browser event retries initialization without crashing the worker.
  });
}

async function handleMessage(request: BackgroundRequest, sender: Browser.runtime.MessageSender): Promise<BackgroundResponse> {
  try {
    switch (request.type) {
      case 'get-permission-status':
        return { ok: true, permission: await getPermissionStatus() };
      case 'get-current-tab': {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        return tab ? { ok: true, tab } : { ok: false, error: 'No active tab is available.' };
      }
      case 'suspend-current':
        return { ok: true, summary: await suspendCurrentTab(request.tabId) };
      case 'suspend-others': {
        const windowId = request.windowId ?? (await browser.windows.getCurrent()).id;
        if (windowId === undefined) return { ok: false, error: 'No browser window is available.' };
        return { ok: true, summary: await suspendOtherTabs(windowId) };
      }
      case 'settings-updated':
        await disableUnavailableAutomations();
        await injectAutomationIntoOpenTabs();
        return { ok: true };
      case 'form-dirty-state':
        if (sender.tab?.id !== undefined) await setTabDirty(sender.tab.id, request.dirty);
        return { ok: true };
      case 'open-preview':
        await openPreview(request.url);
        return { ok: true };
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'CleanTab could not complete the request.' };
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(scheduleInitialization);
  browser.runtime.onStartup.addListener(scheduleInitialization);
  browser.runtime.onMessage.addListener((request, sender) => handleMessage(request as BackgroundRequest, sender));

  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId !== 'preview-clean-url') return;
    const candidate = selectContextMenuUrl(info);
    if (candidate) void openPreview(candidate);
  });

  browser.tabs.onCreated.addListener((tab) => {
    if (tab.id !== undefined) void markTabActive(tab.id);
  });
  browser.tabs.onActivated.addListener(({ tabId }) => void markTabActive(tabId));
  browser.tabs.onRemoved.addListener((tabId) => void removeTabActivity(tabId));
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active || changeInfo.url || changeInfo.status === 'loading') void markTabActive(tabId);
    if (changeInfo.status === 'complete') void injectAutomation(tabId, tab.url);
  });
  browser.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === browser.windows.WINDOW_ID_NONE) return;
    void browser.tabs.query({ active: true, windowId }).then(([tab]) => {
      if (tab?.id !== undefined) return markTabActive(tab.id);
    });
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === AUTO_SUSPEND_ALARM) void runAutomaticSuspension();
  });
  browser.permissions.onRemoved.addListener(() => void disableUnavailableAutomations());

  scheduleInitialization();
});
