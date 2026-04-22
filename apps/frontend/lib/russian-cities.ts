export const RUSSIAN_CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Новосибирск',
  'Екатеринбург',
  'Казань',
  'Нижний Новгород',
  'Челябинск',
  'Самара',
  'Омск',
  'Ростов-на-Дону',
  'Уфа',
  'Красноярск',
  'Пермь',
  'Воронеж',
  'Волгоград',
  'Краснодар',
  'Саратов',
  'Тюмень',
  'Тольятти',
  'Ижевск',
  'Барнаул',
  'Ульяновск',
  'Иркутск',
  'Хабаровск',
  'Ярославль',
  'Владивосток',
  'Махачкала',
  'Томск',
  'Оренбург',
  'Кемерово',
  'Новокузнецк',
  'Рязань',
  'Астрахань',
  'Пенза',
  'Липецк',
  'Киров',
  'Чебоксары',
  'Тула',
  'Калининград',
  'Брянск',
  'Курск',
  'Иваново',
  'Ставрополь',
  'Белгород',
  'Сочи',
  'Севастополь',
  'Симферополь',
  'Архангельск',
  'Мурманск',
  'Якутск',
] as const;

export function extractRussianCity(location: string): string | null {
  const normalized = location.trim();
  if (!normalized) return null;
  if (/онлайн|zoom|teams|webinar|вебинар/i.test(normalized)) return 'Онлайн';

  const direct = RUSSIAN_CITIES.find((city) => normalized.toLowerCase().includes(city.toLowerCase()));
  if (direct) return direct;

  const firstPart = normalized.split(',')[0]?.trim();
  return firstPart || null;
}
