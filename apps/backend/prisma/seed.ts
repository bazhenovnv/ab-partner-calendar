import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type SeedEvent = {
  title: string;
  slug: string;
  descriptionShort: string;
  descriptionFull: string;
  startAt: Date;
  endAt: Date;
  location: string;
  format: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  categoryId: string;
  imageUrl: string;
  source: string;
  sourceUrl: string;
  isImportant: boolean;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  published: boolean;
  tags: string[];
};

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ab-partner.ru';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin12345!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const categories: Array<[string, string, string]> = [
    ['54-ФЗ', '54-fz', '#0f766e'],
    ['Онлайн-кассы', 'online-cash-register', '#0e7490'],
    ['1С', '1c', '#059669'],
    ['Честный знак', 'chestnyj-znak', '#14b8a6'],
    ['ЕГАИС', 'egais', '#ef4444'],
    ['МойСклад', 'moj-sklad', '#2563eb'],
    ['ОФД', 'ofd', '#16a34a'],
    ['Автоматизация торговли', 'retail-automation', '#111827'],
  ];

  for (const [title, slug, color] of categories) {
    await prisma.category.upsert({
      where: { slug },
      update: { title, color },
      create: { title, slug, color },
    });
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Администратор АБ Партнер',
      passwordHash,
      role: 'SUPERADMIN',
    },
    create: {
      email: adminEmail,
      name: 'Администратор АБ Партнер',
      passwordHash,
      role: 'SUPERADMIN',
    },
  });

  const categoryRows = await prisma.category.findMany();
  const categoryMap = Object.fromEntries(categoryRows.map((c: { slug: string; id: string }) => [c.slug, c.id]));

  const events: SeedEvent[] = [
    {
      title: 'Вебинар: изменения 54-ФЗ в 2026 году',
      slug: 'vebinar-izmeneniya-54-fz-v-2026-godu',
      descriptionShort: 'Практический разбор новых требований, чеков коррекции и фискальных сценариев.',
      descriptionFull: 'Детальный вебинар для бухгалтеров и партнеров по вопросам 54-ФЗ, онлайн-касс, корректировок чеков и интеграции с ОФД.',
      startAt: new Date('2026-04-15T11:00:00'),
      endAt: new Date('2026-04-15T13:00:00'),
      location: 'Онлайн, Zoom',
      format: 'ONLINE',
      categoryId: categoryMap['54-fz'],
      imageUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?q=80&w=1200&auto=format&fit=crop',
      source: 'MANUAL',
      sourceUrl: 'https://t.me/ab_afisha_buh',
      isImportant: true,
      status: 'SCHEDULED',
      published: true,
      tags: ['54-ФЗ', 'онлайн-кассы', 'бухгалтерия'],
    },
    {
      title: 'Семинар: онлайн-кассы и автоматизация магазина',
      slug: 'seminar-onlajn-kassy-i-avtomatizaciya-magazina',
      descriptionShort: 'Как бухгалтеру сопровождать запуск кассы, эквайринга и торгового оборудования.',
      descriptionFull: 'Очный семинар с демонстрацией торгового оборудования, сценариев подключения ОФД, кассового ПО и схем взаимодействия с 1С и МойСклад.',
      startAt: new Date('2026-04-18T14:30:00'),
      endAt: new Date('2026-04-18T17:30:00'),
      location: 'Санкт-Петербург, бизнес-пространство АБ Партнер',
      format: 'OFFLINE',
      categoryId: categoryMap['online-cash-register'],
      imageUrl: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1200&auto=format&fit=crop',
      source: 'MANUAL',
      sourceUrl: 'https://t.me/ab_afisha_buh',
      isImportant: true,
      status: 'SCHEDULED',
      published: true,
      tags: ['касса', 'розница', 'эквайринг'],
    },
  ];

  for (const event of events) {
    await prisma.event.upsert({ where: { slug: event.slug }, update: event, create: event });
  }

  console.log('Seed complete');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
