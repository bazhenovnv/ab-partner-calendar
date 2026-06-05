import Image from 'next/image';
import { Layers3 as Layers3Icon } from 'lucide-react';

declare global {
  var Layers3: typeof Layers3Icon;
}

globalThis.Layers3 = Layers3Icon;

const HEADER_BUTTON_CLASS = 'mint-btn mint-btn--header pressable';

function TelegramCircleIcon() {
  return (
    <span className='site-header-icon'>
      <Image
        src='/ui-icons/telegram.png'
        alt=''
        width={30}
        height={30}
        className='site-header-icon-image'
      />
    </span>
  );
}

function MaxCircleIcon() {
  return (
    <span className='site-header-icon'>
      <Image
        src='/ui-icons/max.png'
        alt=''
        width={30}
        height={30}
        className='site-header-icon-image'
      />
    </span>
  );
}

function PartnerCircleIcon() {
  return (
    <span className='site-header-icon'>
      <Image
        src='/ui-icons/partner.png'
        alt=''
        width={30}
        height={30}
        className='site-header-icon-image'
      />
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
            className='site-header-logo-link flex items-center'
            aria-label='Афиша бухгалтера — на главную'
          >
            <img
              src='/logo-afisha-buhgaltera-final.png'
              alt='Афиша Бухгалтера'
              className='site-header-logo-image'
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
