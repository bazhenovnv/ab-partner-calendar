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
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'АБ| Афиша',
  description: 'Современная афиша вебинаров, встреч и обучений для бухгалтеров.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang='ru'><body>{children}</body></html>;
}
