import './globals.css';
import './hotfix.css';
import './white-hover.css';
import './ui-state-fixes.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'АБ| Афиша', description: 'Современная афиша вебинаров, встреч и обучений для бухгалтеров.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang='ru'><body>{children}</body></html>; }
