'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Category, EventItem } from '@/lib/types';

function toDatetimeLocal(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type EventFormValue = {
  title: string;
  slug: string;
  descriptionShort: string;
  descriptionFull: string;
  startAt: string;
  endAt: string;
  location: string;
  format: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  categoryId: string;
  imageUrl?: string;
  source?: string;
  sourceUrl?: string;
  isImportant: boolean;
  published: boolean;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  tags: string[];
};

export function EventForm({
  categories,
  initial,
  submitLabel,
  onSubmit,
}: {
  categories: Category[];
  initial?: EventItem | null;
  submitLabel: string;
  onSubmit: (value: EventFormValue) => Promise<void> | void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<EventFormValue>(() => ({
    title: initial?.title || '',
    slug: initial?.slug || '',
    descriptionShort: initial?.descriptionShort || '',
    descriptionFull: initial?.descriptionFull || '',
    startAt: toDatetimeLocal(initial?.startAt),
    endAt: toDatetimeLocal(initial?.endAt),
    location: initial?.location || 'Онлайн',
    format: initial?.format || 'ONLINE',
    categoryId: initial?.category.id || categories[0]?.id || '',
    imageUrl: initial?.imageUrl || '',
    source: initial?.source || 'MANUAL',
    sourceUrl: initial?.sourceUrl || '',
    isImportant: initial?.isImportant || false,
    published: initial?.published ?? true,
    status: initial?.status || 'SCHEDULED',
    tags: initial?.tags || [],
  }));

  const previewTags = useMemo(() => form.tags.join(', '), [form.tags]);

  return (
    <form
      className='grid gap-4'
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
          await onSubmit(form);
        } finally {
          setLoading(false);
        }
      }}
    >
      <div className='grid gap-4 md:grid-cols-2'>
        <label className='grid gap-2 text-sm text-slate-600'>
          Название
          <Input
            value={form.title}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                title: e.target.value,
                slug:
                  current.slug ||
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-zа-я0-9]+/gi, '-')
                    .replace(/^-|-$/g, ''),
              }))
            }
            placeholder='Название мероприятия'
          />
        </label>
        <label className='grid gap-2 text-sm text-slate-600'>
          Slug
          <Input value={form.slug} onChange={(e) => setForm((current) => ({ ...current, slug: e.target.value }))} placeholder='unikalnyi-slug' />
        </label>
      </div>

      <label className='grid gap-2 text-sm text-slate-600'>
        Краткое описание
        <Textarea value={form.descriptionShort} onChange={(e) => setForm((current) => ({ ...current, descriptionShort: e.target.value }))} />
      </label>

      <label className='grid gap-2 text-sm text-slate-600'>
        Полное описание
        <Textarea value={form.descriptionFull} onChange={(e) => setForm((current) => ({ ...current, descriptionFull: e.target.value }))} className='min-h-[180px]' />
      </label>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <label className='grid gap-2 text-sm text-slate-600'>
          Начало
          <Input type='datetime-local' value={form.startAt} onChange={(e) => setForm((current) => ({ ...current, startAt: e.target.value }))} />
        </label>
        <label className='grid gap-2 text-sm text-slate-600'>
          Окончание
          <Input type='datetime-local' value={form.endAt} onChange={(e) => setForm((current) => ({ ...current, endAt: e.target.value }))} />
        </label>
        <label className='grid gap-2 text-sm text-slate-600'>
          Формат
          <Select value={form.format} onChange={(e) => setForm((current) => ({ ...current, format: e.target.value as EventFormValue['format'] }))}>
            <option value='ONLINE'>Онлайн</option>
            <option value='OFFLINE'>Офлайн</option>
            <option value='HYBRID'>Гибрид</option>
          </Select>
        </label>
        <label className='grid gap-2 text-sm text-slate-600'>
          Статус
          <Select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as EventFormValue['status'] }))}>
            <option value='SCHEDULED'>Запланировано</option>
            <option value='LIVE'>Идет сейчас</option>
            <option value='COMPLETED'>Завершено</option>
          </Select>
        </label>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <label className='grid gap-2 text-sm text-slate-600'>
          Категория
          <Select value={form.categoryId} onChange={(e) => setForm((current) => ({ ...current, categoryId: e.target.value }))}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
            ))}
          </Select>
        </label>
        <label className='grid gap-2 text-sm text-slate-600'>
          Локация
          <Input value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} />
        </label>
        <label className='grid gap-2 text-sm text-slate-600'>
          Источник
          <Input value={form.source} onChange={(e) => setForm((current) => ({ ...current, source: e.target.value }))} />
        </label>
        <label className='grid gap-2 text-sm text-slate-600'>
          Ссылка на источник
          <Input value={form.sourceUrl} onChange={(e) => setForm((current) => ({ ...current, sourceUrl: e.target.value }))} />
        </label>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <label className='grid gap-2 text-sm text-slate-600'>
          Изображение
          <Input value={form.imageUrl} onChange={(e) => setForm((current) => ({ ...current, imageUrl: e.target.value }))} placeholder='https://...' />
        </label>
        <label className='grid gap-2 text-sm text-slate-600'>
          Теги через запятую
          <Input
            value={previewTags}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                tags: e.target.value
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              }))
            }
            placeholder='54-ФЗ, кассы, 1С'
          />
        </label>
      </div>

      <div className='flex flex-wrap gap-6 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600'>
        <label className='inline-flex items-center gap-3'>
          <input type='checkbox' checked={form.isImportant} onChange={(e) => setForm((current) => ({ ...current, isImportant: e.target.checked }))} />
          Показать в верхнем блоке важных мероприятий
        </label>
        <label className='inline-flex items-center gap-3'>
          <input type='checkbox' checked={form.published} onChange={(e) => setForm((current) => ({ ...current, published: e.target.checked }))} />
          Опубликовано на публичной витрине
        </label>
      </div>

      <div className='flex justify-end'>
        <Button type='submit' disabled={loading}>{loading ? 'Сохранение...' : submitLabel}</Button>
      </div>
    </form>
  );
}
