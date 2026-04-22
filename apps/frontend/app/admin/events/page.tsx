'use client';

import { useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { mockCategories, mockEvents } from '@/components/admin/admin-data';
import { EventForm, EventFormValue } from '@/components/admin/event-form';
import { SectionHeader } from '@/components/admin/section-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/admin-utils';
import { EventItem } from '@/lib/types';

export default function AdminEventsPage() {
  const [items, setItems] = useState<EventItem[]>(mockEvents);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [categoryId, setCategoryId] = useState('ALL');
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    api.adminEvents(token).then(setItems).catch(() => undefined);
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchesQuery = [item.title, item.location, item.descriptionShort].join(' ').toLowerCase().includes(query.toLowerCase());
        const matchesStatus = status === 'ALL' || item.status === status;
        const matchesCategory = categoryId === 'ALL' || item.category.id === categoryId;
        return matchesQuery && matchesStatus && matchesCategory;
      }),
    [items, query, status, categoryId],
  );

  async function submitForm(value: EventFormValue, current?: EventItem | null) {
    const token = getAdminToken();
    const payload = { ...value, startAt: new Date(value.startAt).toISOString(), endAt: new Date(value.endAt).toISOString() };

    if (token) {
      try {
        if (current) {
          const updated = await api.updateEvent(token, current.id, payload);
          setItems((prev) => prev.map((item) => (item.id === current.id ? { ...item, ...updated } : item)));
        } else {
          const created = await api.createEvent(token, payload);
          setItems((prev) => [created, ...prev]);
        }
        setCreating(false);
        setEditing(null);
        return;
      } catch {
        // fallback to local mock update
      }
    }

    const category = mockCategories.find((item) => item.id === value.categoryId) || mockCategories[0];
    const record: EventItem = {
      id: current?.id || `local-${Date.now()}`,
      title: value.title,
      slug: value.slug,
      descriptionShort: value.descriptionShort,
      descriptionFull: value.descriptionFull,
      startAt: new Date(value.startAt).toISOString(),
      endAt: new Date(value.endAt).toISOString(),
      location: value.location,
      format: value.format,
      imageUrl: value.imageUrl,
      source: value.source,
      sourceUrl: value.sourceUrl,
      isImportant: value.isImportant,
      status: value.status,
      runtimeStatus: value.status,
      published: value.published,
      tags: value.tags,
      category,
      _count: current?._count || { reminders: 0 },
    };

    if (current) {
      setItems((prev) => prev.map((item) => (item.id === current.id ? record : item)));
    } else {
      setItems((prev) => [record, ...prev]);
    }
    setCreating(false);
    setEditing(null);
  }

  return (
    <div className='space-y-6'>
      <SectionHeader
        eyebrow='Каталог событий'
        title='Мероприятия'
        description='Полноценное управление афишей: создание, редактирование, публикация, фильтрация по статусу и категории, а также работа с важными карточками для hero-блока.'
        actions={<Button onClick={() => setCreating(true)}><Plus className='h-4 w-4' />Создать мероприятие</Button>}
      />

      <section className='grid gap-4 rounded-[28px] bg-white p-5 shadow-panel lg:grid-cols-[1fr_180px_220px]'>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Поиск по названию, месту или описанию' />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value='ALL'>Все статусы</option>
          <option value='SCHEDULED'>Запланировано</option>
          <option value='LIVE'>Идет сейчас</option>
          <option value='COMPLETED'>Завершено</option>
        </Select>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value='ALL'>Все категории</option>
          {mockCategories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
        </Select>
      </section>

      <section className='overflow-hidden rounded-[28px] bg-white shadow-panel'>
        <div className='overflow-x-auto'>
          <table className='min-w-full text-left text-sm'>
            <thead className='bg-slate-50 text-slate-500'>
              <tr>
                <th className='px-5 py-4 font-medium'>Мероприятие</th>
                <th className='px-5 py-4 font-medium'>Дата</th>
                <th className='px-5 py-4 font-medium'>Категория</th>
                <th className='px-5 py-4 font-medium'>Статус</th>
                <th className='px-5 py-4 font-medium'>Публикация</th>
                <th className='px-5 py-4 font-medium'>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className='border-t border-slate-100 align-top'>
                  <td className='px-5 py-4'>
                    <div className='font-medium text-slate-950'>{item.title}</div>
                    <div className='mt-1 max-w-md text-slate-500'>{item.descriptionShort}</div>
                    <div className='mt-3 flex flex-wrap gap-2'>
                      {item.isImportant ? <Badge tone='mint'>Важное</Badge> : null}
                      <Badge tone='default'>{item.format}</Badge>
                      <Badge tone='blue'>{item._count?.reminders || 0} напоминаний</Badge>
                    </div>
                  </td>
                  <td className='px-5 py-4 text-slate-600'>
                    <div>{new Date(item.startAt).toLocaleDateString('ru-RU')}</div>
                    <div className='mt-1 text-xs text-slate-400'>{new Date(item.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className='px-5 py-4 text-slate-600'>{item.category.title}</td>
                  <td className='px-5 py-4'>
                    <Badge tone={item.status === 'LIVE' ? 'red' : item.status === 'COMPLETED' ? 'default' : 'mint'}>
                      {item.status === 'LIVE' ? 'Идет сейчас' : item.status === 'COMPLETED' ? 'Завершено' : 'Запланировано'}
                    </Badge>
                  </td>
                  <td className='px-5 py-4'>{item.published ? <Badge tone='mint'>Опубликовано</Badge> : <Badge tone='amber'>Черновик</Badge>}</td>
                  <td className='px-5 py-4'>
                    <div className='flex gap-2'>
                      <Button variant='ghost' onClick={() => setEditing(item)}><Edit3 className='h-4 w-4' />Изменить</Button>
                      <Button variant='ghost' className='text-rose-700 hover:bg-rose-50' onClick={() => setItems((prev) => prev.filter((record) => record.id !== item.id))}><Trash2 className='h-4 w-4' />Удалить</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={creating || !!editing} onOpenChange={(open) => { if (!open) { setCreating(false); setEditing(null); } }}>
        <DialogContent className='max-w-4xl'>
          <div className='mb-6'>
            <h2 className='text-2xl font-semibold text-slate-950'>{editing ? 'Редактирование мероприятия' : 'Создание мероприятия'}</h2>
            <p className='mt-2 text-sm text-slate-600'>Заполните основные поля события, настройте статусы и публикацию на витрине.</p>
          </div>
          <EventForm categories={mockCategories} initial={editing} submitLabel={editing ? 'Сохранить изменения' : 'Создать мероприятие'} onSubmit={(value) => submitForm(value, editing)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
