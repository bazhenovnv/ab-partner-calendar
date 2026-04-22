'use client';

import { useEffect, useState } from 'react';
import { SectionHeader } from '@/components/admin/section-header';
import { getAdminToken } from '@/lib/admin-utils';
import { api } from '@/lib/api';
import { EventItem } from '@/lib/types';

export default function OrganizerPage() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    api.adminEvents(token).then(setEvents).catch(() => undefined);
  }, []);

  return (
    <div className='space-y-6'>
      <SectionHeader
        eyebrow='Третья линия'
        title='Кабинет организатора'
        description='Базовый контур для работы с собственными мероприятиями, партнёрскими интеграциями и платным продвижением на витрине.'
      />

      <section className='grid gap-6 xl:grid-cols-[0.9fr_1.1fr]'>
        <div className='rounded-[28px] bg-white p-6 shadow-panel'>
          <h2 className='text-xl font-semibold'>Партнёрские API-интеграции</h2>
          <div className='mt-4 space-y-3 text-sm text-slate-600'>
            <div className='rounded-2xl border border-slate-200 p-4'>Подключайте внешние JSON API через SOURCE_CONNECTORS_JSON в .env и синхронизируйте события в календарь.</div>
            <div className='rounded-2xl border border-slate-200 p-4'>События с isImportant=true или тегом #Хит автоматически попадают в highlights.</div>
            <div className='rounded-2xl border border-slate-200 p-4'>Для платного продвижения используйте флаг isImportant как редакторский промо-слой до внедрения отдельного биллинга.</div>
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
