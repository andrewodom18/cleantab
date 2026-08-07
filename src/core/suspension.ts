import { isUrlExcluded } from './domains';
import type { CleanTabSettings, SuspensionDecision, TabActivity } from '../shared/types';

export interface SuspensionContext {
  tab: Browser.tabs.Tab;
  activity: TabActivity | undefined;
  settings: CleanTabSettings;
  now: number;
  requireInactivePeriod: boolean;
}

export function isProtectedTabUrl(url?: string): boolean {
  if (!url) return true;
  try {
    const protocol = new URL(url).protocol;
    return protocol !== 'http:' && protocol !== 'https:';
  } catch {
    return true;
  }
}

export function getSuspensionDecision(context: SuspensionContext): SuspensionDecision {
  const { tab, activity, settings, now, requireInactivePeriod } = context;
  if (tab.active) return { eligible: false, reason: 'active' };
  if (tab.pinned) return { eligible: false, reason: 'pinned' };
  if (tab.audible) return { eligible: false, reason: 'audible' };
  if (tab.discarded) return { eligible: false, reason: 'discarded' };
  if (isProtectedTabUrl(tab.url)) return { eligible: false, reason: 'protected' };
  if (tab.url && isUrlExcluded(tab.url, settings.suspender.excludedDomains)) {
    return { eligible: false, reason: 'excluded-domain' };
  }
  if (activity?.dirty) return { eligible: false, reason: 'dirty-form' };

  if (requireInactivePeriod) {
    if (!activity) return { eligible: false, reason: 'unknown-activity' };
    const inactiveFor = now - activity.lastActiveAt;
    if (inactiveFor < settings.suspender.inactivityMinutes * 60_000) {
      return { eligible: false, reason: 'recent' };
    }
  }

  return { eligible: true };
}
