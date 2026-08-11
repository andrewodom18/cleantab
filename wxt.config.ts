import { defineConfig } from 'wxt';

export default defineConfig({
  vite: () => ({
    build: {
      modulePreload: false,
    },
  }),
  manifest: {
    name: 'CleanTab',
    short_name: 'CleanTab',
    version: '1.0.1',
    description: 'Clean tracking from URLs and safely suspend tabs. Private, local, and lightweight.',
    permissions: ['storage', 'tabs', 'alarms', 'contextMenus'],
    optional_permissions: ['scripting'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    action: {
      default_title: 'CleanTab',
    },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
  },
});
