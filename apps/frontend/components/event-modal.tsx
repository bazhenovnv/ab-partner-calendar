'use client';

import { CalendarClock, MapPin, Tag, ExternalLink, BellRing, Send, Clock4 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { EventItem } from '@/lib/types';
import { formatLabelMap, statusLabelMap } from '@/lib/utils';
import { api } from '@/lib/api';
import { Modal } from './ui/dialog';
import { Button } from './ui/button';

function cleanDescriptionText(value?: string) {
  if (!value) return '';

  return value
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#[\p{L}\p{N}_-]+/gu, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(Источник|Телеграм|Telegram|MAX|Зарегистрироваться|Регистрация)\b/iu.test(line))
    .filter((line) => !/зарегистрироваться|регистрация|телеграм|telegram|\bmax\b/iu.test(line))
    .filter((line) => !/(?:^|[?&])q=|%[0-9a-f]{2}/iu.test(line))
    .filter((line) => !/^\(?\??\)?$/.test(line))
    .join('\n')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function EventModal({
  item,
  open,
  onOpenChange,
}: {
  item: EventItem | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  if (!item) return null;
  const status = item.runtimeStatus ?? item.status;
  const telegramBotDeepLink = process.env.NEXT_PUBLIC_TELEGRAM_BOT_DEEP_LINK || 'https://t.me/PartnersTogether_bot';
  const telegramReminderUrl = `${telegramBotDeepLink}?start=afisha_${item.id}`;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={item.title}>
      <div className='grid gap-6 lg:grid-cols-[1.08fr_0.92fr]'>
        <div>
          <img src={item.imageUrl} alt={item.title} className='h-64 w-full rounded-[24px] border border-[#7CD8B3] object-cover' />
          <p className='mt-5 whitespace-pre-line break-words text-sm leading-7 text-slate-600 [overflow-wrap:anywhere]'>{cleanDescriptionText(item.descriptionFull)}</p>
        </div>
        <div className='space-y-4 rounded-[24px] border border-[#7CD8B3] bg-[#E8E7E3] p-5'>
          <InfoRow label='Дата и время' value={format(new Date(item.startAt), 'd MMMM yyyy, HH:mm', { locale: ru })} icon={<CalendarClock className='h-4 w-4' />} />
          <InfoRow label='Окончание' value={format(new Date(item.endAt), 'd MMMM yyyy, HH:mm', { locale: ru })} icon={<Clock4 className='h-4 w-4' />} />
          <InfoRow label='Место проведения' value={item.location} icon={<MapPin className='h-4 w-4' />} />
          <InfoRow label='Формат' value={formatLabelMap[item.format]} icon={<Tag className='h-4 w-4' />} />
          <InfoRow label='Организатор' value='АБ Партнер' icon={<Send className='h-4 w-4' />} />
          <InfoRow label='Статус' value={statusLabelMap[status]} icon={<BellRing className='h-4 w-4' />} />

          <div className='flex flex-wrap gap-3 pt-4'>
            <Button asChild>
              <a href={telegramReminderUrl} target='_blank' rel='noreferrer'>
                <BellRing className='h-4 w-4' />Напомнить в Telegram
              </a>
            </Button>
            <Button asChild variant='ghost'>
              <a href={api.exportEventIcsUrl(item.slug)} target='_blank' rel='noreferrer'>
                <CalendarClock className='h-4 w-4' />Экспорт в календарь
              </a>
            </Button>
            <Button asChild variant='ghost'>
              <a href={item.sourceUrl || 'https://t.me/ab_afisha_buh'} target='_blank' rel='noreferrer'>
                <ExternalLink className='h-4 w-4' />Telegram-канал
              </a>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className='rounded-2xl border border-[#7CD8B3] bg-[#E8E7E3] p-4'>
      <div className='mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400'>
        {icon}
        {label}
      </div>
      <div className='text-sm font-medium text-slate-800'>{value}</div>
    </div>
  );
}
