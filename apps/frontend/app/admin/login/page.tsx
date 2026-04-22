'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { setAdminToken } from '@/lib/admin-utils';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@ab-partner.ru');
  const [password, setPassword] = useState('Admin12345!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <main className='min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,118,110,.18),_transparent_34%),linear-gradient(180deg,#f5f7f6_0%,#edf2f1_100%)] px-4 py-10'>
      <div className='mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_420px]'>
        <section className='rounded-[36px] bg-graphite p-8 text-white shadow-premium lg:p-12'>
          <div className='inline-flex rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/70'>АБ ПАРТНЕР</div>
          <h1 className='mt-6 max-w-xl text-4xl font-semibold leading-tight'>Безопасный вход в административную панель календаря бухгалтеров</h1>
          <p className='mt-4 max-w-2xl text-base leading-7 text-white/70'>Управляйте афишей, публикациями, импортом из Telegram-канала, напоминаниями и качеством контента в едином интерфейсе.</p>
          <div className='mt-8 grid gap-4 md:grid-cols-2'>
            <div className='rounded-[28px] border border-white/10 bg-white/5 p-5'>
              <ShieldCheck className='h-6 w-6 text-emerald-300' />
              <div className='mt-4 text-lg font-medium'>JWT-аутентификация</div>
              <p className='mt-2 text-sm leading-6 text-white/65'>Защищенный контур доступа для администраторов и редакторов контента.</p>
            </div>
            <div className='rounded-[28px] border border-white/10 bg-white/5 p-5'>
              <LockKeyhole className='h-6 w-6 text-sky-300' />
              <div className='mt-4 text-lg font-medium'>Контроль публикаций</div>
              <p className='mt-2 text-sm leading-6 text-white/65'>Проверка импортов, статусов и важных мероприятий перед выводом на витрину.</p>
            </div>
          </div>
        </section>

        <section className='rounded-[36px] bg-white p-8 shadow-panel lg:p-10'>
          <div className='text-xs uppercase tracking-[0.24em] text-slate-400'>Вход</div>
          <h2 className='mt-2 text-3xl font-semibold text-slate-950'>Авторизация администратора</h2>
          <p className='mt-3 text-sm leading-6 text-slate-600'>Используйте тестовые данные из README или ваши значения из базы пользователей.</p>

          <form
            className='mt-8 space-y-4'
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              setLoading(true);
              try {
                const result = await api.login({ email, password });
                setAdminToken(result.accessToken);
                router.push('/admin');
              } catch {
                setError('Не удалось выполнить вход. Проверьте email, пароль и настройки backend API.');
              } finally {
                setLoading(false);
              }
            }}
          >
            <label className='grid gap-2 text-sm text-slate-600'>
              Email
              <Input type='email' value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className='grid gap-2 text-sm text-slate-600'>
              Пароль
              <Input type='password' value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error ? <div className='rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>{error}</div> : null}
            <Button type='submit' className='w-full' disabled={loading}>{loading ? 'Входим...' : 'Войти в админку'}</Button>
          </form>

          <div className='mt-6 rounded-[24px] bg-slate-50 p-4 text-sm text-slate-600'>
            <div className='font-medium text-slate-900'>Демо-доступ</div>
            <div className='mt-2'>admin@ab-partner.ru</div>
            <div>Admin12345!</div>
          </div>
        </section>
      </div>
    </main>
  );
}
