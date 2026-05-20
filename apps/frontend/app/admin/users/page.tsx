'use client';

import { useEffect, useState } from 'react';
import { Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { SectionHeader } from '@/components/admin/section-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/admin-utils';
import { AdminUser } from '@/lib/types';

type Draft = {
  email: string;
  name: string;
  password: string;
  role: 'ADMIN' | 'SUPERADMIN';
};

const emptyDraft: Draft = {
  email: '',
  name: '',
  password: '',
  role: 'ADMIN',
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadUsers() {
    const token = getAdminToken();
    if (!token) {
      setError('Нет токена администратора. Выйдите и войдите в админку снова.');
      return;
    }
    const users = await api.users(token);
    setItems(users);
  }

  useEffect(() => {
    loadUsers().catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки пользователей'));
  }, []);

  function startCreate() {
    setError('');
    setEditingId('new');
    setDraft(emptyDraft);
  }

  function startEdit(user: AdminUser) {
    setError('');
    setEditingId(user.id);
    setDraft({ email: user.email, name: user.name, password: '', role: user.role });
  }

  async function saveUser() {
    const token = getAdminToken();
    if (!token) return setError('Нет токена администратора.');

    if (!draft.email.trim() || !draft.name.trim()) {
      setError('Заполните email и имя пользователя.');
      return;
    }
    if (editingId === 'new' && !draft.password.trim()) {
      setError('Для нового пользователя нужен пароль.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (editingId === 'new') {
        await api.createUser(token, draft);
      } else if (editingId) {
        await api.updateUser(token, editingId, {
          email: draft.email,
          name: draft.name,
          role: draft.role,
          ...(draft.password.trim() ? { password: draft.password } : {}),
        });
      }
      setEditingId(null);
      setDraft(emptyDraft);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить пользователя');
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(user: AdminUser) {
    const token = getAdminToken();
    if (!token) return setError('Нет токена администратора.');
    if (!confirm(`Удалить пользователя ${user.email}?`)) return;

    setLoading(true);
    setError('');
    try {
      await api.deleteUser(token, user.id);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить пользователя');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='space-y-6'>
      <SectionHeader
        eyebrow='Access control'
        title='Пользователи и администраторы'
        description='Создание, редактирование, удаление и сброс паролей пользователей административной панели.'
        actions={<Button onClick={startCreate}><Plus className='h-4 w-4' />Добавить пользователя</Button>}
      />

      {error ? <div className='rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700'>{error}</div> : null}

      {editingId ? (
        <section className='rounded-[28px] border border-[#7CD8B3] bg-white p-5 shadow-panel'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-xl font-semibold text-slate-950'>{editingId === 'new' ? 'Новый пользователь' : 'Редактирование пользователя'}</h2>
            <Button variant='ghost' onClick={() => setEditingId(null)}><X className='h-4 w-4' />Закрыть</Button>
          </div>
          <div className='grid gap-4 md:grid-cols-2'>
            <label className='grid gap-2 text-sm text-slate-600'>
              Email
              <Input value={draft.email} onChange={(e) => setDraft((value) => ({ ...value, email: e.target.value }))} />
            </label>
            <label className='grid gap-2 text-sm text-slate-600'>
              Имя
              <Input value={draft.name} onChange={(e) => setDraft((value) => ({ ...value, name: e.target.value }))} />
            </label>
            <label className='grid gap-2 text-sm text-slate-600'>
              Пароль
              <Input
                type='password'
                value={draft.password}
                onChange={(e) => setDraft((value) => ({ ...value, password: e.target.value }))}
                placeholder={editingId === 'new' ? 'Обязателен' : 'Оставьте пустым, если не менять'}
              />
            </label>
            <label className='grid gap-2 text-sm text-slate-600'>
              Роль
              <select
                className='h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-mint focus:ring-4 focus:ring-mint/10'
                value={draft.role}
                onChange={(e) => setDraft((value) => ({ ...value, role: e.target.value as Draft['role'] }))}
              >
                <option value='ADMIN'>ADMIN</option>
                <option value='SUPERADMIN'>SUPERADMIN</option>
              </select>
            </label>
          </div>
          <div className='mt-5 flex justify-end gap-3'>
            <Button variant='secondary' onClick={() => setEditingId(null)}>Отмена</Button>
            <Button disabled={loading} onClick={saveUser}><Save className='h-4 w-4' />{loading ? 'Сохранение...' : 'Сохранить'}</Button>
          </div>
        </section>
      ) : null}

      <div className='grid gap-4'>
        {items.map((item) => (
          <div key={item.id} className='rounded-[28px] bg-white p-5 shadow-panel'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <div className='text-lg font-semibold text-slate-950'>{item.name}</div>
                <div className='mt-1 text-sm text-slate-500'>{item.email}</div>
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge tone={item.role === 'SUPERADMIN' ? 'mint' : 'blue'}>{item.role}</Badge>
                <Badge tone='default'>С {new Date(item.createdAt).toLocaleDateString('ru-RU')}</Badge>
                <Button variant='secondary' onClick={() => startEdit(item)}><Edit2 className='h-4 w-4' />Изменить</Button>
                <Button variant='secondary' className='text-rose-700 hover:bg-rose-50' disabled={loading} onClick={() => deleteUser(item)}><Trash2 className='h-4 w-4' />Удалить</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
