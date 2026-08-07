import type { ThemePreference } from './types';

let mediaQuery: MediaQueryList | undefined;
let mediaListener: (() => void) | undefined;

export function applyTheme(theme: ThemePreference): void {
  if (mediaQuery && mediaListener) mediaQuery.removeEventListener('change', mediaListener);

  const update = () => {
    const resolved = theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : theme === 'system' ? 'light' : theme;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  };

  update();
  if (theme === 'system') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaListener = update;
    mediaQuery.addEventListener('change', mediaListener);
  }
}
