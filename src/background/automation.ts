import { browser } from 'wxt/browser';
import { getPermissionStatus } from '../shared/permissions';
import { loadSettings, saveSettings } from '../shared/settings';

function isWebUrl(url?: string): boolean {
  return Boolean(url && (url.startsWith('http://') || url.startsWith('https://')));
}

export async function injectAutomation(tabId: number, url?: string): Promise<void> {
  if (!isWebUrl(url)) return;
  const [settings, permissions] = await Promise.all([loadSettings(), getPermissionStatus()]);
  if (!permissions.automationAccess || (!settings.cleaner.automaticCopy && !settings.suspender.automatic)) return;

  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['/site-automation.js'],
    });
  } catch {
    // Some browser-protected pages report web-like URLs but still reject injection.
  }
}

export async function injectAutomationIntoOpenTabs(): Promise<void> {
  const tabs = await browser.tabs.query({});
  await Promise.all(tabs.map((tab) => tab.id === undefined ? Promise.resolve() : injectAutomation(tab.id, tab.url)));
}

export async function disableUnavailableAutomations(): Promise<boolean> {
  const [settings, permissions] = await Promise.all([loadSettings(), getPermissionStatus()]);
  if (permissions.automationAccess || (!settings.cleaner.automaticCopy && !settings.suspender.automatic)) return false;

  settings.cleaner.automaticCopy = false;
  settings.suspender.automatic = false;
  await saveSettings(settings);
  return true;
}
