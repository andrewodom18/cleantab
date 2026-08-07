export interface ContextMenuUrlInput {
  linkUrl?: string | undefined;
  selectionText?: string | undefined;
  pageUrl?: string | undefined;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function selectContextMenuUrl(input: ContextMenuUrlInput): string | undefined {
  if (input.linkUrl && isHttpUrl(input.linkUrl)) return input.linkUrl;

  const selection = input.selectionText?.trim();
  if (selection && isHttpUrl(selection)) return selection;

  return input.pageUrl && isHttpUrl(input.pageUrl) ? input.pageUrl : undefined;
}
