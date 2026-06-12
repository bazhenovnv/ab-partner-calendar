import './globals.css';
import './controls.css';
import './hotfix.css';
import './calendar-reference.css';
import './calendar-final-overrides.css';
import './section-title-overrides.css';
import './ui-final-overrides.css';
import './topic-metric-final-overrides.css';
import './topic-split-overrides.css';
import './topic-table-overrides.css';
import './button-uniform-overrides.css';
import './status-final-overrides.css';
import './important-date-restore-overrides.css';
import './filter-panel-merge-overrides.css';
import './topic-counter-inline-overrides.css';
import './theme-overrides.css';
import type { Metadata } from 'next';
import { ThemeToggleInjector } from '@/components/theme-toggle-injector';

export const metadata: Metadata = {
  title: 'АБ| Афиша',
  description: 'Современная афиша вебинаров, встреч и обучений для бухгалтеров.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang='ru'><body><ThemeToggleInjector />{children}</body></html>;
}
