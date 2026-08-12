import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('.output/chrome-mv3');
const manifest = JSON.parse(await readFile(resolve(output, 'manifest.json'), 'utf8'));
const packageMetadata = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
const failures = [];

const expectedRequired = ['alarms', 'contextMenus', 'storage', 'tabs'];
const expectedOptional = ['scripting'];
const expectedOrigins = ['http://*/*', 'https://*/*'];

function sameMembers(actual = [], expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

if (manifest.manifest_version !== 3) failures.push('manifest_version must be 3');
if (manifest.version !== packageMetadata.version) failures.push(`manifest version must match package version ${packageMetadata.version}`);
if (!sameMembers(manifest.permissions, expectedRequired)) failures.push(`unexpected required permissions: ${manifest.permissions}`);
if (!sameMembers(manifest.optional_permissions, expectedOptional)) failures.push(`unexpected optional permissions: ${manifest.optional_permissions}`);
if (!sameMembers(manifest.optional_host_permissions, expectedOrigins)) failures.push(`unexpected optional host permissions: ${manifest.optional_host_permissions}`);
if (manifest.host_permissions?.length) failures.push('required host permissions are not allowed');
if (manifest.options_ui?.page !== 'options.html' || manifest.options_ui?.open_in_tab !== true) failures.push('settings must open in a full browser tab');

for (const size of ['16', '32', '48', '128']) {
  try {
    await stat(resolve(output, `icon/${size}.png`));
  } catch {
    failures.push(`missing ${size}px icon`);
  }
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }));
  return nested.flat();
}

for (const file of await filesUnder(output)) {
  if (file.endsWith('.map')) failures.push(`source map included: ${file}`);
  if (!/\.(js|html|css)$/.test(file)) continue;
  const contents = await readFile(file, 'utf8');
  if (/<script[^>]+src=["']https?:\/\//i.test(contents) || /\b(fetch|WebSocket|EventSource)\s*\(\s*["']https?:\/\//i.test(contents) || /new\s+XMLHttpRequest\s*\(/.test(contents)) {
    failures.push(`remote network or code loading found in executable asset: ${file}`);
  }
  if (/\beval\s*\(/.test(contents)) failures.push(`eval found in executable asset: ${file}`);
}

if (failures.length > 0) {
  console.error(`Package audit failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('Package audit passed: permissions, assets, CSP safety, and local-only checks are clean.');
