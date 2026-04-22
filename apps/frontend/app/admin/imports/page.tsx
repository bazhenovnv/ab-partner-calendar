'use client';

import { useEffect, useState } from 'react';
import { Check, RefreshCcw, X } from 'lucide-react';
import { mockImports } from '@/components/admin/admin-data';
import { SectionHeader } from '@/components/admin/section-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/admin-utils';
import { TelegramImport } from '@/lib/types';

export default function AdminImportsPage() {
  const [items, setItems] = useState<TelegramImport[]>(mockImports);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    api.imports(token).then(setItems).catch(() => undefined);
  }, []);

  async function sync() {
    const token = getAdminToken();
    setSyncing(true);
    try {
      if (token) {
        const data = await api.syncImports(token);
        setItems(data);
      }
    } catch {
      setItems((prev) => prev);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className='space-y-6'>
      <SectionHeader
        eyebrow='Telegram ingestion'
        title='Импорт из Telegram'
        description='Поток новых постов из канала t.me/ab_afisha_buh, безопасный парсинг даты/времени/места, защита от дублей и ручное подтверждение публикации.'
        actions={<Button onClick={sync}><RefreshCcw className='h-4 w-4' />{syncing ? 'Синхронизация...' : 'Запустить синхронизацию'}</Button>}
      />

      <div className='grid gap-4'>
        {items.map((item) => (
          <article key={item.id} className='rounded-[28px] bg-white p-6 shadow-panel'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
              <div className='space-y-3'>
                <div className='flex flex-wrap items-center gap-3'>
                  <h2 className='text-xl font-semibold text-slate-950'>{item.parsedTitle || 'Без заголовка'}</h2>
                  <Badge tone={item.status === 'CONFIRMED' ? 'mint' : item.status === 'REJECTED' ? 'red' : item.status === 'REVIEW' ? 'amber' : 'blue'}>{item.status}</Badge>
                </div>
                <p className='text-sm leading-6 text-slate-600'>{item.parsedDescription || item.rawText}</p>
                <div className='flex flex-wrap gap-2 text-sm text-slate-500'>
                  <span>Пост: {item.sourcePostId}</span>
                  <span>•</span>
                  <span>{item.parsedLocation || 'Локация не определена'}</span>
                  <span>•</span>
                  <span>{item.parsedStartAt ? new Date(item.parsedStartAt).toLocaleString('ru-RU') : 'Дата требует проверки'}</span>
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button variant='ghost' onClick={() => setItems((prev) => prev.map((current) => current.id === item.id ? { ...current, status: 'CONFIRMED' } : current))}><Check className='h-4 w-4' />Подтвердить</Button>
                <Button variant='ghost' className='text-rose-700 hover:bg-rose-50' onClick={() => setItems((prev) => prev.map((current) => current.id === item.id ? { ...current, status: 'REJECTED' } : current))}><X className='h-4 w-4' />Отклонить</Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
