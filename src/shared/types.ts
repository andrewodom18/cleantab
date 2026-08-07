export const SETTINGS_SCHEMA_VERSION = 1 as const;

export type ThemePreference = 'system' | 'light' | 'dark';

export interface CleanTabSettings {
  schemaVersion: typeof SETTINGS_SCHEMA_VERSION;
  theme: ThemePreference;
  cleaner: {
    automaticCopy: boolean;
    excludedDomains: string[];
    customRemoveParameters: string[];
    customKeepParameters: string[];
  };
  suspender: {
    automatic: boolean;
    inactivityMinutes: number;
    excludedDomains: string[];
  };
}

export type CleanReason = 'cleaned' | 'unchanged' | 'excluded' | 'invalid' | 'unsupported';

export interface CleanResult {
  originalUrl: string;
  cleanedUrl: string;
  changed: boolean;
  removedParameters: string[];
  reason: CleanReason;
}

export type SuspensionSkipReason =
  | 'active'
  | 'pinned'
  | 'audible'
  | 'discarded'
  | 'protected'
  | 'excluded-domain'
  | 'dirty-form'
  | 'recent'
  | 'unknown-activity';

export interface SuspensionDecision {
  eligible: boolean;
  reason?: SuspensionSkipReason;
}

export interface TabActivity {
  lastActiveAt: number;
  dirty: boolean;
}

export interface SuspensionSummary {
  suspended: number;
  skipped: Partial<Record<SuspensionSkipReason | 'failed', number>>;
}

export interface PermissionStatus {
  automationAccess: boolean;
}

export type BackgroundRequest =
  | { type: 'get-permission-status' }
  | { type: 'get-current-tab' }
  | { type: 'suspend-current'; tabId: number }
  | { type: 'suspend-others'; windowId?: number }
  | { type: 'settings-updated' }
  | { type: 'form-dirty-state'; dirty: boolean }
  | { type: 'open-preview'; url: string };

export type BackgroundResponse =
  | { ok: true; permission?: PermissionStatus; tab?: Browser.tabs.Tab; summary?: SuspensionSummary }
  | { ok: false; error: string };

export interface PreviewPayload {
  url: string;
  createdAt: number;
}
