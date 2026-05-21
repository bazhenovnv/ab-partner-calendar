'use client';

import { useEffect, useMemo, useState } from 'react';
import { Megaphone, RefreshCw, Send, Users } from 'lucide-react';
import { SectionHeader } from '@/components/admin/section-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/admin-utils';
import { BroadcastItem, TelegramSubscriber } from '@/lib/types';

export default function AdminBroadcastsPage() {
  const [items, setItems] = useState<BroadcastItem[]>([]);
  const [subscribers, setSubscribers] = useState<TelegramSubscriber[]>([]);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const activeSubscribers = useMemo(() => subscribers.filter((item) => item.isActive).length, [subscribers]);

  async function load() {
    const token = getAdminToken();
    if (!token) return;

    const [broadcastsData, subscribersData] = await Promise.all([
      api.broadcasts(token),
      api.broadcastSubscribers(token),
    ]);

    setItems(broadcastsData);
    setSubscribers(subscribersData);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить рассылки.'));
  }, []);

  async function createBroadcast(sendImmediately = false) {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    setError('');
    setResult('');

    try {
      const broadcast = await api.createBroadcast(token, { title, text });
      if (sendImmediately) {
        const sent = await api.sendBroadcast(token, broadcast.id);
        setResult(`Рассылка отправлена: ${sent.sentCount} успешно, ${sent.failedCount} ошибок.`);
      } else {
        setResult('Черновик рассылки сохранён.');
      }

      setTitle('');
      setText('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания рассылки.');
    } finally {
      setLoading(false);
    }
  }

  async function sendBroadcast(item: BroadcastItem) {
    const token = getAdminToken();
    if (!token) return;
    if (!confirm(`Отправить рассылку «${item.title}» активным подписчикам?`)) return;

    setLoading(true);
    setError('');
    setResult('');

    try {
      const sent = await api.sendBroadcast(token, item.id);
      setResult(`Рассылка отправлена: ${sent.sentCount} успешно, ${sent.failedCount} ошибок.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки рассылки.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='space-y-6'>
      <SectionHeader
        eyebrow='Telegram broadcasts'
        title='Рассылка'
        description='Отправка сообщений всем активным подписчикам Telegram-бота. Пользователь становится подписчиком после команды /start.'
      />

      <section className='grid gap-4 lg:grid-cols-3'>
        <div className='rounded-[28px] border border-[#7CD8B3] bg-white p-5 shadow-panel'>
          <div className='flex items-center gap-3'>
            <div className='rounded-2xl border border-[#7CD8B3] bg-[#7CD8B3] p-3 text-black'><Users className='h-5 w-5' /></div>
            <div>
              <div className='text-2xl font-bold text-black'>{activeSubscribers}</div>
              <div className='text-sm text-slate-500'>активных подписчиков</div>
            </div>
          </div>
        </div>
        <div className='rounded-[28px] border border-[#7CD8B3] bg-white p-5 shadow-panel'>
          <div className='flex items-center gap-3'>
            <div className='rounded-2xl border border-[#7CD8B3] bg-[#7CD8B3] p-3 text-black'><Megaphone className='h-5 w-5' /></div>
            <div>
              <div className='text-2xl font-bold text-black'>{items.length}</div>
              <div className='text-sm text-slate-500'>рассылок создано</div>
            </div>
          </div>
        </div>
        <button
          type='button'
          onClick={() => load().catch((err) => setError(err instanceof Error ? err.message : 'Ошибка обновления.'))}
          className='mint-btn pressable rounded-[28px] justify-start p-5 text-left'
        >
          <RefreshCw className='h-5 w-5' />
          Обновить данные
        </button>
      </section>

      {error ? <div className='rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{error}</div> : null}
      {result ? <div className='rounded-2xl border border-[#7CD8B3] bg-[#effcf6] p-4 text-sm text-black'>{result}</div> : null}

      <section className='rounded-[30px] border border-[#7CD8B3] bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.16)]'>
        <h2 className='text-2xl font-bold text-black'>Новая рассылка</h2>
        <p className='mt-2 text-sm text-slate-600'>Текст поддерживает базовый HTML Telegram: &lt;b&gt;, &lt;i&gt;, &lt;a href="..."&gt;.</p>

        <div className='mt-5 grid gap-4'>
          <label className='space-y-2'>
            <span className='text-sm font-semibold text-black'>Заголовок</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder='Например: Важные новости недели' />
          </label>
          <label className='space-y-2'>
            <span className='text-sm font-semibold text-black'>Текст рассылки</span>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className='min-h-[220px]' placeholder='Введите текст сообщения...' />
          </label>
        </div>

        <div className='mt-5 flex flex-wrap gap-3'>
          <Button disabled={loading} onClick={() => createBroadcast(false)}>Сохранить черновик</Button>
          <Button disabled={loading} onClick={() => createBroadcast(true)} className='gap-2'><Send className='h-4 w-4' />Сохранить и отправить</Button>
        </div>
      </section>

      <section className='rounded-[30px] border border-[#7CD8B3] bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.16)]'>
        <h2 className='text-2xl font-bold text-black'>История рассылок</h2>
        <div className='mt-5 space-y-4'>
          {items.length === 0 ? (
            <div className='rounded-2xl border border-dashed border-[#7CD8B3] p-6 text-sm text-slate-500'>Рассылок пока нет.</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className='rounded-[24px] border border-[#d8f3e7] bg-white p-5 shadow-[0_14px_34px_rgba(0,0,0,0.10)]'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                  <div>
                    <div className='text-lg font-bold text-black'>{item.title}</div>
                    <div className='mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-700'>{item.text}</div>
                    <div className='mt-3 flex flex-wrap gap-2'>
                      <Badge tone={item.status === 'SENT' ? 'mint' : item.status === 'SENDING' ? 'amber' : 'default'}>{item.status}</Badge>
                      <Badge tone='blue'>отправлено: {item.sentCount}</Badge>
                      <Badge tone={item.failedCount ? 'red' : 'default'}>ошибок: {item.failedCount}</Badge>
                      <Badge tone='default'>доставок: {item._count?.deliveries || 0}</Badge>
                    </div>
                  </div>
                  <Button disabled={loading} onClick={() => sendBroadcast(item)} className='shrink-0 gap-2'><Send className='h-4 w-4' />Отправить</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
