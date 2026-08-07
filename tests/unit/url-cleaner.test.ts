import { describe, expect, it } from 'vitest';
import { cleanUrl } from '../../src/core/url-cleaner';

describe('cleanUrl', () => {
  it('removes known tracking parameters while preserving functional parameters and fragments', () => {
    const result = cleanUrl('https://example.com/path?id=42&utm_source=newsletter&page=2#details');
    expect(result).toMatchObject({
      changed: true,
      cleanedUrl: 'https://example.com/path?id=42&page=2#details',
      removedParameters: ['utm_source'],
      reason: 'cleaned',
    });
  });

  it('matches parameter names case-insensitively and removes repeated trackers', () => {
    const result = cleanUrl('https://example.com/?UTM_Source=a&utm_source=b&q=search');
    expect(result.cleanedUrl).toBe('https://example.com/?q=search');
    expect(result.removedParameters).toEqual(['UTM_Source', 'utm_source']);
  });

  it('preserves retained raw encoding and order', () => {
    const result = cleanUrl('https://example.com/?first=hello%20world&utm_medium=email&first=a+b&empty=');
    expect(result.cleanedUrl).toBe('https://example.com/?first=hello%20world&first=a+b&empty=');
  });

  it('lets keep rules override built-in and custom removal rules', () => {
    const result = cleanUrl('https://example.com/?utm_source=needed&campaign_id=remove', {
      customRemoveParameters: ['campaign_id'],
      customKeepParameters: ['utm_source'],
    });
    expect(result.cleanedUrl).toBe('https://example.com/?utm_source=needed');
    expect(result.removedParameters).toEqual(['campaign_id']);
  });

  it('removes the question mark when every query parameter is removed', () => {
    expect(cleanUrl('https://example.com/path?fbclid=abc#top').cleanedUrl).toBe('https://example.com/path#top');
  });

  it('does not clean excluded domains or their subdomains', () => {
    const result = cleanUrl('https://checkout.shop.example.com/?utm_source=required', {
      excludedDomains: ['example.com'],
    });
    expect(result.reason).toBe('excluded');
    expect(result.changed).toBe(false);
  });

  it('leaves safe parameters and already-clean URLs byte-for-byte unchanged', () => {
    const url = 'https://example.com/search?q=hello%20world&ref=docs';
    expect(cleanUrl(url)).toEqual({
      originalUrl: url,
      cleanedUrl: url,
      changed: false,
      removedParameters: [],
      reason: 'unchanged',
    });
  });

  it('rejects relative, malformed, and non-web URLs', () => {
    expect(cleanUrl('/relative?utm_source=x').reason).toBe('invalid');
    expect(cleanUrl('not a url').reason).toBe('invalid');
    expect(cleanUrl('mailto:user@example.com?utm_source=x').reason).toBe('unsupported');
  });
});
