import { browser } from 'wxt/browser';
import { cleanUrl } from '../../src/core/url-cleaner';
import { loadSettings } from '../../src/shared/settings';
import { applyTheme } from '../../src/shared/theme';
import type { PreviewPayload } from '../../src/shared/types';
import { copyText, formatParameterList, getElement, setStatus } from '../../src/shared/ui';
import './style.css';

const originalElement = getElement('original-url');
const cleanedElement = getElement('cleaned-url');
const removedElement = getElement('removed-parameters');
const statusElement = getElement('preview-status');
const copyButton = getElement<HTMLButtonElement>('copy-preview');
let cleanedUrl = '';

async function initialize(): Promise<void> {
  const settings = await loadSettings();
  applyTheme(settings.theme);
  const id = new URLSearchParams(location.search).get('id');
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('This preview link is invalid or has expired.');

  const key = `preview:${id}`;
  const stored = await browser.storage.session.get(key);
  await browser.storage.session.remove(key);
  const payload = stored[key] as PreviewPayload | undefined;
  if (!payload?.url) throw new Error('This preview has expired. Open it again from the CleanTab menu.');

  const result = cleanUrl(payload.url, {
    excludedDomains: settings.cleaner.excludedDomains,
    customRemoveParameters: settings.cleaner.customRemoveParameters,
    customKeepParameters: settings.cleaner.customKeepParameters,
  });
  originalElement.textContent = result.originalUrl;
  cleanedElement.textContent = result.cleanedUrl;
  removedElement.textContent = result.changed ? formatParameterList(result.removedParameters) : '';
  cleanedUrl = result.cleanedUrl;
  copyButton.disabled = result.reason === 'invalid' || result.reason === 'unsupported';

  if (result.changed) setStatus(statusElement, `${result.removedParameters.length} tracking ${result.removedParameters.length === 1 ? 'parameter' : 'parameters'} removed.`, 'success');
  else if (result.reason === 'excluded') setStatus(statusElement, 'This domain is excluded in your settings.');
  else if (result.reason === 'invalid') setStatus(statusElement, 'The selected text is not a complete URL.', 'error');
  else if (result.reason === 'unsupported') setStatus(statusElement, 'Only HTTP and HTTPS URLs are supported.', 'warning');
  else setStatus(statusElement, 'This URL is already clean.', 'success');
}

copyButton.addEventListener('click', async () => {
  try {
    await copyText(cleanedUrl);
    setStatus(statusElement, 'Clean URL copied.', 'success');
  } catch (error) {
    setStatus(statusElement, error instanceof Error ? error.message : 'Could not copy the URL.', 'error');
  }
});

getElement<HTMLButtonElement>('close-preview').addEventListener('click', () => void browser.tabs.getCurrent().then((tab) => tab?.id === undefined ? window.close() : browser.tabs.remove(tab.id)));

void initialize().catch((error) => {
  originalElement.textContent = 'Preview unavailable';
  cleanedElement.textContent = '';
  setStatus(statusElement, error instanceof Error ? error.message : 'This preview could not be opened.', 'error');
});
