import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TelegramService } from './modules/telegram/telegram.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(process.env.BACKEND_PORT || 4000);

  const tg = app.get(TelegramService);

  console.log('🔥 Запускаем Telegram sync...');

  await tg.sync(); // 👈 ВАЖНО await

  setInterval(() => tg.sync(), 600000);

  console.log('🚀 Backend started');
}

bootstrap();