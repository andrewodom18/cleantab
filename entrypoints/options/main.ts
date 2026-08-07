import { parseDomainList } from '../../src/core/domains';
import { getPermissionStatus, removeAutomationAccess, requestAutomationAccess } from '../../src/shared/permissions';
import { sendBackgroundRequest } from '../../src/shared/messages';
import { DEFAULT_SETTINGS, loadSettings, resetSettings, saveSettings } from '../../src/shared/settings';
import { applyTheme } from '../../src/shared/theme';
import type { CleanTabSettings, ThemePreference } from '../../src/shared/types';
import { getElement, setStatus } from '../../src/shared/ui';
import './style.css';

const form = getElement<HTMLFormElement>('settings-form');
const automaticCopy = getElement<HTMLInputElement>('automatic-copy');
const automaticSuspension = getElement<HTMLInputElement>('automatic-suspension');
const cleanerDomains = getElement<HTMLTextAreaElement>('cleaner-domains');
const suspenderDomains = getElement<HTMLTextAreaElement>('suspender-domains');
const removeParameters = getElement<HTMLTextAreaElement>('remove-parameters');
const keepParameters = getElement<HTMLTextAreaElement>('keep-parameters');
const inactivityMinutes = getElement<HTMLInputElement>('inactivity-minutes');
const theme = getElement<HTMLSelectElement>('theme');
const permissionState = getElement('permission-state');
const removeAccessButton = getElement<HTMLButtonElement>('remove-access');
const formStatus = getElement('form-status');
let hasAutomationAccess = false;

function syncInactivityControl(): void {
  inactivityMinutes.disabled = !automaticSuspension.checked;
}

function parseParameters(value: string): { values: string[]; invalid: string[] } {
  const entries = value.split(/[\n,]/).map((item) => item.trim().toLowerCase()).filter(Boolean);
  const invalid = entries.filter((entry) => /[\s&=#?]/.test(entry));
  return { values: [...new Set(entries.filter((entry) => !invalid.includes(entry)))], invalid };
}

function populate(settings: CleanTabSettings): void {
  automaticCopy.checked = settings.cleaner.automaticCopy;
  automaticSuspension.checked = settings.suspender.automatic;
  cleanerDomains.value = settings.cleaner.excludedDomains.join('\n');
  suspenderDomains.value = settings.suspender.excludedDomains.join('\n');
  removeParameters.value = settings.cleaner.customRemoveParameters.join('\n');
  keepParameters.value = settings.cleaner.customKeepParameters.join('\n');
  inactivityMinutes.value = String(settings.suspender.inactivityMinutes);
  theme.value = settings.theme;
  syncInactivityControl();
  applyTheme(settings.theme);
}

function renderPermissionState(): void {
  permissionState.textContent = hasAutomationAccess ? 'Website access granted' : 'Website access not granted';
  permissionState.dataset.granted = String(hasAutomationAccess);
  removeAccessButton.hidden = !hasAutomationAccess;
}

async function refreshPermissionState(): Promise<void> {
  hasAutomationAccess = (await getPermissionStatus()).automationAccess;
  renderPermissionState();
}

async function initialize(): Promise<void> {
  const [settings] = await Promise.all([loadSettings(), refreshPermissionState()]);
  populate(settings);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(formStatus, 'Checking settings…');

  const cleanerDomainResult = parseDomainList(cleanerDomains.value);
  const suspenderDomainResult = parseDomainList(suspenderDomains.value);
  const removeResult = parseParameters(removeParameters.value);
  const keepResult = parseParameters(keepParameters.value);
  const invalid = [...cleanerDomainResult.invalid, ...suspenderDomainResult.invalid, ...removeResult.invalid, ...keepResult.invalid];
  if (invalid.length > 0) {
    setStatus(formStatus, `Fix invalid entries: ${invalid.join(', ')}`, 'error');
    return;
  }

  const wantsAutomation = automaticCopy.checked || automaticSuspension.checked;
  if (wantsAutomation && !hasAutomationAccess) {
    setStatus(formStatus, 'Chrome is asking for website access…');
    hasAutomationAccess = await requestAutomationAccess();
    renderPermissionState();
    if (!hasAutomationAccess) {
      automaticCopy.checked = false;
      automaticSuspension.checked = false;
      setStatus(formStatus, 'Website access was not granted. Manual tools remain available.', 'warning');
    }
  }

  const settings: CleanTabSettings = {
    schemaVersion: 1,
    theme: theme.value as ThemePreference,
    cleaner: {
      automaticCopy: automaticCopy.checked && hasAutomationAccess,
      excludedDomains: cleanerDomainResult.domains,
      customRemoveParameters: removeResult.values,
      customKeepParameters: keepResult.values,
    },
    suspender: {
      automatic: automaticSuspension.checked && hasAutomationAccess,
      inactivityMinutes: Number(inactivityMinutes.value),
      excludedDomains: suspenderDomainResult.domains,
    },
  };

  const saved = await saveSettings(settings);
  populate(saved);
  await sendBackgroundRequest({ type: 'settings-updated' });
  setStatus(formStatus, wantsAutomation && !hasAutomationAccess ? 'Saved. Automatic features stayed off.' : 'Settings saved.', wantsAutomation && !hasAutomationAccess ? 'warning' : 'success');
});

theme.addEventListener('change', () => applyTheme(theme.value as ThemePreference));
automaticSuspension.addEventListener('change', syncInactivityControl);

removeAccessButton.addEventListener('click', async () => {
  removeAccessButton.disabled = true;
  const settings = await loadSettings();
  settings.cleaner.automaticCopy = false;
  settings.suspender.automatic = false;
  await saveSettings(settings);
  await removeAutomationAccess();
  hasAutomationAccess = false;
  populate(settings);
  renderPermissionState();
  removeAccessButton.disabled = false;
  await sendBackgroundRequest({ type: 'settings-updated' });
  setStatus(formStatus, 'Website access removed. Manual tools still work.', 'success');
});

getElement<HTMLButtonElement>('reset-settings').addEventListener('click', async () => {
  if (!window.confirm('Reset every CleanTab setting to its default?')) return;
  const settings = await resetSettings();
  populate(settings);
  await sendBackgroundRequest({ type: 'settings-updated' });
  setStatus(formStatus, 'Default settings restored.', 'success');
});

void initialize().catch((error) => {
  populate(DEFAULT_SETTINGS);
  setStatus(formStatus, error instanceof Error ? error.message : 'Settings could not be loaded.', 'error');
});
