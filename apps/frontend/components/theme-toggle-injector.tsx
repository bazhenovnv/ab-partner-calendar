'use client';

import { useEffect } from 'react';

const THEME_STORAGE_KEY = 'ab_event_theme';
type SiteTheme = 'light' | 'dark';

function applyTheme(theme: SiteTheme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function getInitialTheme(): SiteTheme {
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  return saved === 'dark' || saved === 'light' ? saved : 'light';
}

export function ThemeToggleInjector() {
  useEffect(() => {
    applyTheme(getInitialTheme());

    const actions = document.querySelector('.site-header-panel .flex.flex-wrap.items-center.justify-end');
    if (!actions || actions.querySelector('[data-theme-toggle-button="true"]')) return;

    const button = document.createElement('button');
    const moon = document.createElement('span');
    const sun = document.createElement('span');
    const thumb = document.createElement('span');

    button.type = 'button';
    button.dataset.themeToggleButton = 'true';
    button.className = 'theme-switch-toggle';
    moon.className = 'theme-switch-icon theme-switch-icon-moon';
    sun.className = 'theme-switch-icon theme-switch-icon-sun';
    thumb.className = 'theme-switch-thumb';
    moon.setAttribute('aria-hidden', 'true');
    sun.setAttribute('aria-hidden', 'true');
    thumb.setAttribute('aria-hidden', 'true');
    moon.textContent = '☾';
    sun.textContent = '☼';
    button.append(moon, sun, thumb);

    const render = () => {
      const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      button.setAttribute('aria-pressed', String(current === 'dark'));
      button.setAttribute('aria-label', current === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
      button.setAttribute('title', current === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
    };

    button.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
      render();
    });

    render();
    actions.prepend(button);
  }, []);

  return null;
}
