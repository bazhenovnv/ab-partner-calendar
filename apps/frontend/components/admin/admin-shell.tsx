'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BellRing,
  CalendarDays,
  FolderSync,
  LayoutDashboard,
  LogOut,
  Settings,
  Tag,
  Users,
  BarChart3,
  BriefcaseBusiness,
} from 'lucide-react';
import { clearAdminToken } from '@/lib/admin-utils';
import { cn } from '@/lib/utils';

const items = [
  ['Дашборд', '/admin', LayoutDashboard],
  ['Мероприятия', '/admin/events', CalendarDays],
  ['Импорт из Telegram', '/admin/imports', FolderSync],
  ['Напоминания', '/admin/reminders', BellRing],
  ['Аналитика', '/admin/analytics', BarChart3],
  ['Кабинет организатора', '/admin/organizer', BriefcaseBusiness],
  ['Категории', '/admin/categories', Tag],
  ['Пользователи', '/admin/users', Users],
  ['Настройки', '/admin/settings', Settings],
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className='min-h-screen bg-slate-100'>
      <div className='mx-auto grid min-h-screen max-w-7xl gap-6 p-4 lg:grid-cols-[280px_1fr]'>
        <aside className='rounded-[28px] bg-graphite p-5 text-white shadow-premium'>
          <div className='mb-8'>
            <div className='text-xs uppercase tracking-[0.24em] text-white/50'>АБ ПАРТНЕР</div>
            <div className='mt-2 text-xl font-semibold'>Админ-панель</div>
            <p className='mt-3 text-sm leading-6 text-white/60'>Управление календарем, импортом из Telegram и подписками на напоминания.</p>
          </div>

          <nav className='space-y-2'>
            {items.map(([label, href, Icon]) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                    active
                      ? 'bg-mint text-white shadow-lg shadow-mint/20'
                      : 'text-white/75 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <Icon className='h-4 w-4' />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className='mt-8 rounded-3xl border border-white/10 bg-white/5 p-4'>
            <div className='text-xs uppercase tracking-[0.22em] text-white/50'>Тестовый доступ</div>
            <div className='mt-3 text-sm text-white/90'>admin@ab-partner.ru</div>
            <div className='text-sm text-white/60'>Admin12345!</div>
            <button
              onClick={() => {
                clearAdminToken();
                router.push('/admin/login');
              }}
              className='mt-4 inline-flex items-center gap-2 text-sm text-white/80 transition hover:text-white'
            >
              <LogOut className='h-4 w-4' />
              Выйти
            </button>
          </div>
        </aside>

        <main className='space-y-6 py-2'>{children}</main>
      </div>
    </div>
  );
}
