import Image from 'next/image';
import { Send, UserRound } from 'lucide-react';

const HEADER_BUTTON_CLASS =
  'mint-btn mint-btn--header site-header-action pressable font-medium';

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
      <div className='site-header-panel surface-card rounded-[18px] bg-white px-5 py-3'>
        <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
          <a
            href='/'
            className='flex min-h-[72px] items-center'
            aria-label='Афиша бухгалтера — на главную'
          >
            <Image
              src='/logo-ab-partner-v2.png'
              alt='Афиша бухгалтера'
              width={2048}
              height={336}
              className='h-[72px] w-auto max-w-full object-contain'
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
              <span className='font-medium'>Telegram</span>
            </a>

            <a
              href='https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0'
              target='_blank'
              rel='noreferrer'
              className={HEADER_BUTTON_CLASS}
            >
              <MaxCircleIcon />
              <span className='font-medium'>Max</span>
            </a>

            <a
              href='https://ab-buhpartner.ru'
              target='_blank'
              rel='noreferrer'
              className={HEADER_BUTTON_CLASS}
            >
              <PartnerCircleIcon />
              <span className='font-medium'>Стать партнером</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
