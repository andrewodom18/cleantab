import { isUrlExcluded } from './domains';
import type { CleanResult } from '../shared/types';

export const DEFAULT_TRACKING_PARAMETERS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid',
  'dclid',
  'fbclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'ttclid',
  'twclid',
  'li_fat_id',
  '_hsenc',
  '_hsmi',
] as const;

export interface CleanUrlOptions {
  excludedDomains?: string[];
  customRemoveParameters?: string[];
  customKeepParameters?: string[];
}

function decodeParameterName(rawName: string): string {
  try {
    return decodeURIComponent(rawName.replace(/\+/g, ' '));
  } catch {
    return rawName;
  }
}

export function cleanUrl(input: string, options: CleanUrlOptions = {}): CleanResult {
  const originalUrl = input;
  let parsed: URL;

  try {
    parsed = new URL(input);
  } catch {
    return { originalUrl, cleanedUrl: originalUrl, changed: false, removedParameters: [], reason: 'invalid' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { originalUrl, cleanedUrl: originalUrl, changed: false, removedParameters: [], reason: 'unsupported' };
  }

  if (isUrlExcluded(input, options.excludedDomains ?? [])) {
    return { originalUrl, cleanedUrl: originalUrl, changed: false, removedParameters: [], reason: 'excluded' };
  }

  const hashIndex = input.indexOf('#');
  const beforeHash = hashIndex >= 0 ? input.slice(0, hashIndex) : input;
  const hash = hashIndex >= 0 ? input.slice(hashIndex) : '';
  const queryIndex = beforeHash.indexOf('?');
  if (queryIndex < 0) {
    return { originalUrl, cleanedUrl: originalUrl, changed: false, removedParameters: [], reason: 'unchanged' };
  }

  const base = beforeHash.slice(0, queryIndex);
  const rawQuery = beforeHash.slice(queryIndex + 1);
  if (!rawQuery) {
    return { originalUrl, cleanedUrl: originalUrl, changed: false, removedParameters: [], reason: 'unchanged' };
  }

  const remove = new Set<string>([
    ...DEFAULT_TRACKING_PARAMETERS,
    ...(options.customRemoveParameters ?? []),
  ].map((item) => item.toLowerCase()));
  const keep = new Set((options.customKeepParameters ?? []).map((item) => item.toLowerCase()));
  const retained: string[] = [];
  const removedParameters: string[] = [];

  for (const segment of rawQuery.split('&')) {
    const separator = segment.indexOf('=');
    const rawName = separator >= 0 ? segment.slice(0, separator) : segment;
    const decodedName = decodeParameterName(rawName);
    const normalizedName = decodedName.toLowerCase();
    if (normalizedName && remove.has(normalizedName) && !keep.has(normalizedName)) {
      removedParameters.push(decodedName);
    } else {
      retained.push(segment);
    }
  }

  if (removedParameters.length === 0) {
    return { originalUrl, cleanedUrl: originalUrl, changed: false, removedParameters, reason: 'unchanged' };
  }

  const cleanedUrl = `${base}${retained.length > 0 ? `?${retained.join('&')}` : ''}${hash}`;
  return { originalUrl, cleanedUrl, changed: true, removedParameters, reason: 'cleaned' };
}
