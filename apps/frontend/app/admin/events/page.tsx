'use client';

import { useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, RotateCcw, Trash2 } from 'lucide-react';
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
import { Category, EventItem } from '@/lib/types';

export default function AdminEventsPage() {
  const [items, setItems] = useState<EventItem[]>(mockEvents);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [categoryId, setCategoryId] = useState('ALL');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function loadEvents(nextIncludeDeleted = includeDeleted) {
    const token = getAdminToken();
    api.categories().then(setCategories).catch(() => undefined);
    if (!token) return;
    const data = await api.adminEvents(token, nextIncludeDeleted);
    setItems(data);
  }

  useEffect(() => {
    loadEvents().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (current) {
        const updated = await api.updateEvent(token, current.id, payload);
        setItems((prev) => prev.map((item) => (item.id === current.id ? updated : item)));
      } else {
        const created = await api.createEvent(token, payload);
        setItems((prev) => [created, ...prev]);
      }
      setCreating(false);
      setEditing(null);
      return;
    }

    const category = categories.find((item) => item.id === value.categoryId) || categories[0] || mockCategories[0];
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

    if (current) setItems((prev) => prev.map((item) => (item.id === current.id ? record : item)));
    else setItems((prev) => [record, ...prev]);
    setCreating(false);
    setEditing(null);
  }

  async function deleteItem(item: EventItem) {
    if (!confirm(`Удалить событие «${item.title}»? После удаления оно не будет повторно загружено синхронизацией.`)) return;
    const token = getAdminToken();
    setError('');
    if (token && !item.id.startsWith('local-')) {
      await api.deleteEvent(token, item.id);
      await loadEvents(includeDeleted);
      return;
    }
    setItems((prev) => prev.filter((record) => record.id !== item.id));
  }

  async function restoreItem(item: EventItem) {
    const token = getAdminToken();
    if (!token) return setError('Нет токена администратора.');
    setError('');
    try {
      await api.restoreEvent(token, item.id);
      await loadEvents(includeDeleted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось восстановить событие');
    }
  }

  async function toggleIncludeDeleted(value: boolean) {
    setIncludeDeleted(value);
    await loadEvents(value);
  }

  return (
    <div className='space-y-6'>
      <SectionHeader
        eyebrow='Каталог событий'
        title='Мероприятия'
        description='Создание, редактирование, мягкое удаление, восстановление и защита от повторного импорта удалённых событий.'
        actions={<Button onClick={() => setCreating(true)}><Plus className='h-4 w-4' />Создать мероприятие</Button>}
      />

      {error ? <div className='rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700'>{error}</div> : null}

      <section className='grid gap-4 rounded-[28px] bg-white p-5-panel lg:grid-cols-[1fr_180px_220px_220px]'>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Поиск по названию, месту или описанию' />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value='ALL'>Все статусы</option>
          <option value='SCHEDULED'>Запланировано</option>
          <option value='LIVE'>Идет сейчас</option>
          <option value='COMPLETED'>Завершено</option>
        </Select>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value='ALL'>Все категории</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
        </Select>
        <label className='inline-flex items-center justify-center gap-3 rounded-2xl border border-[#7CD8B3] bg-white px-4 text-sm text-slate-700'>
          <input type='checkbox' checked={includeDeleted} onChange={(e) => toggleIncludeDeleted(e.target.checked)} />
          Показывать удалённые
        </label>
      </section>

      <section className='overflow-hidden rounded-[28px] bg-white-panel'>
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
                <tr key={item.id} className={`border-t border-slate-100 align-top ${item.deletedAt ? 'bg-rose-50/50' : ''}`}>
                  <td className='px-5 py-4'>
                    <div className='font-medium text-slate-950'>{item.title}</div>
                    <div className='mt-1 max-w-md text-slate-500'>{item.descriptionShort}</div>
                    <div className='mt-3 flex flex-wrap gap-2'>
                      {item.isImportant ? <Badge tone='mint'>Важное</Badge> : null}
                      {item.deletedAt ? <Badge tone='red'>Удалено</Badge> : null}
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
                    <div className='flex flex-wrap gap-2'>
                      <Button variant='ghost' disabled={Boolean(item.deletedAt)} onClick={() => setEditing(item)}><Edit3 className='h-4 w-4' />Изменить</Button>
                      {item.deletedAt ? (
                        <Button variant='ghost' className='text-emerald-700 hover:bg-emerald-50' onClick={() => restoreItem(item)}><RotateCcw className='h-4 w-4' />Восстановить</Button>
                      ) : (
                        <Button variant='ghost' className='text-rose-700 hover:bg-rose-50' onClick={() => deleteItem(item)}><Trash2 className='h-4 w-4' />Удалить</Button>
                      )}
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
          <EventForm categories={categories} initial={editing} submitLabel={editing ? 'Сохранить изменения' : 'Создать мероприятие'} onSubmit={(value) => submitForm(value, editing)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
