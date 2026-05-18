import Image from 'next/image';
import { Send, UsersRound } from 'lucide-react';

export function SiteHeader() {
  return (
    <header className='container-shell pt-5'>
      <div className='surface-card rounded-[18px] bg-white px-5 py-3 shadow-[0_3px_12px_rgba(15,23,42,0.08)]'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <a href='/' className='flex min-h-[72px] items-center' aria-label='Афиша бухгалтера — на главную'>
            <Image
              src='/logo-ab-partner.png'
              alt='Афиша бухгалтера'
              width={900}
              height={260}
              className='h-[72px] w-auto max-w-full object-contain'
              priority
            />
          </a>

          <div className='flex flex-wrap items-center justify-end gap-3'>
            <a
              href='https://t.me/ab_afisha_buh'
              target='_blank'
              rel='noreferrer'
              className='inline-flex min-w-[170px] items-center justify-center gap-2 rounded-[14px] border border-black/20 bg-[#7CD8B3] px-5 py-3 text-sm font-medium text-black transition hover:opacity-90'
            >
              <Send className='h-4 w-4' />
              Telegram
            </a>
            <a
              href='https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0'
              target='_blank'
              rel='noreferrer'
              className='inline-flex min-w-[170px] items-center justify-center gap-2 rounded-[14px] border border-black/20 bg-[#7CD8B3] px-5 py-3 text-sm font-medium text-black transition hover:opacity-90'
            >
              <span className='inline-flex h-5 min-w-[170px] items-center justify-center rounded-full border border-black/25 px-1 text-[10px] font-bold leading-none'>M</span>
              Max
            </a>
            <a
              href='https://ab-buhpartner.ru'
              target='_blank'
              rel='noreferrer'
              className='inline-flex min-w-[170px] items-center justify-center gap-2 rounded-[14px] border border-black/20 bg-[#7CD8B3] px-5 py-3 text-sm font-medium text-black transition hover:opacity-90'
            >
              <UsersRound className='h-4 w-4' />
              Стать партнером
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
