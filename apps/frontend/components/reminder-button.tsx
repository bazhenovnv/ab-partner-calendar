'use client';

import type { MouseEvent } from 'react';
import { BellRing } from 'lucide-react';
import { EventItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

type ReminderButtonProps = {
  event: Pick<EventItem, 'id' | 'title'>;
  label?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark';
  className?: string;
};

export function ReminderButton({
  event,
  label = 'Напомнить',
  variant = 'primary',
  className,
}: ReminderButtonProps) {
  const telegramBotDeepLink = process.env.NEXT_PUBLIC_TELEGRAM_BOT_DEEP_LINK || 'https://t.me/PartnersTogether_bot';
  const href = `${telegramBotDeepLink}?start=afisha_${event.id}`;

  return (
    <Button asChild variant={variant} className={cn('whitespace-nowrap', className)}>
      <a
        href={href}
        target='_blank'
        rel='noreferrer'
        aria-label={`Поставить напоминание: ${event.title}`}
        onClick={(eventClick: MouseEvent<HTMLAnchorElement>) => eventClick.stopPropagation()}
      >
        <BellRing className='h-4 w-4' />
        {label}
      </a>
    </Button>
  );
}
