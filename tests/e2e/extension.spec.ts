/// <reference types="chrome" />

import { test as base, chromium, expect, type BrowserContext, type Worker } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { existsSync } from 'node:fs';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

interface ExtensionFixtures {
  context: BrowserContext;
  extensionId: string;
  serviceWorker: Worker;
}

const extensionPath = resolve('.output/chrome-mv3');

const test = base.extend<ExtensionFixtures>({
  // Playwright requires fixture callbacks to use an object destructuring parameter.
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    if (!existsSync(resolve(extensionPath, 'manifest.json'))) throw new Error('Run npm run build before the browser tests.');
    const context = await chromium.launchPersistentContext('', {
      channel: (process.env.CLEANTAB_BROWSER_CHANNEL ?? 'chromium') as 'chromium' | 'chrome',
      headless: false,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
  },
  serviceWorker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    await use(worker);
  },
  extensionId: async ({ serviceWorker }, use) => {
    await use(new URL(serviceWorker.url()).host);
  },
});

let server: Server;
let testOrigin: string;

test.beforeAll(async () => {
  server = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html><title>CleanTab test</title><h1>Test page</h1><p>${request.url}</p><form><input aria-label="Draft" /></form>`);
  });
  await new Promise<void>((resolveReady) => server.listen(0, '127.0.0.1', resolveReady));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not start.');
  testOrigin = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise<void>((resolveClosed, reject) => server.close((error) => error ? reject(error) : resolveClosed()));
});

test('loads the popup and options UI from the packaged extension', async ({ context, extensionId }) => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.getByRole('heading', { name: 'Cleaner links. Calmer tabs.' })).toBeVisible();
  await expect(popup.getByText('Local only')).toBeVisible();
  await expect(popup.getByRole('heading', { name: 'Suspend tabs' })).toBeVisible();
  expect(await popup.locator('.popup-shell').evaluate((element) => element.getBoundingClientRect().height)).toBeLessThanOrEqual(600);

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(options.getByRole('heading', { name: 'Choose what CleanTab handles automatically.' })).toBeVisible();
  await expect(options.getByText('Website access not granted')).toBeVisible();
  await expect(options.getByText('Exceptions and custom rules')).toBeVisible();
  await expect(options.getByLabel('Do not clean these domains')).not.toBeVisible();

  const copySwitch = options.getByRole('switch', { name: /Automatically clean copied URLs/ });
  await copySwitch.focus();
  await options.keyboard.press('Space');
  await expect(copySwitch).toBeChecked();

  const suspensionSwitch = options.getByRole('switch', { name: /Automatically suspend inactive tabs/ });
  await expect(options.getByLabel('Suspend after')).toBeDisabled();
  await suspensionSwitch.click();
  await expect(options.getByLabel('Suspend after')).toBeEnabled();

  const advancedSummary = options.locator('summary');
  await advancedSummary.focus();
  await options.keyboard.press('Enter');
  await expect(options.getByLabel('Do not clean these domains')).toBeVisible();
});

test('persists validated settings and applies the chosen theme', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.getByText('Exceptions and custom rules').click();
  await page.getByLabel('Do not clean these domains').fill('example.com');
  await page.getByLabel('Additional parameters to remove').fill('campaign_id');
  await page.getByLabel('Choose theme').selectOption('dark');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Settings saved.')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByLabel('Do not clean these domains')).toHaveValue('example.com');
  await expect(page.getByLabel('Additional parameters to remove')).toHaveValue('campaign_id');
});

test('renders and consumes a session-only URL preview', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  const id = '12345678-1234-1234-1234-123456789abc';
  await page.evaluate(async ({ key, url }) => {
    await chrome.storage.session.set({ [key]: { url, createdAt: Date.now() } });
  }, { key: `preview:${id}`, url: 'https://example.test/article?id=7&utm_source=email#read' });

  await page.goto(`chrome-extension://${extensionId}/preview.html?id=${id}`);
  await expect(page.getByText('https://example.test/article?id=7#read', { exact: true })).toBeVisible();
  await expect(page.getByText('utm_source', { exact: true })).toBeVisible();
  await expect(page.getByText('1 tracking parameter removed.')).toBeVisible();
  const removed = await page.evaluate((key) => chrome.storage.session.get(key), `preview:${id}`);
  expect(removed).toEqual({});
});

