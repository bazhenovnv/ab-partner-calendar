'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/admin/admin-cards';
import { SectionHeader } from '@/components/admin/section-header';
import { mockEvents, mockImports, mockReminders, mockUsers } from '@/components/admin/admin-data';
import { DashboardStats } from '@/lib/types';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/admin-utils';

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats>({
    events: mockEvents.length,
    imports: mockImports.length,
    reminders: mockReminders.length,
    users: mockUsers.length,
    visitsTotal: 0,
    visits7d: 0,
    visitsToday: 0,
    uniqueVisitors: 0,
  });

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    api.dashboard(token).then(setStats).catch(() => undefined);
  }, []);

  return (
    <div className='space-y-6'>
      <SectionHeader
        eyebrow='Контроль системы'
        title='Дашборд'
        description='Быстрый обзор количества мероприятий, импортов, напоминаний, пользователей и посещаемости. Здесь удобно контролировать общую активность календаря и интерес аудитории.'
      />

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard label='Мероприятия' value={stats.events} caption='Все записи календаря, включая опубликованные и черновики.' />
        <StatCard label='Импортов' value={stats.imports} caption='Новые и проверяемые материалы, пришедшие из Telegram-канала.' />
        <StatCard label='Напоминаний' value={stats.reminders} caption='Активные пользовательские подписки на уведомления в Telegram.' />
        <StatCard label='Пользователей' value={stats.users} caption='Администраторы и редакторы, имеющие доступ к панели.' />
      </section>

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard label='Посещений всего' value={stats.visitsTotal} caption='Все зафиксированные визиты на витрину календаря.' />
        <StatCard label='Посещений за 7 дней' value={stats.visits7d} caption='Динамика интереса аудитории за последнюю неделю.' />
        <StatCard label='Посещений сегодня' value={stats.visitsToday} caption='Текущая дневная активность пользователей.' />
        <StatCard label='Уникальных посетителей' value={stats.uniqueVisitors} caption='Количество уникальных анонимных идентификаторов посетителей.' />
      </section>

      <section className='grid gap-6 xl:grid-cols-[1.2fr_0.8fr]'>
        <div className='rounded-[28px] bg-white p-6 shadow-panel'>
          <h2 className='text-xl font-semibold'>Что важно сегодня</h2>
          <div className='mt-5 grid gap-4'>
            <div className='rounded-[24px] border border-emerald-100 bg-emerald-50 p-4'>
              <div className='text-sm font-medium text-emerald-800'>Важные мероприятия</div>
              <p className='mt-2 text-sm leading-6 text-emerald-700'>Проверьте актуальность hero-блока и убедитесь, что события с тегом #Хит и приоритетные публикации выделены корректно.</p>
            </div>
            <div className='rounded-[24px] border border-sky-100 bg-sky-50 p-4'>
              <div className='text-sm font-medium text-sky-800'>Telegram-импорт и API</div>
              <p className='mt-2 text-sm leading-6 text-sky-700'>Новые посты и внешние коннекторы должны пройти модерацию перед публикацией на витрине.</p>
            </div>
            <div className='rounded-[24px] border border-violet-100 bg-violet-50 p-4'>
              <div className='text-sm font-medium text-violet-800'>Посещаемость</div>
              <p className='mt-2 text-sm leading-6 text-violet-700'>Следите за ростом визитов: всплески обычно связаны с удачными highlights, полезными подборками и продвижением офлайн-событий.</p>
            </div>
          </div>
        </div>

        <div className='rounded-[28px] bg-white p-6 shadow-panel'>
          <h2 className='text-xl font-semibold'>Последняя активность</h2>
          <div className='mt-5 space-y-4'>
            {[
              'Подтвержден импорт из Telegram: «Практикум по 54-ФЗ»',
              'Создано новое мероприятие категории «1С и автоматизация»',
              'Подписчик @buhgalter_nina оформил напоминание за 1 час',
              `За сегодня зафиксировано ${stats.visitsToday} визитов на витрину календаря`,
            ].map((item) => (
              <div key={item} className='rounded-[22px] border border-slate-200 p-4 text-sm leading-6 text-slate-600'>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
