import { browser } from 'wxt/browser';
import { isUrlExcluded } from '../src/core/domains';
import { cleanUrl } from '../src/core/url-cleaner';
import { loadSettings } from '../src/shared/settings';
import type { CleanTabSettings } from '../src/shared/types';

declare global {
  var __cleanTabAutomationInstalled: boolean | undefined;
}

export default defineUnlistedScript(() => {
  if (globalThis.__cleanTabAutomationInstalled) return;
  globalThis.__cleanTabAutomationInstalled = true;

  let settings: CleanTabSettings | undefined;
  const dirtySources = new Set<Element>();

  const refreshSettings = async () => {
    settings = await loadSettings();
  };

  const reportDirtyState = () => {
    void browser.runtime.sendMessage({ type: 'form-dirty-state', dirty: dirtySources.size > 0 });
  };

  const dirtyOwner = (target: EventTarget | null): Element | null => {
    if (!(target instanceof Element)) return null;
    return target.closest('form') ?? target;
  };

  const onInput = (event: Event) => {
    if (!settings?.suspender.automatic || isUrlExcluded(location.href, settings.suspender.excludedDomains)) return;
    const owner = dirtyOwner(event.target);
    if (!owner) return;
    dirtySources.add(owner);
    reportDirtyState();
  };

  const onSubmitOrReset = (event: Event) => {
    const owner = dirtyOwner(event.target);
    if (!owner) return;
    dirtySources.delete(owner);
    reportDirtyState();
  };

  const selectedText = (event: ClipboardEvent): string => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const start = target.selectionStart ?? 0;
      const end = target.selectionEnd ?? 0;
      return target.value.slice(start, end);
    }
    return window.getSelection()?.toString() ?? '';
  };

  const showToast = (count: number) => {
    document.getElementById('cleantab-copy-toast')?.remove();
    const host = document.createElement('div');
    host.id = 'cleantab-copy-toast';
    host.style.cssText = 'all:initial;position:fixed;right:18px;bottom:18px;z-index:2147483647';
    const root = host.attachShadow({ mode: 'closed' });
    const toast = document.createElement('div');
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = `CleanTab removed ${count} tracking ${count === 1 ? 'parameter' : 'parameters'}.`;
    toast.style.cssText = 'font:600 13px/1.4 system-ui,sans-serif;color:#fff;background:#16181d;border:1px solid #414650;border-radius:10px;padding:10px 12px;box-shadow:0 8px 30px rgba(0,0,0,.25)';
    root.append(toast);
    document.documentElement.append(host);
    window.setTimeout(() => host.remove(), 2800);
  };

  const onCopy = (event: ClipboardEvent) => {
    if (!settings?.cleaner.automaticCopy || isUrlExcluded(location.href, settings.cleaner.excludedDomains)) return;
    const candidate = selectedText(event).trim();
    if (!candidate || /\s/.test(candidate)) return;
    const result = cleanUrl(candidate, {
      excludedDomains: settings.cleaner.excludedDomains,
      customRemoveParameters: settings.cleaner.customRemoveParameters,
      customKeepParameters: settings.cleaner.customKeepParameters,
    });
    if (!result.changed || !event.clipboardData) return;
    event.preventDefault();
    event.clipboardData.setData('text/plain', result.cleanedUrl);
    event.clipboardData.setData('text/uri-list', result.cleanedUrl);
    showToast(result.removedParameters.length);
  };

  document.addEventListener('input', onInput, true);
  document.addEventListener('change', onInput, true);
  document.addEventListener('submit', onSubmitOrReset, true);
  document.addEventListener('reset', onSubmitOrReset, true);
  document.addEventListener('copy', onCopy, true);
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.settings) void refreshSettings();
  });

  void refreshSettings().then(reportDirtyState);
});
