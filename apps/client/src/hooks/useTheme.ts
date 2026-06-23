import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  function toggle() {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark';
      api.patch('/auth/me', { theme: next }).catch(() => {
        // best-effort sync — ignore errors
      });
      return next;
    });
  }

  return { theme, toggle };
}
