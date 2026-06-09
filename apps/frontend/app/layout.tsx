import './globals.css';
import './controls.css';
import './hotfix.css';
import './ui-polish.css';
import type { Metadata } from 'next';
import { CompactModeEnhancer } from '@/components/compact-mode-enhancer';
export const metadata: Metadata = { title: 'АБ| Афиша', description: 'Современная афиша вебинаров, встреч и обучений для бухгалтеров.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang='ru'><body>{children}<CompactModeEnhancer /></body></html>; }
