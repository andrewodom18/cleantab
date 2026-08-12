import { parseDomainList } from '../../src/core/domains';
import { sendBackgroundRequest } from '../../src/shared/messages';
import { getPermissionStatus, removeAutomationAccess, requestAutomationAccess } from '../../src/shared/permissions';
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
const saveBar = getElement('save-bar');
const saveButton = getElement<HTMLButtonElement>('save-settings');
const formStatus = getElement('form-status');

let hasAutomationAccess = false;
let baseline = '';
let feedbackTimer: number | undefined;

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

function formSnapshot(): string {
  return JSON.stringify({
    automaticCopy: automaticCopy.checked,
    automaticSuspension: automaticSuspension.checked,
    cleanerDomains: cleanerDomains.value,
    suspenderDomains: suspenderDomains.value,
    removeParameters: removeParameters.value,
    keepParameters: keepParameters.value,
    inactivityMinutes: inactivityMinutes.value,
    theme: theme.value,
  });
}

function clearFeedbackTimer(): void {
  if (feedbackTimer !== undefined) window.clearTimeout(feedbackTimer);
  feedbackTimer = undefined;
}

function showSaveBar(message: string, tone: 'neutral' | 'success' | 'warning' | 'error', canSave: boolean): void {
  clearFeedbackTimer();
  saveBar.hidden = false;
  saveButton.disabled = !canSave;
  setStatus(formStatus, message, tone);
}

function hideSaveBar(): void {
  clearFeedbackTimer();
  saveBar.hidden = true;
  saveButton.disabled = false;
}

function markClean(message?: string, tone: 'success' | 'warning' = 'success'): void {
  baseline = formSnapshot();
  if (!message) {
    hideSaveBar();
    return;
  }

  showSaveBar(message, tone, false);
  feedbackTimer = window.setTimeout(() => {
    if (formSnapshot() === baseline) hideSaveBar();
  }, 1800);
}

function updateDirtyState(): void {
  if (!baseline) return;
  if (formSnapshot() === baseline) {
    hideSaveBar();
    return;
  }
  showSaveBar('Unsaved changes', 'neutral', true);
}

function renderPermissionState(): void {
  permissionState.textContent = hasAutomationAccess ? 'Granted' : 'Not granted';
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
  baseline = formSnapshot();
  hideSaveBar();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showSaveBar('Checking settings…', 'neutral', false);

  try {
    const cleanerDomainResult = parseDomainList(cleanerDomains.value);
    const suspenderDomainResult = parseDomainList(suspenderDomains.value);
    const removeResult = parseParameters(removeParameters.value);
    const keepResult = parseParameters(keepParameters.value);
    const invalid = [...cleanerDomainResult.invalid, ...suspenderDomainResult.invalid, ...removeResult.invalid, ...keepResult.invalid];
    if (invalid.length > 0) {
      showSaveBar(`Fix invalid entries: ${invalid.join(', ')}`, 'error', true);
      return;
    }

    const wantsAutomation = automaticCopy.checked || automaticSuspension.checked;
    let permissionDenied = false;
    if (wantsAutomation && !hasAutomationAccess) {
      showSaveBar('Chrome is asking for website access…', 'neutral', false);
      hasAutomationAccess = await requestAutomationAccess();
      renderPermissionState();
      if (!hasAutomationAccess) {
        automaticCopy.checked = false;
        automaticSuspension.checked = false;
        syncInactivityControl();
        permissionDenied = true;
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
    markClean(permissionDenied ? 'Saved. Automatic features stayed off.' : 'Settings saved.', permissionDenied ? 'warning' : 'success');
  } catch (error) {
    showSaveBar(error instanceof Error ? error.message : 'Settings could not be saved.', 'error', true);
  }
});

theme.addEventListener('change', () => applyTheme(theme.value as ThemePreference));
automaticSuspension.addEventListener('change', syncInactivityControl);
form.addEventListener('input', updateDirtyState);
form.addEventListener('change', updateDirtyState);

removeAccessButton.addEventListener('click', async () => {
  removeAccessButton.disabled = true;
  try {
    const settings = await loadSettings();
    settings.cleaner.automaticCopy = false;
    settings.suspender.automatic = false;
    await saveSettings(settings);
    await removeAutomationAccess();
    hasAutomationAccess = false;
    populate(settings);
    renderPermissionState();
    await sendBackgroundRequest({ type: 'settings-updated' });
    markClean('Website access removed.');
  } catch (error) {
    showSaveBar(error instanceof Error ? error.message : 'Website access could not be removed.', 'error', true);
  } finally {
    removeAccessButton.disabled = false;
  }
});

getElement<HTMLButtonElement>('reset-settings').addEventListener('click', async () => {
  if (!window.confirm('Reset every CleanTab setting to its default?')) return;
  try {
    const settings = await resetSettings();
    populate(settings);
    await sendBackgroundRequest({ type: 'settings-updated' });
    markClean('Defaults restored.');
  } catch (error) {
    showSaveBar(error instanceof Error ? error.message : 'Settings could not be reset.', 'error', true);
  }
});

void initialize().catch((error) => {
  populate(DEFAULT_SETTINGS);
  baseline = formSnapshot();
  showSaveBar(error instanceof Error ? error.message : 'Settings could not be loaded.', 'error', true);
});
