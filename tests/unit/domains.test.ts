import { describe, expect, it } from 'vitest';
import { hostnameMatchesDomain, normalizeDomain, parseDomainList } from '../../src/core/domains';

describe('domain rules', () => {
  it('normalizes hostnames and complete origins', () => {
    expect(normalizeDomain(' Example.COM ')).toBe('example.com');
    expect(normalizeDomain('https://sub.example.com/')).toBe('sub.example.com');
    expect(normalizeDomain('localhost')).toBe('localhost');
  });

  it('rejects paths, credentials, ports, and non-web schemes', () => {
    expect(normalizeDomain('example.com/path')).toBeNull();
    expect(normalizeDomain('https://user@example.com')).toBeNull();
    expect(normalizeDomain('localhost:8080')).toBeNull();
    expect(normalizeDomain('file:///tmp/test')).toBeNull();
  });

  it('matches an exact domain and its subdomains without suffix confusion', () => {
    expect(hostnameMatchesDomain('example.com', 'example.com')).toBe(true);
    expect(hostnameMatchesDomain('www.example.com', 'example.com')).toBe(true);
    expect(hostnameMatchesDomain('notexample.com', 'example.com')).toBe(false);
  });

  it('returns invalid entries without discarding valid entries', () => {
    expect(parseDomainList('example.com\nhttps://good.test\nexample.com/path')).toEqual({
      domains: ['example.com', 'good.test'],
      invalid: ['example.com/path'],
    });
  });
});
