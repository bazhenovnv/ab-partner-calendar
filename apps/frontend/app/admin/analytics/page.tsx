'use client';

import { useEffect, useState } from 'react';
import { SectionHeader } from '@/components/admin/section-header';
import { getAdminToken } from '@/lib/admin-utils';
import { api } from '@/lib/api';
import { AnalyticsSummary } from '@/lib/types';

const fallback: AnalyticsSummary = {
  byCity: [],
  byTopic: [],
  totals: { upcoming: 0, live: 0, completed: 0, highlighted: 0 },
  attendance: { visitsTotal: 0, visits7d: 0, visits30d: 0, uniqueVisitors: 0, topPaths: [], byVisitCity: [] },
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary>(fallback);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    api.analytics(token).then(setData).catch(() => undefined);
  }, []);

  return (
    <div className='space-y-6'>
      <SectionHeader
        eyebrow='Вторая линия'
        title='Аналитика интереса и посещаемости'
        description='Сводка по темам, городам и фактическим визитам в календарь. Используется для редакторских решений, планирования продвижения и оценки спроса.'
      />

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {[
          ['Запланировано', data.totals.upcoming],
          ['Идёт сейчас', data.totals.live],
          ['Завершено', data.totals.completed],
          ['Важных событий', data.totals.highlighted],
        ].map(([label, value]) => (
          <div key={label} className='rounded-[28px] bg-white p-6 shadow-panel'>
            <div className='text-sm text-slate-500'>{label}</div>
            <div className='mt-3 text-3xl font-semibold'>{value}</div>
          </div>
        ))}
      </section>

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {[
          ['Посещений всего', data.attendance.visitsTotal],
          ['Посещений за 7 дней', data.attendance.visits7d],
          ['Посещений за 30 дней', data.attendance.visits30d],
          ['Уникальных посетителей', data.attendance.uniqueVisitors],
        ].map(([label, value]) => (
          <div key={label} className='rounded-[28px] bg-white p-6 shadow-panel'>
            <div className='text-sm text-slate-500'>{label}</div>
            <div className='mt-3 text-3xl font-semibold'>{value}</div>
          </div>
        ))}
      </section>

      <section className='grid gap-6 xl:grid-cols-2'>
        <div className='rounded-[28px] bg-white p-6 shadow-panel'>
          <h2 className='text-xl font-semibold'>Популярные города по событиям</h2>
          <div className='mt-4 space-y-3'>
            {data.byCity.map((item) => (
              <div key={item.city} className='flex items-center justify-between rounded-2xl border border-slate-200 p-4'>
                <span>{item.city}</span>
                <span className='rounded-full bg-slate-100 px-3 py-1 text-sm'>{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-[28px] bg-white p-6 shadow-panel'>
          <h2 className='text-xl font-semibold'>Популярные темы</h2>
          <div className='mt-4 space-y-3'>
            {data.byTopic.map((item) => (
              <div key={item.topic} className='flex items-center justify-between rounded-2xl border border-slate-200 p-4'>
                <span>{item.topic}</span>
                <span className='rounded-full bg-slate-100 px-3 py-1 text-sm'>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='grid gap-6 xl:grid-cols-2'>
        <div className='rounded-[28px] bg-white p-6 shadow-panel'>
          <h2 className='text-xl font-semibold'>Топ страниц по посещаемости</h2>
          <div className='mt-4 space-y-3'>
            {data.attendance.topPaths.map((item) => (
              <div key={item.path} className='flex items-center justify-between rounded-2xl border border-slate-200 p-4'>
                <span>{item.path}</span>
                <span className='rounded-full bg-slate-100 px-3 py-1 text-sm'>{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-[28px] bg-white p-6 shadow-panel'>
          <h2 className='text-xl font-semibold'>Города по посещаемости</h2>
          <div className='mt-4 space-y-3'>
            {data.attendance.byVisitCity.map((item) => (
              <div key={item.city} className='flex items-center justify-between rounded-2xl border border-slate-200 p-4'>
                <span>{item.city}</span>
                <span className='rounded-full bg-slate-100 px-3 py-1 text-sm'>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
