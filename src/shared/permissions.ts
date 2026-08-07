import { browser } from 'wxt/browser';
import type { PermissionStatus } from './types';

export const AUTOMATION_ORIGINS = ['http://*/*', 'https://*/*'];
export const AUTOMATION_PERMISSIONS: Browser.permissions.Permissions = {
  permissions: ['scripting'],
  origins: AUTOMATION_ORIGINS,
};

export async function getPermissionStatus(): Promise<PermissionStatus> {
  return {
    automationAccess: await browser.permissions.contains(AUTOMATION_PERMISSIONS),
  };
}

export async function requestAutomationAccess(): Promise<boolean> {
  return browser.permissions.request(AUTOMATION_PERMISSIONS);
}

export async function removeAutomationAccess(): Promise<boolean> {
  return browser.permissions.remove(AUTOMATION_PERMISSIONS);
}
