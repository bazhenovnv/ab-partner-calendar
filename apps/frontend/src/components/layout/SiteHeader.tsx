import Link from 'next/link';

const TG_CHANNEL  = 'https://t.me/ab_afisha_buh';
const MAX_CHANNEL = 'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0';
const PARTNER_URL = 'https://ab-buhpartner.ru/';

export function SiteHeader() {
  return (
    <header className="bg-white sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-4 tablet:px-8 h-20 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-3 group shrink-0"
          aria-label="АБ Афиша Бухгалтера — на главную"
        >
          {/* H-01: monogram size 50×40, H-07: увеличена монограмма */}
          <svg
            width="50"
            height="40"
            viewBox="0 0 96 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary shrink-0"
            aria-hidden="true"
          >
            {/* "а" — чаша с нисходящей правой ножкой */}
            <path
              d="M38 10 A20 20 0 1 0 48 30 L48 62"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* "б" — две параллельные диагонали + окружность снизу */}
            <line x1="54" y1="54" x2="70" y2="8"  stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            <line x1="64" y1="54" x2="80" y2="8"  stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            <circle cx="74" cy="60" r="10" stroke="currentColor" strokeWidth="8" />
          </svg>
          {/* H-02: убран text-selected-day — оба слова text-primary; H-06: text-base → text-xl */}
          <span className="font-montserrat font-bold text-primary text-xl leading-tight">
            Афиша Бухгалтера
          </span>
        </Link>

        {/* H-03: все три кнопки — outlined pill стиль */}
        <nav aria-label="Внешние ссылки" className="flex items-center gap-2">
          <a
            href={TG_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в Telegram"
            className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-primary bg-white hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.1 13.771 4.16 12.87c-.635-.197-.648-.635.136-.937l11.083-4.274c.53-.194.994.13.515.562z" />
            </svg>
            <span className="hidden tablet:inline">Telegram</span>
          </a>

          <a
            href={MAX_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в MAX"
            className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-primary bg-white hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7.5 12h9M13.5 8.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden tablet:inline">MAX</span>
          </a>

          <a
            href={PARTNER_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Стать партнёром АБ Афиша"
            className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-primary bg-white hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="hidden tablet:inline">Стать партнёром</span>
            <span className="tablet:hidden">Партнёр</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
