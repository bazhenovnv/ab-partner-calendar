import Image from 'next/image';
import { Send, UsersRound } from 'lucide-react';

function MaxIcon() {
  return <img src='/max-icon.png' alt='' className='h-4 w-4 object-contain' />;
}

export function SiteHeader() {
  return (
    <header className='container-shell pt-5'>
      <div className='rounded-[22px] border border-[#7CD8B3] bg-white px-4 py-3 shadow-[0_18px_42px_rgba(0,0,0,0.20)]'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <a href='/' className='flex min-h-[70px] items-center' aria-label='Афиша бухгалтера — на главную'>
            <Image
              src='/logo-ab-partner-v2.png'
              alt='Афиша бухгалтера'
              width={900}
              height={260}
              className='h-[70px] w-auto max-w-full object-contain'
              priority
            />
          </a>

          <div className='grid w-full max-w-[520px] grid-cols-3 gap-2 md:w-auto'>
            <a
              href='https://t.me/ab_afisha_buh'
              target='_blank'
              rel='noreferrer'
              className='inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-[14px] border border-black bg-[#7CD8B3] px-3 text-sm font-medium text-black shadow-[0_12px_26px_rgba(0,0,0,0.18)] transition hover:opacity-90'
            >
              <Send className='h-4 w-4' />
              Telegram
            </a>
            <a
              href='https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0'
              target='_blank'
              rel='noreferrer'
              className='inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-[14px] border border-black bg-[#7CD8B3] px-3 text-sm font-medium text-black shadow-[0_12px_26px_rgba(0,0,0,0.18)] transition hover:opacity-90'
            >
              <MaxIcon />
              Max
            </a>
            <a
              href='https://ab-buhpartner.ru'
              target='_blank'
              rel='noreferrer'
              className='inline-flex h-11 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-[14px] border border-black bg-[#7CD8B3] px-3 text-sm font-medium text-black shadow-[0_12px_26px_rgba(0,0,0,0.18)] transition hover:opacity-90'
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
