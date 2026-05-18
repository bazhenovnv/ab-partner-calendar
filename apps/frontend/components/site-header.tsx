import Image from 'next/image';
import { Send, UsersRound } from 'lucide-react';

const HEADER_BUTTON_CLASS = 'inline-flex h-[52px] w-[170px] items-center justify-center gap-2 rounded-[14px] border border-black bg-[#7CD8B3] px-5 py-3 text-sm font-medium text-black transition hover:opacity-90';

export function SiteHeader() {
  return (
    <header className='container-shell pt-5'>
      <div className='surface-card rounded-[18px] bg-white px-5 py-3 shadow-[0_3px_12px_rgba(15,23,42,0.08)]'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <a href='/' className='flex min-h-[72px] items-center' aria-label='Афиша бухгалтера — на главную'>
            <Image
              src='/logo-ab-partner-v2.png'
              alt='Афиша бухгалтера'
              width={2048}
              height={336}
              className='h-[72px] w-auto max-w-full object-contain'
              priority
            />
          </a>

          <div className='flex flex-wrap items-center justify-end gap-3'>
            <a
              href='https://t.me/ab_afisha_buh'
              target='_blank'
              rel='noreferrer'
              className={HEADER_BUTTON_CLASS}
            >
              <Send className='h-4 w-4' />
              Telegram
            </a>
            <a
              href='https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0'
              target='_blank'
              rel='noreferrer'
              className={HEADER_BUTTON_CLASS}
            >
              <Image src='/max-icon.png' alt='Max' width={18} height={18} className='h-[18px] w-[18px] object-contain' />
              Max
            </a>
            <a
              href='https://ab-buhpartner.ru'
              target='_blank'
              rel='noreferrer'
              className={HEADER_BUTTON_CLASS}
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
