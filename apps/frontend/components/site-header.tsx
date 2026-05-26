import Image from 'next/image';
import { Send, UserRound } from 'lucide-react';

const HEADER_BUTTON_CLASS =
  'inline-flex h-[44px] w-[190px] items-center justify-center gap-3 whitespace-nowrap rounded-[14px] border border-black bg-[#7CD8B3] px-4 py-2 text-[14px] font-medium text-black transition hover:opacity-90';

function TelegramCircleIcon() {
  return (
    <span className='flex h-6 w-6 items-center justify-center rounded-full bg-black'>
      <Send className='h-3.5 w-3.5 text-white' strokeWidth={2.2} />
    </span>
  );
}

function MaxCircleIcon() {
  return (
    <span className='flex h-6 w-6 items-center justify-center rounded-full bg-black text-[12px] font-bold text-white'>
      M
    </span>
  );
}

function PartnerCircleIcon() {
  return (
    <span className='flex h-6 w-6 items-center justify-center rounded-full bg-black'>
      <UserRound className='h-3.5 w-3.5 text-white' strokeWidth={2.2} />
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className='container-shell pt-5'>
      <div className='surface-card rounded-[18px] bg-white px-5 py-3 shadow-[0_18px_42px_rgba(15,23,42,0.14)]'>
        <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
          <a
            href='/'
            className='flex min-h-[72px] items-center'
            aria-label='Афиша бухгалтера — на главную'
          >
            <Image
              src='/logo-afisha-buhgaltera.png'
              alt='Афиша бухгалтера'
              width={600}
              height={200}
              className='h-[68px] w-auto max-w-[390px] object-contain'
              priority
            />
          </a>

          <div className='flex flex-wrap items-center justify-end gap-3 xl:flex-nowrap'>
            <a
              href='https://t.me/ab_afisha_buh'
              target='_blank'
              rel='noreferrer'
              className={HEADER_BUTTON_CLASS}
            >
              <TelegramCircleIcon />
              <span>Telegram</span>
            </a>

            <a
              href='https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0'
              target='_blank'
              rel='noreferrer'
              className={HEADER_BUTTON_CLASS}
            >
              <MaxCircleIcon />
              <span>Max</span>
            </a>

            <a
              href='https://ab-buhpartner.ru'
              target='_blank'
              rel='noreferrer'
              className={HEADER_BUTTON_CLASS}
            >
              <PartnerCircleIcon />
              <span>Стать партнером</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