test('cleans exact copied URLs and reports unsaved form state in the opt-in page script', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'cleantab-e2e-'));
  const testExtensionPath = join(temporaryRoot, 'extension');
  await cp(extensionPath, testExtensionPath, { recursive: true });
  const manifestPath = join(testExtensionPath, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.permissions.push('scripting');
  manifest.host_permissions = manifest.optional_host_permissions;
  delete manifest.optional_permissions;
  delete manifest.optional_host_permissions;
  await writeFile(manifestPath, JSON.stringify(manifest));

  const automationContext = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${testExtensionPath}`, `--load-extension=${testExtensionPath}`],
  });

  try {
    let [worker] = automationContext.serviceWorkers();
    worker ??= await automationContext.waitForEvent('serviceworker');
    const automationExtensionId = new URL(worker.url()).host;
    const controller = await automationContext.newPage();
    await controller.goto(`chrome-extension://${automationExtensionId}/options.html`);
    await controller.evaluate(async () => {
      await chrome.storage.local.set({
        settings: {
          schemaVersion: 1,
          theme: 'system',
          cleaner: { automaticCopy: true, excludedDomains: [], customRemoveParameters: [], customKeepParameters: [] },
          suspender: { automatic: true, inactivityMinutes: 30, excludedDomains: [] },
        },
      });
      await chrome.runtime.sendMessage({ type: 'settings-updated' });
    });

    const page = await automationContext.newPage();
    await page.goto(`${testOrigin}/automation`);
    await expect.poll(async () => page.evaluate(() => {
      let input = document.querySelector<HTMLInputElement>('#copy-test');
      if (!input) {
        input = document.createElement('input');
        input.id = 'copy-test';
        document.body.append(input);
      }
      input.value = 'https://example.com/article?id=7&utm_source=email#read';
      input.select();
      const clipboardData = new DataTransfer();
      const event = new ClipboardEvent('copy', { bubbles: true, cancelable: true, clipboardData });
      const dispatched = input.dispatchEvent(event);
      return { value: clipboardData.getData('text/plain'), cancelled: !dispatched };
    })).toEqual({ value: 'https://example.com/article?id=7#read', cancelled: true });

    const surroundingText = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('#copy-test');
      if (!input) throw new Error('Copy test input is missing.');
      input.value = 'Share https://example.com/?utm_source=email now';
      input.select();
      const clipboardData = new DataTransfer();
      const event = new ClipboardEvent('copy', { bubbles: true, cancelable: true, clipboardData });
      return { value: clipboardData.getData('text/plain'), cancelled: !input.dispatchEvent(event) };
    });
    expect(surroundingText).toEqual({ value: '', cancelled: false });

    await page.getByLabel('Draft').fill('Unsaved note');
    await expect.poll(async () => controller.evaluate(async (origin) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((candidate) => candidate.url?.startsWith(origin));
      const stored = await chrome.storage.session.get('tabActivities');
      const records = stored.tabActivities as Record<string, { dirty?: boolean }> | undefined;
      return tab?.id === undefined ? undefined : records?.[String(tab.id)]?.dirty;
    }, testOrigin)).toBe(true);

    await page.locator('form').evaluate((form) => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await expect.poll(async () => controller.evaluate(async (origin) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((candidate) => candidate.url?.startsWith(origin));
      const stored = await chrome.storage.session.get('tabActivities');
      const records = stored.tabActivities as Record<string, { dirty?: boolean }> | undefined;
      return tab?.id === undefined ? undefined : records?.[String(tab.id)]?.dirty;
    }, testOrigin)).toBe(false);
  } finally {
    await automationContext.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test.describe('native discard flows', () => {
  test.skip(true, 'Chromium terminates its DevTools-controlled browser when tabs.discard unloads a controlled tab. These flows have mocked integration coverage and a real-Chrome release checklist.');

  test('suspends eligible tabs while retaining the active tab', async ({ context, extensionId }) => {
    const first = await context.newPage();
    await first.goto(`${testOrigin}/one`);
    const second = await context.newPage();
    await second.goto(`${testOrigin}/two`);
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);

    const result = await options.evaluate(async () => {
      const current = await chrome.windows.getCurrent();
      return chrome.runtime.sendMessage({ type: 'suspend-others', windowId: current.id });
    });
    expect(result.ok).toBe(true);
    expect(result.summary.suspended).toBeGreaterThanOrEqual(2);

    const state = await options.evaluate(async (origin) => {
      const tabs = await chrome.tabs.query({});
      return tabs.filter((tab) => tab.url?.startsWith(origin)).map((tab) => tab.discarded);
    }, testOrigin);
    expect(state).toEqual([true, true]);
  });

  test('rolls an active tab into native suspended state without losing it', async ({ context, extensionId }) => {
    const target = await context.newPage();
    await target.goto(`${testOrigin}/current`);
    const controller = await context.newPage();
    await controller.goto(`chrome-extension://${extensionId}/options.html`);

    const result = await controller.evaluate(async (origin) => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find((tab) => tab.url?.startsWith(`${origin}/current`));
      if (targetTab?.id === undefined) throw new Error('Target tab not found');
      await chrome.tabs.update(targetTab.id, { active: true });
      return chrome.runtime.sendMessage({ type: 'suspend-current', tabId: targetTab.id });
    }, testOrigin);
    expect(result).toEqual({ ok: true, summary: { suspended: 1, skipped: {} } });

    const discarded = await controller.evaluate(async (origin) => {
      const tabs = await chrome.tabs.query({});
      return tabs.find((tab) => tab.url?.startsWith(`${origin}/current`))?.discarded;
    }, testOrigin);
    expect(discarded).toBe(true);
  });
});
