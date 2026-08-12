/* global chrome, document, window */

import { chromium } from '@playwright/test';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const extensionPath = resolve('.output/chrome-mv3');
const screenshotDirectory = resolve('store-assets/screenshots');
const promoDirectory = resolve('store-assets/promo');
await mkdir(screenshotDirectory, { recursive: true });
await mkdir(promoDirectory, { recursive: true });

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});

try {
  let [worker] = context.serviceWorkers();
  worker ??= await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.evaluate(async () => {
    await chrome.storage.local.set({
      settings: {
        schemaVersion: 1,
        theme: 'light',
        cleaner: {
          automaticCopy: false,
          excludedDomains: ['checkout.example.com'],
          customRemoveParameters: ['campaign_id'],
          customKeepParameters: ['ref'],
        },
        suspender: {
          automatic: false,
          inactivityMinutes: 30,
          excludedDomains: ['music.example.com'],
        },
      },
    });
  });
  await page.reload();

  await page.screenshot({ path: resolve(screenshotDirectory, '01-url-cleaner.png') });

  await page.evaluate(() => {
    document.body.style.paddingBottom = '520px';
  });
  await page.locator('[aria-labelledby="automation-heading"]').evaluate((element) => window.scrollTo(0, element.offsetTop - 84));
  await page.waitForTimeout(150);
  await page.screenshot({ path: resolve(screenshotDirectory, '02-tab-suspension.png') });

  await page.getByText('Exceptions and custom rules').click();
  await page.locator('.advanced-section').evaluate((element) => window.scrollTo(0, element.offsetTop - 84));
  await page.waitForTimeout(150);
  await page.screenshot({ path: resolve(screenshotDirectory, '03-permission-controls.png') });

  await page.getByLabel('Choose theme').selectOption('dark');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.locator('.advanced-section').evaluate((element) => {
    element.open = false;
  });
  await page.evaluate(() => {
    document.body.style.paddingBottom = '';
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(2_000);
  await page.screenshot({ path: resolve(screenshotDirectory, '04-dark-mode.png') });

  const previewId = '12345678-1234-1234-1234-123456789abc';
  await page.evaluate(async ({ id }) => {
    await chrome.storage.session.set({
      [`preview:${id}`]: {
        url: 'https://example.com/articles/private-browsing?id=42&utm_source=newsletter&utm_campaign=summer#read',
        createdAt: Date.now(),
      },
    });
  }, { id: previewId });
  await page.goto(`chrome-extension://${extensionId}/preview.html?id=${previewId}`);
  await page.screenshot({ path: resolve(screenshotDirectory, '05-private-controls.png') });
} finally {
  await context.close();
}

const icon = await readFile(resolve('public/icon/128.png'));
const iconData = `data:image/png;base64,${icon.toString('base64')}`;
const promoBrowser = await chromium.launch({ channel: 'chromium', headless: true });

try {
  const promoPage = await promoBrowser.newPage({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 1 });
  await promoPage.setContent(`
    <style>
      *{box-sizing:border-box}body{margin:0;width:440px;height:280px;display:flex;align-items:center;justify-content:center;background:#176b5b;font-family:Inter,system-ui,sans-serif;color:white}
      main{display:flex;align-items:center;gap:22px;padding:34px}.icon{width:92px;height:92px;border-radius:22px;box-shadow:0 14px 34px rgba(0,0,0,.2)}
      h1{font-size:35px;line-height:1;margin:0 0 10px;letter-spacing:-1px}p{font-size:16px;line-height:1.35;margin:0;color:#d9f4ed;font-weight:600}
    </style><main><img class="icon" src="${iconData}" alt=""><div><h1>CleanTab</h1><p>Cleaner links.<br>Calmer tabs.</p></div></main>
  `);
  await promoPage.screenshot({ path: resolve(promoDirectory, 'small-tile-440x280.png') });

  await promoPage.setViewportSize({ width: 1400, height: 560 });
  await promoPage.setContent(`
    <style>
      *{box-sizing:border-box}body{margin:0;width:1400px;height:560px;display:flex;align-items:center;background:linear-gradient(120deg,#0f5549,#176b5b 58%,#25816f);font-family:Inter,system-ui,sans-serif;color:white;overflow:hidden}
      main{display:flex;align-items:center;gap:54px;padding:84px 130px}.icon{width:190px;height:190px;border-radius:42px;box-shadow:0 24px 70px rgba(0,0,0,.25)}
      h1{font-size:78px;line-height:.95;margin:0 0 22px;letter-spacing:-3px}p{font-size:30px;line-height:1.35;margin:0;color:#d9f4ed;font-weight:600}.rule{width:120px;height:6px;border-radius:4px;background:#8fdfcc;margin-bottom:28px}
    </style><main><img class="icon" src="${iconData}" alt=""><div><div class="rule"></div><h1>CleanTab</h1><p>Clean tracking from links.<br>Pause tabs without closing them.</p></div></main>
  `);
  await promoPage.screenshot({ path: resolve(promoDirectory, 'marquee-1400x560.png') });
} finally {
  await promoBrowser.close();
}

await copyFile(resolve('public/icon/128.png'), resolve(promoDirectory, 'store-icon-128.png'));
console.log('Chrome Web Store screenshots and promotional assets created.');
