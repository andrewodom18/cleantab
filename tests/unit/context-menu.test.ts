import { describe, expect, it } from 'vitest';
import { selectContextMenuUrl } from '../../src/core/context-menu';

describe('selectContextMenuUrl', () => {
  it('prioritizes a link URL over selected link text', () => {
    expect(selectContextMenuUrl({
      linkUrl: 'https://example.com/article?utm_source=email',
      selectionText: 'Read more',
      pageUrl: 'https://example.com/',
    })).toBe('https://example.com/article?utm_source=email');
  });

  it('accepts selected text only when it is an exact HTTP URL', () => {
    expect(selectContextMenuUrl({ selectionText: '  https://example.com/?id=7  ' })).toBe('https://example.com/?id=7');
    expect(selectContextMenuUrl({ selectionText: 'Share https://example.com now' })).toBeUndefined();
  });

  it('falls back to the page URL for ordinary selected text', () => {
    expect(selectContextMenuUrl({
      selectionText: 'Read more',
      pageUrl: 'https://example.com/current',
    })).toBe('https://example.com/current');
  });

  it('refuses protected and unsupported URLs', () => {
    expect(selectContextMenuUrl({ pageUrl: 'chrome://settings/' })).toBeUndefined();
    expect(selectContextMenuUrl({ linkUrl: 'javascript:alert(1)' })).toBeUndefined();
  });
});
