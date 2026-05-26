'use client';

import { useEffect, useState } from 'react';
import { Link2, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { SectionHeader } from '@/components/admin/section-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAdminToken } from '@/lib/admin-utils';
import { api } from '@/lib/api';
import { EventItem, SourceConnector } from '@/lib/types';

export default function OrganizerPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [connectors, setConnectors] = useState<SourceConnector[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    Promise.all([api.adminEvents(token), api.importConnectors(token)])
      .then(([eventRows, connectorRows]) => {
        setEvents(eventRows);
        setConnectors(connectorRows);
      })
      .catch(() => undefined);
  }, []);

  async function syncNow() {
    const token = getAdminToken();
    if (!token) return;
    setSyncing(true);
    try {
      await api.syncImports(token);
      const [eventRows, connectorRows] = await Promise.all([api.adminEvents(token), api.importConnectors(token)]);
      setEvents(eventRows);
      setConnectors(connectorRows);
    } finally {
      setSyncing(false);
    }
  }

  const activeConnectors = connectors.filter((connector) => connector.enabled).length;

  return (
    <div className='space-y-6'>
      <SectionHeader
        eyebrow='Третья линия'
        title='Кабинет организатора'
        description='Управление собственными мероприятиями, подключениями к источникам по API и продвижением событий на витрине.'
        actions={<Button onClick={syncNow} disabled={syncing}><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Синхронизация...' : 'Обновить источники'}</Button>}
      />

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <div className='rounded-[28px] bg-white p-5 shadow-panel'>
          <div className='flex items-center gap-3 text-slate-500'><Link2 className='h-5 w-5' />Подключено источников</div>
          <div className='mt-3 text-3xl font-semibold text-slate-950'>{activeConnectors}</div>
        </div>
        <div className='rounded-[28px] bg-white p-5 shadow-panel'>
          <div className='flex items-center gap-3 text-slate-500'><Sparkles className='h-5 w-5' />Событий в базе</div>
          <div className='mt-3 text-3xl font-semibold text-slate-950'>{events.length}</div>
        </div>
        <div className='rounded-[28px] bg-white p-5 shadow-panel'>
          <div className='flex items-center gap-3 text-slate-500'><ShieldCheck className='h-5 w-5' />Важных событий</div>
          <div className='mt-3 text-3xl font-semibold text-slate-950'>{events.filter((event) => event.isImportant).length}</div>
        </div>
        <div className='rounded-[28px] bg-white p-5 shadow-panel'>
          <div className='flex items-center gap-3 text-slate-500'><RefreshCw className='h-5 w-5' />Автосинхронизация</div>
          <div className='mt-3 text-lg font-semibold text-slate-950'>Проверяется через backend</div>
        </div>
      </section>

      <section className='grid gap-6 xl:grid-cols-[0.9fr_1.1fr]'>
        <div className='rounded-[28px] bg-white p-6 shadow-panel'>
          <h2 className='text-xl font-semibold'>Подключения к источникам</h2>
          <div className='mt-4 space-y-3 text-sm text-slate-600'>
            {connectors.map((connector) => (
              <div key={connector.id} className='rounded-2xl border border-slate-200 p-4'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div>
                    <div className='font-semibold text-slate-950'>{connector.name}</div>
                    <div className='mt-1 text-xs uppercase tracking-[0.12em] text-slate-400'>{connector.type}</div>
                    <div className='mt-2 break-all text-sm text-slate-600'>{connector.channelUrl || connector.url || 'URL источника не указан'}</div>
                  </div>
                  <Badge tone={connector.enabled ? 'mint' : 'default'}>{connector.enabled ? 'Активен' : 'Отключён'}</Badge>
                </div>
              </div>
            ))}
            {connectors.length === 0 ? <div className='rounded-2xl border border-dashed border-slate-200 p-4'>Подключения ещё не настроены.</div> : null}
          </div>
        </div>
        <div className='rounded-[28px] bg-white p-6 shadow-panel'>
          <h2 className='text-xl font-semibold'>События организатора</h2>
          <div className='mt-4 space-y-3'>
            {events.slice(0, 12).map((event) => (
              <div key={event.id} className='rounded-2xl border border-slate-200 p-4'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <div className='font-semibold'>{event.title}</div>
                    <div className='mt-1 text-sm text-slate-600'>{new Date(event.startAt).toLocaleString('ru-RU')} · {event.location}</div>
                  </div>
                  {event.isImportant && <span className='rounded-full bg-mint px-3 py-1 text-xs text-white'>Продвигается</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
