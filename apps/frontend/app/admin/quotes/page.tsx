'use client';

import { useEffect, useState } from 'react';
import { SectionHeader } from '@/components/admin/section-header';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/admin-utils';
import { QuoteItem } from '@/lib/types';

type FormState = { text: string; author: string; sortOrder: string };
const EMPTY_FORM: FormState = { text: '', author: '', sortOrder: '0' };

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const token = getAdminToken();

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.quotes(token);
      setQuotes(data);
    } catch {
      setError('Ошибка загрузки цитат');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(q: QuoteItem) {
    setEditId(q.id);
    setForm({ text: q.text, author: q.author, sortOrder: String(q.sortOrder) });
    setFormError('');
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  async function handleSave() {
    if (!form.text.trim() || !form.author.trim()) {
      setFormError('Заполните текст и автора');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        text: form.text.trim(),
        author: form.author.trim(),
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editId) {
        await api.updateQuote(token, editId, payload);
      } else {
        await api.createQuote(token, payload);
      }
      cancelForm();
      await load();
    } catch {
      setFormError('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string) {
    try {
      await api.toggleQuote(token, id);
      await load();
    } catch {
      setError('Ошибка переключения статуса');
    }
  }

  async function handleDelete(id: string, text: string) {
    if (!confirm(`Удалить цитату «${text.slice(0, 60)}»?`)) return;
    try {
      await api.deleteQuote(token, id);
      await load();
    } catch {
      setError('Ошибка удаления');
    }
  }

  return (
    <div className='space-y-6'>
      <SectionHeader
        eyebrow='Контент'
        title='Цитаты'
        description='Цитаты бухгалтеров и экспертов, отображаемые на публичной витрине.'
      />

      {error && (
        <div className='rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</div>
      )}

      {showForm && (
        <div className='rounded-[24px] bg-white p-6 shadow-sm'>
          <h2 className='mb-4 text-lg font-semibold'>{editId ? 'Редактировать цитату' : 'Новая цитата'}</h2>
          <div className='space-y-4'>
            <div>
              <label className='mb-1 block text-sm font-medium text-slate-700'>Текст *</label>
              <textarea
                className='w-full rounded-[14px] border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint'
                rows={3}
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                placeholder='Текст цитаты…'
              />
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div>
                <label className='mb-1 block text-sm font-medium text-slate-700'>Автор *</label>
                <input
                  className='w-full rounded-[14px] border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint'
                  value={form.author}
                  onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                  placeholder='Имя автора'
                />
              </div>
              <div>
                <label className='mb-1 block text-sm font-medium text-slate-700'>Порядок сортировки</label>
                <input
                  type='number'
                  className='w-full rounded-[14px] border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint'
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
            </div>
            {formError && <p className='text-sm text-red-600'>{formError}</p>}
            <div className='flex gap-3'>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className='rounded-2xl bg-graphite px-5 py-2 text-sm font-medium text-white transition hover:bg-graphite/90 disabled:opacity-50'
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
              <button
                onClick={cancelForm}
                className='rounded-2xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50'
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <div className='flex items-center justify-between'>
        <p className='text-sm text-slate-500'>{loading ? 'Загрузка…' : `${quotes.length} цитат`}</p>
        {!showForm && (
          <button
            onClick={openCreate}
            className='rounded-2xl bg-graphite px-4 py-2 text-sm font-medium text-white transition hover:bg-graphite/90'
          >
            + Добавить цитату
          </button>
        )}
      </div>

      {!loading && quotes.length === 0 && (
        <div className='rounded-[24px] border border-slate-100 bg-white p-8 text-center text-slate-400'>
          Цитат пока нет. Добавьте первую.
        </div>
      )}

      <div className='space-y-3'>
        {quotes.map((q) => (
          <div
            key={q.id}
            className={`rounded-[24px] border bg-white p-5 transition ${q.isActive ? 'border-slate-100' : 'border-slate-100 opacity-50'}`}
          >
            <div className='flex items-start justify-between gap-4'>
              <div className='flex-1 min-w-0'>
                <p className='text-sm leading-6 text-slate-800'>«{q.text}»</p>
                <p className='mt-1 text-xs text-slate-500'>— {q.author} · порядок: {q.sortOrder}</p>
              </div>
              <div className='flex shrink-0 items-center gap-2'>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    q.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {q.isActive ? 'Активна' : 'Скрыта'}
                </span>
                <button
                  onClick={() => openEdit(q)}
                  className='rounded-xl border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50'
                >
                  Изменить
                </button>
                <button
                  onClick={() => void handleToggle(q.id)}
                  className='rounded-xl border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50'
                >
                  {q.isActive ? 'Скрыть' : 'Показать'}
                </button>
                <button
                  onClick={() => void handleDelete(q.id, q.text)}
                  className='rounded-xl border border-red-100 px-3 py-1 text-xs text-red-600 transition hover:bg-red-50'
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
