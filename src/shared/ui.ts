export function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required element: ${id}`);
  return element as T;
}

export function setStatus(element: HTMLElement, message: string, tone: 'neutral' | 'success' | 'warning' | 'error' = 'neutral'): void {
  element.textContent = message;
  element.dataset.tone = tone;
}

export async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Clipboard access was unavailable.');
  }
}

export function formatParameterList(parameters: string[]): string {
  if (parameters.length === 0) return 'No tracking parameters found';
  const counts = new Map<string, number>();
  for (const parameter of parameters) counts.set(parameter, (counts.get(parameter) ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => count > 1 ? `${name} ×${count}` : name).join(', ');
}
