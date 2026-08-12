import { browser } from 'wxt/browser';
import { cleanUrl } from '../../src/core/url-cleaner';
import { isProtectedTabUrl } from '../../src/core/suspension';
import { sendBackgroundRequest } from '../../src/shared/messages';
import { loadSettings } from '../../src/shared/settings';
import { applyTheme } from '../../src/shared/theme';
import type { CleanResult } from '../../src/shared/types';
import { copyText, formatParameterList, getElement, setStatus } from '../../src/shared/ui';
import './style.css';

let activeTab: Browser.tabs.Tab | undefined;
let cleanResult: CleanResult | undefined;

const copyButton = getElement<HTMLButtonElement>('copy-url');
const suspendCurrentButton = getElement<HTMLButtonElement>('suspend-current');
const suspendOthersButton = getElement<HTMLButtonElement>('suspend-others');
const cleanStatus = getElement('clean-status');
const suspendStatus = getElement('suspend-status');
const cleanState = getElement('clean-state');

function setCleanState(label: string, tone: 'neutral' | 'success' | 'warning' = 'neutral'): void {
  cleanState.textContent = label;
  cleanState.dataset.tone = tone;
}

function describeSummary(suspended: number, skipped: Record<string, number | undefined>): string {
  const skippedTotal = Object.values(skipped).reduce<number>((sum, value) => sum + (value ?? 0), 0);
  if (suspended === 0) return skippedTotal > 0 ? `No tabs were suspended. ${skippedTotal} stayed open for safety.` : 'No other eligible tabs were found.';
  return `Suspended ${suspended} ${suspended === 1 ? 'tab' : 'tabs'}${skippedTotal > 0 ? `; ${skippedTotal} stayed open for safety` : ''}.`;
}

async function loadPopup(): Promise<void> {
  const settings = await loadSettings();
  applyTheme(settings.theme);

  const [tabResponse, permissionResponse] = await Promise.all([
    sendBackgroundRequest({ type: 'get-current-tab' }),
    sendBackgroundRequest({ type: 'get-permission-status' }),
  ]);

  if (permissionResponse.ok) {
    const automationEnabled = settings.cleaner.automaticCopy || settings.suspender.automatic;
    getElement('automation-state').textContent = automationEnabled
      ? 'Automation on'
      : permissionResponse.permission?.automationAccess
        ? 'Automation ready'
        : 'Manual mode';
  }

  if (!tabResponse.ok || !tabResponse.tab?.url) {
    getElement('url-host').textContent = 'This page cannot be inspected.';
    setCleanState('Unavailable', 'warning');
    setStatus(cleanStatus, tabResponse.ok ? 'The browser did not provide a page URL.' : tabResponse.error, 'warning');
    suspendCurrentButton.disabled = true;
    return;
  }

  const activeUrl = tabResponse.tab.url;
  activeTab = tabResponse.tab;
  suspendCurrentButton.disabled = isProtectedTabUrl(activeUrl) || Boolean(activeTab.pinned) || Boolean(activeTab.audible);
  if (activeTab.pinned) setStatus(suspendStatus, 'Pinned tabs stay open for safety.');
  else if (activeTab.audible) setStatus(suspendStatus, 'Tabs playing audio stay open for safety.');
  else if (isProtectedTabUrl(activeUrl)) setStatus(suspendStatus, 'Browser and extension pages cannot be suspended.');
  cleanResult = cleanUrl(activeUrl, {
    excludedDomains: settings.cleaner.excludedDomains,
    customRemoveParameters: settings.cleaner.customRemoveParameters,
    customKeepParameters: settings.cleaner.customKeepParameters,
  });

  const host = new URL(activeUrl).hostname;
  getElement('url-host').textContent = host || 'Current page';
  getElement('cleaned-url').textContent = cleanResult.cleanedUrl;
  getElement('removed-parameters').textContent = cleanResult.changed ? formatParameterList(cleanResult.removedParameters) : '';
  copyButton.disabled = cleanResult.reason === 'unsupported' || cleanResult.reason === 'invalid';

  if (cleanResult.changed) {
    setCleanState(`${cleanResult.removedParameters.length} removed`, 'success');
  } else if (cleanResult.reason === 'excluded') {
    setCleanState('Excluded');
  } else if (cleanResult.reason === 'unsupported') {
    setCleanState('Unavailable', 'warning');
    setStatus(cleanStatus, 'Only web links can be cleaned.', 'warning');
  } else {
    setCleanState('Already clean', 'success');
  }
}

copyButton.addEventListener('click', async () => {
  if (!cleanResult) return;
  try {
    await copyText(cleanResult.cleanedUrl);
    setCleanState('Copied', 'success');
    setStatus(cleanStatus, 'Clean link copied.', 'success');
  } catch (error) {
    setStatus(cleanStatus, error instanceof Error ? error.message : 'Could not copy the URL.', 'error');
  }
});

suspendCurrentButton.addEventListener('click', async () => {
  if (activeTab?.id === undefined) return;
  suspendCurrentButton.disabled = true;
  setStatus(suspendStatus, 'Suspending this tab…');
  const response = await sendBackgroundRequest({ type: 'suspend-current', tabId: activeTab.id });
  if (!response.ok) {
    suspendCurrentButton.disabled = false;
    setStatus(suspendStatus, response.error, 'error');
  }
});

suspendOthersButton.addEventListener('click', async () => {
  if (activeTab?.windowId === undefined) return;
  suspendOthersButton.disabled = true;
  setStatus(suspendStatus, 'Checking other tabs…');
  const response = await sendBackgroundRequest({ type: 'suspend-others', windowId: activeTab.windowId });
  suspendOthersButton.disabled = false;
  if (!response.ok || !response.summary) {
    setStatus(suspendStatus, response.ok ? 'No result was returned.' : response.error, 'error');
    return;
  }
  setStatus(suspendStatus, describeSummary(response.summary.suspended, response.summary.skipped), response.summary.suspended > 0 ? 'success' : 'neutral');
});

getElement<HTMLButtonElement>('open-settings').addEventListener('click', () => void browser.runtime.openOptionsPage());

void loadPopup().catch((error) => setStatus(cleanStatus, error instanceof Error ? error.message : 'CleanTab could not load.', 'error'));
