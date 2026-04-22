import Image from 'next/image';
import { Bell, Send } from 'lucide-react';
import { Button } from './ui/button';

export function SiteHeader() {
  return (
    <header className='container-shell pt-5'>
      <div className='surface-card px-5 py-3'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div className='flex items-center gap-4'>
            <div className='flex h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-[10px] bg-black'>
              <Image src='/logo-black.png' alt='АБ Партнер' width={58} height={58} className='h-[58px] w-[58px] object-cover' priority />
            </div>
            <div className='flex items-center gap-4'>
              <div className='text-[22px] font-semibold tracking-tight text-[#1a1a1a]'>АБ Партнер</div>
              <div className='hidden h-8 w-px bg-[#d6d8dd] sm:block' />
              <div className='hidden text-[15px] text-slate-500 sm:block'>Календарь бухгалтеров</div>
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <Button asChild variant='secondary' className='min-w-[120px]'>
              <a href='https://t.me/ab_afisha_buh' target='_blank' rel='noreferrer'>
                <Send className='h-4 w-4' />Канал
              </a>
            </Button>
            <Button asChild className='min-w-[156px]'>
              <a href='https://t.me/ABletter_bot' target='_blank' rel='noreferrer'>
                <Bell className='h-4 w-4' />Напомнить
              </a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
