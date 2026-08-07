export interface DomainListResult {
  domains: string[];
  invalid: string[];
}

export function normalizeDomain(value: string): string | null {
  const candidate = value.trim().toLowerCase();
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate.includes('://') ? candidate : `https://${candidate}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password || parsed.port || (parsed.pathname !== '/' && parsed.pathname !== '')) return null;
    if (parsed.search || parsed.hash || !parsed.hostname) return null;
    return parsed.hostname.replace(/^\.+|\.+$/g, '');
  } catch {
    return null;
  }
}

export function parseDomainList(value: string): DomainListResult {
  const entries = value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  const domains: string[] = [];
  const invalid: string[] = [];

  for (const entry of entries) {
    const normalized = normalizeDomain(entry);
    if (normalized) domains.push(normalized);
    else invalid.push(entry);
  }

  return { domains: [...new Set(domains)], invalid };
}

export function hostnameMatchesDomain(hostname: string, domain: string): boolean {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, '');
  const normalizedDomain = domain.toLowerCase().replace(/\.$/, '');
  return normalizedHostname === normalizedDomain || normalizedHostname.endsWith(`.${normalizedDomain}`);
}

export function isUrlExcluded(url: string, domains: string[]): boolean {
  try {
    const parsed = new URL(url);
    return domains.some((domain) => hostnameMatchesDomain(parsed.hostname, domain));
  } catch {
    return false;
  }
}
