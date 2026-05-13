import Image from 'next/image';
import { Send, UsersRound } from 'lucide-react';
import { Button } from './ui/button';

export function SiteHeader() {
  return (
    <header className='container-shell pt-5'>
      <div className='surface-card px-5 py-3'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <a href='/' className='flex items-center' aria-label='АБ Партнер — на главную'>
            <div className='flex h-[64px] w-[64px] items-center justify-center overflow-hidden rounded-[16px] bg-black p-1.5'>
              <Image
                src='/logo-ab-partner.png'
                alt='АБ Партнер'
                width={64}
                height={64}
                className='h-full w-full object-contain'
                priority
              />
            </div>
          </a>

          <div className='flex flex-wrap items-center gap-3'>
            <Button asChild variant='secondary' className='min-w-[120px]'>
              <a href='https://t.me/ab_afisha_buh' target='_blank' rel='noreferrer'>
                <Send className='h-4 w-4' />
                Канал
              </a>
            </Button>
            <Button asChild className='min-w-[170px]'>
              <a href='https://ab-buhpartner.ru' target='_blank' rel='noreferrer'>
                <UsersRound className='h-4 w-4' />
                Стать партнером
              </a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
