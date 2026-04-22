'use client';

import { useEffect, useState } from 'react';
import { mockReminders } from '@/components/admin/admin-data';
import { SectionHeader } from '@/components/admin/section-header';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/admin-utils';
import { ReminderItem } from '@/lib/types';

export default function AdminRemindersPage() {
  const [items, setItems] = useState<ReminderItem[]>(mockReminders);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    api.reminders(token).then(setItems).catch(() => undefined);
  }, []);

  return (
    <div className='space-y-6'>
      <SectionHeader
        eyebrow='Telegram reminders'
        title='Напоминания'
        description='Реестр пользовательских подписок на уведомления. Здесь удобно видеть популярные события, интервалы напоминаний и состояние Telegram-подключения.'
      />

      <div className='grid gap-4'>
        {items.map((item) => (
          <div key={item.id} className='rounded-[28px] bg-white p-5 shadow-panel'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <div className='text-lg font-semibold text-slate-950'>{item.event.title}</div>
                <div className='mt-1 text-sm text-slate-500'>@{item.telegramUsername || 'без username'} · ID {item.telegramUserId}</div>
                <div className='mt-2 text-sm text-slate-600'>{new Date(item.event.startAt).toLocaleString('ru-RU')} · {item.event.location}</div>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Badge tone='mint'>{item.remindBefore}</Badge>
                <Badge tone={item.isActive ? 'blue' : 'default'}>{item.isActive ? 'Активно' : 'Отключено'}</Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
