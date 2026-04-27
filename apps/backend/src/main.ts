import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { syncTelegram } from './services/telegram-sync.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(process.env.BACKEND_PORT || 4000);

  if (process.env.TELEGRAM_SYNC_ENABLED === 'true') {
    setInterval(syncTelegram, 10 * 60 * 1000);
    syncTelegram();
  }
}

bootstrap();